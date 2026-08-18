// src/components/ProductCard.jsx
//
// Renders only whatever fields are present on `product.pricing` -- never
// assumes purchasePrice/negotiation exist, since customer-facing responses
// never include them (stripped server-side by sanitizeProduct.js).
//
// Restyled to Light Glass Tech: white glass card, fuchsia/cyan gradient
// price (bg-clip-text, per the palette's "signature gradient" usage),
// glass spec pills, fuchsia-tinted hover lift + border + shadow, image
// zoom on hover. Fixed: the "Inactive" badge was absolutely positioned
// inside a non-relative container, so it was anchoring against the page
// rather than the image tile -- the image wrapper is now `relative`.

import { Link } from "react-router-dom";

// A couple of quick-glance spec chips per category, pulled straight off the
// product doc (each field only renders if it's actually present).
const SPEC_FIELDS_BY_CATEGORY = {
  mobile: [
    { key: "ram", suffix: "" },
    { key: "rom", suffix: "" },
    { key: "network", suffix: "" },
  ],
  headphone: [
    { key: "type", suffix: "" },
    { key: "noiseCancellation", label: "ANC", boolOnly: true },
  ],
  charger: [
    { key: "wattage", suffix: "W" },
    { key: "portType", suffix: "" },
  ],
  powerbank: [
    { key: "capacity", suffix: " mAh" },
    { key: "wirelessCharging", label: "Wireless", boolOnly: true },
  ],
};

const ProductCard = ({ product }) => {
  const specFields = SPEC_FIELDS_BY_CATEGORY[product.category] || [];
  const specs = specFields
    .map((f) => {
      const val = product[f.key];
      if (f.boolOnly) return val ? f.label : null;
      if (val === undefined || val === null || val === "") return null;
      return `${val}${f.suffix}`;
    })
    .filter(Boolean);

  return (
    <Link
      to={`/product/${product._id}`}
      className="group block rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-md overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:border-fuchsia-300 hover:shadow-[0_20px_40px_-24px_rgba(217,70,239,0.4)]"
    >
      <div className="relative aspect-square bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50 flex items-center justify-center overflow-hidden">
        {product.images?.[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <span className="font-mono text-[11px] text-slate-400 uppercase tracking-wide">No image</span>
        )}

        {!product.isActive && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur-md border border-slate-200 text-slate-500 text-[10.5px] font-mono uppercase tracking-wide px-2.5 py-1 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Inactive
          </span>
        )}
      </div>

      <div className="p-3.5">
        <p className="text-[11px] text-slate-400 font-mono uppercase tracking-[0.14em] mb-0.5">
          {product.brand}
        </p>
        <h3 className="font-display text-[14.5px] font-semibold text-slate-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-fuchsia-600 transition-colors duration-200">
          {product.name}
        </h3>

        {specs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {specs.map((s) => (
              <span
                key={s}
                className="font-mono text-[10.5px] text-slate-500 bg-white/70 backdrop-blur-md border border-slate-200 rounded-full px-2.5 py-0.5"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        <p className="font-mono text-[15px] font-bold bg-gradient-to-r from-fuchsia-600 to-cyan-600 bg-clip-text text-transparent">
          ₹{product.pricing?.sellingPrice?.toLocaleString("en-IN")}
        </p>
      </div>
    </Link>
  );
};

export default ProductCard;