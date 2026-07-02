// controllers/product.controller.js
import { Product } from "../models/Product.model.js";
import { getModelByCategory } from "../utils/productModelMap.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { sanitizeProduct, sanitizeProductList } from "../utils/sanitizeProduct.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ---- CREATE PRODUCT ----
// Admin only. category comes from req.body and decides which discriminator model to use.
const createProduct = asyncHandler(async (req, res) => {
    const { category } = req.body;

    if (!category) {
        throw new ApiError(400, "Category is required");
    }

    const Model = getModelByCategory(category);
    if (!Model) {
        throw new ApiError(400, `Invalid category: ${category}`);
    }

    // parse pricing if sent as a JSON string (common with multipart/form-data)
    let pricing = req.body.pricing;
    if (typeof pricing === "string") {
        pricing = JSON.parse(pricing);
    }

    if (!pricing?.purchasePrice || !pricing?.sellingPrice) {
        throw new ApiError(400, "purchasePrice and sellingPrice are required");
    }

    // handle image uploads
    const files = req.files || [];
    if (files.length === 0) {
        throw new ApiError(400, "At least one product image is required");
    }

    const uploadedImages = [];
    for (const file of files) {
        const result = await uploadOnCloudinary(file.path);
        if (!result?.url) {
            throw new ApiError(500, "Error uploading one or more images");
        }
        uploadedImages.push({ url: result.url, publicId: result.public_id });
    }

    const productData = {
        ...req.body,
        pricing,
        images: uploadedImages
    };

    // remove fields that shouldn't be set directly
    delete productData.category; // discriminator key is set automatically by the model

    const product = await Model.create(productData);

    return res
        .status(201)
        .json(new ApiResponse(201, product, "Product created successfully"));
});

// ---- UPDATE PRODUCT ----
// Admin only. Fetches the doc first to know which discriminator schema to validate against.
const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
        throw new ApiError(404, "Product not found");
    }

    const Model = getModelByCategory(existingProduct.category);
    if (!Model) {
        throw new ApiError(400, "Invalid product category on existing record");
    }

    let pricing = req.body.pricing;
    if (typeof pricing === "string") {
        pricing = JSON.parse(pricing);
    }

    const updates = { ...req.body };
    if (pricing) updates.pricing = pricing;
    delete updates.category; // category should never change after creation
    delete updates.images;   // images handled separately via addProductImages/removeProductImage

    const updatedProduct = await Model.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedProduct, "Product updated successfully"));
});

// ---- ADD IMAGES TO EXISTING PRODUCT ----
const addProductImages = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    const files = req.files || [];
    if (files.length === 0) {
        throw new ApiError(400, "At least one image file is required");
    }

    const uploadedImages = [];
    for (const file of files) {
        const result = await uploadOnCloudinary(file.path);
        if (!result?.url) {
            throw new ApiError(500, "Error uploading one or more images");
        }
        uploadedImages.push({ url: result.url, publicId: result.public_id });
    }

    product.images.push(...uploadedImages);
    await product.save();

    return res
        .status(200)
        .json(new ApiResponse(200, product, "Images added successfully"));
});

// ---- REMOVE A SPECIFIC IMAGE FROM A PRODUCT ----
const removeProductImage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { publicId } = req.body;

    if (!publicId) {
        throw new ApiError(400, "publicId is required");
    }

    const product = await Product.findById(id);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    if (product.images.length <= 1) {
        throw new ApiError(400, "Product must have at least one image");
    }

    await deleteFromCloudinary(publicId);

    product.images = product.images.filter((img) => img.publicId !== publicId);
    await product.save();

    return res
        .status(200)
        .json(new ApiResponse(200, product, "Image removed successfully"));
});

// ---- DELETE PRODUCT ----
const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // clean up cloudinary images
    for (const img of product.images) {
        await deleteFromCloudinary(img.publicId);
    }

    await product.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Product deleted successfully"));
});

// ---- GET SINGLE PRODUCT ----
// Public route. Sanitizes pricing based on whether req.user exists (admin logged in) or not.
const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product || !product.isActive) {
        throw new ApiError(404, "Product not found");
    }

    const isAdmin = req.user?.role === "admin";
    const sanitized = sanitizeProduct(product, isAdmin);

    return res
        .status(200)
        .json(new ApiResponse(200, sanitized, "Product fetched successfully"));
});

// ---- GET ALL PRODUCTS (basic listing, no filters yet — that's the search API) ----
const getAllProducts = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const isAdmin = req.user?.role === "admin";

    // customers should only ever see active products
    const filter = isAdmin ? {} : { isActive: true };

    const [products, total] = await Promise.all([
        Product.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Product.countDocuments(filter)
    ]);

    const sanitized = sanitizeProductList(products, isAdmin);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                products: sanitized,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit)
                }
            },
            "Products fetched successfully"
        )
    );
});

// ---- TOGGLE PRODUCT ACTIVE STATUS ----
// Admin only. Soft delete / re-list without removing data.
const toggleProductStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    product.isActive = !product.isActive;
    await product.save();

    return res
        .status(200)
        .json(new ApiResponse(200, product, `Product ${product.isActive ? "activated" : "deactivated"}`));
});

export {
    createProduct,
    updateProduct,
    addProductImages,
    removeProductImage,
    deleteProduct,
    getProductById,
    getAllProducts,
    toggleProductStatus
};