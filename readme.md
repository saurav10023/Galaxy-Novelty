# Product Search & Filter System — Technical Documentation

## 1. Overview

This document describes how product search and category-specific filtering works across the backend and frontend of the shop application.

The catalog contains multiple product categories (Mobile, Charger, PowerBank, Headphone), each with its own set of relevant filters (RAM/ROM/Network for mobiles, wattage/chargingType for chargers, etc.), while sharing a common set of fields (price, brand, images, stock) via a single base `Product` schema using **Mongoose discriminators**.

Two additional rules apply on top of filtering:

- **Role-based pricing visibility** — customers (no login) only ever see `sellingPrice`. Admins see `purchasePrice`, `sellingPrice`, and the negotiation range.
- **Active-status visibility** — customers only ever see `isActive: true` products. Admins can see everything, including deactivated stock.

---

## 2. Architecture Summary

```
Client (React)
   │
   │  GET /api/v1/products/filters/:category
   │  GET /api/v1/products/search?category=...&<filters>&sort=&page=&limit=
   ▼
Express Route
   │
   ▼
optionalAuth middleware  →  determines if requester is admin or anonymous
   │
   ▼
Controller (searchProducts / getAvailableFilters)
   │
   ├── buildProductQuery()   → converts query params into a MongoDB filter object
   ├── buildSortQuery()      → converts sort param into a MongoDB sort object
   ├── Product.find(filter)  → queries the database
   └── sanitizeProductList() → strips purchasePrice/negotiation if not admin
   │
   ▼
JSON Response → Frontend renders results
```

---

## 3. Backend Components

### 3.1 `filterConfig.js` — category filter definitions

Location: `utils/filterConfig.js`

Defines, per category, which query parameters are valid and how each one maps to a MongoDB query fragment.

```javascript
const filterConfig = {
    mobile: {
        company: (val) => ({ company: val }),
        ram: (val) => ({ ram: val }),
        rom: (val) => ({ rom: val }),
        network: (val) => ({ network: val }),
        minBattery: (val) => ({ batteryCapacity: { $gte: Number(val) } }),
        maxBattery: (val) => ({ batteryCapacity: { $lte: Number(val) } }),
        color: (val) => ({ color: val })
    },
    headphone: {
        type: (val) => ({ type: val }),
        noiseCancellation: (val) => ({ noiseCancellation: val === "true" }),
        color: (val) => ({ color: val })
    },
    charger: {
        portType: (val) => ({ portType: val }),
        chargingType: (val) => ({ chargingType: val }),
        fastChargingSupport: (val) => ({ fastChargingSupport: val === "true" })
    },
    powerbank: {
        minCapacity: (val) => ({ capacity: { $gte: Number(val) } }),
        maxCapacity: (val) => ({ capacity: { $lte: Number(val) } }),
        chargingType: (val) => ({ chargingType: val }),
        wirelessCharging: (val) => ({ wirelessCharging: val === "true" }),
        passThroughCharging: (val) => ({ passThroughCharging: val === "true" })
    }
};
```

**Why this pattern:** adding a new product category later means adding one object here — no controller changes, no route changes, no risk of breaking existing categories.

**Adding a new category (example — "cable"):**

```javascript
cable: {
    length: (val) => ({ length: val }),
    connectorType: (val) => ({ connectorType: val })
}
```

That's the only change required for the new category's filters to work end-to-end.

---

### 3.2 `buildProductQuery.js` — the query builder

Location: `utils/buildProductQuery.js`

Combines **shared filters** (apply to every category) with **category-specific filters** (looked up from `filterConfig`) into a single MongoDB filter object.

```javascript
const buildProductQuery = (category, queryParams, isAdmin) => {
    let filter = {};

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

    if (category && filterConfig[category]) {
        const categoryFilters = filterConfig[category];
        for (const key in categoryFilters) {
            if (queryParams[key] !== undefined) {
                filter = { ...filter, ...categoryFilters[key](queryParams[key]) };
            }
        }
    }

    return filter;
};
```

#### Shared filters (apply to all categories)

| Query param | Effect |
|---|---|
| `minPrice`, `maxPrice` | Filters `pricing.sellingPrice` with `$gte`/`$lte` |
| `brand` | Exact match on `brand` field |
| `search` | Case-insensitive partial match on `name` |
| `category` | Restricts results to one discriminator type |
| *(none, if admin)* | Admins see both active and inactive products |
| *(forced `isActive: true`, if not admin)* | Customers never see deactivated products |

#### Category-specific filters

Only the params defined in that category's `filterConfig` entry are recognized. Any unrelated param sent by the client (e.g. `?ram=8GB` while `category=charger`) is silently ignored — no error, no crash, no cross-category leakage.

---

### 3.3 `buildSortQuery.js` — sort mapping

Location: `utils/buildSortQuery.js`

```javascript
const sortMap = {
    "price-asc": { "pricing.sellingPrice": 1 },
    "price-desc": { "pricing.sellingPrice": -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 }
};

const buildSortQuery = (sortParam) => sortMap[sortParam] || sortMap.newest;
```

Defaults to `newest` if no valid `sort` param is provided.

---

### 3.4 `sanitizeProduct.js` — pricing visibility enforcement

Location: `utils/sanitizeProduct.js`

```javascript
const sanitizeProduct = (product, isAdmin) => {
    const obj = product.toObject ? product.toObject() : { ...product };

    if (!isAdmin && obj.pricing) {
        obj.pricing = {
            sellingPrice: obj.pricing.sellingPrice
        };
    }

    return obj;
};

const sanitizeProductList = (products, isAdmin) => products.map((p) => sanitizeProduct(p, isAdmin));
```

**Critical rule:** this runs **after** the database query, on every response, regardless of endpoint. `purchasePrice` and `negotiation` are never serialized into the JSON response sent to a non-admin — this is enforced server-side, not hidden client-side. A customer inspecting the raw network response in browser dev tools cannot see cost price or negotiation range under any circumstance.

---

### 3.5 `optionalAuth.js` — determines requester identity without blocking

Location: `middlewares/optionalAuth.middleware.js`

```javascript
export const optionalAuth = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        return next(); // anonymous / customer
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        if (user) {
            req.user = user;
        }
    } catch (error) {
        // invalid/expired token treated as anonymous, not an error
    }

    next();
});
```

**Why this exists:** search/browse routes must work for both logged-out customers and logged-in admins, with different pricing visibility for each. The standard `verifyjwt` middleware throws a 401 if no token is present — that would block customers entirely. `optionalAuth` never blocks; it only populates `req.user` when a valid token exists.

---

### 3.6 `search.controller.js` — the endpoints

Location: `controllers/search.controller.js`

#### `searchProducts`

```
GET /api/v1/products/search
```

| Query param | Type | Description |
|---|---|---|
| `category` | string | `mobile` \| `charger` \| `powerbank` \| `headphone` |
| `minPrice`, `maxPrice` | number | Selling price range |
| `brand` | string | Exact brand match |
| `search` | string | Partial name match |
| `sort` | string | `price-asc` \| `price-desc` \| `newest` \| `oldest` |
| `page` | number | Default `1` |
| `limit` | number | Default `20` |
| *(category-specific)* | varies | See §3.1 per category |

```javascript
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
        new ApiResponse(200, {
            products: sanitized,
            pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
        }, "Products fetched successfully")
    );
});
```

#### `getAvailableFilters`

```
GET /api/v1/products/filters/:category
```

Returns the set of selectable filter options for a given category, so the frontend can render the correct filter UI dynamically without hardcoding options per category.

```javascript
const getAvailableFilters = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const filters = staticFilters[category];

    if (!filters) {
        return res.status(200).json(new ApiResponse(200, {}, "No filters defined for this category"));
    }

    return res.status(200).json(new ApiResponse(200, filters, "Available filters fetched"));
});
```

> **Note:** `staticFilters` currently returns hardcoded enum values (matching the schema enums). An alternative implementation using `Model.distinct("fieldName")` would return only values that actually exist in current inventory (e.g. never show "16GB" as an option if no 16GB phones are in stock). Trade-off: extra DB query per filter-options request vs. always-accurate options.

---

### 3.7 Routes

Location: `routes/search.routes.js`

```javascript
router.route("/search").get(optionalAuth, searchProducts);
router.route("/filters/:category").get(getAvailableFilters);
```

`searchProducts` uses `optionalAuth` (not `verifyjwt`) so it works for both anonymous customers and logged-in admins with different pricing output. `getAvailableFilters` requires no auth at all — it never touches pricing or product data, just returns static filter option lists.

---

## 4. Complete Request Trace (Worked Example)

**Scenario:** An anonymous customer browsing mobiles filters by RAM: 8GB, Network: 5G, price ₹10,000–₹30,000, sorted by price ascending.

**Request:**
```
GET /api/v1/products/search?category=mobile&ram=8GB&network=5G&minPrice=10000&maxPrice=30000&sort=price-asc&page=1&limit=20
Cookie: (none)
```

**Step 1 — `optionalAuth`:** No `accessToken` cookie present → `req.user` stays `undefined`.

**Step 2 — Controller:** `isAdmin = req.user?.role === "admin"` → `false`.

**Step 3 — `buildProductQuery("mobile", req.query, false)` constructs:**

```javascript
{
  isActive: true,
  "pricing.sellingPrice": { $gte: 10000, $lte: 30000 },
  category: "mobile",
  ram: "8GB",
  network: "5G"
}
```

**Step 4 — `buildSortQuery("price-asc")` returns:**
```javascript
{ "pricing.sellingPrice": 1 }
```

**Step 5 — Query execution:**
```javascript
Product.find(filter).sort(sortQuery).skip(0).limit(20)
```
Returns matching documents — each still containing full `pricing` (including `purchasePrice`, `negotiation`) at this point.

**Step 6 — `sanitizeProductList(products, false)`** strips sensitive pricing from every result.

Before:
```json
{ "name": "Galaxy A54", "pricing": { "purchasePrice": 18000, "sellingPrice": 24999, "negotiation": { "minPrice": 23000, "maxPrice": 26000 } } }
```

After:
```json
{ "name": "Galaxy A54", "pricing": { "sellingPrice": 24999 } }
```

**Final response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Products fetched successfully",
  "data": {
    "products": [
      {
        "_id": "...",
        "name": "Galaxy A54",
        "brand": "Samsung",
        "category": "mobile",
        "pricing": { "sellingPrice": 24999 },
        "ram": "8GB",
        "rom": "128GB",
        "network": "5G",
        "images": [{ "url": "...", "publicId": "..." }]
      }
    ],
    "pagination": { "total": 7, "page": 1, "pages": 1 }
  }
}
```

**Same request with a valid admin `accessToken` cookie instead:** `req.user.role === "admin"` → `isAdmin = true` → `filter.isActive` is never forced to `true` (admin sees inactive stock too) → sanitizer passes `pricing` through unchanged, including `purchasePrice` and `negotiation`.

---

## 5. Frontend Implementation

### 5.1 Filter sidebar — fetches available options per category

```jsx
// components/ProductFilters.jsx
import { useEffect, useState } from "react";
import axios from "axios";

const ProductFilters = ({ category, onFilterChange }) => {
    const [availableFilters, setAvailableFilters] = useState({});
    const [selected, setSelected] = useState({});

    useEffect(() => {
        const fetchFilters = async () => {
            const res = await axios.get(`/api/v1/products/filters/${category}`, {
                withCredentials: true
            });
            setAvailableFilters(res.data.data);
        };
        fetchFilters();
    }, [category]);

    const handleChange = (key, value) => {
        const updated = { ...selected, [key]: value };
        setSelected(updated);
        onFilterChange(updated);
    };

    return (
        <div className="filter-sidebar">
            {Object.entries(availableFilters).map(([filterKey, options]) => (
                <div key={filterKey} className="filter-group">
                    <h4>{filterKey.toUpperCase()}</h4>
                    {options.map((option) => (
                        <label key={option}>
                            <input
                                type="radio"
                                name={filterKey}
                                value={option}
                                onChange={() => handleChange(filterKey, option)}
                            />
                            {option}
                        </label>
                    ))}
                </div>
            ))}

            <div className="filter-group">
                <h4>PRICE RANGE</h4>
                <input type="number" placeholder="Min" onChange={(e) => handleChange("minPrice", e.target.value)} />
                <input type="number" placeholder="Max" onChange={(e) => handleChange("maxPrice", e.target.value)} />
            </div>
        </div>
    );
};

export default ProductFilters;
```

### 5.2 Category page — orchestrates filters, search, pagination, and URL sync

```jsx
// pages/CategoryPage.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import ProductFilters from "../components/ProductFilters";
import ProductCard from "../components/ProductCard";

const CategoryPage = ({ category }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchProducts = async (filters = {}) => {
        setLoading(true);
        const params = { category, ...filters };

        const res = await axios.get("/api/v1/products/search", {
            params,
            withCredentials: true
        });

        setProducts(res.data.data.products);
        setPagination(res.data.data.pagination);
        setLoading(false);
    };

    useEffect(() => {
        const initialFilters = Object.fromEntries(searchParams.entries());
        fetchProducts(initialFilters);
    }, [category]);

    const handleFilterChange = (filters) => {
        setSearchParams(filters);
        fetchProducts(filters);
    };

    return (
        <div className="category-page">
            <ProductFilters category={category} onFilterChange={handleFilterChange} />
            <div className="product-grid">
                {loading
                    ? <p>Loading...</p>
                    : products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
        </div>
    );
};

export default CategoryPage;
```

**Key design notes:**

- `useSearchParams` keeps filters in the URL (e.g. `?ram=8GB&network=5G`), so results are shareable and bookmarkable, and back/forward browser navigation works correctly.
- `withCredentials: true` ensures the `accessToken` cookie is sent with the request if an admin is logged in — this is what allows `optionalAuth` to detect them server-side.
- `ProductCard` should render only whatever fields are present in `product.pricing` — it should **never** assume `purchasePrice` exists, since it won't for customer-facing responses.

---

## 6. Adding a New Product Category — Checklist

1. Create the new Mongoose discriminator schema (e.g. `models/cable.model.js`).
2. Add it to `categoryModelMap` in `utils/productModelMap.js`.
3. Add its filterable fields to `filterConfig` in `utils/filterConfig.js`.
4. Add its filter option lists to `staticFilters` in `search.controller.js`.
5. No changes needed to: routes, `buildProductQuery`, `buildSortQuery`, `sanitizeProduct`, `optionalAuth`, or the frontend components — they are all category-agnostic by design.

---

## 7. Known Gaps / Future Work

- `getAvailableFilters` currently returns static enum values rather than deriving them from live inventory (`distinct()`); revisit if stale filter options (e.g. showing out-of-stock variants) becomes a problem.
- No full-text search relevance ranking — `search` param does a simple case-insensitive regex match on `name` only, not description or specs.
- No filter combination validation — e.g. nothing currently stops a request combining `category=charger` with `?ram=8GB`; it's just silently ignored rather than rejected, which is intentional but worth documenting for anyone extending this later.