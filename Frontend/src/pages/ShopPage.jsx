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

const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="aspect-square rounded-xl bg-[#F1F1EE]" />
    <div className="h-3.5 bg-[#F1F1EE] rounded mt-3 w-4/5" />
    <div className="h-3.5 bg-[#F1F1EE] rounded mt-2 w-2/5" />
  </div>
);

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Number(searchParams.get("page")) || 1;

  // Everything in the URL except the pagination/sort/search params that get
  // their own dedicated controls -- this is what the sidebar edits.
  const filters = useMemo(() => {
    const obj = {};
    for (const [key, value] of searchParams.entries()) {
      if (!["category", "search", "sort", "page"].includes(key)) obj[key] = value;
    }
    return obj;
  }, [searchParams]);

  const activeFilterCount = Object.keys(filters).length;

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
    // switching category invalidates every category-specific filter
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
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") next.set(key, value);
    });
    setSearchParams(next);
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
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[12.5px] text-[#9CA0A6]">
                {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} applied
              </span>
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