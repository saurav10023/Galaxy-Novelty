// src/pages/ProductDisplayPage.jsx
//
// Kiosk / signage-style product display. Functionally a sibling of
// ShopPage.jsx and ProductDetail.jsx (same category/brand/price filters,
// same product data), but visually its own thing on purpose: this is the
// one screen in the app meant to run untouched on a wall-mounted TV or a
// counter kiosk, advancing itself, so it gets to be a small stage rather
// than a browsing surface.
//
// DESIGN DIRECTION -- "spec-scan stage" (Light Glass Tech palette)
// White, softly-lit backdrop instead of a dark stage -- fuchsia and cyan
// glow blobs wash the canvas from behind, and the product sits on frosted
// glass the way it would behind a display case's clean glass, not a
// spotlight in the dark. Two accents only, always used as a pair (a
// gradient on price, on the active filter pill, on the progress rail): a
// fuchsia (`#D946EF`) and a cyan (`#06B6D4`), so the palette reads as one
// deliberate choice rather than a handful of competing colours. Type is
// Space Grotesk for anything the eye should land on first (name, price)
// and JetBrains Mono for anything that reads like a readout (labels,
// counters, specs) -- leaning into the idea that this screen is
// *inspecting* the product for you.
//
// SIGNATURE MOMENT: every time a product becomes the centred slide, four
// corner brackets snap in around the card like a viewfinder acquiring
// focus, a thin scan-line sweeps once down the image well, and the
// copy (brand, name, price, specs, CTA) staggers in a beat behind it.
// It's one animated moment per slide, not continuous motion -- the
// backdrop otherwise just drifts very slowly, and prefers-reduced-motion
// collapses all of it to an instant, fully-visible state.
//
// CAROUSEL MECHANICS (unchanged)
// Classic 3-slide infinite-loop technique: a track holding
// [prevSlide, currentSlide, nextSlide] (each 33.3333% of a 300%-wide
// track, i.e. exactly one container-width each) is shifted with
// `translateX(calc(-33.3333% + offsetPx))`. Autoplay and swipe both just
// animate `offsetPx` out to a full container width in the chosen
// direction; once that transition finishes we swap the active index,
// snap the offset back to 0 with transitions off for one frame, then
// turn transitions back on. The visible slide never appears to jump.
// Each slide is keyed by product id so the scan-reveal above replays
// exactly when that slot's product actually changes, not on every
// render.
//
// Swipe uses Pointer Events (covers touch + mouse + pen in one handler)
// and drags 1:1 with the finger; autoplay reuses the exact same
// "settle" animation so both feel identical.
//
// RESPONSIVE
// The card is sized with CSS container queries (cqw) keyed off its own
// rendered width, so type scale, image well height and spacing all stay
// in proportion whether it's 340px on a phone or 1680px on a signage
// wall. Past ~560px of container width it also switches shape, not just
// scale: image and copy sit side by side so a wide container (a desktop
// window, a landscape tablet, a wall TV) spends its width instead of
// centering a narrow stacked column in empty space. A genuinely portrait
// screen (a phone, or a tall narrow signage panel) forces the stacked
// layout back on regardless of pixel width, since that's a property of
// the physical screen, not the card.
//
// TIMER: the autoplay progress rail is a plain CSS animation
// (GPU-composited scaleX), not a requestAnimationFrame loop -- pausing
// just flips animation-play-state so it resumes exactly where it left
// off, and reaching 100% fires onAnimationEnd to advance the slide. No
// JS timer, no per-frame render, nothing to desync.

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
const CARD_MAX_WIDTH = "clamp(320px, 92vw, 1680px)";

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
/* Ambient backdrop -- white stage: a faint graph grid, two slow-drifting  */
/* fuchsia/cyan glows, and a fine grain so it never reads as a flat vector */
/* fill. Everything here is quiet on purpose -- the one animated moment   */
/* this design spends its budget on is the scan-reveal on the active      */
/* slide, not the backdrop.                                               */
/* ---------------------------------------------------------------------- */

const AmbientBackdrop = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ background: "var(--bg-deep)" }}>
    <div className="absolute inset-0 ambient-grid" />
    <div className="absolute -top-24 -left-20 w-[54vw] h-[54vw] max-w-[600px] max-h-[600px] 2xl:max-w-[820px] 2xl:max-h-[820px] rounded-full blur-3xl animate-[driftA_26s_ease-in-out_infinite]" style={{ background: "radial-gradient(closest-side, var(--accent-fuchsia-soft), transparent 70%)" }} />
    <div className="absolute -bottom-32 -right-16 w-[58vw] h-[58vw] max-w-[640px] max-h-[640px] 2xl:max-w-[880px] 2xl:max-h-[880px] rounded-full blur-3xl animate-[driftB_30s_ease-in-out_infinite]" style={{ background: "radial-gradient(closest-side, var(--accent-cyan-soft), transparent 70%)" }} />
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[36vw] h-[36vw] max-w-[420px] max-h-[420px] rounded-full blur-3xl opacity-60 animate-[driftC_34s_ease-in-out_infinite]" style={{ background: "radial-gradient(closest-side, rgba(217,70,239,0.10), transparent 72%)" }} />
    <div className="absolute inset-0 opacity-[0.035] grain-layer" />
    <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 18vw 2vw var(--bg-deep)" }} />
  </div>
);

/* ---------------------------------------------------------------------- */
/* Skeleton                                                                */
/* ---------------------------------------------------------------------- */

const Shimmer = ({ className = "" }) => (
  <div className={`relative overflow-hidden ${className}`} style={{ background: "linear-gradient(135deg, var(--bg-panel-2), var(--bg-panel))" }}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]" style={{ background: "linear-gradient(90deg, transparent, rgba(15,23,42,0.06), transparent)" }} />
  </div>
);

const DisplaySkeleton = () => (
  <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
    <div className="panel w-full rounded-[28px] p-6 sm:p-10 2xl:p-14" style={{ maxWidth: CARD_MAX_WIDTH }}>
      <Shimmer className="mx-auto rounded-2xl w-[70%] max-w-sm 2xl:max-w-lg h-[240px] sm:h-[320px] 2xl:h-[420px]" />
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
        className="absolute inset-0 backdrop-blur-sm fade-in"
        style={{ background: "rgba(255,255,255,0.6)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Display filters"
        className="panel panel--elevated relative w-full sm:max-w-xl lg:max-w-2xl mx-3 sm:mx-0 mt-3 sm:mt-8 max-h-[85vh] overflow-y-auto rounded-3xl 2xl:rounded-[32px] panel-in"
      >
        <div className="flex items-center justify-between px-5 sm:px-6 2xl:px-8 pt-5 2xl:pt-7 pb-3 2xl:pb-4" style={{ borderBottom: "1px solid var(--hairline)" }}>
          <div>
            <h2 className="font-display text-[15px] 2xl:text-[18px] font-semibold" style={{ color: "var(--text-primary)" }}>Display filters</h2>
            <p className="text-[11.5px] 2xl:text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>Narrow what rotates through the display</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="p-1.5 2xl:p-2 rounded-full transition-colors duration-150 icon-btn"
          >
            <IconClose />
          </button>
        </div>

        <div className="px-5 sm:px-6 2xl:px-8 py-4 2xl:py-6 space-y-5 2xl:space-y-7">
          <div>
            <span className="font-mono text-[10px] 2xl:text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
              Category
            </span>
            <div className="mt-2 2xl:mt-3 flex flex-wrap gap-2 2xl:gap-2.5">
              <button
                onClick={() => onCategoryChange("")}
                className={`chip px-3.5 py-1.5 2xl:px-4 2xl:py-2 rounded-full text-[13px] 2xl:text-[14px] font-medium transition-all duration-150 ${!category ? "chip--active" : ""}`}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => onCategoryChange(c.key)}
                  className={`chip px-3.5 py-1.5 2xl:px-4 2xl:py-2 rounded-full text-[13px] 2xl:text-[14px] font-medium transition-all duration-150 ${category === c.key ? "chip--active" : ""}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {category && (
            <div>
              <span className="font-mono text-[10px] 2xl:text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                Brand
              </span>
              <div className="mt-2 2xl:mt-3 flex flex-wrap gap-2 2xl:gap-2.5">
                {brandsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Shimmer key={i} className="h-[30px] 2xl:h-[36px] w-[76px] 2xl:w-[92px] rounded-full" />
                  ))
                ) : brandsError ? (
                  <p className="text-[12.5px] 2xl:text-[13.5px]" style={{ color: "var(--danger)" }}>{brandsError}</p>
                ) : brands.length === 0 ? (
                  <p className="text-[12.5px] 2xl:text-[13.5px]" style={{ color: "var(--text-faint)" }}>No brands in this category yet.</p>
                ) : (
                  brands.map((b) => {
                    const isSelected = brand === b.brand;
                    return (
                      <button
                        key={b.brand}
                        onClick={() => onBrandChange(isSelected ? "" : b.brand)}
                        aria-pressed={isSelected}
                        className={`chip inline-flex items-center gap-1.5 px-3.5 py-1.5 2xl:px-4 2xl:py-2 rounded-full text-[13px] 2xl:text-[14px] font-medium transition-all duration-150 ${isSelected ? "chip--active" : ""}`}
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
                <span className="font-mono text-[10px] 2xl:text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-faint)" }}>
                  Price
                </span>
                {selectedPreset && (
                  <button
                    onClick={() => onPriceSelect(null)}
                    className="text-[11px] 2xl:text-[12px] font-medium hover:underline"
                    style={{ color: "var(--accent-cyan)" }}
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="mt-2 2xl:mt-3 flex flex-wrap gap-2 2xl:gap-2.5">
                {pricePresets.map((p) => {
                  const isSelected = selectedPreset && selectedPreset.min === p.min && selectedPreset.max === p.max;
                  return (
                    <button
                      key={p.label}
                      onClick={() => onPriceSelect(isSelected ? null : p)}
                      aria-pressed={isSelected}
                      className={`chip px-3.5 py-1.5 2xl:px-4 2xl:py-2 rounded-full text-[13px] 2xl:text-[14px] font-medium transition-all duration-150 active:scale-95 ${isSelected ? "chip--active" : ""}`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 2xl:px-8 py-4 2xl:py-5" style={{ borderTop: "1px solid var(--hairline)", background: "rgba(15,23,42,0.015)" }}>
          <button
            onClick={onClearAll}
            disabled={activeFilterCount === 0}
            className="text-[13px] 2xl:text-[14px] font-medium disabled:opacity-30 transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="btn-primary rounded-full text-[13.5px] 2xl:text-[15px] font-medium px-5 py-2 2xl:px-6 2xl:py-2.5 active:scale-[0.97] transition-transform duration-150"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------- */
/* One slide's content -- the big stage card. Keyed by product id from    */
/* the parent so this whole subtree remounts (and its entrance animations */
/* replay) exactly when the product shown in this slot changes.           */
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
    <div className="w-full h-full flex items-center justify-center px-3 sm:px-6 2xl:px-10">
      <div
        className="panel panel--elevated glass-card relative w-full h-full max-h-full rounded-[28px] overflow-hidden flex items-center"
        style={{ maxWidth: CARD_MAX_WIDTH }}
      >
        {/* faint fixed scanline texture -- this is a "display", so the card  */}
        {/* itself reads a little like a screen, not just a panel            */}
        <div className="pointer-events-none absolute inset-0 screen-lines" aria-hidden="true" />

        {/* viewfinder brackets -- snap in once when this slide is acquired */}
        <div className="scan-frame" aria-hidden="true">
          <span className="scan-corner scan-corner--tl" />
          <span className="scan-corner scan-corner--tr" />
          <span className="scan-corner scan-corner--bl" />
          <span className="scan-corner scan-corner--br" />
        </div>

        <div className="slide-body relative w-full">
          <div className="relative w-full shrink-0 flex items-center justify-center image-well-wrap">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="spotlight-glow" />
            </div>
            <div className="image-well relative w-full rounded-2xl flex items-center justify-center overflow-hidden">
              <div className="shelf-glow pointer-events-none absolute inset-x-[12%] bottom-0 z-0" aria-hidden="true" />
              {/* one-shot scan-line sweep over the image on entrance */}
              <div className="scan-sweep" aria-hidden="true" />
              {image ? (
                <img
                  src={image}
                  alt={product.name}
                  draggable={false}
                  className="image-well-img relative z-[1] max-w-full max-h-full w-auto h-auto object-contain select-none"
                />
              ) : (
                <div className="flex flex-col items-center gap-2" style={{ color: "var(--text-faint)" }}>
                  <IconImageOff />
                  <span className="empty-label">No image available</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full min-w-0 slide-copy">
            {product.brand && (
              <p className="brand-label reveal reveal-1 font-mono font-medium uppercase tracking-[0.16em]" style={{ color: "var(--text-faint)" }}>
                {product.brand}
              </p>
            )}
            <h2 className="product-title reveal reveal-2 font-display font-semibold tracking-tight leading-[1.1] truncate-2" style={{ color: "var(--text-primary)" }}>
              {product.name}
            </h2>

            <div className="flex items-center gap-2.5 mt-2.5 flex-wrap price-row reveal reveal-3">
              <p className="product-price font-mono font-bold price-gradient">
                {formatINR(product.pricing?.sellingPrice)}
              </p>
              <span className={`stock-pill inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-wide ${inStock ? (lowStock ? "stock-pill--warn" : "stock-pill--ok") : "stock-pill--out"}`}>
                <span className="stock-dot rounded-full" />
                {inStock ? (lowStock ? `Only ${product.stock} left` : "In stock") : "Out of stock"}
              </span>
            </div>

            {highlights.length > 0 && (
              <div className="flex items-center gap-2 mt-4 flex-wrap highlight-row reveal reveal-4">
                {highlights.map(([key, label]) => (
                  <span key={key} className="highlight-chip inline-flex items-center gap-1.5 rounded-full">
                    <span className="highlight-label font-mono uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{label}</span>
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>{formatHighlightValue(product[key])}</span>
                  </span>
                ))}
              </div>
            )}

            <Link
              to={`/product/${product._id}`}
              className="cta-link reveal reveal-5 inline-flex items-center gap-1.5 rounded-full font-medium transition-colors duration-150"
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
  const [swipeHintVisible, setSwipeHintVisible] = useState(true);

  const [index, setIndex] = useState(0);
  const [offsetPx, setOffsetPx] = useState(0);
  const [transitionOn, setTransitionOn] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

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
      setIsSettling(true);
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
    setIsSettling(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setTransitionOn(true)));
  };

  /* ---- swipe (pointer events cover touch + mouse + pen) ---- */

  const handlePointerDown = (e) => {
    if (len < 2 || pendingRef.current) return;
    setDragging(true);
    setTransitionOn(false);
    setSwipeHintVisible(false);
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
      setIsSettling(true);
      setOffsetPx(-w);
    } else if (offsetPx >= threshold && len > 1) {
      pendingRef.current = "prev";
      setIsSettling(true);
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
      if (e.key === "ArrowRight") { setSwipeHintVisible(false); goNext(); }
      if (e.key === "ArrowLeft") { setSwipeHintVisible(false); goPrev(); }
      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    if (len < 2) return;
    const t = setTimeout(() => setSwipeHintVisible(false), 4200);
    return () => clearTimeout(t);
  }, [len]);

  const autoplayRunning = isPlaying && !dragging && !filterOpen && !isSettling && len > 1;

  const handleProgressComplete = () => {
    if (pendingRef.current) return;
    goNext();
  };

  const prevIdx = len > 0 ? (index - 1 + len) % len : 0;
  const nextIdx = len > 0 ? (index + 1) % len : 0;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden select-none">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        :root {
          --bg-deep: #FFFFFF;
          --bg-panel: #FDFCFE;
          --bg-panel-2: #F7F3FA;
          --hairline: rgba(15,23,42,0.09);
          --hairline-strong: rgba(15,23,42,0.16);
          --accent-fuchsia: #D946EF;
          --accent-fuchsia-soft: rgba(217,70,239,0.28);
          --accent-cyan: #06B6D4;
          --accent-cyan-soft: rgba(6,182,212,0.26);
          --text-primary: #0F172A;
          --text-muted: #64748B;
          --text-faint: #94A3B8;
          --success: #10B981;
          --warning: #F59E0B;
          --danger: #F43F5E;
        }

        .font-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

        @keyframes shimmer { 100% { transform: translateX(100%); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes panelIn { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes driftA { 0%,100% { transform: translate(0,0); } 50% { transform: translate(4%, 6%); } }
        @keyframes driftB { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-5%, -4%); } }
        @keyframes driftC { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-46%, 4%); } }

        .fade-in { animation: fadeIn 0.2s ease both; }
        .panel-in { animation: panelIn 0.22s cubic-bezier(0.22,1,0.36,1) both; }
        .truncate-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        /* -------------------------------------------------------------- */
        /* Stage panels -- light frosted glass: soft gradient fill, a      */
        /* single hairline border, fuchsia-tinted contact shadow. Calm on  */
        /* purpose, so the product photo is what visually pops off the     */
        /* screen.                                                         */
        /* -------------------------------------------------------------- */
        .panel {
          position: relative;
          background: linear-gradient(180deg, var(--bg-panel-2) 0%, var(--bg-panel) 100%);
          border: 1px solid var(--hairline);
          backdrop-filter: blur(20px) saturate(140%);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          box-shadow: 0 32px 80px -30px rgba(217,70,239,0.28), 0 1px 0 rgba(255,255,255,0.6) inset;
        }
        .panel--elevated {
          background: linear-gradient(165deg, rgba(255,255,255,0.92) 0%, rgba(250,247,253,0.88) 100%);
        }
        .icon-btn { color: var(--text-muted); }
        .icon-btn:hover { color: var(--accent-fuchsia); background: rgba(217,70,239,0.10); }

        .ambient-grid {
          background-image:
            linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse at center, black 0%, transparent 78%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 78%);
        }
        .grain-layer {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
          background-size: 180px 180px;
        }

        /* faint fixed horizontal lines on every panel -- a "display" cue,   */
        /* static (no motion) so it reads as material, not animation.       */
        .screen-lines {
          background-image: repeating-linear-gradient(rgba(15,23,42,0.014) 0px, rgba(15,23,42,0.014) 1px, transparent 1px, transparent 3px);
          mix-blend-mode: multiply;
        }

        /* -------------------------------------------------------------- */
        /* Chips / pills -- category, brand, price presets                 */
        /* -------------------------------------------------------------- */
        .chip {
          background: rgba(255,255,255,0.7);
          border: 1px solid var(--hairline);
          color: var(--text-muted);
        }
        .chip:hover { border-color: var(--accent-fuchsia-soft); color: var(--text-primary); }
        .chip--active {
          background: linear-gradient(90deg, var(--accent-fuchsia), var(--accent-cyan));
          border-color: transparent;
          color: #FFFFFF;
          font-weight: 600;
          box-shadow: 0 6px 18px -6px var(--accent-fuchsia-soft);
        }
        .btn-primary {
          background: linear-gradient(90deg, var(--accent-fuchsia), var(--accent-cyan));
          color: #FFFFFF;
          box-shadow: 0 10px 26px -8px var(--accent-fuchsia-soft);
        }

        /* -------------------------------------------------------------- */
        /* Swipe surface                                                    */
        /* -------------------------------------------------------------- */
        .swipe-surface { touch-action: none; }
        .swipe-surface > div { will-change: transform; }
        .swipe-surface.is-dragging .panel {
          box-shadow: 0 24px 60px -22px rgba(217,70,239,0.32), 0 1px 0 rgba(255,255,255,0.6) inset;
        }

        @keyframes swipeHintPulse {
          0%, 100% { transform: translateX(0); opacity: 0.5; }
          50% { transform: translateX(-6px); opacity: 1; }
        }
        .swipe-hint-chevron { animation: swipeHintPulse 1.6s ease-in-out infinite; color: var(--text-muted); }
        .swipe-hint-chevron--right { animation-name: swipeHintPulseRight; }
        @keyframes swipeHintPulseRight {
          0%, 100% { transform: translateX(0); opacity: 0.5; }
          50% { transform: translateX(6px); opacity: 1; }
        }

        /* -------------------------------------------------------------- */
        /* Autoplay progress rail                                          */
        /* -------------------------------------------------------------- */
        @keyframes progressGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .progress-fill {
          animation-name: progressGrow;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
          background: linear-gradient(90deg, var(--accent-fuchsia), var(--accent-cyan));
          filter: drop-shadow(0 0 6px var(--accent-fuchsia-soft));
        }

        /* -------------------------------------------------------------- */
        /* Signature moment -- viewfinder brackets + scan-line sweep,      */
        /* played once per slide (see the key={product._id} on SlideCard). */
        /* -------------------------------------------------------------- */
        .scan-frame { position: absolute; inset: clamp(10px, 2cqw, 22px); pointer-events: none; z-index: 3; }
        .scan-corner {
          position: absolute; width: clamp(16px, 2.4cqw, 26px); height: clamp(16px, 2.4cqw, 26px);
          border: 2px solid var(--accent-fuchsia);
          opacity: 0;
          animation: cornerIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .scan-corner--tl { top: 0; left: 0; border-right: none; border-bottom: none; border-radius: 4px 0 0 0; animation-delay: 0.04s; }
        .scan-corner--tr { top: 0; right: 0; border-left: none; border-bottom: none; border-radius: 0 4px 0 0; border-color: var(--accent-cyan); animation-delay: 0.10s; }
        .scan-corner--bl { bottom: 0; left: 0; border-right: none; border-top: none; border-radius: 0 0 0 4px; border-color: var(--accent-cyan); animation-delay: 0.10s; }
        .scan-corner--br { bottom: 0; right: 0; border-left: none; border-top: none; border-radius: 0 0 4px 0; animation-delay: 0.16s; }
        @keyframes cornerIn { from { opacity: 0; transform: scale(1.5); } to { opacity: 0.7; transform: scale(1); } }

        .scan-sweep {
          position: absolute; left: 4%; right: 4%; top: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent-fuchsia) 35%, var(--accent-cyan) 65%, transparent);
          box-shadow: 0 0 14px 2px var(--accent-fuchsia-soft);
          opacity: 0;
          animation: sweepDown 1s cubic-bezier(0.65,0,0.35,1) 0.2s forwards;
          z-index: 2;
        }
        @keyframes sweepDown {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          88% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        .reveal { opacity: 0; transform: translateY(10px); animation: revealUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        .reveal-1 { animation-delay: 0.30s; }
        .reveal-2 { animation-delay: 0.37s; }
        .reveal-3 { animation-delay: 0.44s; }
        .reveal-4 { animation-delay: 0.51s; }
        .reveal-5 { animation-delay: 0.58s; }
        @keyframes revealUp { to { opacity: 1; transform: none; } }

        .image-well-img { animation: imgIn 0.7s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
        @keyframes imgIn { from { opacity: 0; transform: scale(0.93); } to { opacity: 1; transform: scale(1); } }

        /* -------------------------------------------------------------- */
        /* Slide card -- container-query sizing + row/column shape switch  */
        /* (see previous pass notes above the component for the reasoning) */
        /* -------------------------------------------------------------- */
        .glass-card { container-type: inline-size; container-name: card; }
        .slide-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: clamp(24px, 5cqw, 64px);
          gap: clamp(18px, 3.5cqw, 40px);
          max-height: 100%;
        }
        .image-well-wrap { width: 100%; max-width: clamp(220px, 62cqw, 620px); margin: 0 auto; }
        .slide-copy { width: 100%; max-width: 46em; margin: 0 auto; text-align: center; }
        .price-row, .highlight-row { justify-content: center; }

        @container card (min-width: 560px) {
          .slide-body { flex-direction: row; align-items: center; text-align: left; gap: clamp(28px, 5cqw, 72px); padding: clamp(28px, 5cqw, 72px); }
          .image-well-wrap { flex: 0 0 auto; width: 42%; max-width: 640px; margin: 0; }
          .slide-copy { flex: 1 1 auto; max-width: none; text-align: left; margin: 0; }
          .price-row, .highlight-row { justify-content: flex-start; }
        }

        @media (orientation: portrait) {
          .slide-body { flex-direction: column !important; text-align: center !important; }
          .image-well-wrap { flex: none !important; width: 100% !important; max-width: clamp(220px, 62cqw, 620px) !important; margin: 0 auto !important; }
          .slide-copy { text-align: center !important; max-width: 46em !important; margin: 0 auto !important; }
          .price-row, .highlight-row { justify-content: center !important; }
        }

        .brand-label { font-size: clamp(10px, 1.5cqw, 13px); margin-bottom: clamp(4px, 0.8cqw, 8px); }

        .image-well {
          height: clamp(160px, 32cqw, 520px);
          padding: clamp(16px, 3cqw, 40px);
          background: radial-gradient(120% 100% at 50% 15%, rgba(217,70,239,0.05), transparent 60%), var(--bg-panel);
          box-shadow: inset 0 0 0 1px var(--hairline), inset 0 -18px 34px -18px rgba(15,23,42,0.12);
        }
        @container card (min-width: 560px) {
          .image-well { height: clamp(220px, 30cqw, 620px); }
        }
        .image-well-img { filter: drop-shadow(0 20px 26px rgba(15,23,42,0.22)); }
        .spotlight-glow {
          width: 72%; height: 72%; border-radius: 999px;
          background: radial-gradient(closest-side, var(--accent-fuchsia-soft), var(--accent-cyan-soft) 55%, transparent 78%);
          filter: blur(26px);
        }
        .shelf-glow {
          height: 16%; border-radius: 999px;
          background: radial-gradient(closest-side, rgba(217,70,239,0.18), transparent 72%);
          filter: blur(3px);
        }
        .empty-label { font-size: clamp(11px, 1.6cqw, 14px); }

        .product-title { font-size: clamp(20px, 4cqw, 42px); }
        .price-row { gap: clamp(8px, 1.4cqw, 16px); }
        .product-price { font-size: clamp(24px, 5cqw, 50px); }
        .price-gradient {
          background: linear-gradient(90deg, var(--accent-fuchsia), var(--accent-cyan));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        .stock-pill { font-size: clamp(10px, 1.4cqw, 13px); padding: clamp(4px, 0.9cqw, 7px) clamp(9px, 1.6cqw, 15px); gap: clamp(4px, 0.8cqw, 7px); border: 1px solid transparent; }
        .stock-pill--ok { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.35); color: var(--success); }
        .stock-pill--warn { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.35); color: var(--warning); }
        .stock-pill--out { background: rgba(244,63,94,0.12); border-color: rgba(244,63,94,0.35); color: var(--danger); }
        .stock-dot { width: clamp(5px, 0.8cqw, 8px); height: clamp(5px, 0.8cqw, 8px); background: currentColor; }

        .highlight-row { gap: clamp(6px, 1.1cqw, 12px); margin-top: clamp(12px, 2.2cqw, 24px); }
        .highlight-chip { font-size: clamp(11px, 1.5cqw, 14px); padding: clamp(6px, 1.1cqw, 9px) clamp(11px, 1.7cqw, 17px); gap: clamp(4px, 0.8cqw, 8px); border: 1px solid var(--hairline); background: rgba(255,255,255,0.55); }
        .highlight-label { font-size: clamp(9px, 1.1cqw, 11px); }

        .cta-link {
          margin-top: clamp(18px, 3cqw, 32px);
          font-size: clamp(13px, 1.6cqw, 16px);
          padding: clamp(8px, 1.4cqw, 13px) clamp(16px, 2.4cqw, 26px);
          border: 1px solid var(--hairline-strong);
          color: var(--text-primary);
          background: rgba(255,255,255,0.7);
        }
        .cta-link:hover { border-color: var(--accent-fuchsia); color: var(--accent-fuchsia); box-shadow: 0 0 0 1px var(--accent-fuchsia-soft); }

        @media (prefers-reduced-motion: reduce) {
          [class*="animate-["],
          .scan-sweep,
          .scan-corner,
          .reveal,
          .image-well-img {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <AmbientBackdrop />

      {/* Top bar: counter (left) + filter icon (right), floating panel */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 2xl:px-10 pt-4 sm:pt-5 2xl:pt-8">
        <div className="panel panel--elevated inline-flex items-center gap-2 2xl:gap-3 rounded-full px-3.5 py-2 2xl:px-5 2xl:py-3">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause autoplay" : "Resume autoplay"}
            className="w-6 h-6 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center icon-btn transition-colors duration-150"
          >
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>
          <span className="font-mono text-[12px] 2xl:text-[15px] tabular-nums" style={{ color: "var(--text-muted)" }}>
            {len > 0 ? String(index + 1).padStart(2, "0") : "00"} / {String(len).padStart(2, "0")}
          </span>
        </div>

        <button
          onClick={() => setFilterOpen(true)}
          aria-label="Open display filters"
          className="panel panel--elevated relative inline-flex items-center justify-center w-10 h-10 2xl:w-14 2xl:h-14 rounded-full icon-btn transition-colors duration-150"
        >
          <IconFilter />
          {activeFilterCount > 0 && (
            <span
              className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 2xl:min-w-[20px] 2xl:h-5 px-1 rounded-full text-[10px] 2xl:text-[11px] font-mono font-semibold"
              style={{ background: "linear-gradient(90deg, var(--accent-fuchsia), var(--accent-cyan))", color: "#FFFFFF" }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Autoplay progress rail */}
      {len > 1 && (
        <div className="absolute top-[64px] sm:top-[68px] 2xl:top-[92px] left-4 right-4 sm:left-6 sm:right-6 2xl:left-10 2xl:right-10 z-30 h-[3px] 2xl:h-[4px] rounded-full overflow-hidden" style={{ background: "rgba(15,23,42,0.08)" }}>
          <div
            key={index}
            className="progress-fill h-full w-full origin-left rounded-full"
            style={{
              animationDuration: `${AUTOPLAY_MS}ms`,
              animationPlayState: autoplayRunning ? "running" : "paused",
            }}
            onAnimationEnd={handleProgressComplete}
          />
        </div>
      )}

      {/* Main stage */}
      <div className="w-full h-full flex items-center justify-center pt-14 pb-4 sm:pt-16 sm:pb-6 2xl:pt-20 2xl:pb-10">
        {loading ? (
          <DisplaySkeleton />
        ) : error ? (
          <div className="panel panel--elevated max-w-sm 2xl:max-w-md mx-4 rounded-2xl px-4 py-3 2xl:px-6 2xl:py-4 text-[13px] 2xl:text-[15px] text-center" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : len === 0 ? (
          <div className="max-w-sm 2xl:max-w-md mx-4 text-center">
            <div className="panel panel--elevated w-12 h-12 2xl:w-16 2xl:h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ color: "var(--text-faint)" }}>
              <IconImageOff />
            </div>
            <p className="text-[14px] 2xl:text-[17px] font-medium" style={{ color: "var(--text-primary)" }}>No products match these filters.</p>
            <p className="text-[13px] 2xl:text-[15px] mt-1" style={{ color: "var(--text-faint)" }}>Try a different category or clear a filter.</p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="panel panel--elevated mt-4 rounded-full text-[13px] 2xl:text-[15px] font-medium px-4 py-2 2xl:px-6 2xl:py-3 transition-colors duration-150"
                style={{ color: "var(--text-primary)" }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center">
            {len > 1 && (
              <>
                <button
                  onClick={() => { setSwipeHintVisible(false); goPrev(); }}
                  aria-label="Previous product"
                  className="panel panel--elevated hidden sm:flex absolute left-3 lg:left-6 2xl:left-10 top-1/2 -translate-y-1/2 z-20 w-11 h-11 2xl:w-14 2xl:h-14 rounded-full items-center justify-center icon-btn hover:scale-105 active:scale-95 transition-all duration-150"
                >
                  <IconChevronLeft />
                </button>
                <button
                  onClick={() => { setSwipeHintVisible(false); goNext(); }}
                  aria-label="Next product"
                  className="panel panel--elevated hidden sm:flex absolute right-3 lg:right-6 2xl:right-10 top-1/2 -translate-y-1/2 z-20 w-11 h-11 2xl:w-14 2xl:h-14 rounded-full items-center justify-center icon-btn hover:scale-105 active:scale-95 transition-all duration-150"
                >
                  <IconChevronRight />
                </button>
              </>
            )}

            {len > 1 && (
              <div
                className={`swipe-hint pointer-events-none absolute inset-0 z-10 flex sm:hidden items-center justify-between px-3 transition-opacity duration-500 ${swipeHintVisible ? "opacity-100" : "opacity-0"}`}
                aria-hidden="true"
              >
                <span className="swipe-hint-chevron panel panel--elevated w-9 h-9 rounded-full flex items-center justify-center">
                  <IconChevronLeft />
                </span>
                <span className="swipe-hint-chevron swipe-hint-chevron--right panel panel--elevated w-9 h-9 rounded-full flex items-center justify-center">
                  <IconChevronRight />
                </span>
              </div>
            )}

            {/* 3-slide track */}
            <div
              ref={containerRef}
              className={`swipe-surface w-full h-full overflow-hidden cursor-grab active:cursor-grabbing ${dragging ? "is-dragging" : ""}`}
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
                  <SlideCard key={products[prevIdx]?._id ?? "prev-empty"} product={products[prevIdx]} />
                </div>
                <div className="h-full shrink-0" style={{ width: "33.3333%" }}>
                  <SlideCard key={products[index]?._id ?? "current-empty"} product={products[index]} />
                </div>
                <div className="h-full shrink-0" style={{ width: "33.3333%" }}>
                  <SlideCard key={products[nextIdx]?._id ?? "next-empty"} product={products[nextIdx]} />
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