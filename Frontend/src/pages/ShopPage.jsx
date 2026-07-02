// src/pages/ShopPage.jsx
//
// One page, four category experiences. `category` lives in the URL
// (?category=mobile) so navbar links, back/forward nav, and sharing/
// bookmarking a filtered search all work -- matching the design already
// laid out in docs/CategoryPage.jsx, but with real per-category filters
// (DynamicFilterSidebar) instead of a single generic radio list, plus
// sorting and pagination wired up end to end.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/axios";
import DynamicFilterSidebar from "../components/filters/DynamicFilterSidebar";
import ProductCard from "../components/ProductCard";
import { CATEGORIES, sortOptions } from "../config/categoryFilterFields";

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Number(searchParams.get("page")) || 1;

  // Everything in the URL except the pagination/sort/search params that get
  // their own dedicated controls -- this is what the sidebar edits.
  const filters = useMemo(() => {
    const obj = {};
    for (const [key, value] of searchParams.entries()) {
      if (!["category", "search", "sort", "page"].includes(key)) obj[key] = value;
    }
    return obj;
  }, [searchParams]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(searchParams.entries());
      const res = await API.get("/api/v1/products/search", {
        params: { ...params, limit: 20 },
        withCredentials: true,
      });
      setProducts(res.data.data.products);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateParams = (updates, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    if (resetPage) next.delete("page");
    setSearchParams(next);
  };

  const handleCategoryChange = (newCategory) => {
    // switching category invalidates every category-specific filter
    const next = new URLSearchParams();
    if (newCategory) next.set("category", newCategory);
    if (search) next.set("search", search);
    setSearchParams(next);
  };

  const handleFilterChange = (newFilters) => {
    const next = new URLSearchParams();
    if (category) next.set("category", category);
    if (search) next.set("search", search);
    if (sort !== "newest") next.set("sort", sort);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") next.set(key, value);
    });
    setSearchParams(next);
  };

  const activeCategory = CATEGORIES.find((c) => c.key === category);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-[24px] font-semibold text-[#14171C] tracking-tight">
          {search ? `Results for "${search}"` : activeCategory ? activeCategory.label : "All products"}
        </h1>
        <p className="text-[13.5px] text-[#4B4F57] mt-1">
          {pagination.total} product{pagination.total === 1 ? "" : "s"}
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-[#E1E3DD] pb-4">
        <button
          onClick={() => handleCategoryChange("")}
          className={`px-3.5 py-2 rounded-full text-[13.5px] font-medium transition-colors duration-150 ${
            !category ? "bg-[#14171C] text-white" : "text-[#4B4F57] hover:bg-[#F6F7F3]"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => handleCategoryChange(c.key)}
            className={`px-3.5 py-2 rounded-full text-[13.5px] font-medium transition-colors duration-150 ${
              category === c.key ? "bg-[#14171C] text-white" : "text-[#4B4F57] hover:bg-[#F6F7F3]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar -- only category-specific fields exist once a category is picked */}
        {category ? (
          <DynamicFilterSidebar category={category} filters={filters} onFilterChange={handleFilterChange} />
        ) : (
          <div className="w-full md:w-64 shrink-0">
            <p className="text-[12.5px] text-[#9CA0A6]">
              Pick a category above to see its filters.
            </p>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="flex items-center justify-end mb-4">
            <select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value }, { resetPage: false })}
              className="font-mono text-[13px] bg-white border border-[#E1E3DD] rounded-lg px-3 py-2 text-[#14171C] focus:outline-none focus:border-[#2F5DFF]"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-[13.5px] text-[#4B4F57]">Loading…</p>
          ) : error ? (
            <div className="rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
              {error}
            </div>
          ) : products.length === 0 ? (
            <p className="text-[13.5px] text-[#4B4F57]">No products match these filters.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) }, { resetPage: false })}
                className="text-[13px] font-medium text-[#4B4F57] disabled:opacity-40 hover:text-[#14171C]"
              >
                Previous
              </button>
              <span className="text-[13px] text-[#9CA0A6]">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => updateParams({ page: String(page + 1) }, { resetPage: false })}
                className="text-[13px] font-medium text-[#4B4F57] disabled:opacity-40 hover:text-[#14171C]"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopPage;