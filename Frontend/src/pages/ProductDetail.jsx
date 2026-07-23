// src/pages/ProductDetail.jsx
//
// Route target for /product/:id. Unlike ProductCard.jsx (a presentational
// component that expects `product` as a prop, used inside the shop grid),
// this page owns the fetch: it reads `id` from the URL, calls
// GET /api/v1/products/:id, and handles loading/error/not-found states.
//
// NOTE: this is a catalog page, not a checkout flow -- there is no cart,
// no shipping/delivery messaging, and no buy button. The only "action"
// info shown is that warranty service is handled in person at an
// authorized service centre.
//
// LAYOUT NOTE: this deliberately avoids CSS grid with arbitrary
// multi-track templates (e.g. grid-cols-[64px_1fr_1fr]) and avoids
// `aspect-[..]` + `absolute inset-0` for the hero image. Both are fragile
// across Tailwind configs/build setups and were the cause of a real bug
// where the image rendered as an absolutely-positioned block that
// overlapped the info column instead of sitting beside it. Plain flexbox
// with an explicit pixel height on the image well is used instead --
// it degrades predictably with no dependency on grid-template parsing.

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api/axios";

// Which raw schema fields to show as a spec table per category. Keys map
// straight onto the product document -- same source as SPEC_FIELDS_BY_CATEGORY
// in ProductCard.jsx, just fuller since there's room for it here.
const SPEC_FIELDS_BY_CATEGORY = {
  mobile: [
    ["company", "Brand"],
    ["ram", "RAM"],
    ["rom", "Storage"],
    ["network", "Network"],
    ["processor", "Processor"],
    ["batteryCapacity", "Battery"],
    ["displaySize", "Display"],
    ["color", "Color"],
  ],
  headphone: [
    ["type", "Type"],
    ["bluetoothVersion", "Bluetooth"],
    ["batteryLife", "Battery life"],
    ["noiseCancellation", "Noise cancellation"],
    ["waterResistance", "Water resistance"],
    ["color", "Color"],
  ],
  charger: [
    ["wattage", "Wattage"],
    ["portType", "Port type"],
    ["chargingType", "Charging type"],
    ["fastChargingSupport", "Fast charging"],
    ["numberOfPorts", "Ports"],
  ],
  powerbank: [
    ["capacity", "Capacity"],
    ["outputPorts", "Output ports"],
    ["inputPortType", "Input port"],
    ["outputPortType", "Output port(s)"],
    ["chargingType", "Charging type"],
    ["wattageOutput", "Output wattage"],
    ["fastChargingSupport", "Fast charging"],
    ["wirelessCharging", "Wireless charging"],
    ["displayType", "Display"],
    ["color", "Color"],
  ],
};

const formatValue = (val) => {
  if (val === true) return "Yes";
  if (val === false) return "No";
  if (Array.isArray(val)) return val.join(", ");
  return val;
};

const formatINR = (n) => (n || n === 0 ? `\u20B9${n.toLocaleString("en-IN")}` : "");

/* ---------------------------------------------------------------------- */
/* Icons                                                                   */
/* ---------------------------------------------------------------------- */

const IconArrowLeft = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" {...props}>
    <path d="M12 5 6 10l6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChevronLeft = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" {...props}>
    <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChevronRight = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" {...props}>
    <path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconImageOff = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="22" height="22" {...props}>
    <path d="M3 4h11l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M6.5 9.5A1.5 1.5 0 1 0 6.5 6.5a1.5 1.5 0 0 0 0 3ZM3 14.5l4-4 3 3 3-3.5 4 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconShield = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="18" height="18" {...props}>
    <path
      d="M10 2.5 16 4.8v4.3c0 3.9-2.5 6.9-6 8.4-3.5-1.5-6-4.5-6-8.4V4.8L10 2.5Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path d="M7.3 9.8 9.2 11.7 12.8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconMaximize = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" {...props}>
    <path
      d="M7 3H4a1 1 0 0 0-1 1v3M13 3h3a1 1 0 0 1 1 1v3M17 13v3a1 1 0 0 1-1 1h-3M3 13v3a1 1 0 0 0 1 1h3"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ---------------------------------------------------------------------- */
/* Skeleton (shimmer, matching ShopPage's animation)                      */
/* ---------------------------------------------------------------------- */

const Shimmer = ({ className = "" }) => (
  <div className={`relative overflow-hidden bg-[#F1F1EE] ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

const DetailSkeleton = () => (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8">
    <Shimmer className="h-4 w-28 rounded mb-6" />
    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
      <div className="hidden md:flex flex-col gap-3 w-16 shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="w-[64px] h-[64px] rounded-xl" />
        ))}
      </div>
      <Shimmer className="rounded-2xl w-full md:w-[46%] h-[320px] sm:h-[400px] lg:h-[460px] shrink-0" />
      <div className="flex-1 min-w-0">
        <Shimmer className="h-3 w-24 rounded mb-3" />
        <Shimmer className="h-6 w-3/4 rounded mb-3" />
        <Shimmer className="h-8 w-1/3 rounded mb-5" />
        <Shimmer className="h-16 w-full rounded mb-4" />
        <Shimmer className="h-14 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

/* ---------------------------------------------------------------------- */
/* Lightbox — full, uncropped view of the active image                    */
/* ---------------------------------------------------------------------- */

const Lightbox = ({ src, alt, onClose }) => (
  <div
    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 fade-in"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
  >
    <button
      onClick={onClose}
      aria-label="Close"
      className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20"
    >
      ✕
    </button>
    <img
      src={src}
      alt={alt}
      onClick={(e) => e.stopPropagation()}
      className="max-w-full max-h-full w-auto h-auto object-contain select-none"
    />
  </div>
);

/* ---------------------------------------------------------------------- */
/* Page                                                                    */
/* ---------------------------------------------------------------------- */

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setActiveImage(0);

    API.get(`/api/v1/products/${id}`, { withCredentials: true })
      .then((res) => {
        if (!cancelled) setProduct(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.status === 404
              ? "This product doesn't exist or is no longer available."
              : err.response?.data?.message || "Failed to load product."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Esc to close the lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => e.key === "Escape" && setLightboxOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  if (loading) return <DetailSkeleton />;

  if (error || !product) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-[#F6F7F3] border border-[#E5E7EA] flex items-center justify-center mx-auto mb-4 text-[#9CA0A6]">
          <IconImageOff />
        </div>
        <p className="text-[15px] text-[#14171C] font-medium mb-2">
          {error || "Product not found."}
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 mt-2 text-[13.5px] font-medium text-[#2F5DFF] hover:underline"
        >
          <IconArrowLeft />
          Back to shop
        </Link>
      </div>
    );
  }

  const specFields = SPEC_FIELDS_BY_CATEGORY[product.category] || [];
  const images = product.images || [];
  const hasMultipleImages = images.length > 1;
  const inStock = product.stock > 0;
  const lowStock = inStock && product.stock <= 3;

  const visibleSpecs = specFields.filter(([key]) => {
    const val = product[key];
    return val !== undefined && val !== null && val !== "";
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-4 md:py-8">
      <style>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 0.25s ease both; }
      `}</style>

      {lightboxOpen && images[activeImage]?.url && (
        <Lightbox
          src={images[activeImage].url}
          alt={product.name}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-4 md:mb-6 text-[13px]">
        <Link to="/shop" className="text-[#4B4F57] hover:text-[#14171C] transition-colors">
          Shop
        </Link>
        {product.category && (
          <>
            <span className="text-[#D8DADD]">/</span>
            <Link
              to={`/shop?category=${product.category}`}
              className="text-[#4B4F57] hover:text-[#14171C] transition-colors capitalize"
            >
              {product.category}
            </Link>
          </>
        )}
        <span className="text-[#D8DADD]">/</span>
        <span className="text-[#9CA0A6] truncate max-w-[160px] sm:max-w-xs">{product.name}</span>
      </div>

      {/* Main layout: plain flex row on desktop, stacked on mobile.
          Each column has an explicit width/basis so nothing can overlap. */}
      <div className="flex flex-col md:flex-row gap-5 lg:gap-8 items-start">
        {/* Thumbnail rail — desktop only, sits left of the main image */}
        {hasMultipleImages && (
          <div className="hidden md:flex flex-col gap-2.5 w-16 shrink-0">
            {images.map((img, i) => (
              <button
                key={img.publicId || i}
                type="button"
                onClick={() => setActiveImage(i)}
                aria-label={`View image ${i + 1}`}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 bg-[#F6F7F3] transition-all duration-150 ${
                  i === activeImage
                    ? "border-[#2F5DFF] shadow-[0_0_0_3px_rgba(47,93,255,0.12)]"
                    : "border-[#E5E7EA] opacity-70 hover:opacity-100 hover:border-[#D8DADD]"
                }`}
              >
                <img src={img.url} alt="" className="w-full h-full object-contain p-1" />
              </button>
            ))}
          </div>
        )}

        {/* Main gallery — fixed pixel height, never overlaps the info column
            because it's a normal flex child with its own width, not an
            absolutely positioned overlay. */}
        <div className="w-full md:w-[44%] lg:w-[42%] shrink-0">
          <div
            role="button"
            tabIndex={0}
            onClick={() => images[activeImage]?.url && setLightboxOpen(true)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && images[activeImage]?.url) {
                setLightboxOpen(true);
              }
            }}
            className="group relative w-full h-[320px] sm:h-[400px] lg:h-[460px] rounded-2xl bg-gradient-to-b from-[#FAFAF8] to-[#F1F2EE] border border-[#E5E7EA] overflow-hidden cursor-zoom-in flex items-center justify-center"
          >
            {images[activeImage]?.url ? (
              <>
                <img
                  key={activeImage}
                  src={images[activeImage].url}
                  alt={product.name}
                  className="max-w-full max-h-full w-auto h-auto object-contain p-6 sm:p-8 transition-transform duration-300 ease-out group-hover:scale-[1.04] fade-in"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxOpen(true);
                  }}
                  aria-label="View full image"
                  className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/95 border border-[#E5E7EA] flex items-center justify-center text-[#4B4F57] hover:bg-white hover:text-[#14171C] shadow-sm opacity-0 group-hover:opacity-100 md:opacity-90 transition-opacity"
                >
                  <IconMaximize />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-[#9CA0A6]">
                <IconImageOff />
                <span className="text-[12px]">No image available</span>
              </div>
            )}

            {!product.isActive && (
              <span className="absolute top-3 left-3 rounded-full bg-black/70 backdrop-blur text-white text-[11px] font-medium px-2.5 py-1">
                Currently unavailable
              </span>
            )}

            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage((p) => (p === 0 ? images.length - 1 : p - 1));
                  }}
                  aria-label="Previous image"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-[#E5E7EA] flex items-center justify-center text-[#14171C] hover:bg-white shadow-sm"
                >
                  <IconChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage((p) => (p === images.length - 1 ? 0 : p + 1));
                  }}
                  aria-label="Next image"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-[#E5E7EA] flex items-center justify-center text-[#14171C] hover:bg-white shadow-sm"
                >
                  <IconChevronRight />
                </button>
                <span className="absolute bottom-3 left-3 rounded-full bg-black/60 backdrop-blur text-white text-[11px] font-medium px-2 py-0.5">
                  {activeImage + 1} / {images.length}
                </span>
              </>
            )}
          </div>

          {/* Thumbnail strip — mobile only, scrolls under the main image */}
          {hasMultipleImages && (
            <div className="flex md:hidden items-center gap-2 mt-2.5 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.publicId || i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`shrink-0 w-[54px] h-[54px] rounded-lg overflow-hidden border-2 bg-[#F6F7F3] transition-colors ${
                    i === activeImage ? "border-[#2F5DFF]" : "border-[#E5E7EA]"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info panel — its own flex child, full width on mobile, remaining
            space on desktop. No absolute/sticky trick to avoid another
            source of overlap; a top margin is used instead. */}
        <div className="w-full flex-1 min-w-0 mt-1 md:mt-0">
          {product.brand && (
            <p className="text-[12px] font-medium text-[#9CA0A6] uppercase tracking-wide mb-1">
              {product.brand}
            </p>
          )}
          <h1 className="font-display text-[19px] sm:text-[23px] font-semibold text-[#14171C] tracking-tight leading-snug">
            {product.name}
          </h1>

          <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
            <p className="text-[24px] font-semibold text-[#FF5630]">
              {formatINR(product.pricing?.sellingPrice)}
            </p>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium ${
                inStock
                  ? lowStock
                    ? "bg-[#FAEEDA] text-[#854F0B]"
                    : "bg-[#EAF3DE] text-[#3B6D11]"
                  : "bg-[#FBEAE7] text-[#C0402E]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  inStock ? (lowStock ? "bg-[#EF9F27]" : "bg-[#639922]") : "bg-[#C0402E]"
                }`}
              />
              {inStock
                ? lowStock
                  ? `Only ${product.stock} left`
                  : "In stock"
                : "Out of stock"}
            </span>
          </div>

          {/* Admin-only pricing -- only renders if the backend actually sent
              these fields, i.e. the requester was authenticated as admin */}
          {product.pricing?.purchasePrice !== undefined && (
            <div className="mt-3 rounded-lg bg-[#F6F7F3] border border-[#E5E7EA] px-3.5 py-2.5 text-[12.5px] text-[#4B4F57] space-y-1">
              <p className="flex justify-between">
                <span className="text-[#9CA0A6]">Purchase price</span>
                <span className="font-medium text-[#14171C]">
                  {formatINR(product.pricing.purchasePrice)}
                </span>
              </p>
              {product.pricing?.negotiation && (
                <p className="flex justify-between">
                  <span className="text-[#9CA0A6]">Negotiation range</span>
                  <span className="font-medium text-[#14171C]">
                    {formatINR(product.pricing.negotiation.minPrice)} – {formatINR(product.pricing.negotiation.maxPrice)}
                  </span>
                </p>
              )}
            </div>
          )}

          {product.description && (
            <p className="text-[13px] leading-relaxed text-[#4B4F57] mt-3.5">
              {product.description}
            </p>
          )}

          {/* Warranty & service — this is a catalog, not a storefront, so the
              only "next step" info shown is where warranty work happens */}
          <div className="flex items-start gap-2.5 mt-4 rounded-xl border border-[#E5E7EA] px-3.5 py-3 bg-[#F6F7F3]">
            <span className="text-[#639922] mt-0.5 shrink-0">
              <IconShield />
            </span>
            <div>
              <p className="text-[12.5px] font-medium text-[#14171C]">Warranty service</p>
              <p className="text-[11.5px] text-[#9CA0A6] mt-0.5 leading-snug">
                Warranty support is handled only at our authorized service centre.
              </p>
            </div>
          </div>

          {/* Spec card */}
          {visibleSpecs.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#E5E7EA] px-4 py-1">
              <h3 className="text-[10px] font-mono font-semibold uppercase tracking-[0.08em] text-[#9CA0A6] pt-3 pb-1">
                Specifications
              </h3>
              <dl>
                {visibleSpecs.map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 border-t border-[#F1F1EE]"
                  >
                    <dt className="text-[12.5px] text-[#9CA0A6]">{label}</dt>
                    <dd className="text-[12.5px] font-medium text-[#14171C] text-right">
                      {formatValue(product[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;