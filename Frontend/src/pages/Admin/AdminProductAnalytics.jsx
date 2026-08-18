// pages/admin/AdminProductAnalytics.jsx
//
// Live snapshot only (no date range — matches the backend, which has no
// date filtering either). Pulls from the three endpoints on
// analytics.controller.js:
//   GET /api/v1/products/analytics/overview
//   GET /api/v1/products/analytics/brands?category=...
//   GET /api/v1/products/analytics/price-distribution?category=...&buckets=6
//
// The category selector only affects brand + price distribution (the
// overview endpoint is intentionally global-only — it's the "how many
// products of each kind do I have" answer, and doesn't take a category
// filter). Same Light Glass Tech language as AdminProductsList: glass
// panels, fuchsia→cyan gradient for emphasis, mono for numbers/labels,
// rounded-2xl surfaces, restrained motion.

import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../api/axios";
import Select from "../../components/ui/Select";
import { CATEGORIES } from "../../config/categoryfilterfields";

/* ---------------------------------------------------------------------- */
/* Icons                                                                   */
/* ---------------------------------------------------------------------- */

const IconBox = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" {...props}>
    <path d="M10 3l6.5 3.4v7.2L10 17 3.5 13.6V6.4L10 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M3.7 6.3 10 9.7l6.3-3.4M10 9.7V17" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);
const IconPulse = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" {...props}>
    <path d="M3 10.5h3l1.6-4.5 3 8 1.8-5.5H17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconLayers = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" {...props}>
    <path d="M10 3l7 3.5-7 3.5-7-3.5L10 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M3 10.5L10 14l7-3.5M3 14L10 17.5 17 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconTag = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" {...props}>
    <path d="M11 3H4v7l9 9 7-7-9-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="7.3" cy="6.7" r="1" fill="currentColor" />
  </svg>
);
const IconRupee = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" {...props}>
    <path d="M5 4h10M5 8h10M5 4c3 0 5 1.2 5 3.2S8 10.4 5 10.4h-.5L11 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconPower = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" {...props}>
    <path d="M10 3v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M6 5.5a6 6 0 1 0 8 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const formatINR = (n) => `\u20B9${Number(n ?? 0).toLocaleString("en-IN")}`;
const formatCompactINR = (n) => {
  const num = Number(n ?? 0);
  if (num >= 100000) return `\u20B9${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
  if (num >= 1000) return `\u20B9${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}k`;
  return formatINR(num);
};

/* ---------------------------------------------------------------------- */
/* Presentational bits                                                    */
/* ---------------------------------------------------------------------- */

const StatCard = ({ icon, label, value, tone = "default", loading }) => (
  <div className="border border-slate-200 rounded-2xl bg-white/75 backdrop-blur-xl p-4 shadow-[0_18px_40px_-32px_rgba(217,70,239,0.3)]">
    <div className="flex items-center gap-2 mb-2">
      <span
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
          tone === "emerald"
            ? "bg-emerald-50 text-emerald-600"
            : tone === "rose"
            ? "bg-rose-50 text-rose-600"
            : "bg-gradient-to-r from-fuchsia-50 to-cyan-50 text-slate-500 border border-slate-200"
        }`}
      >
        {icon}
      </span>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
    </div>
    {loading ? (
      <div className="h-6 w-16 bg-slate-100 rounded animate-pulse" />
    ) : (
      <p className="font-display text-[22px] font-semibold text-slate-900 tracking-tight">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
    )}
  </div>
);

// Horizontal proportional bar — used for both category and brand
// breakdowns so the two sections read as one visual language.
const BarRow = ({ label, sublabel, count, maxCount, gradient }) => {
  const pct = maxCount > 0 ? Math.max((count / maxCount) * 100, 3) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 sm:w-28 shrink-0 min-w-0">
        <p className="text-[12.5px] font-medium text-slate-900 truncate capitalize" title={label}>{label}</p>
        {sublabel && <p className="text-[10.5px] text-slate-400 truncate">{sublabel}</p>}
      </div>
      <div className="flex-1 h-6 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${gradient} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-[12px] text-slate-500">{count}</span>
    </div>
  );
};

const SectionCard = ({ icon, title, subtitle, action, children }) => (
  <div className="border border-slate-200 rounded-2xl bg-white/75 backdrop-blur-xl p-4 sm:p-5 shadow-[0_18px_40px_-32px_rgba(217,70,239,0.3)]">
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-gradient-to-r from-fuchsia-50 to-cyan-50 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div>
          <h2 className="text-[13.5px] font-semibold text-slate-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-[11.5px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const EmptyRow = ({ children }) => (
  <p className="text-[12.5px] text-slate-400 py-2">{children}</p>
);

const BarRowSkeleton = () => (
  <div className="flex items-center gap-3 animate-pulse">
    <div className="w-24 sm:w-28 h-3 bg-slate-100 rounded shrink-0" />
    <div className="flex-1 h-6 rounded-full bg-slate-100" />
    <div className="w-10 h-3 bg-slate-100 rounded shrink-0" />
  </div>
);

/* ---------------------------------------------------------------------- */
/* Page                                                                    */
/* ---------------------------------------------------------------------- */

const AdminProductAnalytics = () => {
  const [category, setCategory] = useState(""); // "" = all categories

  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const [brandData, setBrandData] = useState(null);
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandError, setBrandError] = useState("");

  const [priceData, setPriceData] = useState(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState("");

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const res = await API.get("/api/v1/products/analytics/overview");
      setOverview(res.data.data);
    } catch (err) {
      setOverviewError(err.response?.data?.message || "Failed to load overview.");
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    setBrandLoading(true);
    setBrandError("");
    try {
      const res = await API.get("/api/v1/products/analytics/brands", {
        params: category ? { category } : {},
      });
      setBrandData(res.data.data);
    } catch (err) {
      setBrandError(err.response?.data?.message || "Failed to load brand distribution.");
    } finally {
      setBrandLoading(false);
    }
  }, [category]);

  const fetchPriceDistribution = useCallback(async () => {
    setPriceLoading(true);
    setPriceError("");
    try {
      const res = await API.get("/api/v1/products/analytics/price-distribution", {
        params: { buckets: 6, ...(category ? { category } : {}) },
      });
      setPriceData(res.data.data);
    } catch (err) {
      setPriceError(err.response?.data?.message || "Failed to load price distribution.");
    } finally {
      setPriceLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    fetchPriceDistribution();
  }, [fetchPriceDistribution]);

  const categoryCounts = overview?.categoryCounts || [];
  const maxCategoryCount = useMemo(
    () => Math.max(1, ...categoryCounts.map((c) => c.count)),
    [categoryCounts]
  );

  const brandCounts = brandData?.brandCounts || [];
  const [showAllBrands, setShowAllBrands] = useState(false);
  const visibleBrands = showAllBrands ? brandCounts : brandCounts.slice(0, 8);
  const maxBrandCount = useMemo(
    () => Math.max(1, ...brandCounts.map((b) => b.count)),
    [brandCounts]
  );

  const priceBuckets = priceData?.buckets || [];
  const maxBucketCount = useMemo(
    () => Math.max(1, ...priceBuckets.map((b) => b.count)),
    [priceBuckets]
  );

  const activeCategoryLabel = CATEGORIES.find((c) => c.key === category)?.label;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header + category scope selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-[19px] sm:text-[21px] font-semibold text-slate-900 tracking-tight">
            Analytics
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Live snapshot of your inventory — no date range applied.</p>
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={category}
            onChange={setCategory}
            fullWidth
            options={[{ value: "", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c.key, label: c.label }))]}
          />
        </div>
      </div>

      {overviewError ? (
        <div className="rounded-xl bg-rose-50/80 border border-rose-200 px-4 py-6 text-center">
          <p className="text-[13.5px] text-rose-600 mb-3">{overviewError}</p>
          <button
            onClick={fetchOverview}
            className="rounded-full border border-rose-200 text-[13px] font-medium text-rose-600 px-4 py-2 hover:bg-rose-100/60 transition-colors duration-150"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Stat cards — total / categories / active / inactive. Active &
              inactive only appear once the overview call actually returns
              them (the backend only includes that split for admins, which
              this page always is, but we still guard for the field being
              absent rather than assuming). */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard icon={<IconBox />} label="Total products" value={overview?.totalProducts ?? 0} loading={overviewLoading} />
            <StatCard icon={<IconLayers />} label="Categories" value={categoryCounts.length} loading={overviewLoading} />
            <StatCard
              icon={<IconPower />}
              label="Active"
              value={overview?.activeCount ?? "—"}
              tone="emerald"
              loading={overviewLoading}
            />
            <StatCard
              icon={<IconPower />}
              label="Inactive"
              value={overview?.inactiveCount ?? "—"}
              tone="rose"
              loading={overviewLoading}
            />
          </div>

          {/* Category breakdown — always global, unaffected by the
              category selector above (picking one category to inspect its
              brand/price makeup shouldn't collapse this section to a
              single bar). */}
          <SectionCard icon={<IconLayers />} title="Products by category" subtitle="Across your whole catalog">
            <div className="space-y-3">
              {overviewLoading ? (
                Array.from({ length: 4 }).map((_, i) => <BarRowSkeleton key={i} />)
              ) : categoryCounts.length === 0 ? (
                <EmptyRow>No products yet.</EmptyRow>
              ) : (
                categoryCounts.map((c) => (
                  <BarRow
                    key={c.category}
                    label={CATEGORIES.find((cat) => cat.key === c.category)?.label || c.category}
                    count={c.count}
                    maxCount={maxCategoryCount}
                    gradient="bg-gradient-to-r from-fuchsia-500 to-cyan-500"
                  />
                ))
              )}
            </div>
          </SectionCard>

          {/* Brand distribution — scoped to the selected category, or the
              whole catalog when "All categories" is picked. */}
          <SectionCard
            icon={<IconTag />}
            title="Brand distribution"
            subtitle={activeCategoryLabel ? `Within ${activeCategoryLabel}` : "Across your whole catalog"}
            action={
              brandCounts.length > 8 && (
                <button
                  onClick={() => setShowAllBrands((v) => !v)}
                  className="text-[12px] font-medium text-fuchsia-600 hover:text-fuchsia-700"
                >
                  {showAllBrands ? "Show less" : `Show all ${brandCounts.length}`}
                </button>
              )
            }
          >
            {brandError ? (
              <p className="text-[12.5px] text-rose-600">{brandError}</p>
            ) : (
              <div className="space-y-3">
                {brandLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <BarRowSkeleton key={i} />)
                ) : visibleBrands.length === 0 ? (
                  <EmptyRow>No branded products in this scope yet.</EmptyRow>
                ) : (
                  visibleBrands.map((b) => (
                    <BarRow
                      key={b.brand}
                      label={b.brand}
                      count={b.count}
                      maxCount={maxBrandCount}
                      gradient="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
                    />
                  ))
                )}
              </div>
            )}
          </SectionCard>

          {/* Price distribution — vertical bar chart over the auto-sized
              buckets the backend computes with $bucketAuto, so this holds
              up for any category without a hardcoded price ladder. */}
          <SectionCard
            icon={<IconRupee />}
            title="Price distribution"
            subtitle={activeCategoryLabel ? `Selling price \u00B7 ${activeCategoryLabel}` : "Selling price \u00B7 whole catalog"}
          >
            {priceError ? (
              <p className="text-[12.5px] text-rose-600">{priceError}</p>
            ) : priceLoading ? (
              <div className="flex items-end gap-2.5 h-40 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-slate-100 rounded-t-lg" style={{ height: `${30 + (i % 3) * 20}%` }} />
                ))}
              </div>
            ) : priceBuckets.length === 0 ? (
              <EmptyRow>No priced products in this scope yet.</EmptyRow>
            ) : (
              <div className="flex items-end gap-2.5 h-40">
                {priceBuckets.map((b, i) => {
                  const heightPct = Math.max((b.count / maxBucketCount) * 100, 6);
                  return (
                    <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full group">
                      <span className="text-[11px] font-mono text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {b.count}
                      </span>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-fuchsia-500 to-cyan-400 transition-all duration-500 hover:brightness-110"
                        style={{ height: `${heightPct}%` }}
                        title={`${formatINR(b.minPrice)} \u2013 ${formatINR(b.maxPrice)} \u00B7 ${b.count} product${b.count === 1 ? "" : "s"}`}
                      />
                      <span className="mt-2 text-[10px] font-mono text-slate-400 text-center leading-tight truncate w-full">
                        {formatCompactINR(b.rangeStart)}
                        <br />
                        {formatCompactINR(b.rangeEnd)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default AdminProductAnalytics;