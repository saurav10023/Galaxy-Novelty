// utils/buildProductQuery.js
import { filterConfig } from "./filterConfig.js";

const buildProductQuery = (category, queryParams, isAdmin) => {
    let filter = {};

    // shared filters, apply regardless of category
    if (!isAdmin) {
        filter.isActive = true;
    }

    if (queryParams.minPrice || queryParams.maxPrice) {
        filter["pricing.sellingPrice"] = {};
        if (queryParams.minPrice) filter["pricing.sellingPrice"].$gte = Number(queryParams.minPrice);
        if (queryParams.maxPrice) filter["pricing.sellingPrice"].$lte = Number(queryParams.maxPrice);
    }

    if (queryParams.brand) {
        filter.brand = queryParams.brand;
    }

    if (queryParams.search) {
        filter.name = { $regex: queryParams.search, $options: "i" };
    }

    if (category) {
        filter.category = category;
    }

    // category-specific filters
    if (category && filterConfig[category]) {
        const categoryFilters = filterConfig[category];

        for (const key in categoryFilters) {
            if (queryParams[key] !== undefined) {
                const partialFilter = categoryFilters[key](queryParams[key]);
                filter = { ...filter, ...partialFilter };
            }
        }
    }

    return filter;
};

export { buildProductQuery };