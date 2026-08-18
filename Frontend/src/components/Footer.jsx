// src/components/Footer.jsx
//
// Slim single-tier footer -- no commerce chrome (shipping/returns/newsletter),
// no social row. Just wayfinding: brand, shop categories, a couple of
// company links, and a copyright line. Light Glass Tech, matching
// Navbar/Hero/CategoryGrid: white glass surface, fuchsia/cyan gradient
// accents, font-display wordmark, font-mono labels. The electric gradient
// line runs along the TOP edge here (mirroring the navbar's bottom edge),
// so the two bars read as matching bookends of the same page.
//
// Deeper "liquid glass" pass: heavier tint (slate-100 base, white/60 panel),
// stronger blur, a glossy inner highlight hairline under the top edge to
// sell the glass thickness, deeper borders/text. Still fully light-mode --
// no flat dark fills, just denser frosted glass over a shaded canvas.

import { Link } from "react-router-dom";
import logo from "../assets/galaxy-novelty-logo.png";

const CATEGORY_LINKS = [
  { key: "mobile", label: "Mobiles" },
  { key: "headphone", label: "Headphones" },
  { key: "charger", label: "Chargers" },
  { key: "powerbank", label: "Power Banks" },
];

const COMPANY_LINKS = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/login", label: "Staff login" },
];

const Footer = () => {
  return (
    <footer className="relative bg-slate-100 mt-20 overflow-x-clip">
      {/* Electric gradient top edge -- mirrors the navbar's bottom edge */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-fuchsia-500 opacity-90"
      />
      {/* Glossy inner highlight, just under the top edge -- sells the "liquid glass" thickness */}
      <div
        aria-hidden
        className="absolute top-[2px] left-0 right-0 h-px bg-white/70"
      />

      {/* Ambient glass-tech glow, clamped so it can never force horizontal scroll */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-[min(560px,130vw)] h-40 rounded-full bg-gradient-to-r from-fuchsia-300/35 via-cyan-300/30 to-fuchsia-300/25 blur-3xl"
      />

      <div className="relative border-t border-slate-300/80 bg-white/60 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <span className="relative w-10 h-10 shrink-0">
                <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-fuchsia-400/50 to-cyan-400/50 blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md ring-1 ring-slate-300 overflow-hidden flex items-center justify-center shadow-[0_2px_10px_-2px_rgba(15,23,42,0.2)]">
                  <img src={logo} alt="Galaxy Novelty" className="w-full h-full object-cover" />
                </span>
              </span>
              <span className="font-display text-[16px] font-semibold text-slate-900 tracking-tight leading-none">
                GALAXY<span className="text-fuchsia-600 font-normal"> NOVELTY</span>
              </span>
            </Link>

            {/* Links */}
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {CATEGORY_LINKS.map((c) => (
                <Link
                  key={c.key}
                  to={`/shop?category=${c.key}`}
                  className="text-[13px] text-slate-600 hover:text-fuchsia-600 transition-colors duration-150"
                >
                  {c.label}
                </Link>
              ))}
              <span className="hidden md:inline w-px h-3.5 bg-slate-300" />
              {COMPANY_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="text-[13px] text-slate-600 hover:text-fuchsia-600 transition-colors duration-150"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-6 pt-5 border-t border-slate-300/80">
            <p className="flex items-center gap-1.5 text-[11.5px] text-slate-500 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500" />
              © {new Date().getFullYear()} Galaxy Novelty. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              <Link to="/privacy" className="text-[11.5px] text-slate-500 hover:text-fuchsia-600 transition-colors duration-150">
                Privacy
              </Link>
              <Link to="/terms" className="text-[11.5px] text-slate-500 hover:text-fuchsia-600 transition-colors duration-150">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;