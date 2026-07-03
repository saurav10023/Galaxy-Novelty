// src/components/CategoryGrid.jsx
//
// 2x2 on tablet width (the layout tablets are actually good at), 4-across
// once there's room on desktop. Glyphs match the Hero's PhoneGlyph style:
// 64x64 viewBox, #14171C stroke, #F5590A tinted fill fills.

import { Link } from "react-router-dom";
import { useScrollReveal } from "../hooks/useScrollReveal";

const MobileGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <rect x="18" y="6" width="28" height="52" rx="6" stroke="#14171C" strokeWidth="2.5" />
    <rect x="22" y="13" width="20" height="34" rx="1.5" fill="#F5590A" opacity="0.12" />
    <circle cx="32" cy="52" r="2.2" fill="#14171C" />
  </svg>
);

const HeadphoneGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <path d="M12 34a20 20 0 0 1 40 0" stroke="#14171C" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="9" y="32" width="10" height="18" rx="4" fill="#F5590A" opacity="0.12" stroke="#14171C" strokeWidth="2.5" />
    <rect x="45" y="32" width="10" height="18" rx="4" fill="#F5590A" opacity="0.12" stroke="#14171C" strokeWidth="2.5" />
    <path d="M55 41v3a8 8 0 0 1-8 8h-6" stroke="#14171C" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const ChargerGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <rect x="20" y="8" width="24" height="16" rx="3" stroke="#14171C" strokeWidth="2.5" />
    <path d="M27 8V4M37 8V4" stroke="#14171C" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="28" y="24" width="8" height="10" fill="#F5590A" opacity="0.12" stroke="#14171C" strokeWidth="2.5" />
    <path d="M34 34 26 46h6l-2 12 12-16h-6l2-8Z" fill="#F5590A" stroke="#14171C" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

const PowerBankGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
    <rect x="16" y="10" width="32" height="44" rx="6" stroke="#14171C" strokeWidth="2.5" />
    <rect x="27" y="5" width="10" height="6" rx="1.5" fill="#14171C" />
    <rect x="21" y="18" width="22" height="28" rx="2" fill="#F5590A" opacity="0.12" />
    <path d="M35 22 27 34h5l-1 10 10-14h-5l1-8Z" fill="#F5590A" stroke="#14171C" strokeWidth="1.6" strokeLinejoin="round" />
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

const CategoryGrid = () => {
  const { ref, revealed } = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="bg-[#F3F4F1]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="mb-10 max-w-lg">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#F5590A] mb-3">
            Shop by category
          </p>
          <h2 className="font-display text-[28px] md:text-[32px] font-semibold text-[#14171C] tracking-tight">
            Find exactly what you're after
          </h2>
        </div>

        <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {CATEGORIES.map(({ key, label, tagline, glyph: Glyph }, i) => (
            <Link
              key={key}
              to={`/shop?category=${key}`}
              className="group relative rounded-2xl bg-white border border-[#E1E3DD] p-6 flex flex-col justify-between min-h-[220px] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#F5590A] hover:shadow-[0_20px_40px_-24px_rgba(245,89,10,0.35)]"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? "translateY(0)" : "translateY(16px)",
                transitionProperty: "opacity, transform",
                transitionDuration: "600ms",
                transitionDelay: revealed ? `${i * 90}ms` : "0ms",
              }}
            >
              <div className="flex items-start justify-between">
                <span className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  <Glyph />
                </span>
                <span className="w-8 h-8 rounded-full bg-[#FFF1E8] flex items-center justify-center text-[#F5590A] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <ArrowIcon />
                </span>
              </div>

              <div className="mt-6">
                <h3 className="font-display text-[17px] font-semibold text-[#14171C] group-hover:text-[#F5590A] transition-colors duration-200">
                  {label}
                </h3>
                <p className="text-[12.5px] text-[#6B7280] mt-1">{tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;