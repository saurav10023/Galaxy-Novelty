// src/pages/ShopPage.jsx
//
// One page, four category experiences. `category` lives in the URL
// (?category=mobile) so navbar links, back/forward nav, and sharing/
// bookmarking a filtered search all work.
//
// UX pass: the category tabs + sort bar are sticky so they stay reachable
// while scrolling a long result grid; the filter sidebar moves into a
// slide-over drawer below `lg` instead of stacking above the grid and
// pushing every product down a screen's worth on mobile; loading shows
// skeleton cards shaped like real results instead of a bare "Loading…"
// line; and the empty state offers a one-tap way to clear filters instead
// of just reporting the dead end.
//
// NEW: a "Brands" segment strip under the category tabs. Selecting a
// category fetches GET /api/v1/products/brands?category=... (distinct
// brand names + counts + a sample image, powered by search.controller.js's
// getBrandsByCategory) and shows them as tappable chips. Tapping a brand
// writes `brand` into the URL -- same lane as `category`/`search`/`sort` --
// so it's shareable/bookmarkable and survives filter/sort changes, and
// buildProductQuery picks it up automatically on the next /search call.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/axios";
import DynamicFilterSidebar from "../components/filters/Dynamicfiltersidebar";
import ProductCard from "../components/ProductCard";
import Select from "../components/ui/Select";
import { CATEGORIES, sortOptions } from "../config/categoryfilterfields";

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
const IconTag = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="15" height="15" {...props}>
    <path d="M11 3H4v7l9 9 7-7-9-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="7.3" cy="6.7" r="1.1" fill="currentColor" />
  </svg>
);

const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="aspect-square rounded-xl bg-[#F1F1EE]" />
    <div className="h-3.5 bg-[#F1F1EE] rounded mt-3 w-4/5" />
    <div className="h-3.5 bg-[#F1F1EE] rounded mt-2 w-2/5" />
  </div>
);

// Skeleton chip shown while brands are loading -- shaped like the real
// chip so the strip doesn't jump when data arrives.
const SkeletonBrandChip = () => (
  <div className="shrink-0 flex flex-col items-center gap-1.5 rounded-lg border border-[#E1E3DD] px-3 py-2 min-w-[76px] animate-pulse">
    <div className="w-9 h-9 rounded-full bg-[#F1F1EE]" />
    <div className="h-2.5 w-10 bg-[#F1F1EE] rounded" />
  </div>
);

// Horizontal, tappable brand segment strip. Pure presentational --
// data + handlers come from the parent.
const BrandStrip = ({ brands, loading, error, selectedBrand, onSelect }) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBrandChip key={i} />
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="text-[13px] text-[#C0402E] px-1 py-1">{error}</p>;
  }
  if (brands.length === 0) {
    return <p className="text-[13px] text-[#9CA0A6] px-1 py-1">No brands available in this category yet.</p>;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {brands.map((b) => {
        const isSelected = selectedBrand === b.brand;
        return (
          <button
            key={b.brand}
            onClick={() => onSelect(isSelected ? "" : b.brand)}
            aria-pressed={isSelected}
            className={`shrink-0 flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2 min-w-[76px] transition-colors duration-150 ${
              isSelected
                ? "border-[#2F5DFF] bg-[#EEF2FF]"
                : "border-[#E1E3DD] bg-white hover:border-[#2F5DFF]"
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

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // -- brands feature state --------------------------------------------
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState("");

  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Number(searchParams.get("page")) || 1;
  const brand = searchParams.get("brand") || ""; // new -- same lane as category/search/sort

  // Everything in the URL except the pagination/sort/search/brand params
  // that get their own dedicated controls -- this is what the sidebar edits.
  const filters = useMemo(() => {
    const obj = {};
    for (const [key, value] of searchParams.entries()) {
      if (!["category", "search", "sort", "page", "brand"].includes(key)) obj[key] = value;
    }
    return obj;
  }, [searchParams]);

  const activeFilterCount = Object.keys(filters).length + (brand ? 1 : 0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(searchParams.entries());
      const res = await API.get("/api/v1/products/search", {
        params: { ...params, limit: 20 },
        withCredentials: true,
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

  // -- brands: fetch fresh whenever category changes --------------------
  // Unlike the admin panel (click-to-expand), the shop shows the strip
  // by default whenever a category is selected, so it fetches eagerly.
  const fetchBrands = useCallback(async () => {
    if (!category) {
      setBrands([]);
      return;
    }
    setBrandsLoading(true);
    setBrandsError("");
    try {
      const res = await API.get("/api/v1/products/brands", {
        params: { category },
        withCredentials: true,
      });
      setBrands(res.data.data);
    } catch (err) {
      setBrandsError(err.response?.data?.message || "Failed to load brands.");
    } finally {
      setBrandsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

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
    setMobileFiltersOpen(false);
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

  const handleBrandSelect = (brandName) => {
    updateParams({ brand: brandName });
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (category) next.set("category", category);
    if (search) next.set("search", search);
    setSearchParams(next);
  };

  const activeCategory = CATEGORIES.find((c) => c.key === category);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <h1 className="font-display text-[20px] sm:text-[24px] font-semibold text-[#14171C] tracking-tight">
          {search ? `Results for "${search}"` : activeCategory ? activeCategory.label : "All products"}
          {brand ? ` · ${brand}` : ""}
        </h1>
        <p className="text-[13.5px] text-[#4B4F57] mt-1">
          {loading ? "Searching…" : `${pagination.total} product${pagination.total === 1 ? "" : "s"}`}
        </p>
      </div>

      {/* Sticky control bar: category tabs + sort + (mobile) filters trigger.
          Stays reachable while scrolling a long grid. If this page sits
          under a fixed site navbar, add that navbar's height as `top-*`
          instead of `top-0`. */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 md:-mx-10 px-4 sm:px-6 md:px-10 bg-[#FBFBF9]/95 backdrop-blur border-b border-[#E1E3DD]">
        <div className="flex items-center gap-2 py-3 overflow-x-auto whitespace-nowrap sm:flex-wrap">
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

        {/* Brand segment strip -- only when a specific category is selected.
            Sits inside the sticky bar, right under the category tabs, so it
            reads as "brands within this category" rather than a separate
            filter. */}
        {category && (
          <div className="pb-3">
            <BrandStrip
              brands={brands}
              loading={brandsLoading}
              error={brandsError}
              selectedBrand={brand}
              onSelect={handleBrandSelect}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pb-3">
          {category ? (
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-[#E1E3DD] text-[13px] font-medium text-[#14171C] px-3.5 py-2 hover:border-[#2F5DFF] bg-white"
            >
              <IconFilter />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#2F5DFF] text-white text-[10.5px] font-mono">
                  {activeFilterCount}
                </span>
              )}
            </button>
          ) : (
            <span />
          )}

          <Select
            value={sort}
            onChange={(v) => updateParams({ sort: v }, { resetPage: false })}
            options={sortOptions}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 pt-5 md:pt-6">
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
                  <DynamicFilterSidebar category={category} filters={filters} onFilterChange={handleFilterChange} />
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="mt-5 w-full rounded-full bg-[#14171C] text-white text-[14px] font-medium py-2.5"
                  >
                    Show {pagination.total} result{pagination.total === 1 ? "" : "s"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-[12.5px] text-[#9CA0A6]">
                {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} applied
              </span>
              {brand && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#14171C] text-white text-[12px] font-medium pl-3 pr-1.5 py-1">
                  {brand}
                  <button
                    onClick={() => handleBrandSelect("")}
                    aria-label="Clear brand filter"
                    className="rounded-full hover:bg-white/20 w-4 h-4 flex items-center justify-center"
                  >
                    <IconClose width="9" height="9" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-[12.5px] font-medium text-[#2F5DFF] hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
              {error}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[14px] font-medium text-[#14171C]">No products match these filters.</p>
              <p className="text-[13px] text-[#9CA0A6] mt-1">Try widening your search or clearing a filter.</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 rounded-full border border-[#E1E3DD] text-[13px] font-medium text-[#14171C] px-4 py-2 hover:border-[#14171C]"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
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

export default ShopPage;