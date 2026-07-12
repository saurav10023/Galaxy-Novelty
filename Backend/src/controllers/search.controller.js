// controllers/search.controller.js
import { Product } from "../models/Product.model.js";
import { buildProductQuery } from "../utils/buildProductQuery.js";
import { buildSortQuery } from "../utils/buildSortQuery.js";
import { sanitizeProductList } from "../utils/sanitizeProduct.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// GET /api/v1/products/search?category=mobile&ram=8GB&network=5G&minPrice=10000&maxPrice=30000&sort=price-asc&page=1&limit=20
const searchProducts = asyncHandler(async (req, res) => {
    const { category, sort, page = 1, limit = 20 } = req.query;

    const isAdmin = req.user?.role === "admin";

    const filter = buildProductQuery(category, req.query, isAdmin);
    const sortQuery = buildSortQuery(sort);

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
        Product.find(filter).sort(sortQuery).skip(skip).limit(Number(limit)),
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
                    page: Number(page),
                    pages: Math.ceil(total / Number(limit))
                }
            },
            "Products fetched successfully"
        )
    );
});

// GET /api/v1/products/filters/:category  — tells the frontend what filters are available for a category
const getAvailableFilters = asyncHandler(async (req, res) => {
    const { category } = req.params;

    // static enum-based options — could also be dynamically derived from distinct() values in DB
    const staticFilters = {
        mobile: {
            ram: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"],
            rom: ["64GB", "128GB", "256GB", "512GB", "1TB"],
            network: ["4G", "5G"]
        },
        charger: {
            portType: ["Type-C", "Micro-USB", "Lightning", "Multi-port"],
            chargingType: [
                "Standard Charging", "Fast Charging", "Super Fast Charging",
                "Super VOOC", "VOOC", "Warp Charge", "Dash Charge",
                "SuperCharge", "Flash Charge", "Turbo Power",
                "Power Delivery (PD)", "Quick Charge (QC)"
            ]
        },
        powerbank: {
            chargingType: [
                "Standard Charging", "Fast Charging", "Super Fast Charging",
                "Super VOOC", "VOOC", "Warp Charge", "Dash Charge",
                "SuperCharge", "Flash Charge", "Turbo Power",
                "Power Delivery (PD)", "Quick Charge (QC)"
            ]
        },
        headphone: {
            type: ["tws", "neckband", "wired", "over-ear"]
        }
    };

    const filters = staticFilters[category];
    if (!filters) {
        return res.status(200).json(new ApiResponse(200, {}, "No filters defined for this category"));
    }

    return res.status(200).json(new ApiResponse(200, filters, "Available filters fetched"));
});

// GET /api/v1/products/brands?category=mobile
// Returns distinct brands present in a category, with counts + a sample
// image for the chip strip. Reuses the same isActive rule as searchProducts
// (buildProductQuery would do this too, but we only need brand+isActive here).
const getBrandsByCategory = asyncHandler(async (req, res) => {
    const { category } = req.query;

    if (!category) {
        throw new ApiError(400, "Category is required");
    }

    const isAdmin = req.user?.role === "admin";

    const matchStage = {
        category,
        brand: { $exists: true, $ne: null, $ne: "" },
    };
    if (!isAdmin) matchStage.isActive = true;

    const brands = await Product.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: "$brand",
                productCount: { $sum: 1 },
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

export { searchProducts, getAvailableFilters, getBrandsByCategory };
