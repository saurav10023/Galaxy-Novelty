// src/pages/ProductDisplayPage.jsx
//
// Kiosk / signage-style product display. Sibling to ShopPage.jsx and
// ProductDetail.jsx and built on the same Light Glass Tech language
// (glass panels, fuchsia/cyan gradient actives, mono labels), but a
// different job: instead of a grid to browse, this is one big slide that
// advances itself, can be swiped left/right, and can be narrowed down
// with the same category/brand/price filters as the shop -- just tucked
// behind a single small icon so the display stays uncluttered.
//
// CAROUSEL MECHANICS
// Classic 3-slide infinite-loop technique: a track holding
// [prevSlide, currentSlide, nextSlide] (each 33.3333% of a 300%-wide
// track, i.e. exactly one container-width each) is shifted with
// `translateX(calc(-33.3333% + offsetPx))`. Autoplay and swipe both just
// animate `offsetPx` out to a full container width in the chosen
// direction; once that transition finishes we swap the active index,
// snap the offset back to 0 with transitions off for one frame, then
// turn transitions back on. The visible slide never appears to jump.
//
// Swipe uses Pointer Events (covers touch + mouse + pen in one handler)
// and drags 1:1 with the finger; autoplay reuses the exact same
// "settle" animation so both feel identical.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../api/axios";
import { CATEGORIES } from "../config/categoryfilterfields";

/* ---------------------------------------------------------------------- */
/* Tunables                                                                */
/* ---------------------------------------------------------------------- */

const AUTOPLAY_MS = 6500;
const SWIPE_THRESHOLD_RATIO = 0.18; // fraction of container width
const SWIPE_THRESHOLD_MIN_PX = 56;
const TRANSITION = "transform 520ms cubic-bezier(0.22,1,0.36,1)";

/* ---------------------------------------------------------------------- */
/* Icons                                                                   */
/* ---------------------------------------------------------------------- */

const IconFilter = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" {...props}>
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
const IconChevronLeft = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="18" height="18" {...props}>
    <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChevronRight = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="18" height="18" {...props}>
    <path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconPlay = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="13" height="13" {...props}>
    <path d="M6 4.5v11l9-5.5-9-5.5Z" fill="currentColor" />
  </svg>
);
const IconPause = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="13" height="13" {...props}>
    <rect x="5.5" y="4.5" width="3" height="11" rx="1" fill="currentColor" />
    <rect x="11.5" y="4.5" width="3" height="11" rx="1" fill="currentColor" />
  </svg>
);
const IconImageOff = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="22" height="22" {...props}>
    <path d="M3 4h11l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M6.5 9.5A1.5 1.5 0 1 0 6.5 6.5a1.5 1.5 0 0 0 0 3ZM3 14.5l4-4 3 3 3-3.5 4 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------------------------------------------------------------------- */
/* Shared formatting / price-preset logic (mirrors ShopPage.jsx so the    */
/* filter panel here behaves identically to the shop's own filters)       */
/* ---------------------------------------------------------------------- */

const formatINR = (n) => (n || n === 0 ? `\u20B9${Number(n).toLocaleString("en-IN")}` : "");

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

const BUDGET_PRICE_PRESETS = [
  { label: `Under ${formatINR(1000)}`, min: 0, max: 1000 },
  { label: `${formatINR(1000)}–${formatINR(1500)}`, min: 1000, max: 1500 },
  { label: `${formatINR(1500)}–${formatINR(2000)}`, min: 1500, max: 2000 },
  { label: `${formatINR(2000)}+`, min: 2000, max: undefined },
];

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

// Three headline specs per category, shown as small highlight chips on the
// big slide -- a trimmed version of ProductDetail.jsx's fuller spec table.
const HIGHLIGHT_FIELDS_BY_CATEGORY = {
  mobile: [
    ["ram", "RAM"],
    ["rom", "Storage"],
    ["batteryCapacity", "Battery"],
  ],
  headphone: [
    ["type", "Type"],
    ["batteryLife", "Battery life"],
    ["noiseCancellation", "ANC"],
  ],
  charger: [
    ["wattage", "Wattage"],
    ["portType", "Port type"],
    ["fastChargingSupport", "Fast charging"],
  ],
  powerbank: [
    ["capacity", "Capacity"],
    ["wattageOutput", "Output"],
    ["fastChargingSupport", "Fast charging"],
  ],
};

const formatHighlightValue = (val) => {
  if (val === true) return "Yes";
  if (val === false) return "No";
  if (Array.isArray(val)) return val.join(", ");
  return val;
};

/* ---------------------------------------------------------------------- */
/* Ambient backdrop -- slow-drifting glass blobs, theme-matched            */
/* ---------------------------------------------------------------------- */

const AmbientBackdrop = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-50">
    <div className="absolute -top-24 -left-20 w-[52vw] h-[52vw] max-w-[560px] max-h-[560px] rounded-full bg-gradient-to-br from-fuchsia-200/40 to-cyan-100/10 blur-3xl animate-[driftA_22s_ease-in-out_infinite]" />
    <div className="absolute -bottom-32 -right-16 w-[58vw] h-[58vw] max-w-[620px] max-h-[620px] rounded-full bg-gradient-to-tr from-cyan-200/40 to-fuchsia-100/10 blur-3xl animate-[driftB_26s_ease-in-out_infinite]" />
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[38vw] h-[38vw] max-w-[420px] max-h-[420px] rounded-full bg-gradient-to-br from-slate-200/30 to-transparent blur-3xl animate-[driftC_30s_ease-in-out_infinite]" />
  </div>
);

/* ---------------------------------------------------------------------- */
/* Skeleton                                                                */
/* ---------------------------------------------------------------------- */

const Shimmer = ({ className = "" }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br from-fuchsia-50 via-slate-100 to-cyan-50 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
  </div>
);

const DisplaySkeleton = () => (
  <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
    <div className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white/70 backdrop-blur-xl p-6 sm:p-10">
      <Shimmer className="mx-auto rounded-2xl w-[70%] max-w-sm h-[240px] sm:h-[320px]" />
      <Shimmer className="mt-6 h-3 w-24 rounded-full" />
      <Shimmer className="mt-3 h-6 w-2/3 rounded-full" />
      <Shimmer className="mt-3 h-8 w-1/3 rounded-full" />
    </div>
  </div>
);

/* ---------------------------------------------------------------------- */
/* Filter panel -- category / brand / price, same behaviour as ShopPage   */
/* ---------------------------------------------------------------------- */

const FilterPanel = ({
  open,
  onClose,
  category,
  onCategoryChange,
  brand,
  onBrandChange,
  brands,
  brandsLoading,
  brandsError,
  pricePresets,
  selectedPreset,
  onPriceSelect,
  onClearAll,
  activeFilterCount,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center">
      <div
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Display filters"
        className="relative w-full sm:max-w-xl mx-3 sm:mx-0 mt-3 sm:mt-8 max-h-[85vh] overflow-y-auto rounded-3xl border border-white/60 bg-white/85 backdrop-blur-2xl shadow-[0_30px_80px_-24px_rgba(15,23,42,0.35)] panel-in"
      >
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3 border-b border-slate-200/70">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-slate-900">Display filters</h2>
            <p className="text-[11.5px] text-slate-400 mt-0.5">Narrow what rotates through the display</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="p-1.5 rounded-full text-slate-500 hover:bg-fuchsia-50 hover:text-fuchsia-600 transition-colors duration-150"
          >
            <IconClose />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-4 space-y-5">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Category
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onCategoryChange("")}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 ${
                  !category
                    ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white shadow-[0_6px_16px_-6px_rgba(217,70,239,0.5)]"
                    : "bg-white/80 border border-slate-200 text-slate-500 hover:border-fuchsia-300 hover:text-slate-900"
                }`}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => onCategoryChange(c.key)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 ${
                    category === c.key
                      ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white shadow-[0_6px_16px_-6px_rgba(217,70,239,0.5)]"
                      : "bg-white/80 border border-slate-200 text-slate-500 hover:border-fuchsia-300 hover:text-slate-900"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {category && (
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Brand
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {brandsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Shimmer key={i} className="h-[30px] w-[76px] rounded-full" />
                  ))
                ) : brandsError ? (
                  <p className="text-[12.5px] text-rose-600">{brandsError}</p>
                ) : brands.length === 0 ? (
                  <p className="text-[12.5px] text-slate-400">No brands in this category yet.</p>
                ) : (
                  brands.map((b) => {
                    const isSelected = brand === b.brand;
                    return (
                      <button
                        key={b.brand}
                        onClick={() => onBrandChange(isSelected ? "" : b.brand)}
                        aria-pressed={isSelected}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-150 ${
                          isSelected
                            ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 border-transparent text-white shadow-[0_4px_14px_-2px_rgba(217,70,239,0.45)]"
                            : "bg-white/80 border-slate-200 text-slate-500 hover:border-fuchsia-300 hover:text-slate-900"
                        }`}
                      >
                        <IconTag className="opacity-70" />
                        {b.brand}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {category && (
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Price
                </span>
                {selectedPreset && (
                  <button
                    onClick={() => onPriceSelect(null)}
                    className="text-[11px] font-medium text-fuchsia-600 hover:text-fuchsia-700 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {pricePresets.map((p) => {
                  const isSelected = selectedPreset && selectedPreset.min === p.min && selectedPreset.max === p.max;
                  return (
                    <button
                      key={p.label}
                      onClick={() => onPriceSelect(isSelected ? null : p)}
                      aria-pressed={isSelected}
                      className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-150 active:scale-95 ${
                        isSelected
                          ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 border-transparent text-white shadow-[0_4px_14px_-2px_rgba(217,70,239,0.45)]"
                          : "bg-white/80 border-slate-200 text-slate-500 hover:border-fuchsia-300 hover:text-slate-900"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-slate-200/70 bg-white/60">
          <button
            onClick={onClearAll}
            disabled={activeFilterCount === 0}
            className="text-[13px] font-medium text-slate-500 disabled:opacity-40 hover:text-fuchsia-600 transition-colors duration-150"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-[13.5px] font-medium px-5 py-2 active:scale-[0.97] shadow-[0_10px_24px_-8px_rgba(217,70,239,0.45)] transition-transform duration-150"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------- */
/* One slide's content -- the big glass showcase card                     */
/* ---------------------------------------------------------------------- */

const SlideCard = ({ product }) => {
  if (!product) return null;
  const image = product.images?.[0]?.url;
  const inStock = product.stock > 0;
  const lowStock = inStock && product.stock <= 3;
  const highlights = (HIGHLIGHT_FIELDS_BY_CATEGORY[product.category] || []).filter(
    ([key]) => product[key] !== undefined && product[key] !== null && product[key] !== ""
  );

  return (
    <div className="w-full h-full flex items-center justify-center px-3 sm:px-6">
      <div className="relative w-full max-w-3xl rounded-[28px] border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_40px_100px_-30px_rgba(15,23,42,0.35)] overflow-hidden">
        {/* liquid sheen sweep -- the single signature motion element */}
        <div className="pointer-events-none absolute inset-0 sheen" aria-hidden="true" />

        <div className="relative flex flex-col sm:flex-row items-center gap-5 sm:gap-8 p-6 sm:p-10">
          <div className="relative w-full sm:w-[46%] shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fuchsia-100/60 via-white/0 to-cyan-100/60 blur-2xl" />
            <div className="relative w-full h-[220px] sm:h-[280px] rounded-2xl border border-slate-200 bg-white/60 flex items-center justify-center overflow-hidden">
              {image ? (
                <img
                  src={image}
                  alt={product.name}
                  draggable={false}
                  className="max-w-full max-h-full w-auto h-auto object-contain p-6 select-none"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <IconImageOff />
                  <span className="text-[12px]">No image available</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full min-w-0 text-center sm:text-left">
            {product.brand && (
              <p className="font-mono text-[11px] font-medium text-slate-400 uppercase tracking-[0.14em] mb-1">
                {product.brand}
              </p>
            )}
            <h2 className="font-display text-[20px] sm:text-[26px] font-semibold text-slate-900 tracking-tight leading-snug truncate-2">
              {product.name}
            </h2>

            <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-2.5 flex-wrap">
              <p className="font-mono text-[26px] sm:text-[30px] font-bold bg-gradient-to-r from-fuchsia-600 to-cyan-600 bg-clip-text text-transparent">
                {formatINR(product.pricing?.sellingPrice)}
              </p>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wide border ${
                  inStock
                    ? lowStock
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${inStock ? (lowStock ? "bg-amber-500" : "bg-emerald-500") : "bg-rose-500"}`} />
                {inStock ? (lowStock ? `Only ${product.stock} left` : "In stock") : "Out of stock"}
              </span>
            </div>

            {highlights.length > 0 && (
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-4 flex-wrap">
                {highlights.map(([key, label]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[12px] text-slate-500"
                  >
                    <span className="font-mono uppercase tracking-wide text-[10px] text-slate-400">{label}</span>
                    <span className="font-medium text-slate-900">{formatHighlightValue(product[key])}</span>
                  </span>
                ))}
              </div>
            )}

            <Link
              to={`/product/${product._id}`}
              className="inline-flex items-center gap-1.5 mt-5 rounded-full border border-slate-200 bg-white/80 backdrop-blur-md text-[13px] font-medium text-slate-900 px-4 py-2 hover:border-fuchsia-300 hover:text-fuchsia-600 shadow-sm transition-colors duration-150"
            >
              View details
              <IconChevronRight className="opacity-60" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------- */
/* Page                                                                    */
/* ---------------------------------------------------------------------- */

const ProductDisplayPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  const pricePresets = useMemo(() => getPricePresets(category), [category]);
  const selectedPreset = useMemo(() => {
    if (!minPrice) return null;
    return pricePresets.find((p) => String(p.min) === minPrice && String(p.max || "") === (maxPrice || "")) || null;
  }, [pricePresets, minPrice, maxPrice]);

  const activeFilterCount = (category ? 1 : 0) + (brand ? 1 : 0) + (minPrice ? 1 : 0);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState("");

  const [filterOpen, setFilterOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const [index, setIndex] = useState(0);
  const [offsetPx, setOffsetPx] = useState(0);
  const [transitionOn, setTransitionOn] = useState(true);
  const [dragging, setDragging] = useState(false);

  const containerRef = useRef(null);
  const containerWidthRef = useRef(0);
  const pendingRef = useRef(null); // 'next' | 'prev' | null
  const dragStartXRef = useRef(0);

  /* ---- data fetching ---- */

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { limit: 30 };
      if (category) params.category = category;
      if (brand) params.brand = brand;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      const res = await API.get("/api/v1/products/search", { params, withCredentials: true });
      setProducts(res.data.data.products || []);
      setIndex(0);
      setOffsetPx(0);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [category, brand, minPrice, maxPrice]);

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
      const res = await API.get("/api/v1/products/brands", { params: { category }, withCredentials: true });
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

  /* ---- filter param helpers ---- */

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next);
  };

  const handleCategoryChange = (newCategory) => {
    const next = new URLSearchParams();
    if (newCategory) next.set("category", newCategory);
    setSearchParams(next);
  };

  const handleBrandChange = (b) => updateParams({ brand: b });
  const handlePriceSelect = (preset) => {
    if (!preset) return updateParams({ minPrice: null, maxPrice: null });
    updateParams({ minPrice: String(preset.min), maxPrice: preset.max ? String(preset.max) : null });
  };
  const clearAllFilters = () => setSearchParams(new URLSearchParams());

  /* ---- container width tracking ---- */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      containerWidthRef.current = el.getBoundingClientRect().width;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---- carousel navigation ---- */

  const len = products.length;

  const settleTo = useCallback(
    (direction) => {
      if (len < 2 || pendingRef.current) return;
      const w = containerWidthRef.current || 1;
      pendingRef.current = direction;
      setTransitionOn(true);
      setOffsetPx(direction === "next" ? -w : w);
    },
    [len]
  );

  const goNext = useCallback(() => settleTo("next"), [settleTo]);
  const goPrev = useCallback(() => settleTo("prev"), [settleTo]);

  const handleTrackTransitionEnd = (e) => {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    if (!pendingRef.current) return;
    const direction = pendingRef.current;
    pendingRef.current = null;
    setTransitionOn(false);
    setIndex((prev) => (direction === "next" ? (prev + 1) % len : (prev - 1 + len) % len));
    setOffsetPx(0);
    // re-enable the transition only after the reset frame has painted,
    // so the snap-back itself never animates
    requestAnimationFrame(() => requestAnimationFrame(() => setTransitionOn(true)));
  };

  /* ---- swipe (pointer events cover touch + mouse + pen) ---- */

  const handlePointerDown = (e) => {
    if (len < 2 || pendingRef.current) return;
    setDragging(true);
    setTransitionOn(false);
    dragStartXRef.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    setOffsetPx(e.clientX - dragStartXRef.current);
  };

  const finishDrag = () => {
    if (!dragging) return;
    setDragging(false);
    const w = containerWidthRef.current || 1;
    const threshold = Math.max(SWIPE_THRESHOLD_MIN_PX, w * SWIPE_THRESHOLD_RATIO);
    setTransitionOn(true);
    if (offsetPx <= -threshold && len > 1) {
      pendingRef.current = "next";
      setOffsetPx(-w);
    } else if (offsetPx >= threshold && len > 1) {
      pendingRef.current = "prev";
      setOffsetPx(w);
    } else {
      setOffsetPx(0);
    }
  };

  /* ---- keyboard nav ---- */

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  /* ---- autoplay + progress ring ---- */

  useEffect(() => {
    if (!isPlaying || dragging || filterOpen || len < 2 || pendingRef.current) return;
    setProgress(0);
    const start = performance.now();
    let frameId;
    const tick = (now) => {
      const pct = Math.min(100, ((now - start) / AUTOPLAY_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        goNext();
        return;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isPlaying, dragging, filterOpen, len]);

  /* ---- slide indices ---- */

  const prevIdx = len > 0 ? (index - 1 + len) % len : 0;
  const nextIdx = len > 0 ? (index + 1) % len : 0;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden select-none">
      <style>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes panelIn { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes driftA { 0%,100% { transform: translate(0,0); } 50% { transform: translate(4%, 6%); } }
        @keyframes driftB { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-5%, -4%); } }
        @keyframes driftC { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-46%, 4%); } }
        @keyframes sheenMove { 0% { background-position: -140% 0; } 60%, 100% { background-position: 240% 0; } }
        .fade-in { animation: fadeIn 0.2s ease both; }
        .panel-in { animation: panelIn 0.22s cubic-bezier(0.22,1,0.36,1) both; }
        .truncate-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .sheen {
          background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%);
          background-size: 220% 100%;
          animation: sheenMove 5.5s ease-in-out infinite;
          mix-blend-mode: screen;
        }
        @media (prefers-reduced-motion: reduce) {
          .sheen, [class*="animate-[drift"], [class*="animate-[shimmer"] { animation: none !important; }
        }
      `}</style>

      <AmbientBackdrop />

      {/* Top bar: counter (left) + filter icon (right), floating glass */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 backdrop-blur-xl px-3.5 py-2 shadow-sm">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause autoplay" : "Resume autoplay"}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-600 hover:text-fuchsia-600 transition-colors duration-150"
          >
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>
          <span className="font-mono text-[12px] text-slate-500 tabular-nums">
            {len > 0 ? String(index + 1).padStart(2, "0") : "00"} / {String(len).padStart(2, "0")}
          </span>
        </div>

        <button
          onClick={() => setFilterOpen(true)}
          aria-label="Open display filters"
          className="relative inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/60 bg-white/70 backdrop-blur-xl text-slate-600 hover:text-fuchsia-600 hover:border-fuchsia-300 shadow-sm transition-colors duration-150"
        >
          <IconFilter />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-[10px] font-mono">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Autoplay progress rail */}
      {len > 1 && (
        <div className="absolute top-[64px] sm:top-[68px] left-4 right-4 sm:left-6 sm:right-6 z-30 h-[3px] rounded-full bg-slate-200/70 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500"
            style={{ width: `${progress}%`, transition: dragging ? "none" : "width 80ms linear" }}
          />
        </div>
      )}

      {/* Main stage */}
      <div className="w-full h-full flex items-center justify-center pt-16 pb-10">
        {loading ? (
          <DisplaySkeleton />
        ) : error ? (
          <div className="max-w-sm mx-4 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-[13px] text-rose-600 text-center">
            {error}
          </div>
        ) : len === 0 ? (
          <div className="max-w-sm mx-4 text-center">
            <div className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-sm">
              <IconImageOff />
            </div>
            <p className="text-[14px] font-medium text-slate-900">No products match these filters.</p>
            <p className="text-[13px] text-slate-400 mt-1">Try a different category or clear a filter.</p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="mt-4 rounded-full border border-slate-200 text-[13px] font-medium text-slate-900 px-4 py-2 bg-white/80 backdrop-blur-md hover:border-fuchsia-300 transition-colors duration-150"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center">
            {/* Edge arrows */}
            {len > 1 && (
              <>
                <button
                  onClick={goPrev}
                  aria-label="Previous product"
                  className="hidden sm:flex absolute left-3 lg:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full items-center justify-center border border-white/60 bg-white/70 backdrop-blur-xl text-slate-600 hover:text-fuchsia-600 hover:border-fuchsia-300 shadow-sm transition-colors duration-150"
                >
                  <IconChevronLeft />
                </button>
                <button
                  onClick={goNext}
                  aria-label="Next product"
                  className="hidden sm:flex absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full items-center justify-center border border-white/60 bg-white/70 backdrop-blur-xl text-slate-600 hover:text-fuchsia-600 hover:border-fuchsia-300 shadow-sm transition-colors duration-150"
                >
                  <IconChevronRight />
                </button>
              </>
            )}

            {/* 3-slide track */}
            <div
              ref={containerRef}
              className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerLeave={finishDrag}
              onPointerCancel={finishDrag}
            >
              <div
                className="flex h-full"
                style={{
                  width: "300%",
                  transform: `translateX(calc(-33.3333% + ${offsetPx}px))`,
                  transition: transitionOn ? TRANSITION : "none",
                }}
                onTransitionEnd={handleTrackTransitionEnd}
              >
                <div className="h-full shrink-0" style={{ width: "33.3333%" }}>
                  <SlideCard product={products[prevIdx]} />
                </div>
                <div className="h-full shrink-0" style={{ width: "33.3333%" }}>
                  <SlideCard product={products[index]} />
                </div>
                <div className="h-full shrink-0" style={{ width: "33.3333%" }}>
                  <SlideCard product={products[nextIdx]} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        category={category}
        onCategoryChange={handleCategoryChange}
        brand={brand}
        onBrandChange={handleBrandChange}
        brands={brands}
        brandsLoading={brandsLoading}
        brandsError={brandsError}
        pricePresets={pricePresets}
        selectedPreset={selectedPreset}
        onPriceSelect={handlePriceSelect}
        onClearAll={clearAllFilters}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
};

export default ProductDisplayPage;