import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

/* ---------------------------------------------------------------------- */
/* Design note                                                             */
/* ---------------------------------------------------------------------- */
// This hero's thesis is the store's pricing promise ("every price you see
// is the price you pay"), so the signature element is a literal price TAG:
// a die-cut ticket card with a punch hole, a perforated tear line, and a
// footer stub that reads like a real shelf tag. The featured product
// rotates through it; a mono ticker strip up top carries the store's
// trust signals like retail signage. Everything else stays quiet so that
// one idea reads clearly.

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

const PhoneGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20" fill="none">
    <rect x="14" y="4" width="36" height="56" rx="6" stroke="#14171C" strokeWidth="2.5" />
    <rect x="19" y="12" width="26" height="36" rx="1.5" fill="#F5590A" opacity="0.12" />
    <circle cx="32" cy="53" r="2.4" fill="#14171C" />
    <circle cx="41" cy="9" r="1.6" fill="#14171C" />
  </svg>
);

const TICKER_ITEMS = [
  "No hidden markup",
  "Genuine accessories",
  "4G / 5G ready",
  "In-store pickup",
  "Prices update live",
];

const buildSpecChips = (p) => {
  const chips = [];
  if (p.ram) chips.push(`${p.ram} RAM`);
  if (p.storage) chips.push(`${p.storage}`);
  if (p.network) chips.push(p.network);
  if (p.batteryCapacity) chips.push(`${p.batteryCapacity}`);
  if (p.connectivity) chips.push(p.connectivity);
  return chips.slice(0, 3);
};

const formatINR = (n) => `\u20B9${Number(n ?? 0).toLocaleString("en-IN")}`;

const Hero = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchFeatured = async () => {
      setLoading(true);
      try {
        const res = await API.get("/api/v1/products/search?limit=6");
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
    if (products.length < 2 || paused) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % products.length);
    }, 4200);
    return () => clearInterval(timerRef.current);
  }, [products.length, paused]);

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
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tagIn {
          0% { opacity: 0; transform: translateY(-34px) scale(0.96); }
          55% { opacity: 1; transform: translateY(7px) scale(1.008); }
          80% { transform: translateY(-2px) scale(1); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes priceIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes pulseDot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.35); }
          50% { box-shadow: 0 0 0 5px rgba(22,163,74,0); }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(5px); }
        }
        @keyframes shimmerSweep {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        @keyframes spinRing {
          to { transform: rotate(360deg); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2.5px); }
        }
        @keyframes glyphPulse {
          0%, 100% { opacity: 0.5; transform: scale(0.96); }
          50% { opacity: 0.9; transform: scale(1); }
        }
        .stagger { opacity: 0; animation: fadeUp 0.7s cubic-bezier(.16,1,.3,1) both; }
        .tag-card { animation: tagIn 0.75s cubic-bezier(.2,.8,.3,1.15) both; }
        .tag-card:hover, .tag-card:focus-within { transform: translateY(-4px) !important; }
        .price-key { animation: priceIn 0.45s cubic-bezier(.16,1,.3,1) both; }
        .marquee-track { animation: marquee 22s linear infinite; }
        @keyframes pulseDotOrange {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,89,10,0.35); }
          50% { box-shadow: 0 0 0 5px rgba(245,89,10,0); }
        }
        .live-dot { animation: pulseDot 2s ease-out infinite; }
        .live-dot-orange { animation: pulseDotOrange 2s ease-out infinite; }
        .bob { animation: bob 2.4s ease-in-out infinite; }
        .shimmer-sweep { animation: shimmerSweep 1.6s ease-in-out infinite; }
        .spin-ring { animation: spinRing 1.1s linear infinite; }
        .dot-bounce { animation: dotBounce 1.2s ease-in-out infinite; }
        .glyph-pulse { animation: glyphPulse 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .stagger, .tag-card, .price-key { animation: none !important; opacity: 1 !important; transform: none !important; }
          .marquee-track, .live-dot, .bob, .shimmer-sweep, .spin-ring, .dot-bounce, .glyph-pulse { animation: none !important; }
        }
      `}</style>

      {/* Signage strip — store-ticker, sits above the fold like real signage */}
      <div className="relative bg-[#14171C] text-[#F3F4F1] overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 flex items-stretch">
          {/* Fixed indicator — doesn't scroll, anchors the strip */}
          <div className="hidden sm:flex items-center gap-2 shrink-0 py-2 pr-4 mr-4 border-r border-white/10">
            <span className="relative w-1.5 h-1.5 rounded-full bg-[#F5590A]">
              <span className="absolute inset-0 rounded-full bg-[#F5590A] live-dot-orange" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">
              Live
            </span>
          </div>

          {/* Scrolling ticker — single continuous track, edges fade instead of hard-cutting */}
          <div
            className="relative flex-1 min-w-0 overflow-hidden py-2"
            style={{
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
              maskImage:
                "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
            }}
          >
            <div className="flex whitespace-nowrap marquee-track w-max">
              {TICKER_ITEMS.concat(TICKER_ITEMS).map((item, i) => (
                <span
                  key={i}
                  className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.16em] px-4 text-[#F3F4F1]/85"
                >
                  {item}
                  <span className="w-1 h-1 rounded-full bg-[#F5590A]" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 pt-12 pb-16 sm:pt-16 sm:pb-20 md:pt-20 md:pb-28 grid md:grid-cols-2 gap-10 sm:gap-12 md:gap-16 items-center">
        {/* Left column — thesis */}
        <div className="max-w-xl text-center md:text-left mx-auto md:mx-0">
          <span
            className="stagger inline-flex items-center gap-2 font-mono text-[10.5px] sm:text-[11px] tracking-[0.16em] uppercase text-[#14171C] bg-white border border-[#14171C]/10 rounded-full px-3.5 py-1.5 mb-6 shadow-[0_1px_0_rgba(20,23,28,0.04)]"
            style={{ animationDelay: "0ms" }}
          >
            <span className="relative w-1.5 h-1.5 rounded-full bg-[#16A34A]">
              <span className="absolute inset-0 rounded-full bg-[#16A34A] live-dot" />
            </span>
            Prices verified live
          </span>

          <h1 className="font-display text-[2.25rem] leading-[1.08] sm:text-[2.75rem] sm:leading-[1.05] md:text-[3.75rem] md:leading-[1.02] text-[#14171C] tracking-tight">
            <span className="stagger block" style={{ animationDelay: "70ms" }}>
              Every price you see
            </span>
            <span className="stagger block" style={{ animationDelay: "140ms" }}>
              is the price you pay.
            </span>
          </h1>

          <p
            className="stagger mt-5 sm:mt-6 text-[15.5px] sm:text-[17px] leading-relaxed text-[#4B4F57] max-w-md mx-auto md:mx-0"
            style={{ animationDelay: "210ms" }}
          >
            Browse real specs and real prices on every phone, charger,
            power bank and pair of headphones in store — updated the
            moment stock changes, no asterisks.
          </p>

          <div
            className="stagger mt-8 sm:mt-9 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 sm:gap-4"
            style={{ animationDelay: "280ms" }}
          >
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
        </div>

        {/* Right column — the price-tag card (signature element) */}
        <div className="w-full max-w-[380px] mx-auto md:mx-0 md:max-w-none">
          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="tag-card relative rounded-[22px] bg-white border border-[#14171C]/10 shadow-[0_28px_70px_-30px_rgba(20,23,28,0.28)] transition-transform duration-300 ease-out"
          >
            {/* Punch hole, top-left — the "hang tag" detail */}
            <div className="absolute -top-3 left-7 w-6 h-6 rounded-full bg-white border border-[#14171C]/10 shadow-[0_1px_2px_rgba(20,23,28,0.08)] z-10">
              <div className="absolute inset-[5px] rounded-full bg-[#F3F4F1]" />
            </div>

            {/* Image well */}
            <div className="relative rounded-t-[22px] overflow-hidden aspect-[5/4] sm:aspect-[16/11] bg-gradient-to-br from-[#FFEEE2] via-[#FFF6EF] to-white">
              <div className="absolute -bottom-14 -right-10 w-44 h-44 rounded-full bg-[#F5590A]/12 blur-3xl" aria-hidden="true" />
              <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-white/70 blur-3xl" aria-hidden="true" />

              {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5">
                  {/* shimmer sweep across the well */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="shimmer-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                  </div>

                  {/* spinning ring around a tag glyph */}
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg viewBox="0 0 40 40" className="absolute inset-0 spin-ring">
                      <circle cx="20" cy="20" r="17" fill="none" stroke="#F5590A" strokeOpacity="0.15" strokeWidth="2.5" />
                      <circle
                        cx="20"
                        cy="20"
                        r="17"
                        fill="none"
                        stroke="#F5590A"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="26 80"
                      />
                    </svg>
                    <svg viewBox="0 0 24 24" className="w-6 h-6 glyph-pulse" fill="none">
                      <path
                        d="M11.2 3.6 4 10.8a1.6 1.6 0 0 0 0 2.26l6.94 6.94a1.6 1.6 0 0 0 2.26 0l7.2-7.2a1.6 1.6 0 0 0 .47-1.13V5.6A2 2 0 0 0 18.87 3.6H12.3a1.6 1.6 0 0 0-1.1.5Z"
                        stroke="#14171C"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                      <circle cx="15.2" cy="8.4" r="1.4" fill="#14171C" />
                    </svg>
                  </div>

                  <p className="relative flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-wider text-[#6B7280]">
                    Printing your price tag
                    <span className="flex gap-0.5 ml-0.5">
                      <span className="dot-bounce" style={{ animationDelay: "0ms" }}>.</span>
                      <span className="dot-bounce" style={{ animationDelay: "150ms" }}>.</span>
                      <span className="dot-bounce" style={{ animationDelay: "300ms" }}>.</span>
                    </span>
                  </p>
                </div>
              ) : !current ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <PhoneGlyph />
                  <p className="mt-3 text-[13px] text-[#6B7280]">No products to show yet.</p>
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
                      key={active}
                      src={current.images[0].url}
                      alt={current.name}
                      className="price-key w-[52%] max-h-[66%] object-contain drop-shadow-[0_18px_32px_rgba(20,23,28,0.2)] transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="transition-transform duration-500 group-hover:scale-105">
                      <PhoneGlyph />
                    </span>
                  )}
                </button>
              )}

              {current && !loading && (
                <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-[#14171C] bg-white/90 backdrop-blur border border-white shadow-sm rounded-full px-3 py-1.5">
                  <span
                    className={`relative w-1.5 h-1.5 rounded-full ${
                      current.stock > 0 ? "bg-[#16A34A]" : "bg-[#DC2626]"
                    }`}
                  >
                    {current.stock > 0 && (
                      <span className="absolute inset-0 rounded-full bg-[#16A34A] live-dot" />
                    )}
                  </span>
                  {current.stock > 0 ? "In stock" : "Out of stock"}
                </span>
              )}

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

            {/* Perforated tear line with die-cut notches */}
            <div className="relative">
              <div className="absolute -left-[13px] top-0 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F3F4F1] border border-[#14171C]/10" />
              <div className="absolute -right-[13px] top-0 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F3F4F1] border border-[#14171C]/10" />
              <div className="mx-6 border-t border-dashed border-[#14171C]/15" />
            </div>

            {/* Ticket stub — product + price */}
            {current && !loading ? (
              <button
                type="button"
                onClick={handleCardClick}
                className="group w-full flex items-end justify-between gap-4 px-5 sm:px-6 pt-4 pb-5 text-left rounded-b-[22px] transition-colors duration-200 hover:bg-[#FFF8F3]"
              >
                <div className="min-w-0">
                  <p className="font-display text-[15px] sm:text-[16px] text-[#14171C] leading-tight truncate">
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

                <div className="shrink-0 text-right overflow-hidden">
                  <p className="font-mono text-[9.5px] uppercase tracking-wider text-[#6B7280]">Ticket price</p>
                  <p key={active} className="price-key font-mono text-xl sm:text-2xl text-[#F5590A] mt-0.5 tabular-nums">
                    {formatINR(current.pricing?.sellingPrice)}
                  </p>
                </div>
              </button>
            ) : loading ? (
              <div className="px-5 sm:px-6 pt-4 pb-5 flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="relative h-3.5 w-3/5 rounded-full bg-[#F1F1EE] overflow-hidden">
                    <div className="shimmer-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                  </div>
                  <div className="relative h-2.5 w-2/5 rounded-full bg-[#F1F1EE] overflow-hidden">
                    <div className="shimmer-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" style={{ animationDelay: "120ms" }} />
                  </div>
                </div>
                <div className="shrink-0 relative h-6 w-16 rounded-full bg-[#F1F1EE] overflow-hidden">
                  <div className="shimmer-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" style={{ animationDelay: "220ms" }} />
                </div>
              </div>
            ) : (
              <div className="px-6 pt-4 pb-5 text-[13px] text-[#9CA0A6]">No products to show yet.</div>
            )}
          </div>

          {/* Dots */}
          {products.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-6">
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

      {/* Scroll cue */}
      <div className="hidden md:flex justify-center pb-6 -mt-6 text-[#9CA0A6]" aria-hidden="true">
        <div className="bob">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <path d="M12 4v14m0 0-5-5m5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default Hero;