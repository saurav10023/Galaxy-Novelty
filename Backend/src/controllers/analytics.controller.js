// controllers/analytics.controller.js
//
// Inventory analytics — live snapshot, no date filtering (there's no
// Order/Sales model in this codebase yet, so this is scoped to what the
// Product collection can actually answer: how many products exist, broken
// down by category/brand, and how selling prices are distributed).
//
// Same conventions as search.controller.js: asyncHandler wrapper,
// ApiResponse envelope, admin sees inactive products too (everyone else is
// scoped to isActive: true), category is validated against the same
// discriminator keys used across the Product/Mobile/Charger/PowerBank/
// Headphone models.

import { Product } from "../models/Product.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Discriminator keys currently registered on Product — kept here as the one
// place to update if a new category discriminator gets added later.
const KNOWN_CATEGORIES = ["mobile", "charger", "powerbank", "headphone"];

const assertValidCategory = (category) => {
    if (category && !KNOWN_CATEGORIES.includes(category)) {
        throw new ApiError(400, `Unknown category "${category}". Expected one of: ${KNOWN_CATEGORIES.join(", ")}`);
    }
};

// Same isActive rule used everywhere else — admins see the full catalog,
// everyone else only sees what's live.
const buildBaseMatch = (req, { category } = {}) => {
    const isAdmin = req.user?.role === "admin";
    const match = {};
    if (!isAdmin) match.isActive = true;
    if (category) match.category = category;
    return match;
};

// GET /api/v1/products/analytics/overview
// Total product count, active/inactive split, and a per-category count —
// "how many products do I have, and of what kind" at a glance.
const getInventoryOverview = asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role === "admin";
    const baseMatch = isAdmin ? {} : { isActive: true };

    const [result] = await Product.aggregate([
        { $match: baseMatch },
        {
            $facet: {
                totalCount: [{ $count: "count" }],
                categoryCounts: [
                    { $group: { _id: "$category", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $project: { _id: 0, category: "$_id", count: 1 } }
                ],
                // Only meaningful for admins (public results are already
                // filtered to isActive: true, so this would just echo the
                // total back) — computed either way since it's cheap in the
                // same facet pass, but the response only surfaces it for
                // admins below.
                statusCounts: [
                    { $group: { _id: "$isActive", count: { $sum: 1 } } },
                    { $project: { _id: 0, isActive: "$_id", count: 1 } }
                ]
            }
        }
    ]);

    const totalProducts = result.totalCount[0]?.count || 0;
    const activeCount = result.statusCounts.find((s) => s.isActive === true)?.count || 0;
    const inactiveCount = result.statusCounts.find((s) => s.isActive === false)?.count || 0;

    const payload = {
        totalProducts,
        categoryCounts: result.categoryCounts,
    };

    // Inactive counts only make sense to show admins — a non-admin's
    // baseMatch already excludes inactive products, so activeCount would
    // just equal totalProducts and inactiveCount would always read 0,
    // which is misleading rather than informative.
    if (isAdmin) {
        payload.activeCount = activeCount;
        payload.inactiveCount = inactiveCount;
    }

    return res
        .status(200)
        .json(new ApiResponse(200, payload, "Inventory overview fetched successfully"));
});

// GET /api/v1/products/analytics/brands?category=mobile
// Brand counts, optionally scoped to one category. Omit `category` to get
// brand counts across the whole catalog plus the category breakdown behind
// each brand (e.g. "Samsung" might span mobile + headphone).
const getBrandDistribution = asyncHandler(async (req, res) => {
    const { category } = req.query;
    assertValidCategory(category);

    const match = {
        ...buildBaseMatch(req, { category }),
        brand: { $exists: true, $ne: null, $ne: "" },
    };

    const [result] = await Product.aggregate([
        { $match: match },
        {
            $facet: {
                brandCounts: [
                    { $group: { _id: "$brand", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $project: { _id: 0, brand: "$_id", count: 1 } }
                ],
                // Per-brand category split — dropped from the response when
                // a specific category was requested, since every row would
                // trivially show that one category.
                categoryBrandCounts: category
                    ? []
                    : [
                          {
                              $group: {
                                  _id: { category: "$category", brand: "$brand" },
                                  count: { $sum: 1 }
                              }
                          },
                          { $sort: { count: -1 } },
                          {
                              $project: {
                                  _id: 0,
                                  category: "$_id.category",
                                  brand: "$_id.brand",
                                  count: 1
                              }
                          }
                      ]
            }
        }
    ]);

    const payload = {
        category: category || null,
        brandCounts: result.brandCounts,
    };
    if (!category) payload.categoryBrandCounts = result.categoryBrandCounts;

    return res
        .status(200)
        .json(new ApiResponse(200, payload, "Brand distribution fetched successfully"));
});

// GET /api/v1/products/analytics/price-distribution?category=mobile&buckets=5
// Groups products into `buckets` evenly-sized price ranges (Mongo picks the
// boundaries itself via $bucketAuto, so this works for any category without
// hardcoding a price ladder per category the way the shop's preset chips
// do). Defaults to 5 buckets across the whole catalog if no category/count
// is given.
const getPriceDistribution = asyncHandler(async (req, res) => {
    const { category } = req.query;
    assertValidCategory(category);

    const bucketCount = Math.min(Math.max(Number(req.query.buckets) || 5, 2), 20);

    const match = {
        ...buildBaseMatch(req, { category }),
        "pricing.sellingPrice": { $exists: true, $ne: null },
    };

    const productCount = await Product.countDocuments(match);
    if (productCount === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, { category: category || null, buckets: [] }, "No products to distribute"));
    }

    const buckets = await Product.aggregate([
        { $match: match },
        {
            $bucketAuto: {
                groupBy: "$pricing.sellingPrice",
                buckets: bucketCount,
                output: {
                    count: { $sum: 1 },
                    minPrice: { $min: "$pricing.sellingPrice" },
                    maxPrice: { $max: "$pricing.sellingPrice" }
                }
            }
        },
        {
            $project: {
                _id: 0,
                rangeStart: "$_id.min",
                rangeEnd: "$_id.max",
                count: 1,
                minPrice: 1,
                maxPrice: 1
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, { category: category || null, buckets }, "Price distribution fetched successfully"));
});

export { getInventoryOverview, getBrandDistribution, getPriceDistribution };