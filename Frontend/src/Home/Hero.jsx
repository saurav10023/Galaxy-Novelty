import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

const PhoneGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-20 h-20 sm:w-24 sm:h-24" fill="none">
    <rect x="14" y="4" width="36" height="56" rx="6" stroke="#14171C" strokeWidth="2.5" />
    <rect x="19" y="12" width="26" height="36" rx="1.5" fill="#F5590A" opacity="0.12" />
    <circle cx="32" cy="53" r="2.4" fill="#14171C" />
    <circle cx="41" cy="9" r="1.6" fill="#14171C" />
  </svg>
);

const ChevronIcon = ({ dir = "right" }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path
      d={dir === "right" ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowUpRight = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const buildSpecChips = (p) => {
  const chips = [];
  if (p.ram) chips.push(`${p.ram} RAM`);
  if (p.storage) chips.push(`${p.storage}`);
  if (p.network) chips.push(p.network);
  if (p.batteryCapacity) chips.push(`${p.batteryCapacity}`);
  if (p.connectivity) chips.push(p.connectivity);
  return chips.slice(0, 3);
};

const Hero = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchFeatured = async () => {
      setLoading(true);
      try {
        const res = await API.get("/api/v1/products?limit=6");
        const list = res?.data?.data?.products || res?.data?.data || [];
        setProducts(Array.isArray(list) ? list.slice(0, 6) : []);
      } catch (err) {
        console.error("Failed to load featured products", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    if (products.length < 2) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % products.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [products.length]);

  const goTo = (i) => {
    clearInterval(timerRef.current);
    setActive(i);
  };
  const prev = () => goTo((active - 1 + products.length) % products.length);
  const next = () => goTo((active + 1) % products.length);

  const current = products[active];

  const handleCardClick = () => {
    if (!current?._id) return;
    navigate(`/product/${current._id}`); // adjust to your actual route
  };

  return (
    <section className="relative overflow-hidden bg-[#F3F4F1]">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 pt-12 pb-14 sm:pt-16 sm:pb-20 md:pt-24 md:pb-32 grid md:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-center">
        {/* Left column — thesis */}
        <div className="max-w-xl text-center md:text-left mx-auto md:mx-0">
          <span className="inline-flex items-center gap-2 font-mono text-[10.5px] sm:text-[11px] tracking-[0.16em] uppercase text-[#F5590A] bg-[#FFF1E8] border border-[#F5590A]/20 rounded-full px-3.5 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5590A]" />
            Mobiles · Accessories · No Hidden Markup
          </span>

          <h1 className="font-display text-[2.25rem] leading-[1.08] sm:text-[2.75rem] sm:leading-[1.05] md:text-[3.75rem] md:leading-[1.02] text-[#14171C] tracking-tight">
            Every price you see
            <br />
            is the price you pay.
          </h1>

          <p className="mt-5 sm:mt-6 text-[15.5px] sm:text-[17px] leading-relaxed text-[#4B4F57] max-w-md mx-auto md:mx-0">
            Browse real specs and real prices on every phone, charger,
            power bank and pair of headphones in store — updated the
            moment stock changes, no asterisks.
          </p>

          <div className="mt-8 sm:mt-9 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 sm:gap-4">
            <a
              href="/shop"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-[#14171C] text-white text-[14.5px] sm:text-[15px] font-medium px-6 sm:px-7 py-3 sm:py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F5590A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5590A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3F4F1]"
            >
              Browse the catalog
              <ArrowUpRight />
            </a>
            <a
              href="/shop?category=mobile"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-[#D8DAD3] bg-white/60 text-[#14171C] text-[14.5px] sm:text-[15px] font-medium px-6 sm:px-7 py-3 sm:py-3.5 transition-colors duration-200 hover:border-[#F5590A] hover:text-[#F5590A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5590A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3F4F1]"
            >
              Shop mobiles
            </a>
          </div>

          <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 font-mono text-[11.5px] sm:text-[12px] text-[#6B7280]">
            <span>4G / 5G</span>
            <span className="w-1 h-1 rounded-full bg-[#F5590A]/40" />
            <span>Genuine accessories</span>
            <span className="w-1 h-1 rounded-full bg-[#F5590A]/40" />
            <span>In-store pickup</span>
          </div>
        </div>

        {/* Right column — image panel + unified info bar (no overlapping cards) */}
        <div className="w-full max-w-[400px] mx-auto md:mx-0 md:max-w-none">
          {/* Image panel */}
          <div className="relative rounded-[24px] sm:rounded-[28px] bg-gradient-to-br from-[#FFE4D1] via-[#FFF1E8] to-white border border-[#F5590A]/15 overflow-hidden aspect-[5/4] sm:aspect-[16/10] md:aspect-[4/3] shadow-[0_24px_60px_-28px_rgba(245,89,10,0.35)]">
            <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-[#F5590A]/15 blur-3xl" aria-hidden="true" />
            <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-white/60 blur-3xl" aria-hidden="true" />

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-2xl bg-white/70 animate-pulse" />
              </div>
            ) : !current ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <PhoneGlyph />
                <p className="mt-4 text-[13px] text-[#6B7280]">No products to show yet.</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCardClick}
                aria-label={`View ${current.name}`}
                className="group absolute inset-0 flex items-center justify-center focus:outline-none"
              >
                {current.images?.[0]?.url ? (
                  <img
                    src={current.images[0].url}
                    alt={current.name}
                    className="w-[52%] max-h-[68%] object-contain drop-shadow-[0_20px_36px_rgba(20,23,28,0.2)] transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span className="transition-transform duration-500 group-hover:scale-105">
                    <PhoneGlyph />
                  </span>
                )}
              </button>
            )}

            {/* Stock badge */}
            {current && !loading && (
              <span className="absolute top-4 left-4 font-mono text-[9.5px] sm:text-[10px] uppercase tracking-wider text-[#F5590A] bg-white/90 backdrop-blur border border-white shadow-sm rounded-full px-3 py-1.5">
                {current.stock > 0 ? "In stock" : "Out of stock"}
              </span>
            )}

            {/* Slider arrows */}
            {products.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous product"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur border border-white text-[#4B4F57] hover:text-[#F5590A] shadow-sm flex items-center justify-center transition-colors duration-150"
                >
                  <ChevronIcon dir="left" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next product"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur border border-white text-[#4B4F57] hover:text-[#F5590A] shadow-sm flex items-center justify-center transition-colors duration-150"
                >
                  <ChevronIcon dir="right" />
                </button>
              </>
            )}
          </div>

          {/* Unified info bar — sits directly below the panel, no overlap */}
          {current && !loading && (
            <button
              type="button"
              onClick={handleCardClick}
              className="group w-full mt-4 flex items-center justify-between gap-4 rounded-2xl bg-white border border-[#E1E3DD] shadow-[0_10px_30px_-16px_rgba(20,23,28,0.2)] px-4 sm:px-5 py-3.5 sm:py-4 text-left transition-all duration-200 hover:border-[#F5590A]/40 hover:-translate-y-0.5"
            >
              <div className="min-w-0">
                <p className="font-display text-[14.5px] sm:text-[15.5px] text-[#14171C] leading-tight truncate">
                  {current.name}
                </p>
                <p className="text-[11.5px] sm:text-[12px] text-[#6B7280] mt-0.5 capitalize truncate">
                  {current.brand}
                  {current.category ? ` · ${current.category}` : ""}
                </p>
                {buildSpecChips(current).length > 0 && (
                  <div className="hidden sm:flex flex-wrap gap-1 mt-2">
                    {buildSpecChips(current).map((chip) => (
                      <span
                        key={chip}
                        className="font-mono text-[9.5px] text-[#4B4F57] border border-[#E1E3DD] rounded-full px-2 py-0.5"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 text-right">
                <p className="font-mono text-[9.5px] uppercase tracking-wider text-[#6B7280]">Store price</p>
                <p className="font-mono text-lg sm:text-xl text-[#14171C] mt-0.5">
                  ₹{Number(current.pricing?.sellingPrice ?? 0).toLocaleString("en-IN")}
                </p>
              </div>
            </button>
          )}

          {/* Dots */}
          {products.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-5">
              {products.map((p, i) => (
                <button
                  key={p._id || i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show product ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === active ? "w-5 bg-[#F5590A]" : "w-1.5 bg-[#D8DAD3] hover:bg-[#F5590A]/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;