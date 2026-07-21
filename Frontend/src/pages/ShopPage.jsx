// src/pages/ShopPage.jsx
//
// Redesign pass on top of the previous sticky-tabs / slide-over version.
// Everything about data flow (category/search/sort/page/brand live in the
// URL, buildProductQuery reads filters generically) is unchanged.
//
// Fixes in this pass:
// 1. Price preset chips simplified to plain pills (no punched-hole/
//    dashed-edge tag styling, no font-mono) — matches the rest of the UI
//    instead of reading as a foreign component.
// 2. Only the category tabs are sticky now. Brand strip, price strip, and
//    the filter/sort row scroll normally with the page — previously all
//    four rows were pinned together and ate most of the viewport.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/axios";
import DynamicFilterSidebar from "../components/filters/Dynamicfiltersidebar";
import ProductCard from "../components/ProductCard";
import Select from "../components/ui/Select";
import { CATEGORIES, sortOptions } from "../config/categoryfilterfields";

/* ---------------------------------------------------------------------- */
/* Icons                                                                   */
/* ---------------------------------------------------------------------- */

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
const IconChevronDown = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" {...props}>
    <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------------------------------------------------------------------- */
/* Price presets                                                          */
/* ---------------------------------------------------------------------- */
// Edit this list to move the whole ladder. Kept as flat numbers (not
// formatted strings) so min/max travel straight into the query params.
const PRICE_PRESETS = [
  { label: "8k–10k", min: 8000, max: 10000 },
  { label: "10k–12k", min: 10000, max: 12000 },
  { label: "12k–14k", min: 12000, max: 14000 },
  { label: "14k–16k", min: 14000, max: 16000 },
  { label: "16k–18k", min: 16000, max: 18000 },
  { label: "18k–20k", min: 18000, max: 20000 },
  { label: "20k–22k", min: 20000, max: 22000 },
  { label: "22k+", min: 22000, max: undefined },
];

const formatINR = (n) => `\u20B9${n.toLocaleString("en-IN")}`;

// A plain pill — coral fill/border when selected, otherwise neutral.
// Same font as the rest of the UI; no separate "price tag" visual gimmick.
const PricePresetChip = ({ preset, isSelected, onSelect }) => (
  <button
    onClick={() => onSelect(isSelected ? null : preset)}
    aria-pressed={isSelected}
    className={`shrink-0 px-3.5 py-1.5 rounded-full border text-[13px] font-medium transition-colors duration-150 whitespace-nowrap ${
      isSelected
        ? "bg-[#FF5630] border-[#FF5630] text-white"
        : "bg-white border-[#E5E7EA] text-[#4B4F57] hover:border-[#FF5630]/60 hover:text-[#14171C]"
    }`}
  >
    {preset.label}
  </button>
);

const PricePresetStrip = ({ selectedPreset, onSelect }) => (
  <div className="flex items-center gap-2 overflow-x-auto pb-1">
    {PRICE_PRESETS.map((p) => {
      const isSelected =
        selectedPreset && selectedPreset.min === p.min && selectedPreset.max === p.max;
      return <PricePresetChip key={p.label} preset={p} isSelected={isSelected} onSelect={onSelect} />;
    })}
  </div>
);

/* ---------------------------------------------------------------------- */
/* Skeletons                                                              */
/* ---------------------------------------------------------------------- */

const SkeletonCard = () => (
  <div>
    <div className="aspect-square rounded-2xl bg-[#F1F1EE] relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
    <div className="h-3.5 bg-[#F1F1EE] rounded mt-3 w-4/5 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
    <div className="h-3.5 bg-[#F1F1EE] rounded mt-2 w-2/5 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  </div>
);

const SkeletonBrandChip = () => (
  <div className="shrink-0 flex flex-col items-center gap-1.5 rounded-xl border border-[#E5E7EA] px-3 py-2 min-w-[76px] animate-pulse">
    <div className="w-9 h-9 rounded-full bg-[#F1F1EE]" />
    <div className="h-2.5 w-10 bg-[#F1F1EE] rounded" />
  </div>
);

const SkeletonPriceChip = () => (
  <div className="shrink-0 h-[30px] w-[80px] rounded-full border border-[#E5E7EA] bg-[#F6F7F3] animate-pulse" />
);

/* ---------------------------------------------------------------------- */
/* Brand strip                                                            */
/* ---------------------------------------------------------------------- */

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
            className={`shrink-0 flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2 min-w-[76px] transition-all duration-150 ${
              isSelected
                ? "border-[#2F5DFF] bg-[#EEF2FF] ring-1 ring-[#2F5DFF]/30"
                : "border-[#E5E7EA] bg-white hover:border-[#2F5DFF]/50"
            }`}
          >
            {b.sampleImage ? (
              <img
                src={b.sampleImage}
                alt={b.brand}
                className="w-9 h-9 rounded-full object-cover border border-[#E5E7EA]"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#F6F7F3] border border-[#E5E7EA] flex items-center justify-center text-[#9CA0A6]">
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

/* ---------------------------------------------------------------------- */
/* Section label — small caps eyebrow used above each sub-row             */
/* ---------------------------------------------------------------------- */

const SectionLabel = ({ children }) => (
  <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.08em] text-[#9CA0A6] px-1">
    {children}
  </span>
);

/* ---------------------------------------------------------------------- */
/* Page                                                                    */
/* ---------------------------------------------------------------------- */

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);

  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState("");

  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Number(searchParams.get("page")) || 1;
  const brand = searchParams.get("brand") || "";
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  const selectedPreset = useMemo(() => {
    if (!minPrice) return null;
    return (
      PRICE_PRESETS.find(
        (p) => String(p.min) === minPrice && String(p.max || "") === (maxPrice || "")
      ) || null
    );
  }, [minPrice, maxPrice]);

  // Everything in the URL except params with their own dedicated control.
  const filters = useMemo(() => {
    const obj = {};
    for (const [key, value] of searchParams.entries()) {
      if (!["category", "search", "sort", "page", "brand", "minPrice", "maxPrice"].includes(key)) {
        obj[key] = value;
      }
    }
    return obj;
  }, [searchParams]);

  const activeFilterCount =
    Object.keys(filters).length + (brand ? 1 : 0) + (minPrice ? 1 : 0);

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

  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileFiltersOpen]);

  const closeSheet = () => {
    setSheetClosing(true);
    setTimeout(() => {
      setMobileFiltersOpen(false);
      setSheetClosing(false);
    }, 180);
  };

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
    if (brand) next.set("brand", brand);
    if (minPrice) next.set("minPrice", minPrice);
    if (maxPrice) next.set("maxPrice", maxPrice);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") next.set(key, value);
    });
    setSearchParams(next);
  };

  const handleBrandSelect = (brandName) => {
    updateParams({ brand: brandName });
  };

  const handlePricePresetSelect = (preset) => {
    if (!preset) {
      updateParams({ minPrice: null, maxPrice: null });
      return;
    }
    updateParams({ minPrice: String(preset.min), maxPrice: preset.max ? String(preset.max) : null });
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (category) next.set("category", category);
    if (search) next.set("search", search);
    setSearchParams(next);
  };

  const activeCategory = CATEGORIES.find((c) => c.key === category);

  const priceChipLabel = selectedPreset
    ? selectedPreset.max
      ? `${formatINR(selectedPreset.min)}\u2013${formatINR(selectedPreset.max)}`
      : `${formatINR(selectedPreset.min)}+`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8">
      <style>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes sheetDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .card-in { animation: fadeInUp 0.35s ease both; }
      `}</style>

      {/* Header */}
      <div className="mb-5 md:mb-6">
        <h1 className="font-display text-[20px] sm:text-[24px] font-semibold text-[#14171C] tracking-tight">
          {search ? `Results for "${search}"` : activeCategory ? activeCategory.label : "All products"}
          {brand ? ` \u00B7 ${brand}` : ""}
        </h1>
        <p className="text-[13.5px] text-[#4B4F57] mt-1">
          {loading ? "Searching\u2026" : `${pagination.total} product${pagination.total === 1 ? "" : "s"}`}
        </p>
      </div>

      {/* Sticky bar — category tabs ONLY. Everything else below scrolls normally
          so it doesn't eat the viewport once a category is selected. */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 md:-mx-10 px-4 sm:px-6 md:px-10 bg-white/80 backdrop-blur-md border-b border-[#E5E7EA] supports-[backdrop-filter]:bg-white/70">
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
      </div>

      {/* Non-sticky: brand strip, price strip, filter/sort row */}
      {category && (
        <>
          <div className="pt-3 pb-2.5">
            <SectionLabel>Brands</SectionLabel>
            <div className="mt-1.5">
              <BrandStrip
                brands={brands}
                loading={brandsLoading}
                error={brandsError}
                selectedBrand={brand}
                onSelect={handleBrandSelect}
              />
            </div>
          </div>

          <div className="pb-3">
            <div className="flex items-center justify-between px-1">
              <SectionLabel>Price</SectionLabel>
              {selectedPreset && (
                <button
                  onClick={() => handlePricePresetSelect(null)}
                  className="text-[11px] font-medium text-[#FF5630] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="mt-1.5">
              {brandsLoading ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonPriceChip key={i} />
                  ))}
                </div>
              ) : (
                <PricePresetStrip selectedPreset={selectedPreset} onSelect={handlePricePresetSelect} />
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-2 pb-3 pt-1">
        {category ? (
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EA] text-[13px] font-medium text-[#14171C] px-4 py-2 hover:border-[#14171C] bg-white shadow-sm"
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

        <Select value={sort} onChange={(v) => updateParams({ sort: v }, { resetPage: false })} options={sortOptions} />
      </div>

      <div className="flex flex-col lg:flex-row gap-8 pt-2 md:pt-3">
        {/* Desktop sidebar */}
        {category && (
          <div className="hidden lg:block w-64 shrink-0">
            <DynamicFilterSidebar category={category} filters={filters} onFilterChange={handleFilterChange} />
          </div>
        )}

        {/* Mobile bottom sheet */}
        {category && mobileFiltersOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end">
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${sheetClosing ? "opacity-0" : "opacity-100"}`}
              onClick={closeSheet}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              className="relative w-full max-h-[85vh] bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
              style={{ animation: `${sheetClosing ? "sheetDown" : "sheetUp"} 0.22s cubic-bezier(0.32,0.72,0,1) both` }}
            >
              <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-9 h-1 rounded-full bg-[#E5E7EA]" />
              </div>
              <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-[#E5E7EA] shrink-0">
                <h2 className="font-display text-[15px] font-semibold text-[#14171C]">
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 text-[12px] font-mono text-[#9CA0A6]">({activeFilterCount})</span>
                  )}
                </h2>
                <button onClick={closeSheet} className="p-1.5 rounded-full text-[#4B4F57] hover:bg-[#F6F7F3]" aria-label="Close filters">
                  <IconClose />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4 flex-1">
                <SectionLabel>Price</SectionLabel>
                <div className="mt-2 mb-5">
                  <PricePresetStrip selectedPreset={selectedPreset} onSelect={handlePricePresetSelect} />
                </div>
                <DynamicFilterSidebar category={category} filters={filters} onFilterChange={handleFilterChange} />
              </div>
              <div className="px-5 py-4 border-t border-[#E5E7EA] shrink-0 bg-white">
                <button
                  onClick={closeSheet}
                  className="w-full rounded-full bg-[#14171C] text-white text-[14px] font-medium py-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  Show {pagination.total} result{pagination.total === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          </div>
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
                  <button onClick={() => handleBrandSelect("")} aria-label="Clear brand filter" className="rounded-full hover:bg-white/20 w-4 h-4 flex items-center justify-center">
                    <IconClose width="9" height="9" />
                  </button>
                </span>
              )}
              {priceChipLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5630] text-white text-[12px] font-medium pl-3 pr-1.5 py-1">
                  {priceChipLabel}
                  <button onClick={() => handlePricePresetSelect(null)} aria-label="Clear price filter" className="rounded-full hover:bg-white/20 w-4 h-4 flex items-center justify-center">
                    <IconClose width="9" height="9" />
                  </button>
                </span>
              )}
              <button onClick={clearFilters} className="text-[12.5px] font-medium text-[#2F5DFF] hover:underline">
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
            <div className="rounded-xl bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">{error}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-[#F6F7F3] border border-[#E5E7EA] flex items-center justify-center mx-auto mb-4 text-[#9CA0A6]">
                <IconFilter />
              </div>
              <p className="text-[14px] font-medium text-[#14171C]">No products match these filters.</p>
              <p className="text-[13px] text-[#9CA0A6] mt-1">Try widening your search or clearing a filter.</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="mt-4 rounded-full border border-[#E5E7EA] text-[13px] font-medium text-[#14171C] px-4 py-2 hover:border-[#14171C]">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p, i) => (
                <div key={p._id} className="card-in" style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
                  <ProductCard product={p} />
                </div>
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