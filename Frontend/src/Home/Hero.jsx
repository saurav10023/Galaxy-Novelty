import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";

/* ---------------------------------------------------------------------- */
/* Design note                                                             */
/* ---------------------------------------------------------------------- */
// This hero's thesis is the store's pricing promise ("every price you see
// is the price you pay"), so the signature element is a literal price TAG:
// a die-cut ticket card with a punch hole, a perforated tear line, and a
// footer stub that reads like a real shelf tag. Light-mode Glass Tech: a
// clean white field with fuchsia/cyan color washes glowing behind frosted
// glass panels. Compressed to fit above the fold on a laptop screen, with
// a bolder motion layer: ambient glow blobs drift at different speeds for
// a parallax feel, the tag card floats and tilts toward the cursor with a
// cursor-tracked glass "spotlight", and CTAs get a light-sweep on hover.
// Everything still resolves around the one idea: the price tag.

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
  <svg viewBox="0 0 24 24" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none">
    <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PhoneGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20" fill="none">
    <rect x="14" y="4" width="36" height="56" rx="6" stroke="#94A3B8" strokeWidth="2.5" />
    <rect x="19" y="12" width="26" height="36" rx="1.5" fill="#D946EF" opacity="0.1" />
    <circle cx="32" cy="53" r="2.4" fill="#94A3B8" />
    <circle cx="41" cy="9" r="1.6" fill="#94A3B8" />
  </svg>
);

const TRUST_ITEMS = [
  { icon: "tag", label: "No hidden markup" },
  { icon: "shield", label: "Genuine accessories" },
  { icon: "store", label: "In-store pickup" },
];

const TrustIcon = ({ name }) => {
  const common = { viewBox: "0 0 24 24", className: "w-3.5 h-3.5", fill: "none" };
  if (name === "tag") {
    return (
      <svg {...common}>
        <path d="M12.5 3.5h5a2 2 0 0 1 2 2v5a2 2 0 0 1-.59 1.41l-8 8a2 2 0 0 1-2.82 0l-5-5a2 2 0 0 1 0-2.82l8-8A2 2 0 0 1 12.5 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="16.5" cy="7.5" r="1.25" fill="currentColor" />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3.5 5 6v5.2c0 4.4 2.9 7.9 7 8.8 4.1-.9 7-4.4 7-8.8V6l-7-2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 10.5 5.2 4.5h13.6L20 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4.5 10.5v8.2a1 1 0 0 0 1 1H10v-5.4h4v5.4h4.5a1 1 0 0 0 1-1v-8.2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
};

const QUICK_LINKS = [
  { key: "mobile", label: "Mobiles", position: "-top-5 -left-5" },
  { key: "headphone", label: "Headphones", position: "-top-6 -right-5" },
  { key: "charger", label: "Chargers", position: "-bottom-5 -left-6" },
  { key: "powerbank", label: "Power Banks", position: "-bottom-6 -right-6" },
];

const QuickLinkIcon = ({ name }) => {
  const common = { viewBox: "0 0 24 24", className: "w-[18px] h-[18px]", fill: "none" };
  if (name === "mobile") {
    return (
      <svg {...common}>
        <rect x="7" y="2.5" width="10" height="19" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M11 18h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "headphone") {
    return (
      <svg {...common}>
        <path d="M4.5 13.5v-1a7.5 7.5 0 0 1 15 0v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <rect x="3.5" y="13" width="4" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
        <rect x="16.5" y="13" width="4" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (name === "charger") {
    return (
      <svg {...common}>
        <path d="M13 2.5 5.5 13h5l-1 8.5L20.5 11h-5l-2.5-8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="4" y="7.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M18 10.5v6a1.7 1.7 0 0 0 1.8-1.7v-2.6A1.7 1.7 0 0 0 18 10.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m12.2 10.5-3 4h2.2l-.6 3 3-4h-2.2l.6-3Z" fill="currentColor" />
    </svg>
  );
};

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

  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50 });
  const [cardHovering, setCardHovering] = useState(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

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
    navigate(`/product/${current._id}`);
  };

  const handleCardMouseMove = (e) => {
    if (reducedMotionRef.current || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const maxDeg = 7;
    setTilt({
      rx: (0.5 - py) * maxDeg * 2,
      ry: (px - 0.5) * maxDeg * 2,
    });
    setSpotlight({ x: px * 100, y: py * 100 });
  };

  const handleCardEnter = () => {
    setPaused(true);
    setCardHovering(true);
  };

  const handleCardLeave = () => {
    setPaused(false);
    setCardHovering(false);
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <section className="relative overflow-x-hidden overflow-y-visible bg-white w-full max-w-[100vw]">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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
        @keyframes pulseDot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          50% { box-shadow: 0 0 0 5px rgba(16,185,129,0); }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(5px); }
        }
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-9px) rotate(-0.35deg); }
        }
        @keyframes shimmerSweep {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        @keyframes buttonSweep {
          from { transform: translateX(-120%) skewX(-12deg); }
          to { transform: translateX(220%) skewX(-12deg); }
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
        @keyframes ambientPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes driftA {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(36px, 22px) scale(1.12); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes driftB {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-30px, 26px) scale(0.92); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes driftC {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(24px, -30px) scale(1.08); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes badgeGlow {
          0%, 100% { box-shadow: 0 2px 10px -4px rgba(15,23,42,0.1); }
          50% { box-shadow: 0 2px 18px -3px rgba(217,70,239,0.35); }
        }
        @keyframes chipFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes quickFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(-3deg); }
        }
        .stagger { opacity: 0; animation: fadeUp 0.7s cubic-bezier(.22,1.1,.32,1) both; }
        .tag-card-wrap { animation: tagIn 0.75s cubic-bezier(.2,.8,.3,1.15) both; }
        .price-key { animation: priceIn 0.45s cubic-bezier(.16,1,.3,1) both; }
        .live-dot { animation: pulseDot 2s ease-out infinite; }
        .bob { animation: bob 2.4s ease-in-out infinite; }
        .card-float { animation: cardFloat 5.5s ease-in-out infinite; }
        .shimmer-sweep { animation: shimmerSweep 1.6s ease-in-out infinite; }
        .spin-ring { animation: spinRing 1.1s linear infinite; }
        .dot-bounce { animation: dotBounce 1.2s ease-in-out infinite; }
        .glyph-pulse { animation: glyphPulse 1.8s ease-in-out infinite; }
        .ambient-pulse { animation: ambientPulse 6s ease-in-out infinite; }
        .drift-a { animation: driftA 14s ease-in-out infinite; }
        .drift-b { animation: driftB 18s ease-in-out infinite; }
        .drift-c { animation: driftC 11s ease-in-out infinite; }
        .badge-glow { animation: badgeGlow 3.2s ease-in-out infinite; }
        .btn-sweep { animation: buttonSweep 2.6s ease-in-out infinite; }
        .chip-float { animation: chipFloat 3.6s ease-in-out infinite; }
        .quick-float { animation: quickFloat 4.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .stagger, .tag-card-wrap, .price-key { animation: none !important; opacity: 1 !important; transform: none !important; }
          .live-dot, .bob, .card-float, .shimmer-sweep, .spin-ring,
          .dot-bounce, .glyph-pulse, .ambient-pulse, .drift-a, .drift-b, .drift-c, .badge-glow, .btn-sweep, .chip-float, .quick-float {
            animation: none !important;
          }
        }
      `}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[min(820px,150vw)] h-72 rounded-full bg-gradient-to-r from-fuchsia-300/40 via-cyan-200/40 to-fuchsia-300/30 blur-3xl ambient-pulse drift-a"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 w-[min(380px,70vw)] h-[min(380px,70vw)] rounded-full bg-cyan-200/40 blur-3xl drift-b"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -left-20 w-[min(260px,60vw)] h-[min(260px,60vw)] rounded-full bg-fuchsia-200/30 blur-3xl drift-c"
      />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 md:px-10 pt-8 pb-7 sm:pt-9 sm:pb-8 md:pt-11 md:pb-10 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-9 md:gap-12 items-center">
        <div className="max-w-xl text-center md:text-left mx-auto md:mx-0">
          <div
            className="stagger flex items-center justify-center md:justify-start gap-2 mb-4 sm:mb-5"
            style={{ animationDelay: "0ms" }}
          >
            {QUICK_LINKS.map((q, i) => (
              <Link
                key={q.key}
                to={`/shop?category=${q.key}`}
                aria-label={`Shop ${q.label}`}
                className="quick-float group relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-fuchsia-600 hover:border-fuchsia-200 hover:-translate-y-0.5 transition-all duration-300"
                style={{ animationDelay: `${i * 350}ms` }}
              >
                <QuickLinkIcon name={q.key} />
                <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-wide text-slate-600 bg-white border border-slate-200 rounded-full px-2.5 py-1 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 shadow-sm z-20">
                  {q.label}
                </span>
              </Link>
            ))}
          </div>

          <span
            className="stagger badge-glow inline-flex items-center gap-2 font-mono text-[10.5px] sm:text-[11px] tracking-[0.16em] uppercase text-slate-700 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full px-3.5 py-1.5 mb-3.5 sm:mb-4"
            style={{ animationDelay: "40ms" }}
          >
            <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500">
              <span className="absolute inset-0 rounded-full bg-emerald-500 live-dot" />
            </span>
            Prices verified live
          </span>

          <h1 className="font-display text-[1.8rem] leading-[1.06] sm:text-[2.2rem] sm:leading-[1.04] md:text-[2.85rem] md:leading-[1.02] text-slate-900 tracking-tight">
            <span className="stagger block" style={{ animationDelay: "70ms" }}>
              Every price you see
            </span>
            <span className="stagger block" style={{ animationDelay: "140ms" }}>
              is the price you pay.
            </span>
          </h1>

          <p
            className="stagger mt-3 sm:mt-3.5 text-[14px] sm:text-[15px] leading-relaxed text-slate-500 max-w-md mx-auto md:mx-0"
            style={{ animationDelay: "210ms" }}
          >
            Browse real specs and real prices on every phone, charger,
            power bank and pair of headphones in store — updated the
            moment stock changes, no asterisks.
          </p>

          <div
            className="stagger mt-5 sm:mt-6 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 sm:gap-4"
            style={{ animationDelay: "280ms" }}
          >
            <a
              href="/shop"
              className="group relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-[14px] sm:text-[14.5px] font-medium px-6 sm:px-7 py-2.5 transition-all duration-200 hover:-translate-y-0.5 shadow-[0_10px_28px_-10px_rgba(217,70,239,0.55)] hover:shadow-[0_14px_34px_-8px_rgba(217,70,239,0.6)] active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <span
                aria-hidden
                className="btn-sweep pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/30 blur-[6px]"
              />
              <span className="relative">Browse the catalog</span>
              <span className="relative"><ArrowUpRight /></span>
            </a>
            <a
              href="/shop?category=mobile"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/70 backdrop-blur-md text-slate-800 text-[14px] sm:text-[14.5px] font-medium px-6 sm:px-7 py-2.5 transition-all duration-200 hover:border-cyan-400 hover:text-cyan-600 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Shop mobiles
            </a>
          </div>

          <div
            className="stagger mt-5 sm:mt-6 flex flex-wrap items-center justify-center md:justify-start gap-2"
            style={{ animationDelay: "340ms" }}
          >
            {TRUST_ITEMS.map((item, i) => (
              <span
                key={item.label}
                className="chip-float inline-flex items-center gap-1.5 font-mono text-[10.5px] text-slate-500 bg-white/70 backdrop-blur-md border border-slate-200 rounded-full pl-2.5 pr-3 py-1.5"
                style={{ animationDelay: `${i * 250}ms` }}
              >
                <span className="text-fuchsia-500">
                  <TrustIcon name={item.icon} />
                </span>
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative w-full max-w-[340px] mx-auto md:mx-0 md:max-w-full md:justify-self-stretch">
          <div
            className="tag-card-wrap"
            style={{ perspective: "1200px" }}
          >
            <div
              ref={cardRef}
              onMouseEnter={handleCardEnter}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardLeave}
              className={`relative rounded-[20px] bg-white/75 backdrop-blur-xl border border-white shadow-[0_24px_60px_-28px_rgba(217,70,239,0.4)] transition-transform duration-300 ease-out will-change-transform ${
                !cardHovering ? "card-float" : ""
              }`}
              style={{
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) ${
                  cardHovering ? "translateY(-4px) scale(1.015)" : ""
                }`,
                transformStyle: "preserve-3d",
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 transition-opacity duration-300"
                style={{
                  opacity: cardHovering ? 1 : 0,
                  background: `radial-gradient(240px circle at ${spotlight.x}% ${spotlight.y}%, rgba(217,70,239,0.16), rgba(6,182,212,0.08) 45%, transparent 70%)`,
                }}
              />

              <div className="absolute -top-3 left-7 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.08)] z-10">
                <div className="absolute inset-[5px] rounded-full bg-[#FBFBFD]" />
              </div>

              <div className="relative rounded-t-[20px] overflow-hidden aspect-[5/4] sm:aspect-[16/10] bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50">
                <div className="absolute -bottom-14 -right-10 w-40 h-40 rounded-full bg-fuchsia-300/30 blur-3xl" aria-hidden="true" />
                <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full bg-cyan-300/25 blur-3xl" aria-hidden="true" />

                {loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="shimmer-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                    </div>

                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg viewBox="0 0 40 40" className="absolute inset-0 spin-ring">
                        <circle cx="20" cy="20" r="17" fill="none" stroke="#D946EF" strokeOpacity="0.18" strokeWidth="2.5" />
                        <circle
                          cx="20"
                          cy="20"
                          r="17"
                          fill="none"
                          stroke="#06B6D4"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray="26 80"
                        />
                      </svg>
                      <svg viewBox="0 0 24 24" className="w-5 h-5 glyph-pulse" fill="none">
                        <path
                          d="M11.2 3.6 4 10.8a1.6 1.6 0 0 0 0 2.26l6.94 6.94a1.6 1.6 0 0 0 2.26 0l7.2-7.2a1.6 1.6 0 0 0 .47-1.13V5.6A2 2 0 0 0 18.87 3.6H12.3a1.6 1.6 0 0 0-1.1.5Z"
                          stroke="#334155"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                        <circle cx="15.2" cy="8.4" r="1.4" fill="#334155" />
                      </svg>
                    </div>

                    <p className="relative flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
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
                    <p className="mt-3 text-[13px] text-slate-400">No products to show yet.</p>
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
                        className="price-key w-[50%] max-h-[62%] object-contain drop-shadow-[0_18px_32px_rgba(15,23,42,0.18)] transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="transition-transform duration-500 group-hover:scale-105">
                        <PhoneGlyph />
                      </span>
                    )}
                  </button>
                )}

                {current && !loading && (
                  <span className="chip-float absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-slate-700 bg-white/85 backdrop-blur-md border border-white shadow-sm rounded-full px-3 py-1.5">
                    <span
                      className={`relative w-1.5 h-1.5 rounded-full ${
                        current.stock > 0 ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    >
                      {current.stock > 0 && (
                        <span className="absolute inset-0 rounded-full bg-emerald-500 live-dot" />
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur-md border border-white text-slate-500 hover:text-fuchsia-500 shadow-sm flex items-center justify-center transition-colors duration-150"
                    >
                      <ChevronIcon dir="left" />
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      aria-label="Next product"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 backdrop-blur-md border border-white text-slate-500 hover:text-cyan-600 shadow-sm flex items-center justify-center transition-colors duration-150"
                    >
                      <ChevronIcon dir="right" />
                    </button>
                  </>
                )}
              </div>

              <div className="relative">
                <div className="absolute -left-[13px] top-0 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FBFBFD] border border-slate-200" />
                <div className="absolute -right-[13px] top-0 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FBFBFD] border border-slate-200" />
                <div className="mx-6 border-t border-dashed border-slate-200" />
              </div>

              {current && !loading ? (
                <button
                  type="button"
                  onClick={handleCardClick}
                  className="group w-full flex items-end justify-between gap-4 px-5 sm:px-5 pt-3 pb-3.5 text-left rounded-b-[20px] transition-colors duration-200 hover:bg-fuchsia-50/40"
                >
                  <div className="min-w-0">
                    <p className="font-display text-[14px] sm:text-[14.5px] text-slate-900 leading-tight truncate">
                      {current.name}
                    </p>
                    <p className="text-[11px] sm:text-[11.5px] text-slate-400 mt-0.5 capitalize truncate">
                      {current.brand}
                      {current.category ? ` · ${current.category}` : ""}
                    </p>
                    {buildSpecChips(current).length > 0 && (
                      <div className="hidden sm:flex flex-wrap gap-1 mt-1.5">
                        {buildSpecChips(current).map((chip) => (
                          <span
                            key={chip}
                            className="font-mono text-[9.5px] text-slate-500 border border-slate-200 rounded-full px-2 py-0.5"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-right overflow-hidden">
                    <p className="font-mono text-[9.5px] uppercase tracking-wider text-cyan-600/70">Ticket price</p>
                    <p
                      key={active}
                      className="price-key font-mono text-lg sm:text-xl mt-0.5 tabular-nums bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent"
                    >
                      {formatINR(current.pricing?.sellingPrice)}
                    </p>
                  </div>
                </button>
              ) : loading ? (
                <div className="px-5 pt-3 pb-3.5 flex items-end justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="relative h-3.5 w-3/5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="shimmer-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                    </div>
                    <div className="relative h-2.5 w-2/5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="shimmer-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent" style={{ animationDelay: "120ms" }} />
                    </div>
                  </div>
                  <div className="shrink-0 relative h-6 w-16 rounded-full bg-slate-100 overflow-hidden">
                    <div className="shimmer-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent" style={{ animationDelay: "220ms" }} />
                  </div>
                </div>
              ) : (
                <div className="px-6 pt-3 pb-3.5 text-[13px] text-slate-400">No products to show yet.</div>
              )}
            </div>
          </div>

          {products.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3.5">
              {products.map((p, i) => (
                <button
                  key={p._id || i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show product ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === active
                      ? "w-5 bg-gradient-to-r from-fuchsia-500 to-cyan-500 shadow-[0_0_10px_-1px_rgba(217,70,239,0.6)]"
                      : "w-1.5 bg-slate-200 hover:bg-fuchsia-300"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex justify-center pb-2 text-slate-300 relative" aria-hidden="true">
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