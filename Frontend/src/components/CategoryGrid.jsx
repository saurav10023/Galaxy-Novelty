// src/components/CategoryGrid.jsx
//
// 2x2 on tablet width, 4-across once there's room on desktop. Restyled to
// match Hero/Navbar's light Glass Tech language: white glass cards on a
// soft ambient fuchsia/cyan wash, glyphs re-inked in slate with a fuchsia
// tint instead of the old solid-orange treatment.
//
// Motion pass: layered per the design-language spec --
//   1. Ambient background drift (glow blob, slow independent loop)
//   2. Idle float (glyphs gently bob, staggered per card)
//   3. Entrance (staggered fade/slide with a cubic-bezier overshoot settle)
//   4. Hover/interaction (cursor-tracked spotlight + subtle 3D tilt, arrow
//      chip slide-in, glyph scale/rotate, light-sweep on the arrow chip)
// All animation is neutralized under prefers-reduced-motion.

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useScrollReveal } from "../hooks/useScrollReveal";

const MobileGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <rect x="18" y="6" width="28" height="52" rx="6" stroke="#334155" strokeWidth="2.5" />
    <rect x="22" y="13" width="20" height="34" rx="1.5" fill="#D946EF" opacity="0.12" />
    <circle cx="32" cy="52" r="2.2" fill="#334155" />
  </svg>
);

const HeadphoneGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <path d="M12 34a20 20 0 0 1 40 0" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="9" y="32" width="10" height="18" rx="4" fill="#D946EF" opacity="0.12" stroke="#334155" strokeWidth="2.5" />
    <rect x="45" y="32" width="10" height="18" rx="4" fill="#06B6D4" opacity="0.12" stroke="#334155" strokeWidth="2.5" />
    <path d="M55 41v3a8 8 0 0 1-8 8h-6" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const ChargerGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <rect x="20" y="8" width="24" height="16" rx="3" stroke="#334155" strokeWidth="2.5" />
    <path d="M27 8V4M37 8V4" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="28" y="24" width="8" height="10" fill="#06B6D4" opacity="0.12" stroke="#334155" strokeWidth="2.5" />
    <path d="M34 34 26 46h6l-2 12 12-16h-6l2-8Z" fill="#D946EF" stroke="#334155" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

const PowerBankGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <rect x="16" y="10" width="32" height="44" rx="6" stroke="#334155" strokeWidth="2.5" />
    <rect x="27" y="5" width="10" height="6" rx="1.5" fill="#334155" />
    <rect x="21" y="18" width="22" height="28" rx="2" fill="#D946EF" opacity="0.1" />
    <path d="M35 22 27 34h5l-1 10 10-14h-5l1-8Z" fill="#06B6D4" stroke="#334155" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const CATEGORIES = [
  { key: "mobile", label: "Mobiles", tagline: "4G & 5G, every budget", glyph: MobileGlyph },
  { key: "headphone", label: "Headphones", tagline: "TWS, over-ear, ANC", glyph: HeadphoneGlyph },
  { key: "charger", label: "Chargers", tagline: "Fast & wireless", glyph: ChargerGlyph },
  { key: "powerbank", label: "Power Banks", tagline: "10,000–20,000 mAh", glyph: PowerBankGlyph },
];

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CategoryCard = ({ category, index, revealed }) => {
  const { key, label, tagline, glyph: Glyph } = category;
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [spot, setSpot] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);

  const handleMouseMove = (e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // Max ~7deg of tilt in either axis
    setTilt({ rx: (0.5 - py) * 14, ry: (px - 0.5) * 14 });
    setSpot({ x: px * 100, y: py * 100 });
  };

  const handleEnter = () => setHovering(true);
  const handleLeave = () => {
    setHovering(false);
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <Link
      ref={cardRef}
      to={`/shop?category=${key}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="category-card group relative rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200 p-6 flex flex-col justify-between min-h-[220px] overflow-hidden hover:border-fuchsia-300 hover:shadow-[0_20px_40px_-24px_rgba(217,70,239,0.4)]"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed
          ? `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(0px) scale(${hovering ? 1.015 : 1})`
          : "perspective(900px) translateY(16px)",
        transitionProperty: "opacity, transform, border-color, box-shadow",
        transitionDuration: hovering ? "150ms" : "650ms",
        transitionTimingFunction: revealed
          ? "cubic-bezier(.2,.8,.3,1.15)"
          : "ease-out",
        transitionDelay: revealed ? `${index * 90}ms` : "0ms",
        willChange: "transform",
      }}
    >
      {/* Cursor-tracked spotlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(180px circle at ${spot.x}% ${spot.y}%, rgba(217,70,239,0.16), rgba(6,182,212,0.08) 45%, transparent 70%)`,
        }}
      />

      {/* Ambient corner glow (kept from prior version, layered under the cursor spotlight) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-fuchsia-300/0 to-cyan-300/0 group-hover:from-fuchsia-300/25 group-hover:to-cyan-300/20 blur-2xl transition-all duration-500"
      />

      <div className="relative flex items-start justify-between">
        <span
          className="category-icon-float inline-block transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
          style={{ animationDelay: `${index * 260}ms` }}
        >
          <Glyph />
        </span>
        <span className="relative w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-white flex items-center justify-center overflow-hidden opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-250 shadow-[0_6px_16px_-4px_rgba(217,70,239,0.5)]">
          <span className="category-arrow-sweep pointer-events-none absolute inset-0" />
          <ArrowIcon />
        </span>
      </div>

      <div className="relative mt-6">
        <h3 className="font-display text-[17px] font-semibold text-slate-900 group-hover:text-fuchsia-600 transition-colors duration-200">
          {label}
        </h3>
        <p className="text-[12.5px] text-slate-500 mt-1">{tagline}</p>
      </div>
    </Link>
  );
};

const CategoryGrid = () => {
  const { ref, revealed } = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="relative bg-white overflow-x-clip">
      <style>{`
        @keyframes categoryGlowDrift {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(26px, -18px) scale(1.08); }
        }
        .category-glow { animation: categoryGlowDrift 16s ease-in-out infinite; }

        /* Idle float -- glyphs gently bob, each card staggered via inline animationDelay */
        @keyframes categoryIconFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(-1.5deg); }
        }
        .category-icon-float { animation: categoryIconFloat 4.2s ease-in-out infinite; }

        /* Light sweep across the arrow chip on hover */
        @keyframes categoryArrowSweep {
          0% { transform: translateX(-120%) skewX(-15deg); }
          100% { transform: translateX(220%) skewX(-15deg); }
        }
        .category-arrow-sweep {
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent);
          transform: translateX(-120%) skewX(-15deg);
        }
        .group:hover .category-arrow-sweep {
          animation: categoryArrowSweep 900ms ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .category-glow,
          .category-icon-float,
          .category-arrow-sweep,
          .category-card {
            animation: none !important;
          }
          .category-card {
            transition: none !important;
          }
        }
      `}</style>

      {/* Ambient wash, clamped so it can never force horizontal scroll */}
      <div
        aria-hidden
        className="category-glow pointer-events-none absolute top-10 right-0 w-[min(420px,80vw)] h-[min(420px,80vw)] rounded-full bg-gradient-to-br from-cyan-200/30 to-fuchsia-200/25 blur-3xl"
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="mb-10 max-w-lg">
          <p className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase text-slate-700 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full px-3.5 py-1.5 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500" />
            Shop by category
          </p>
          <h2 className="font-display text-[28px] md:text-[32px] font-semibold text-slate-900 tracking-tight">
            Find exactly what you're after
          </h2>
        </div>

        <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {CATEGORIES.map((category, i) => (
            <CategoryCard
              key={category.key}
              category={category}
              index={i}
              revealed={revealed}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;