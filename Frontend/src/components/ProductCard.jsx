// src/components/ProductCard.jsx
//
// Renders only whatever fields are present on `product.pricing` -- never
// assumes purchasePrice/negotiation exist, since customer-facing responses
// never include them (stripped server-side by sanitizeProduct.js).

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
      className="group block rounded-xl border border-[#E1E3DD] bg-white overflow-hidden hover:border-[#14171C] transition-colors duration-150"
    >
      <div className="aspect-square bg-[#F6F7F3] flex items-center justify-center overflow-hidden">
        {product.images?.[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
          />
        ) : (
          <span className="font-mono text-[11px] text-[#9CA0A6] uppercase">No image</span>
        )}
        {!product.isActive && (
          <span className="absolute mt-2 ml-2 self-start rounded-full bg-[#F1F1EE] text-[#4B4F57] text-[10.5px] font-medium px-2 py-0.5">
            Inactive
          </span>
        )}
      </div>

      <div className="p-3.5">
        <p className="text-[12px] text-[#9CA0A6] font-mono uppercase tracking-wide mb-0.5">
          {product.brand}
        </p>
        <h3 className="text-[14.5px] font-medium text-[#14171C] leading-snug mb-1.5 line-clamp-2">
          {product.name}
        </h3>

        {specs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {specs.map((s) => (
              <span
                key={s}
                className="font-mono text-[10.5px] text-[#4B4F57] bg-[#F6F7F3] border border-[#E1E3DD] rounded-full px-2 py-0.5"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        <p className="font-mono text-[15px] font-semibold text-[#14171C]">
          ₹{product.pricing?.sellingPrice?.toLocaleString("en-IN")}
        </p>
      </div>
    </Link>
  );
};

export default ProductCard;