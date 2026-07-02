// src/pages/ProductDetail.jsx
//
// Route target for /product/:id. Unlike ProductCard.jsx (a presentational
// component that expects `product` as a prop, used inside the shop grid),
// this page owns the fetch: it reads `id` from the URL, calls
// GET /api/v1/products/:id, and handles loading/error/not-found states.

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

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-16">
        <p className="text-[13.5px] text-[#4B4F57]">Loading…</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-16 text-center">
        <p className="text-[15px] text-[#14171C] font-medium mb-2">
          {error || "Product not found."}
        </p>
        <Link to="/shop" className="text-[13.5px] font-medium text-[#2F5DFF] hover:underline">
          Back to shop
        </Link>
      </div>
    );
  }

  const specFields = SPEC_FIELDS_BY_CATEGORY[product.category] || [];
  const images = product.images || [];

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
      <Link to="/shop" className="text-[13px] font-medium text-[#4B4F57] hover:text-[#14171C]">
        ← Back to shop
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-5">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-xl bg-[#F6F7F3] border border-[#E1E3DD] overflow-hidden flex items-center justify-center">
            {images[activeImage]?.url ? (
              <img
                src={images[activeImage].url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-mono text-[11px] text-[#9CA0A6] uppercase">No image</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.map((img, i) => (
                <button
                  key={img.publicId || i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border ${
                    i === activeImage ? "border-[#2F5DFF]" : "border-[#E1E3DD]"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="font-mono text-[12px] text-[#9CA0A6] uppercase tracking-wide mb-1">
            {product.brand}
          </p>
          <h1 className="font-display text-[24px] font-semibold text-[#14171C] tracking-tight mb-2">
            {product.name}
          </h1>

          {!product.isActive && (
            <span className="inline-block mb-3 rounded-full bg-[#F1F1EE] text-[#4B4F57] text-[11px] font-medium px-2.5 py-1">
              Currently unavailable
            </span>
          )}

          <p className="font-mono text-[26px] font-semibold text-[#14171C] mb-1">
            ₹{product.pricing?.sellingPrice?.toLocaleString("en-IN")}
          </p>

          {/* Admin-only pricing -- only renders if the backend actually sent
              these fields, i.e. the requester was authenticated as admin */}
          {product.pricing?.purchasePrice !== undefined && (
            <div className="font-mono text-[12.5px] text-[#9CA0A6] mb-4 space-y-0.5">
              <p>Purchase price: ₹{product.pricing.purchasePrice.toLocaleString("en-IN")}</p>
              {product.pricing?.negotiation && (
                <p>
                  Negotiation range: ₹{product.pricing.negotiation.minPrice?.toLocaleString("en-IN")} – ₹
                  {product.pricing.negotiation.maxPrice?.toLocaleString("en-IN")}
                </p>
              )}
            </div>
          )}

          <p className="text-[13.5px] text-[#4B4F57] mb-2">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>

          {/* Spec table */}
          {specFields.length > 0 && (
            <div className="mt-6 border-t border-[#E1E3DD] pt-5">
              <h3 className="font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6] mb-3">
                Specifications
              </h3>
              <dl className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                {specFields.map(([key, label]) => {
                  const val = product[key];
                  if (val === undefined || val === null || val === "") return null;
                  return (
                    <div key={key} className="contents">
                      <dt className="text-[13px] text-[#9CA0A6]">{label}</dt>
                      <dd className="text-[13px] text-[#14171C] font-medium">{formatValue(val)}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;