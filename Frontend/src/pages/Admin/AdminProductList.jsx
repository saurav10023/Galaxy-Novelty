// src/pages/ShopPage.jsx
//
// Redesign pass on top of the previous sticky-tabs / slide-over version.
// Everything about data flow (category/search/sort/page/brand live in the
// URL, buildProductQuery reads filters generically) is unchanged.
//
// THIS PASS:
// 1. Search bar added. The URL already carried a `search` param and the
//    header already displayed `Results for "..."`, but there was no actual
//    input anywhere to set it -- the only way in was editing the URL by
//    hand. There's now a real search box (icon + clear button), shown on
//    every screen size, right under the sticky category tabs.
// 2. Desktop filter sidebar rebuilt. The column was there
//    (`hidden lg:block w-64`) but rendered as a bare, unstyled
//    `DynamicFilterSidebar` with no card, no heading, and no sticky
//    behavior -- easy to miss entirely next to the glass panels used
//    everywhere else on the page, and it scrolled away with the results on
//    a long list. It's now a proper glass card with a header (Filters +
//    active category + count), its own scroll region, a sticky position
//    under the sticky tabs bar, and a "Clear all filters" footer that only
//    appears once something is actually active.
// 3. Mobile bottom sheet gets the same "Clear all" affordance the desktop
//    sidebar has, plus the search box lives outside the sheet (it's always
//    visible) so search and filters are two clearly separate actions.
//
// Everything from the previous visual pass (price ladders, sticky tabs
// only, brand/price strips, skeletons, chips, empty/error states,
// pagination) is unchanged.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../../api/axios"
import DynamicFilterSidebar from "../../components/filters/Dynamicfiltersidebar";
import ProductCard from "../../components/ProductCard";
import Select from "../../components/ui/Select";
import { CATEGORIES, sortOptions } from "../../config/categoryfilterfields";

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
const IconSearch = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="15" height="15" {...props}>
    <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M16 16l-3.4-3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/* ---------------------------------------------------------------------- */
/* Price presets                                                          */
/* ---------------------------------------------------------------------- */
// Two ladders. Which one shows up is decided by getPricePresets() below,
// keyed off the active category. Edit either list to move its ladder, or
// add more category keys to BUDGET_CATEGORY_MATCHERS to route them onto
// the budget ladder instead of the phone one.

const formatINR = (n) => `\u20B9${n.toLocaleString("en-IN")}`;

// Default sort — price low to high. Rather than hardcoding a guessed value
// string, this looks through the real sortOptions (from
// categoryfilterfields.js) for the low-to-high entry, matching on label
// text ("low"..."high") or common value spellings (price_asc, price-asc,
// priceAsc, asc). Falls back to "price_asc" only if nothing matches, so if
// sortOptions doesn't have a low-to-high entry at all this won't silently
// select the wrong thing without a console warning.
const findLowToHighSortValue = (options) => {
  if (!Array.isArray(options)) return null;
  const match = options.find((o) => {
    const label = String(o.label || "").toLowerCase();
    const value = String(o.value || "").toLowerCase();
    if (label.includes("low") && label.includes("high")) return true;
    if (value.replace(/[-_\s]/g, "").includes("priceasc")) return true;
    if (value.includes("price") && value.includes("asc")) return true;
    return false;
  });
  return match ? match.value : null;
};

const DEFAULT_SORT = findLowToHighSortValue(sortOptions) || "price_asc";
if (!findLowToHighSortValue(sortOptions)) {
  // eslint-disable-next-line no-console
  console.warn(
    "[ShopPage] Couldn't find a low-to-high option in sortOptions — defaulting to \"price_asc\". Check the value string in categoryfilterfields.js."
  );
}

// Phones (and anything not matched below) — original ladder, unchanged.
const PHONE_PRICE_PRESETS = [
  { label: "8k–10k", min: 8000, max: 10000 },
  { label: "10k–12k", min: 10000, max: 12000 },
  { label: "12k–14k", min: 12000, max: 14000 },
  { label: "14k–16k", min: 14000, max: 16000 },
  { label: "16k–18k", min: 16000, max: 18000 },
  { label: "18k–20k", min: 18000, max: 20000 },
  { label: "20k–22k", min: 20000, max: 22000 },
  { label: "22k+", min: 22000, max: undefined },
];

// Power bank / charger / headphones — tighter budget ladder: below 1000,
// then 500-wide steps up to 2000, then an open-ended 2000+ band.
const BUDGET_PRICE_PRESETS = [
  { label: `Under ${formatINR(1000)}`, min: 0, max: 1000 },
  { label: `${formatINR(1000)}–${formatINR(1500)}`, min: 1000, max: 1500 },
  { label: `${formatINR(1500)}–${formatINR(2000)}`, min: 1500, max: 2000 },
  { label: `${formatINR(2000)}+`, min: 2000, max: undefined },
];

// Category keys/labels that should use the budget ladder instead of the
// phone ladder. Matched case-insensitively against both the category `key`
// and `label` so this keeps working regardless of exact casing/slug used
// in categoryfilterfields.js.
const BUDGET_CATEGORY_MATCHERS = [
  "powerbank",
  "power-bank",
  "power bank",
  "charger",
  "headphone",
  "earphone",
];

const getPricePresets = (categoryKey) => {
  const cat = CATEGORIES.find((c) => c.key === categoryKey);
  const haystack = `${categoryKey || ""} ${cat?.label || ""}`.toLowerCase();
  const isBudgetCategory = BUDGET_CATEGORY_MATCHERS.some((m) => haystack.includes(m));
  return isBudgetCategory ? BUDGET_PRICE_PRESETS : PHONE_PRICE_PRESETS;
};

// A plain pill — gradient fill/glow when selected, otherwise glass. Scales
// down slightly on tap for tactile feedback and picks up the signature
// fuchsia-to-cyan gradient instead of a flat border when active, so the
// "selected" state reads clearly at any screen size.
const PricePresetChip = ({ preset, isSelected, onSelect }) => (
  <button
    onClick={() => onSelect(isSelected ? null : preset)}
    aria-pressed={isSelected}
    className={`snap-start shrink-0 px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-full border text-[13px] font-medium transition-all duration-150 whitespace-nowrap active:scale-95 ${
      isSelected
        ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 border-transparent text-white shadow-[0_4px_14px_-2px_rgba(217,70,239,0.45)]"
        : "bg-white/80 backdrop-blur-md border-slate-200 text-slate-500 hover:border-fuchsia-300 hover:text-slate-900 hover:shadow-sm"
    }`}
  >
    {preset.label}
  </button>
);

const PricePresetStrip = ({ presets, selectedPreset, onSelect }) => (
  <div className="flex items-center gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth md:flex-wrap md:overflow-visible md:snap-none [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {presets.map((p) => {
      const isSelected =
        selectedPreset && selectedPreset.min === p.min && selectedPreset.max === p.max;
      return <PricePresetChip key={p.label} preset={p} isSelected={isSelected} onSelect={onSelect} />;
    })}
  </div>
);

/* ---------------------------------------------------------------------- */
/* Skeletons — glass tone, mirrors the real ProductCard layout            */
/* ---------------------------------------------------------------------- */

const Shimmer = ({ className = "" }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br from-fuchsia-50 via-slate-100 to-cyan-50 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
  </div>
);

const SkeletonCard = () => (
  <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-md overflow-hidden">
    <Shimmer className="aspect-square" />
    <div className="p-3.5 space-y-2.5">
      <Shimmer className="h-2.5 w-1/3 rounded-full" />
      <Shimmer className="h-3 w-4/5 rounded-full" />
      <Shimmer className="h-4 w-1/2 rounded-full mt-1" />
    </div>
  </div>
);

const SkeletonBrandChip = () => (
  <div className="shrink-0 flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 backdrop-blur-md px-3 py-2 min-w-[76px]">
    <Shimmer className="w-9 h-9 rounded-full" />
    <Shimmer className="h-2.5 w-10 rounded-full" />
  </div>
);

const SkeletonPriceChip = () => (
  <Shimmer className="shrink-0 h-[30px] w-[80px] rounded-full border border-slate-200" />
);

/* ---------------------------------------------------------------------- */
/* Brand strip                                                            */
/* ---------------------------------------------------------------------- */

const BrandStrip = ({ brands, loading, error, selectedBrand, onSelect }) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBrandChip key={i} />
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="text-[13px] text-rose-600 px-1 py-1">{error}</p>;
  }
  if (brands.length === 0) {
    return <p className="text-[13px] text-slate-400 px-1 py-1">No brands available in this category yet.</p>;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
      {brands.map((b) => {
        const isSelected = selectedBrand === b.brand;
        return (
          <button
            key={b.brand}
            onClick={() => onSelect(isSelected ? "" : b.brand)}
            aria-pressed={isSelected}
            className={`shrink-0 flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2 min-w-[76px] transition-all duration-150 backdrop-blur-md ${
              isSelected
                ? "border-fuchsia-300 bg-fuchsia-50/80 ring-1 ring-fuchsia-300/50 shadow-[0_8px_20px_-12px_rgba(217,70,239,0.4)]"
                : "border-slate-200 bg-white/80 hover:border-fuchsia-200 hover:bg-fuchsia-50/40"
            }`}
          >
            {b.sampleImage ? (
              <img
                src={b.sampleImage}
                alt={b.brand}
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                <IconTag />
              </div>
            )}
            <span className="text-[11.5px] font-medium text-slate-900 truncate max-w-[70px]" title={b.brand}>
              {b.brand}
            </span>
            <span className="text-[10px] font-mono text-slate-400">{b.productCount}</span>
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
  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 px-1">
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
  const sort = searchParams.get("sort") || DEFAULT_SORT;
  const page = Number(searchParams.get("page")) || 1;
  const brand = searchParams.get("brand") || "";
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  // Which price ladder applies to the active category.
  const pricePresets = useMemo(() => getPricePresets(category), [category]);

  const selectedPreset = useMemo(() => {
    if (!minPrice) return null;
    return (
      pricePresets.find(
        (p) => String(p.min) === minPrice && String(p.max || "") === (maxPrice || "")
      ) || null
    );
  }, [pricePresets, minPrice, maxPrice]);

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

  // Sidebar-only count (category-specific fields), used on the sidebar's
  // own badge/heading.
  const sidebarFilterCount = Object.keys(filters).length;
  // Everything an admin/shopper would think of as "a filter I set" --
  // sidebar fields + brand + price -- used for chips, "Clear all", and the
  // mobile Filters button badge.
  const activeFilterCount = sidebarFilterCount + (brand ? 1 : 0) + (minPrice ? 1 : 0);

  // Local, uncommitted copy of the search box -- only written to the URL
  // (and therefore only triggers a fetch) on submit, same pattern as the
  // admin list's search box.
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(searchParams.entries());
      // If the URL has no explicit sort, the request still needs one --
      // otherwise the backend falls back to its own default instead of
      // opening on low-to-high price.
      if (!params.sort) params.sort = DEFAULT_SORT;
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
      const onKeyDown = (e) => {
        if (e.key === "Escape") closeSheet();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", onKeyDown);
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
    if (sort !== DEFAULT_SORT) next.set("sort", sort);
    setSearchParams(next);
    setMobileFiltersOpen(false);
  };

  const handleFilterChange = (newFilters) => {
    const next = new URLSearchParams();
    if (category) next.set("category", category);
    if (search) next.set("search", search);
    if (sort !== DEFAULT_SORT) next.set("sort", sort);
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ search: searchInput.trim() });
  };

  const handleClearSearchInput = () => {
    setSearchInput("");
    if (search) updateParams({ search: null });
  };

  // Clears sidebar filters + brand + price, keeping category/search/sort.
  const clearFilters = () => {
    const next = new URLSearchParams();
    if (category) next.set("category", category);
    if (search) next.set("search", search);
    if (sort !== DEFAULT_SORT) next.set("sort", sort);
    setSearchParams(next);
  };

  const activeCategory = CATEGORIES.find((c) => c.key === category);

  const priceChipLabel = selectedPreset
    ? selectedPreset.max
      ? `${formatINR(selectedPreset.min)}\u2013${formatINR(selectedPreset.max)}`
      : `${formatINR(selectedPreset.min)}+`
    : null;

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8 overflow-x-clip">
      <style>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes sheetDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .card-in { animation: fadeInUp 0.45s cubic-bezier(.2,.8,.3,1.05) both; }

        @media (prefers-reduced-motion: reduce) {
          .card-in { animation: none !important; opacity: 1 !important; transform: none !important; }
          [class*="animate-[shimmer"] { animation: none !important; }
        }
      `}</style>

      {/* Ambient wash, clamped so it can never force horizontal scroll */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 right-0 w-[min(420px,80vw)] h-[min(420px,80vw)] rounded-full bg-gradient-to-br from-cyan-200/20 to-fuchsia-200/20 blur-3xl -z-10"
      />

      {/* Header */}
      <div className="mb-5 md:mb-6">
        <h1 className="font-display text-[20px] sm:text-[24px] font-semibold text-slate-900 tracking-tight">
          {search ? `Results for "${search}"` : activeCategory ? activeCategory.label : "All products"}
          {brand ? ` \u00B7 ${brand}` : ""}
        </h1>
        <p className="text-[13.5px] text-slate-500 mt-1">
          {loading ? "Searching\u2026" : `${pagination.total} product${pagination.total === 1 ? "" : "s"}`}
        </p>
      </div>

      {/* Sticky bar — category tabs ONLY. Everything else below scrolls normally
          so it doesn't eat the viewport once a category is selected. */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 md:-mx-10 px-4 sm:px-6 md:px-10 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="flex items-center gap-2 py-3 overflow-x-auto whitespace-nowrap sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => handleCategoryChange("")}
            className={`shrink-0 px-3.5 py-2 rounded-full text-[13.5px] font-medium transition-all duration-150 ${
              !category
                ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white shadow-[0_6px_16px_-6px_rgba(217,70,239,0.5)]"
                : "text-slate-500 hover:bg-fuchsia-50 hover:text-fuchsia-600"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => handleCategoryChange(c.key)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-[13.5px] font-medium transition-all duration-150 ${
                category === c.key
                  ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white shadow-[0_6px_16px_-6px_rgba(217,70,239,0.5)]"
                  : "text-slate-500 hover:bg-fuchsia-50 hover:text-fuchsia-600"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar — every screen size, right under the sticky tabs. This
          was previously missing entirely: the URL and header both already
          understood a `search` term, but there was no input to set one. */}
      <div className="pt-4">
        <form onSubmit={handleSearchSubmit} className="relative max-w-md">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products…"
            className="w-full text-[13.5px] bg-white/80 backdrop-blur-md border border-slate-200 rounded-full pl-10 pr-9 py-2.5 min-h-[42px] text-slate-900 placeholder:text-slate-400 outline-none shadow-sm transition-colors duration-150 focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-400/15"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearchInput}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors duration-150"
            >
              <IconClose width="12" height="12" />
            </button>
          )}
        </form>
      </div>

      {/* Non-sticky: brand strip, price strip, filter/sort row */}
      {category && (
        <>
          <div className="pt-4 pb-2.5">
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
                  className="text-[11px] font-medium text-fuchsia-600 hover:text-fuchsia-700 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="mt-1.5">
              {brandsLoading ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonPriceChip key={i} />
                  ))}
                </div>
              ) : (
                <PricePresetStrip presets={pricePresets} selectedPreset={selectedPreset} onSelect={handlePricePresetSelect} />
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-2 pb-3 pt-1">
        {category ? (
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden relative inline-flex items-center gap-1.5 rounded-full border border-slate-200 text-[13px] font-medium text-slate-900 px-4 py-2 hover:border-fuchsia-300 bg-white/80 backdrop-blur-md shadow-sm transition-colors duration-150"
          >
            <IconFilter />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-[10.5px] font-mono">
                {activeFilterCount}
              </span>
            )}
          </button>
        ) : (
          <span />
        )}

        <Select value={sort} onChange={(v) => updateParams({ sort: v }, { resetPage: false })} options={sortOptions} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8 pt-2 md:pt-3">
        {/* Desktop sidebar — a real glass card now instead of a bare
            DynamicFilterSidebar: header (Filters + active category + field
            count), its own scroll region so a long filter list doesn't
            push the whole page down, sticky under the sticky category-tabs
            bar, and a "Clear all filters" footer once anything is active. */}
        {category && (
          <div className="hidden lg:block w-64 xl:w-72 shrink-0 lg:sticky lg:top-[76px]">
            <div className="border border-slate-200 rounded-2xl bg-white/80 backdrop-blur-xl shadow-[0_18px_40px_-30px_rgba(217,70,239,0.3)] max-h-[calc(100vh-96px)] flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
                <span className="w-6 h-6 rounded-lg bg-gradient-to-r from-fuchsia-50 to-cyan-50 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                  <IconFilter />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-[14px] font-semibold text-slate-900 leading-tight">Filters</h2>
                  {activeCategory && <p className="text-[11px] text-slate-400 truncate">{activeCategory.label}</p>}
                </div>
                {sidebarFilterCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-[10px] font-mono shrink-0">
                    {sidebarFilterCount}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
                <DynamicFilterSidebar category={category} filters={filters} onFilterChange={handleFilterChange} />
              </div>

              {activeFilterCount > 0 && (
                <div className="shrink-0 px-4 py-3 border-t border-slate-100">
                  <button
                    onClick={clearFilters}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-[12.5px] font-medium text-slate-500 py-2 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50/60 transition-colors duration-150"
                  >
                    <IconClose width="11" height="11" />
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile bottom sheet */}
        {category && mobileFiltersOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end">
            <div
              className={`absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-200 ${sheetClosing ? "opacity-0" : "opacity-100"}`}
              onClick={closeSheet}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              className="relative w-full max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-t-3xl shadow-[0_-20px_60px_-20px_rgba(217,70,239,0.25)] overflow-hidden flex flex-col"
              style={{ animation: `${sheetClosing ? "sheetDown" : "sheetUp"} 0.22s cubic-bezier(0.32,0.72,0,1) both` }}
            >
              <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-9 h-1 rounded-full bg-slate-300" />
              </div>
              <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-slate-200 shrink-0">
                <h2 className="font-display text-[15px] font-semibold text-slate-900">
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 text-[12px] font-mono text-slate-400">({activeFilterCount})</span>
                  )}
                </h2>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-[12.5px] font-medium text-rose-600 hover:text-rose-700"
                    >
                      Clear all
                    </button>
                  )}
                  <button onClick={closeSheet} className="p-1.5 rounded-full text-slate-500 hover:bg-fuchsia-50 hover:text-fuchsia-600 transition-colors duration-150" aria-label="Close filters">
                    <IconClose />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto px-5 py-4 flex-1">
                <SectionLabel>Price</SectionLabel>
                <div className="mt-2 mb-5">
                  <PricePresetStrip presets={pricePresets} selectedPreset={selectedPreset} onSelect={handlePricePresetSelect} />
                </div>
                <DynamicFilterSidebar category={category} filters={filters} onFilterChange={handleFilterChange} />
              </div>
              <div
                className="px-5 pt-4 border-t border-slate-200 shrink-0 bg-white/95 backdrop-blur-xl"
                style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
              >
                <button
                  onClick={closeSheet}
                  className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-[14px] font-medium py-3 flex items-center justify-center gap-2 active:scale-[0.98] shadow-[0_10px_24px_-8px_rgba(217,70,239,0.45)] transition-transform duration-150"
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
              <span className="text-[12.5px] text-slate-400">
                {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} applied
              </span>
              {brand && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-[12px] font-medium pl-3 pr-1.5 py-1 shadow-[0_4px_12px_-4px_rgba(217,70,239,0.4)]">
                  {brand}
                  <button onClick={() => handleBrandSelect("")} aria-label="Clear brand filter" className="rounded-full hover:bg-white/20 w-4 h-4 flex items-center justify-center">
                    <IconClose width="9" height="9" />
                  </button>
                </span>
              )}
              {priceChipLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-[12px] font-medium pl-3 pr-1.5 py-1 shadow-[0_4px_12px_-4px_rgba(217,70,239,0.4)]">
                  {priceChipLabel}
                  <button onClick={() => handlePricePresetSelect(null)} aria-label="Clear price filter" className="rounded-full hover:bg-white/20 w-4 h-4 flex items-center justify-center">
                    <IconClose width="9" height="9" />
                  </button>
                </span>
              )}
              <button onClick={clearFilters} className="text-[12.5px] font-medium text-fuchsia-600 hover:text-fuchsia-700 hover:underline">
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-[13px] text-rose-600">{error}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.1)]">
                <IconFilter />
              </div>
              <p className="text-[14px] font-medium text-slate-900">
                {search ? `No products match "${search}".` : "No products match these filters."}
              </p>
              <p className="text-[13px] text-slate-400 mt-1">Try widening your search or clearing a filter.</p>
              {(activeFilterCount > 0 || search) && (
                <button
                  onClick={() => {
                    handleClearSearchInput();
                    clearFilters();
                  }}
                  className="mt-4 rounded-full border border-slate-200 text-[13px] font-medium text-slate-900 px-4 py-2 bg-white/80 backdrop-blur-md hover:border-fuchsia-300 transition-colors duration-150"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
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
                className="text-[13px] font-medium text-slate-500 disabled:opacity-40 hover:text-fuchsia-600 transition-colors duration-150"
              >
                Previous
              </button>
              <span className="font-mono text-[12.5px] text-slate-400 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full px-3 py-1">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => updateParams({ page: String(page + 1) }, { resetPage: false })}
                className="text-[13px] font-medium text-slate-500 disabled:opacity-40 hover:text-fuchsia-600 transition-colors duration-150"
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