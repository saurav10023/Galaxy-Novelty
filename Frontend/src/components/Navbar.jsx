import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/galaxy-novelty-logo.png";

const CATEGORY_LINKS = [
  { key: "mobile", label: "Mobiles" },
  { key: "headphone", label: "Headphones" },
  { key: "charger", label: "Chargers" },
  { key: "powerbank", label: "Power Banks" },
];

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
    <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const MenuIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
    {open ? (
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    ) : (
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    )}
  </svg>
);

const ChevronDown = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Logo chip stays white/rounded -- reads crisply against the solid orange bar.
const BrandMark = ({ onClick }) => (
  <Link to="/" onClick={onClick} className="flex items-center gap-2.5 shrink-0">
    <span className="w-11 h-11 rounded-lg bg-white ring-1 ring-white/40 overflow-hidden flex items-center justify-center shrink-0">
      <img src={logo} alt="Galaxy Novelty" className="w-full h-full object-cover" />
    </span>
    <span className="font-display text-[17px] font-semibold text-white tracking-tight leading-none hidden sm:block">
      GALAXY<span className="text-white/80"> NOVELTY</span>
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

  const isStaff = user?.role === "admin";

  const activeCategory = new URLSearchParams(location.search).get("category");

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
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#FF7A1A] to-[#F5590A] backdrop-blur-md shadow-[0_4px_20px_-8px_rgba(245,89,10,0.5)]">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="h-16 flex items-center justify-between gap-6">
          {/* Brand */}
          <BrandMark onClick={() => setMobileOpen(false)} />

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {CATEGORY_LINKS.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <Link
                  key={cat.key}
                  to={`/shop?category=${cat.key}`}
                  className={`px-3.5 py-2 rounded-full text-[14px] font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-white text-[#F5590A] shadow-sm"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {cat.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="hidden sm:flex items-center">
              {searchOpen ? (
                <form onSubmit={handleSearchSubmit} className="flex items-center">
                  <input
                    autoFocus
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onBlur={() => !searchValue && setSearchOpen(false)}
                    placeholder="Search products…"
                    className="font-mono text-[13px] bg-black/20 border border-white/25 rounded-full pl-4 pr-4 py-2 w-56 text-white placeholder:text-white/60 focus:outline-none focus:border-white/70 transition-all"
                  />
                </form>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search products"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/90 hover:text-white hover:bg-white/15 transition-colors duration-150"
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
                      className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 transition-colors duration-150"
                    >
                      <span className="w-6 h-6 rounded-full bg-white text-[#F5590A] text-[11px] font-mono font-semibold flex items-center justify-center uppercase">
                        {user.username?.charAt(0) || "S"}
                      </span>
                      <span className="text-[13.5px] font-medium text-white max-w-[100px] truncate">
                        {user.username}
                      </span>
                      <span className="text-white/80">
                        <ChevronDown />
                      </span>
                    </button>

                    {accountOpen && (
                      <div
                        className="absolute right-0 mt-2 w-48 rounded-xl border border-[#E1E3DD] bg-white shadow-[0_16px_40px_-16px_rgba(20,23,28,0.25)] py-1.5 overflow-hidden"
                        onMouseLeave={() => setAccountOpen(false)}
                      >
                        <span className="block px-4 py-2 font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6]">
                          Staff account
                        </span>
                        <Link
                          to="/admin"
                          onClick={() => setAccountOpen(false)}
                          className="block px-4 py-2.5 text-[14px] text-[#14171C] hover:bg-[#F6F7F3]"
                        >
                          Admin 
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2.5 text-[14px] text-[#C0402E] hover:bg-[#F6F7F3]"
                        >
                          Log out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="hidden md:inline-flex items-center justify-center rounded-full border border-white/35 text-[13.5px] font-medium text-white px-4 py-2 hover:bg-white/15 transition-colors duration-150"
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
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 transition-colors duration-150"
            >
              <MenuIcon open={mobileOpen} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/20 bg-[#F5590A] px-6 py-5">
          <form onSubmit={handleSearchSubmit} className="mb-5">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search products…"
              className="w-full font-mono text-[13px] bg-black/20 border border-white/25 rounded-full px-4 py-2.5 text-white placeholder:text-white/60 focus:outline-none focus:border-white/70"
            />
          </form>

          <nav className="flex flex-col gap-1 mb-5">
            {CATEGORY_LINKS.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <Link
                  key={cat.key}
                  to={`/shop?category=${cat.key}`}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2.5 rounded-lg text-[15px] font-medium transition-colors duration-150 ${
                    isActive ? "bg-white text-[#F5590A]" : "text-white hover:bg-white/15"
                  }`}
                >
                  {cat.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-white/20">
            {isStaff ? (
              <div className="flex flex-col gap-1">
                <span className="px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider text-white/70">
                  Signed in as {user.username}
                </span>
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-[15px] text-white hover:bg-white/15 transition-colors duration-150"
                >
                  Admin
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left px-3 py-2.5 rounded-lg text-[15px] text-white hover:bg-white/15 transition-colors duration-150"
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block text-center rounded-full border border-white/35 text-[14px] font-medium text-white px-4 py-2.5 hover:bg-white/15 transition-colors duration-150"
              >
                Staff login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;