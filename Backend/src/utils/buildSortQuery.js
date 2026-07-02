// utils/buildSortQuery.js
const sortMap = {
    "price-asc": { "pricing.sellingPrice": 1 },
    "price-desc": { "pricing.sellingPrice": -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 }
};

const buildSortQuery = (sortParam) => {
    return sortMap[sortParam] || sortMap.newest;
};

export { buildSortQuery };