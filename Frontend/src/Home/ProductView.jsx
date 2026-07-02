import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";

const CATEGORIES = [
  {
    key: "mobile",
    label: "Mobiles",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <rect x="6" y="2" width="12" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="18.4" r="0.9" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "headphone",
    label: "Headphones",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <path d="M4 13v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="3" y="13" width="4.5" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
        <rect x="16.5" y="13" width="4.5" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    key: "charger",
    label: "Chargers",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "powerbank",
    label: "Power Banks",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <rect x="7" y="4" width="10" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <rect x="10" y="1.5" width="4" height="2.5" rx="0.6" fill="currentColor" />
        <path d="M12.6 9.5 10 14h2.4l-1 4.5 3.6-5.5h-2.4l1-3.5Z" fill="currentColor" />
      </svg>
    ),
  },
];

const SpecChip = ({ children }) => (
  <span className="font-mono text-[10.5px] text-[#4B4F57] border border-[#E1E3DD] rounded-full px-2 py-0.5">
    {children}
  </span>
);

const ProductCardSkeleton = () => (
  <div className="rounded-xl border border-[#E1E3DD] bg-white overflow-hidden animate-pulse">
    <div className="h-40 bg-[#EEEFEA]" />
    <div className="p-4 space-y-2.5">
      <div className="h-3 w-2/3 bg-[#EEEFEA] rounded" />
      <div className="h-3 w-1/3 bg-[#EEEFEA] rounded" />
      <div className="h-5 w-1/2 bg-[#EEEFEA] rounded mt-3" />
    </div>
  </div>
);

const ProductCard = ({ product }) => {
  const image = product?.images?.[0]?.url;
  const price = product?.pricing?.sellingPrice;

  const specs = [
    product?.ram,
    product?.network,
    product?.type,
    product?.chargingType,
    product?.capacity ? `${product.capacity}mAh` : null,
  ].filter(Boolean);

  return (
    <Link
      to={`/product/${product._id}`}
      className="group rounded-xl border border-[#E1E3DD] bg-white overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-24px_rgba(20,23,28,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5DFF]"
    >
      <div className="h-40 bg-[#F6F7F3] flex items-center justify-center overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="font-mono text-[11px] text-[#B8BBB3]">No image</span>
        )}
      </div>

      <div className="p-4">
        <p className="text-[13px] text-[#6B7280]">{product.brand}</p>
        <p className="font-display text-[15px] text-[#14171C] leading-snug mt-0.5 line-clamp-1">
          {product.name}
        </p>

        {specs.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {specs.slice(0, 3).map((s, i) => (
              <SpecChip key={i}>{s}</SpecChip>
            ))}
          </div>
        )}

        <div className="mt-3.5 pt-3.5 border-t border-[#EFEFEA] flex items-baseline justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B7280]">Price</span>
          <span className="font-mono text-lg text-[#14171C]">
            {price ? `₹${price.toLocaleString("en-IN")}` : "—"}
          </span>
        </div>
      </div>
    </Link>
  );
};

const ProductView = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ignore = false;

    const fetchFeatured = async () => {
      try {
        const res = await API.get("/api/v1/products/search", {
          params: { sort: "newest", limit: 8 },
        });
        if (!ignore) setProducts(res.data?.data?.products || []);
      } catch (err) {
        if (!ignore) setError(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchFeatured();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="bg-[#F3F4F1] py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Category shelf */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#6B7280] mb-2">
              Shop by category
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-[#14171C]">
              Find what you're after
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              to={`/shop?category=${cat.key}`}
              className="group flex items-center gap-3 rounded-xl border border-[#E1E3DD] bg-white px-5 py-5 transition-all duration-200 hover:border-[#14171C] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5DFF]"
            >
              <span className="text-[#2F5DFF]">{cat.icon}</span>
              <span className="font-medium text-[14.5px] text-[#14171C]">{cat.label}</span>
            </Link>
          ))}
        </div>

        {/* Featured products */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#6B7280] mb-2">
              Just in
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-[#14171C]">
              Recently added
            </h2>
          </div>
          <Link
            to="/shop"
            className="hidden sm:inline-flex font-mono text-[12px] uppercase tracking-wider text-[#2F5DFF] hover:underline underline-offset-4"
          >
            View all →
          </Link>
        </div>

        {error ? (
          <p className="text-[14px] text-[#6B7280] font-mono">
            Couldn't load products right now — try refreshing.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductView;