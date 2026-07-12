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

    // Parse pricing if sent as JSON string (multipart/form-data)
    let pricing = req.body.pricing;
    if (typeof pricing === "string") {
        try {
            pricing = JSON.parse(pricing);
        } catch {
            throw new ApiError(400, "Invalid pricing format");
        }
    }

    if (!pricing?.purchasePrice || !pricing?.sellingPrice) {
        throw new ApiError(400, "purchasePrice and sellingPrice are required");
    }

    // Handle image uploads (optional)
    const files = req.files || [];
    const uploadedImages = [];

    if (files.length > 0) {
        for (const file of files) {
            const result = await uploadOnCloudinary(file.path);

            if (!result?.url || !result?.public_id) {
                throw new ApiError(500, "Error uploading one or more images");
            }

            uploadedImages.push({
                url: result.url,
                publicId: result.public_id,
            });
        }
    }

    const productData = {
        ...req.body,
        pricing,
    };

    // Add images only if uploaded
    if (uploadedImages.length > 0) {
        productData.images = uploadedImages;
    }

    // Prevent category from being overwritten
    delete productData.category;

    const product = await Model.create(productData);

    return res.status(201).json(
        new ApiResponse(201, product, "Product created successfully")
    );
});

// ---- UPDATE PRODUCT ----
// Admin only. Fetches the document first to know which discriminator schema to validate against.
const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
        throw new ApiError(404, "Product not found");
    }

    const Model = getModelByCategory(existingProduct.category);

    if (!Model) {
        throw new ApiError(400, "Invalid product category");
    }

    // Parse pricing
    let pricing = req.body.pricing;
    if (typeof pricing === "string") {
        try {
            pricing = JSON.parse(pricing);
        } catch {
            throw new ApiError(400, "Invalid pricing format");
        }
    }

    const setUpdates = {
        ...req.body,
    };

    if (pricing) {
        // IMPORTANT: $set on a nested path REPLACES the whole subdocument,
        // it does not merge. Merge with the existing pricing here so a
        // partial payload (e.g. only { sellingPrice }) can't silently wipe
        // purchasePrice or negotiation, and can't trigger a spurious
        // "required" validation error for fields the client never touched.
        const existingPricing = existingProduct.pricing?.toObject
            ? existingProduct.pricing.toObject()
            : existingProduct.pricing || {};

        const { negotiation: incomingNegotiation, ...restPricing } = pricing;

        const mergedPricing = {
            ...existingPricing,
            ...restPricing,
        };

        if (incomingNegotiation === null) {
            // Explicit clear signal from the client — remove negotiation entirely.
            delete mergedPricing.negotiation;
        } else if (incomingNegotiation !== undefined) {
            // Object provided — merge into whatever negotiation already existed
            // so e.g. sending only { minPrice } doesn't wipe an existing maxPrice.
            mergedPricing.negotiation = {
                ...(existingPricing.negotiation || {}),
                ...incomingNegotiation,
            };
        }
        // incomingNegotiation === undefined (key absent from payload entirely)
        // -> leave existingPricing.negotiation as-is, already carried over above.

        setUpdates.pricing = mergedPricing;
    }

    delete setUpdates.category;
    delete setUpdates.images;

    const updateQuery = {
        $set: setUpdates,
    };

    // Optional image upload
    const files = req.files || [];

    if (files.length > 0) {
        const uploadedImages = [];

        for (const file of files) {
            const result = await uploadOnCloudinary(file.path);

            if (!result?.url || !result?.public_id) {
                throw new ApiError(500, "Error uploading image");
            }

            uploadedImages.push({
                url: result.url,
                publicId: result.public_id,
            });
        }

        updateQuery.$push = {
            images: {
                $each: uploadedImages,
            },
        };
    }

    const updatedProduct = await Model.findByIdAndUpdate(
        id,
        updateQuery,
        {
            new: true,
            runValidators: true,
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedProduct,
            "Product updated successfully"
        )
    );
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
        if (!result?.url || !result?.public_id) {
            throw new ApiError(500, "Error uploading one or more images");
        }
        uploadedImages.push({ url: result.url, publicId: result.public_id });
    }

    // Defensive: ensure images array exists before pushing
    if (!Array.isArray(product.images)) {
        product.images = [];
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

    const imageExists = (product.images || []).some(
        (img) => img.publicId === publicId
    );

    if (!imageExists) {
        throw new ApiError(404, "Image not found on this product");
    }

    await deleteFromCloudinary(publicId);

    product.images = (product.images || []).filter(
        (img) => img.publicId !== publicId
    );
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

    // clean up cloudinary images (defensive against missing/undefined images or publicId)
    for (const img of product.images || []) {
        if (img?.publicId) {
            await deleteFromCloudinary(img.publicId);
        }
    }

    await product.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Product deleted successfully"));
});

// ---- GET SINGLE PRODUCT (ADMIN) ----
// Protected route — must sit behind auth + role middleware in the router
// (e.g. router.get("/admin/:id", verifyJWT, isAdmin, getProductByIdAdmin)).
// Unlike the public getProductById, this:
//   - never filters on isActive (admins need to edit inactive/delisted products too)
//   - never sanitizes the response — purchasePrice and full pricing always included
// This is what the admin edit form should call, so pricing is never silently
// stripped because of a missing/expired auth token on the public route.
const getProductByIdAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, product, "Product fetched successfully"));
});


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

// ---- GET DISTINCT BRANDS FOR A CATEGORY ----
// Public. Powers the brand segment strip shown when a user is inside
// a specific category (mobile / charger / powerbank / headphones).
const getBrandsByCategory = asyncHandler(async (req, res) => {
    const { category } = req.query;

    const allowedCategories = ["mobile", "charger", "powerbank", "headphones"];

    if (!category) {
        throw new ApiError(400, "Category is required");
    }

    if (!allowedCategories.includes(category)) {
        throw new ApiError(400, `Invalid category: ${category}`);
    }

    const brands = await Product.aggregate([
        {
            $match: {
                category,
                isActive: true,
                brand: { $exists: true, $ne: null, $ne: "" },
            },
        },
        {
            $group: {
                _id: "$brand",
                productCount: { $sum: 1 },
                // grab one representative image per brand for the UI chip/thumbnail
                sampleImage: { $first: "$images" },
            },
        },
        { $sort: { productCount: -1 } },
        {
            $project: {
                _id: 0,
                brand: "$_id",
                productCount: 1,
                sampleImage: { $arrayElemAt: ["$sampleImage.url", 0] },
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, brands, "Brands fetched successfully"));
});

// ---- GET PRODUCTS BY CATEGORY + BRAND ----
// Public. Called when user taps a brand chip inside a category screen.
// Reuses the same pagination + sanitization pattern as getAllProducts.
const getProductsByBrand = asyncHandler(async (req, res) => {
    const { category, brand } = req.query;

    if (!category || !brand) {
        throw new ApiError(400, "category and brand are required");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const isAdmin = req.user?.role === "admin";

    const filter = {
        category,
        brand,
        ...(isAdmin ? {} : { isActive: true }),
    };

    const [products, total] = await Promise.all([
        Product.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Product.countDocuments(filter),
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
                    pages: Math.ceil(total / limit),
                },
            },
            "Products fetched successfully"
        )
    );
});
export {
    createProduct,
    updateProduct,
    addProductImages,
    removeProductImage,
    deleteProduct,
    getProductById,
    getProductByIdAdmin,
    getAllProducts,
    toggleProductStatus,
    getProductsByBrand , 
    getBrandsByCategory
};