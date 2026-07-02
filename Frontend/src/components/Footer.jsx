// src/components/Footer.jsx
//
// Slim single-tier footer -- no commerce chrome (shipping/returns/newsletter),
// no social row. Just wayfinding: brand, shop categories, a couple of
// company links, and a copyright line. Same design language as Navbar.jsx
// (font-display wordmark, font-mono labels, #2F5DFF accent), inverted to a
// dark surface so it reads as the page's baseline.

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
    <footer className="bg-[#14171C] text-white mt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center shrink-0">
              <img src={logo} alt="Galaxy Novelty" className="w-full h-full object-cover" />
            </span>
            <span className="font-display text-[16px] font-semibold tracking-tight leading-none">
              GALAXY<span className="text-[#5B84FF]"> NOVELTY</span>
            </span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {CATEGORY_LINKS.map((c) => (
              <Link
                key={c.key}
                to={`/shop?category=${c.key}`}
                className="text-[13px] text-[#9CA0A6] hover:text-white transition-colors duration-150"
              >
                {c.label}
              </Link>
            ))}
            <span className="hidden md:inline w-px h-3.5 bg-white/15" />
            {COMPANY_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-[13px] text-[#9CA0A6] hover:text-white transition-colors duration-150"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-6 pt-5 border-t border-white/10">
          <p className="text-[11.5px] text-[#6B6F76] font-mono">
            © {new Date().getFullYear()} Galaxy Novelty. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-[11.5px] text-[#6B6F76] hover:text-[#C7C9CE] transition-colors duration-150">
              Privacy
            </Link>
            <Link to="/terms" className="text-[11.5px] text-[#6B6F76] hover:text-[#C7C9CE] transition-colors duration-150">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;