// pages/admin/AdminProductsList.jsx
//
// Same URL-driven filtering pattern as the public ShopPage: `category`,
// `search`, `sort`, `page`, `brand`, and any category-specific filter all
// live in the URL, so a filtered admin view is shareable/bookmarkable and
// survives a refresh. The DynamicFilterSidebar + categoryFilterFields config
// are reused as-is from the shop -- same filter fields per category, just
// pointed at the admin search endpoint.
//
// NEW: "Brands" toggle next to the category tabs. When a category is
// selected, tapping it fetches GET /admin/brands?category=... (distinct
// brand names + counts + a sample image, powered by search.controller.js's
// getBrandsByCategory) and renders them as a horizontal chip strip. Tapping
// a brand chip writes `brand` into the URL, same lane as `category`/`search`/
// `sort` -- it survives sidebar filter changes and page navigation, and gets
// picked up automatically by buildProductQuery on the next /admin/search call.
//
// Layout: >=1024px (lg) shows the classic table with the filter sidebar
// pinned alongside it. Below that -- tablet and mobile -- every attribute
// still needs to be legible, so results render as a card grid (2 columns
// on tablet, 1 on phone) with each field as its own labeled row, and the
// filter sidebar moves into a slide-over drawer instead of shoving the
// results down the page.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../../api/axios";
import DynamicFilterSidebar from "../../components/filters/Dynamicfiltersidebar";
import Select from "../../components/ui/Select";
import { CATEGORIES, sortOptions } from "../../config/categoryfilterfields";

// -- tiny inline icons, kept dependency-free on purpose --------------------
const IconEdit = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="15" height="15" {...props}>
    <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
const IconPower = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="15" height="15" {...props}>
    <path d="M10 3v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M6 5.5a6 6 0 1 0 8 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconTrash = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="15" height="15" {...props}>
    <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6.5 0 .6 9.4A1.5 1.5 0 0 0 7.6 17h4.8a1.5 1.5 0 0 0 1.5-1.6L14.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconFilter = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="15" height="15" {...props}>
    <path d="M3 4.5h14M6 10h8M8.5 15.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconClose = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" {...props}>
    <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconChevronDown = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="13" height="13" {...props}>
    <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconTag = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="15" height="15" {...props}>
    <path d="M11 3H4v7l9 9 7-7-9-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="7.3" cy="6.7" r="1.1" fill="currentColor" />
  </svg>
);

// Row of admin actions shared by the table and the card layout.
const AdminActions = ({ product, onEdit, onToggleStatus, onDelete, fullWidth }) => (
  <div className={`flex items-center gap-1.5 ${fullWidth ? "w-full" : "justify-end"}`}>
    <button
      onClick={() => onEdit(product._id)}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[#E1E3DD] text-[12.5px] font-medium text-[#2F5DFF] px-2.5 py-1.5 hover:border-[#2F5DFF] hover:bg-[#EEF2FF] transition-colors duration-150 ${fullWidth ? "flex-1 justify-center" : ""}`}
    >
      <IconEdit /> Edit
    </button>
    <button
      onClick={() => onToggleStatus(product._id)}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[#E1E3DD] text-[12.5px] font-medium text-[#4B4F57] px-2.5 py-1.5 hover:border-[#14171C] hover:text-[#14171C] transition-colors duration-150 ${fullWidth ? "flex-1 justify-center" : ""}`}
    >
      <IconPower /> {product.isActive ? "Deactivate" : "Activate"}
    </button>
    <button
      onClick={() => onDelete(product._id, product.name)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#F2C6BD] text-[12.5px] font-medium text-[#C0402E] px-2.5 py-1.5 hover:bg-[#FBEAE7] transition-colors duration-150"
    >
      <IconTrash />
    </button>
  </div>
);

// One product, laid out as label/value rows -- used for tablet (2-col grid)
// and mobile (1-col stack) so every attribute stays fully legible instead
// of being squeezed into table cells.
const ProductCard = ({ product: p, onEdit, onToggleStatus, onDelete }) => (
  <div className="border border-[#E1E3DD] rounded-xl bg-white p-4 flex flex-col gap-3">
    <div className="flex items-start gap-3">
      {p.images?.[0]?.url ? (
        <img
          src={p.images[0].url}
          alt={p.name}
          className="w-14 h-14 rounded-lg object-cover border border-[#E1E3DD] shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-[#F6F7F3] border border-[#E1E3DD] shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[14.5px] text-[#14171C] leading-snug break-words">{p.name}</p>
        <p className="text-[12.5px] text-[#9CA0A6] mt-0.5">{p.brand}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="capitalize text-[11px] font-mono text-[#4B4F57] bg-[#F6F7F3] rounded-full px-2 py-0.5">
            {p.category}
          </span>
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
              p.isActive ? "bg-[#E6F4EA] text-[#1E7B3B]" : "bg-[#F1F1EE] text-[#4B4F57]"
            }`}
          >
            {p.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </div>

    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px] border-t border-[#E1E3DD] pt-3">
      <div>
        <dt className="text-[11px] uppercase tracking-wide text-[#9CA0A6] font-mono">Selling price</dt>
        <dd className="font-mono text-[#14171C] mt-0.5">₹{p.pricing?.sellingPrice ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-[11px] uppercase tracking-wide text-[#9CA0A6] font-mono">Purchase price</dt>
        <dd className="font-mono text-[#4B4F57] mt-0.5">
          {p.pricing?.purchasePrice !== undefined ? `₹${p.pricing.purchasePrice}` : "—"}
        </dd>
      </div>
      <div>
        <dt className="text-[11px] uppercase tracking-wide text-[#9CA0A6] font-mono">Negotiation</dt>
        <dd className="font-mono text-[#4B4F57] mt-0.5">
          {p.pricing?.negotiation
            ? `₹${p.pricing.negotiation.minPrice ?? "—"} – ₹${p.pricing.negotiation.maxPrice ?? "—"}`
            : "—"}
        </dd>
      </div>
      <div>
        <dt className="text-[11px] uppercase tracking-wide text-[#9CA0A6] font-mono">Stock</dt>
        <dd className="font-mono text-[#14171C] mt-0.5">{p.stock}</dd>
      </div>
    </dl>

    <div className="border-t border-[#E1E3DD] pt-3">
      <AdminActions product={p} onEdit={onEdit} onToggleStatus={onToggleStatus} onDelete={onDelete} fullWidth />
    </div>
  </div>
);

// Horizontal brand chip strip. Shown/hidden by the "Brands" toggle button.
// Pure presentational -- all data + handlers come from the parent so the
// fetch-once-per-category caching lives in one place.
const BrandStrip = ({ brands, loading, error, selectedBrand, onSelect }) => {
  if (loading) {
    return <p className="text-[13px] text-[#4B4F57] px-1 py-1">Loading brands…</p>;
  }
  if (error) {
    return <p className="text-[13px] text-[#C0402E] px-1 py-1">{error}</p>;
  }
  if (brands.length === 0) {
    return <p className="text-[13px] text-[#4B4F57] px-1 py-1">No brands found in this category.</p>;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {brands.map((b) => {
        const isSelected = selectedBrand === b.brand;
        return (
          <button
            key={b.brand}
            onClick={() => onSelect(b.brand)}
            className={`shrink-0 flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2 min-w-[76px] transition-colors duration-150 ${
              isSelected
                ? "border-[#2F5DFF] bg-[#EEF2FF]"
                : "border-[#E1E3DD] hover:border-[#2F5DFF]"
            }`}
          >
            {b.sampleImage ? (
              <img
                src={b.sampleImage}
                alt={b.brand}
                className="w-9 h-9 rounded-full object-cover border border-[#E1E3DD]"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#F6F7F3] border border-[#E1E3DD] flex items-center justify-center text-[#9CA0A6]">
                <IconTag />
              </div>
            )}
            <span className="text-[11.5px] font-medium text-[#14171C] truncate max-w-[70px]" title={b.brand}>
              {b.brand}
            </span>
            <span className="text-[10px] font-mono text-[#9CA0A6]">{b.productCount}</span>
          </button>
        );
      })}
    </div>
  );
};

const AdminProductsList = ({ onEdit, onAddNew }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // -- brands feature state --------------------------------------------
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState("");
  const [showBrands, setShowBrands] = useState(false);

  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Number(searchParams.get("page")) || 1;
  const brand = searchParams.get("brand") || ""; // new -- same lane as category/search/sort

  // Local, uncommitted copy of the search box -- only written to the URL
  // (and therefore only triggers a fetch) on submit.
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  // Everything in the URL except the params that get their own dedicated
  // controls -- this is what the sidebar edits.
  const filters = useMemo(() => {
    const obj = {};
    for (const [key, value] of searchParams.entries()) {
      if (!["category", "search", "sort", "page", "brand"].includes(key)) obj[key] = value;
    }
    return obj;
  }, [searchParams]);

  const activeFilterCount = Object.keys(filters).length;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(searchParams.entries());
      const res = await API.get("/api/v1/products/admin/search", {
        params: { ...params, limit: 20 },
      });
      setProducts(res.data.data.products);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // -- brands: fetch + reset on category change -------------------------
  const fetchBrands = useCallback(async () => {
    if (!category) return;
    setBrandsLoading(true);
    setBrandsError("");
    try {
      const res = await API.get("/api/v1/products/admin/brands", {
        params: { category },
      });
      setBrands(res.data.data);
    } catch (err) {
      setBrandsError(err.response?.data?.message || "Failed to load brands.");
    } finally {
      setBrandsLoading(false);
    }
  }, [category]);

  // Switching category invalidates the cached brand list -- collapse the
  // panel and clear stale brands so a re-open always fetches fresh data
  // for the new category.
  useEffect(() => {
    setShowBrands(false);
    setBrands([]);
  }, [category]);

  const handleToggleBrands = () => {
    const next = !showBrands;
    setShowBrands(next);
    if (next && brands.length === 0) fetchBrands();
  };

  const handleBrandSelect = (brandName) => {
    updateParams({ brand: brandName });
    setShowBrands(false);
  };

  const handleClearBrand = () => {
    updateParams({ brand: undefined });
  };

  // Lock body scroll while the mobile filter drawer is open.
  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileFiltersOpen]);

  const updateParams = (updates, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    if (resetPage) next.delete("page");
    setSearchParams(next);
  };

  const handleCategoryChange = (newCategory) => {
    // switching category invalidates every category-specific filter,
    // and the previously selected brand (brands don't cross categories)
    const next = new URLSearchParams();
    if (newCategory) next.set("category", newCategory);
    if (search) next.set("search", search);
    if (sort !== "newest") next.set("sort", sort);
    setSearchParams(next);
  };

  const handleFilterChange = (newFilters) => {
    const next = new URLSearchParams();
    if (category) next.set("category", category);
    if (search) next.set("search", search);
    if (sort !== "newest") next.set("sort", sort);
    if (brand) next.set("brand", brand); // preserve brand across sidebar filter changes
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") next.set(key, value);
    });
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ search: searchInput });
  };

  const handleToggleStatus = async (id) => {
    setActionError("");
    try {
      await API.patch(`/api/v1/products/${id}/toggle-status`);
      setProducts((prev) =>
        prev.map((p) => (p._id === id ? { ...p, isActive: !p.isActive } : p))
      );
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to toggle status.");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This also removes its images from storage. This cannot be undone.`)) {
      return;
    }
    setActionError("");
    try {
      await API.delete(`/api/v1/products/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to delete product.");
    }
  };

  const activeCategory = CATEGORIES.find((c) => c.key === category);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-[20px] sm:text-[22px] font-semibold text-[#14171C] tracking-tight">
            Inventory
          </h1>
          <p className="text-[13.5px] text-[#4B4F57] mt-1">
            {search ? `Results for "${search}" — ` : activeCategory ? `${activeCategory.label} — ` : ""}
            {brand ? `${brand} — ` : ""}
            {pagination.total} product{pagination.total === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={onAddNew}
          className="rounded-full bg-[#14171C] text-white text-[14px] font-medium px-5 py-2.5 hover:bg-[#2F5DFF] transition-colors duration-150 w-full sm:w-auto"
        >
          + Add product
        </button>
      </div>

      {/* Category tabs -- horizontally scrollable on narrow screens */}
      <div className="flex items-center gap-2 mb-5 border-b border-[#E1E3DD] pb-4 overflow-x-auto whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button
          onClick={() => handleCategoryChange("")}
          className={`shrink-0 px-3.5 py-2 rounded-full text-[13.5px] font-medium transition-colors duration-150 ${
            !category ? "bg-[#14171C] text-white" : "text-[#4B4F57] hover:bg-[#F6F7F3]"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => handleCategoryChange(c.key)}
            className={`shrink-0 px-3.5 py-2 rounded-full text-[13.5px] font-medium transition-colors duration-150 ${
              category === c.key ? "bg-[#14171C] text-white" : "text-[#4B4F57] hover:bg-[#F6F7F3]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Brands toggle + chip strip -- only when a specific category is active */}
      {category && (
        <div className="mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggleBrands}
              aria-expanded={showBrands}
              className={`inline-flex items-center gap-1.5 rounded-full border text-[13px] font-medium px-3.5 py-2 transition-colors duration-150 ${
                showBrands
                  ? "border-[#2F5DFF] text-[#2F5DFF] bg-[#EEF2FF]"
                  : "border-[#E1E3DD] text-[#14171C] hover:border-[#2F5DFF]"
              }`}
            >
              <IconTag />
              Brands
              <IconChevronDown className={`transition-transform duration-150 ${showBrands ? "rotate-180" : ""}`} />
            </button>

            {brand && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#14171C] text-white text-[12.5px] font-medium pl-3 pr-1.5 py-1.5">
                {brand}
                <button
                  onClick={handleClearBrand}
                  aria-label="Clear brand filter"
                  className="rounded-full hover:bg-white/20 w-4 h-4 flex items-center justify-center"
                >
                  <IconClose width="10" height="10" />
                </button>
              </span>
            )}
          </div>

          {showBrands && (
            <div className="mt-3 border border-[#E1E3DD] rounded-xl bg-white p-3">
              <BrandStrip
                brands={brands}
                loading={brandsLoading}
                error={brandsError}
                selectedBrand={brand}
                onSelect={handleBrandSelect}
              />
            </div>
          )}
        </div>
      )}

      {/* Search + sort + (mobile) filters trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name…"
            className="font-mono text-[13px] bg-white border border-[#E1E3DD] rounded-lg px-3.5 py-2 flex-1 sm:w-56 text-[#14171C] placeholder:text-[#9CA0A6] focus:outline-none focus:border-[#2F5DFF]"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-[#E1E3DD] text-[13px] font-medium text-[#4B4F57] px-3.5 py-2 hover:border-[#14171C] hover:text-[#14171C]"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          {category && (
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-[#E1E3DD] text-[13px] font-medium text-[#14171C] px-3.5 py-2 hover:border-[#2F5DFF]"
            >
              <IconFilter />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#2F5DFF] text-white text-[10.5px] font-mono">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
          <Select
            value={sort}
            onChange={(v) => updateParams({ sort: v }, { resetPage: false })}
            options={sortOptions}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar -- inline on desktop, slide-over drawer below lg */}
        {category && (
          <>
            <div className="hidden lg:block w-64 shrink-0">
              <DynamicFilterSidebar category={category} filters={filters} onFilterChange={handleFilterChange} />
            </div>

            {mobileFiltersOpen && (
              <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
                <div
                  className="absolute inset-0 bg-black/30"
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-hidden="true"
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Filters"
                  className="relative w-[85%] max-w-xs h-full bg-white shadow-xl overflow-y-auto p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-[15px] font-semibold text-[#14171C]">Filters</h2>
                    <button
                      onClick={() => setMobileFiltersOpen(false)}
                      className="p-1.5 rounded-lg text-[#4B4F57] hover:bg-[#F6F7F3]"
                      aria-label="Close filters"
                    >
                      <IconClose />
                    </button>
                  </div>
                  <DynamicFilterSidebar
                    category={category}
                    filters={filters}
                    onFilterChange={(f) => {
                      handleFilterChange(f);
                    }}
                  />
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="mt-5 w-full rounded-full bg-[#14171C] text-white text-[14px] font-medium py-2.5"
                  >
                    Show results
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {actionError && (
            <div className="mb-4 rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
              {actionError}
            </div>
          )}

          {loading ? (
            <p className="text-[13.5px] text-[#4B4F57]">Loading…</p>
          ) : error ? (
            <div className="rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
              {error}
            </div>
          ) : products.length === 0 ? (
            <p className="text-[13.5px] text-[#4B4F57]">No products match these filters.</p>
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden lg:block border border-[#E1E3DD] rounded-xl overflow-hidden bg-white overflow-x-auto">
                <table className="w-full text-[13.5px]">
                  <thead>
                    <tr className="bg-[#F6F7F3] text-left font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6]">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Selling price</th>
                      <th className="px-4 py-3">Purchase price</th>
                      <th className="px-4 py-3">Negotiation</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p._id} className="border-t border-[#E1E3DD]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.images?.[0]?.url && (
                              <img
                                src={p.images[0].url}
                                alt={p.name}
                                className="w-9 h-9 rounded-md object-cover border border-[#E1E3DD]"
                              />
                            )}
                            <div>
                              <p className="font-medium text-[#14171C]">{p.name}</p>
                              <p className="text-[12px] text-[#9CA0A6]">{p.brand}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">{p.category}</td>
                        <td className="px-4 py-3 font-mono">₹{p.pricing?.sellingPrice}</td>
                        <td className="px-4 py-3 font-mono text-[#9CA0A6]">
                          {p.pricing?.purchasePrice !== undefined ? `₹${p.pricing.purchasePrice}` : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px]">
                          {p.pricing?.negotiation ? (
                            <div className="flex flex-col">
                              <span>₹{p.pricing.negotiation.minPrice ?? "—"}</span>
                              <span className="text-[#9CA0A6]">to ₹{p.pricing.negotiation.maxPrice ?? "—"}</span>
                            </div>
                          ) : (
                            <span className="text-[#9CA0A6]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{p.stock}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${
                              p.isActive
                                ? "bg-[#E6F4EA] text-[#1E7B3B]"
                                : "bg-[#F1F1EE] text-[#4B4F57]"
                            }`}
                          >
                            {p.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <AdminActions
                            product={p}
                            onEdit={onEdit}
                            onToggleStatus={handleToggleStatus}
                            onDelete={handleDelete}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tablet + mobile: card grid (1 col phone, 2 col tablet) */}
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((p) => (
                  <ProductCard
                    key={p._id}
                    product={p}
                    onEdit={onEdit}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6 md:mt-8">
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) }, { resetPage: false })}
                className="text-[13px] font-medium text-[#4B4F57] disabled:opacity-40 hover:text-[#14171C]"
              >
                Previous
              </button>
              <span className="text-[13px] text-[#9CA0A6]">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => updateParams({ page: String(page + 1) }, { resetPage: false })}
                className="text-[13px] font-medium text-[#4B4F57] disabled:opacity-40 hover:text-[#14171C]"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProductsList;