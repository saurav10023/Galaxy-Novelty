// utils/sanitizeProduct.js
const sanitizeProduct = (product, isAdmin) => {
    const obj = product.toObject ? product.toObject() : { ...product };

    if (!isAdmin) {
        if (obj.pricing) {
            obj.pricing = {
                sellingPrice: obj.pricing.sellingPrice
                // purchasePrice and negotiation stripped for non-admin
            };
        }
    }

    return obj;
};

const sanitizeProductList = (products, isAdmin) => {
    return products.map((p) => sanitizeProduct(p, isAdmin));
};

export { sanitizeProduct, sanitizeProductList };