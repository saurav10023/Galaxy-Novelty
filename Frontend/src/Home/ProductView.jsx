// src/components/ProductView.jsx
//
// Restyled to Light Glass Tech and deduplicated: this file previously
// carried its own inline ProductCard and its own 4-tile category shelf,
// both in the old flat palette (#14171C / #E1E3DD / #2F5DFF) rather than
// the glass system used by Navbar/Hero/Footer. Both already exist as
// dedicated, more capable components (ProductCard.jsx has the gradient
// price + glass spec pills; CategoryGrid.jsx has the swipe carousel +
// hover spotlight/tilt), so this page now composes those instead of
// re-implementing them -- one less place for the two to drift apart.
//
// What's left here (the "Recently added" shelf) is restyled to match:
// ambient glow wash, glass eyebrow pill, font-display heading, glass
// skeleton cards while loading, fuchsia "View all" link.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import CategoryGrid from "./CategoryGrid";
import ProductCard from "./ProductCard";

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ProductCardSkeleton = () => (
  <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-md overflow-hidden animate-pulse">
    <div className="aspect-square bg-gradient-to-br from-fuchsia-50 via-slate-100 to-cyan-50" />
    <div className="p-3.5 space-y-2.5">
      <div className="h-2.5 w-1/3 bg-slate-200/70 rounded-full" />
      <div className="h-3 w-4/5 bg-slate-200/70 rounded-full" />
      <div className="flex gap-1.5 pt-1">
        <div className="h-4 w-12 bg-slate-200/70 rounded-full" />
        <div className="h-4 w-14 bg-slate-200/70 rounded-full" />
      </div>
      <div className="h-4 w-1/2 bg-slate-200/70 rounded-full mt-3" />
    </div>
  </div>
);

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
    <>
      <CategoryGrid />

      <section className="relative bg-white overflow-x-clip">
        {/* Ambient wash, clamped so it can never force horizontal scroll */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-10 left-0 w-[min(420px,80vw)] h-[min(420px,80vw)] rounded-full bg-gradient-to-br from-fuchsia-200/25 to-cyan-200/25 blur-3xl"
        />

        <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <p className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase text-slate-700 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full px-3.5 py-1.5 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500" />
                Just in
              </p>
              <h2 className="font-display text-[26px] md:text-[32px] font-semibold text-slate-900 tracking-tight">
                Recently added
              </h2>
            </div>
            <Link
              to="/shop"
              className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider text-fuchsia-600 hover:text-fuchsia-700 transition-colors duration-150 shrink-0"
            >
              View all <ArrowIcon />
            </Link>
          </div>

          {error ? (
            <p className="text-[14px] text-slate-500 font-mono">
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
    </>
  );
};

export default ProductView;