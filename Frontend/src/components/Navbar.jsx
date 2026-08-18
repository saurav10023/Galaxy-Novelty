import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/galaxy-novelty-logo.png";

/* ---------------------------------------------------------------------- */
/* Design note                                                             */
/* ---------------------------------------------------------------------- */
// Matches Hero's light-mode Glass Tech language: a frosted white bar lit
// from behind by a fuchsia/cyan ambient wash, with a thin electric gradient
// underline as the signature detail. The bar tightens up (stronger blur,
// deeper shadow) once the page is scrolled, so it reads as "docked" rather
// than floating. The brand wordmark now shows at every breakpoint — on
// mobile it sits tight next to the mark instead of being hidden. The mobile
// drawer gets a real open/close transition instead of a hard cut, and the
// hamburger morphs into an X.

const CATEGORY_LINKS = [
  { key: "mobile", label: "Mobiles" },
  { key: "headphone", label: "Headphones" },
  { key: "charger", label: "Chargers" },
  { key: "powerbank", label: "Power Banks" },
];

const SearchIcon = ({ className = "w-[18px] h-[18px]" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
    <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const ChevronDown = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// Animated hamburger <-> close, built from three spans so it can morph with CSS instead of swapping icons.
const HamburgerIcon = ({ open }) => (
  <span className="relative w-4 h-3.5 flex flex-col justify-between">
    <span
      className={`block h-[1.6px] w-full rounded-full bg-current transition-transform duration-300 origin-center ${
        open ? "translate-y-[6.5px] rotate-45" : ""
      }`}
    />
    <span
      className={`block h-[1.6px] w-full rounded-full bg-current transition-opacity duration-200 ${
        open ? "opacity-0" : "opacity-100"
      }`}
    />
    <span
      className={`block h-[1.6px] w-full rounded-full bg-current transition-transform duration-300 origin-center ${
        open ? "-translate-y-[6.5px] -rotate-45" : ""
      }`}
    />
  </span>
);

const CategoryGlyph = ({ name }) => {
  const common = { viewBox: "0 0 24 24", className: "w-4 h-4", fill: "none" };
  if (name === "mobile") {
    return (
      <svg {...common}>
        <rect x="7" y="2.5" width="10" height="19" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11 18.2h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "headphone") {
    return (
      <svg {...common}>
        <path d="M4 13.5v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="3" y="13" width="4" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
        <rect x="17" y="13" width="4" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (name === "charger") {
    return (
      <svg {...common}>
        <path d="M13 2 4.5 13.2h5.2L11 22l8.5-11.2h-5.2L13 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3.5" y="6.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M18.5 10v4a1.6 1.6 0 0 0 1.6-1.6v-.8A1.6 1.6 0 0 0 18.5 10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="5.5" y="8.7" width="7" height="4.6" rx="0.8" fill="currentColor" opacity="0.18" />
    </svg>
  );
};

// Glass-tech brand mark: frosted white chip lit by a fuchsia-to-cyan halo, wordmark visible at every size.
const BrandMark = ({ onClick }) => (
  <Link to="/" onClick={onClick} className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0 group">
    <span className="relative w-9 h-9 sm:w-11 sm:h-11 shrink-0">
      <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fuchsia-300/60 to-cyan-300/60 blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
      <span className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white/80 backdrop-blur-md ring-1 ring-slate-200 overflow-hidden flex items-center justify-center shadow-[0_2px_10px_-2px_rgba(15,23,42,0.12)] transition-transform duration-300 group-hover:scale-[1.04] group-hover:-rotate-2">
        <img src={logo} alt="Galaxy Novelty" className="w-full h-full object-cover" />
      </span>
    </span>
    <span className="font-display text-[13.5px] sm:text-[17px] font-semibold text-slate-900 tracking-tight leading-none truncate">
      GALAXY<span className="text-fuchsia-500 font-normal"> NOVELTY</span>
    </span>
  </Link>
);

const Navbar = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isStaff = user?.role === "admin";

  const activeCategory = new URLSearchParams(location.search).get("category");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(searchValue.trim())}`);
    setSearchOpen(false);
    setSearchValue("");
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    setAccountOpen(false);
    setMobileOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 relative w-full max-w-[100vw] overflow-x-clip">
      <style>{`
        @keyframes navGlowPulse {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
        @keyframes drawerIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nav-glow { animation: navGlowPulse 5s ease-in-out infinite; }
        .drawer-in { animation: drawerIn 0.22s cubic-bezier(.2,.8,.3,1) both; }
        .dropdown-in { animation: dropdownIn 0.16s cubic-bezier(.2,.8,.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .nav-glow, .drawer-in, .dropdown-in { animation: none !important; }
        }
      `}</style>

      {/* Ambient glass-tech glow, clamped so it can never force horizontal scroll */}
      <div
        aria-hidden
        className="nav-glow pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[min(680px,140vw)] h-48 rounded-full bg-gradient-to-r from-fuchsia-300/35 via-cyan-300/30 to-fuchsia-300/25 blur-3xl"
      />

      <div
        className={`relative bg-white/70 backdrop-blur-xl border-b transition-all duration-300 ${
          scrolled
            ? "border-slate-200 shadow-[0_10px_34px_-16px_rgba(217,70,239,0.4)] bg-white/85"
            : "border-slate-200/70 shadow-[0_8px_30px_-14px_rgba(217,70,239,0.25)]"
        }`}
      >
        {/* Electric gradient underline */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-fuchsia-400 opacity-80"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-6">
            <BrandMark onClick={() => setMobileOpen(false)} />

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-slate-100/70 border border-slate-200/80 shrink-0">
              {CATEGORY_LINKS.map((cat) => {
                const isActive = activeCategory === cat.key;
                return (
                  <Link
                    key={cat.key}
                    to={`/shop?category=${cat.key}`}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[14px] font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-white text-fuchsia-600 border border-fuchsia-200 shadow-[0_4px_16px_-4px_rgba(217,70,239,0.45)]"
                        : "text-slate-500 border border-transparent hover:text-slate-900 hover:bg-white/70"
                    }`}
                  >
                    {cat.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right side controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Display Product */}
              <Link
                to="/productdisplay"
                className="hidden sm:inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/60 backdrop-blur-md text-[13.5px] font-medium text-slate-800 px-4 py-2 hover:bg-white hover:border-fuchsia-300 hover:text-fuchsia-600 transition-all duration-200"
              >
                Display Product
              </Link>

              {/* Search */}
              <div className="hidden sm:flex items-center">
                {searchOpen ? (
                  <form onSubmit={handleSearchSubmit} className="flex items-center">
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <SearchIcon className="w-4 h-4" />
                      </span>
                      <input
                        autoFocus
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onBlur={() => !searchValue && setSearchOpen(false)}
                        placeholder="Search products…"
                        className="font-mono text-[13px] bg-white/80 backdrop-blur-md border border-slate-200 rounded-full pl-9 pr-4 py-2 w-52 md:w-60 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.18)] transition-all duration-200"
                      />
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    aria-label="Search products"
                    className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 border border-transparent hover:text-fuchsia-600 hover:bg-slate-100 hover:border-slate-200 transition-all duration-200"
                  >
                    <SearchIcon />
                  </button>
                )}
              </div>

              {/* Staff auth area */}
              {!loading && (
                <>
                  {isStaff ? (
                    <div className="relative hidden md:block">
                      <button
                        onClick={() => setAccountOpen((v) => !v)}
                        className="flex items-center gap-2 pl-2.5 pr-2.5 py-1.5 rounded-full border border-slate-200 bg-white/70 backdrop-blur-md hover:bg-white hover:border-slate-300 transition-all duration-200"
                      >
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 text-white text-[11px] font-mono font-semibold flex items-center justify-center uppercase shadow-[0_0_10px_-1px_rgba(217,70,239,0.6)]">
                          {user.username?.charAt(0) || "S"}
                        </span>
                        <span className="text-[13.5px] font-medium text-slate-800 max-w-[100px] truncate">
                          {user.username}
                        </span>
                        <span className={`text-slate-400 transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`}>
                          <ChevronDown />
                        </span>
                      </button>

                      {accountOpen && (
                        <div
                          className="dropdown-in absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_-16px_rgba(15,23,42,0.25)] py-1.5 overflow-hidden"
                          onMouseLeave={() => setAccountOpen(false)}
                        >
                          <span className="block px-4 py-2 font-mono text-[10.5px] uppercase tracking-wider text-fuchsia-500/80">
                            Staff account
                          </span>
                          <Link
                            to="/admin"
                            onClick={() => setAccountOpen(false)}
                            className="block px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50"
                          >
                            Admin
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2.5 text-[14px] text-rose-500 hover:bg-slate-50"
                          >
                            Log out
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      className="hidden md:inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/60 backdrop-blur-md text-[13.5px] font-medium text-slate-800 px-4 py-2 hover:bg-white hover:border-fuchsia-300 hover:text-fuchsia-600 transition-all duration-200"
                    >
                      Staff login
                    </Link>
                  )}
                </>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
                className={`md:hidden w-9 h-9 flex items-center justify-center rounded-full border transition-all duration-200 ${
                  mobileOpen
                    ? "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200"
                    : "text-slate-700 bg-white/70 border-slate-200 hover:bg-white"
                }`}
              >
                <HamburgerIcon open={mobileOpen} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="drawer-in md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-xl px-5 py-5 max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
            <form onSubmit={handleSearchSubmit} className="mb-5">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search products…"
                  className="w-full font-mono text-[13px] bg-white border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.18)] transition-all duration-200"
                />
              </div>
            </form>

            <Link
              to="/productdisplay"
              onClick={() => setMobileOpen(false)}
              className="mb-5 block text-center rounded-full border border-slate-300 bg-white text-[14px] font-medium text-slate-800 px-4 py-2.5 hover:border-fuchsia-300 hover:text-fuchsia-600 transition-all duration-200"
            >
              Display Product
            </Link>

            <p className="px-1 mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
              Shop by category
            </p>
            <nav className="grid grid-cols-2 gap-2 mb-5">
              {CATEGORY_LINKS.map((cat) => {
                const isActive = activeCategory === cat.key;
                return (
                  <Link
                    key={cat.key}
                    to={`/shop?category=${cat.key}`}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-3.5 py-3 rounded-xl text-[14px] font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200 shadow-sm"
                        : "text-slate-600 border border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <CategoryGlyph name={cat.key} />
                    {cat.label}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-200">
              {isStaff ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 px-1 pb-2">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 text-white text-[12px] font-mono font-semibold flex items-center justify-center uppercase shadow-[0_0_10px_-1px_rgba(217,70,239,0.6)]">
                      {user.username?.charAt(0) || "S"}
                    </span>
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-fuchsia-500/80">
                      Signed in as {user.username}
                    </span>
                  </div>
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 rounded-xl text-[15px] text-slate-700 hover:bg-slate-100 transition-all duration-200"
                  >
                    Admin
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-left px-3 py-2.5 rounded-xl text-[15px] text-rose-500 hover:bg-slate-100 transition-all duration-200"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center rounded-full border border-slate-300 bg-white text-[14px] font-medium text-slate-800 px-4 py-2.5 hover:border-fuchsia-300 hover:text-fuchsia-600 transition-all duration-200"
                >
                  Staff login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;