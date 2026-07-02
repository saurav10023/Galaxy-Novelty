// pages/admin/AdminProductsList.jsx
//
// Same URL-driven filtering pattern as the public ShopPage: `category`,
// `search`, `sort`, `page`, and any category-specific filter all live in
// the URL, so a filtered admin view is shareable/bookmarkable and survives
// a refresh. The DynamicFilterSidebar + categoryFilterFields config are
// reused as-is from the shop -- same filter fields per category, just
// pointed at the admin search endpoint and rendered as a table instead of
// a product grid.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../../api/axios";
import DynamicFilterSidebar from "../../components/filters/Dynamicfiltersidebar";
import { CATEGORIES, sortOptions } from "../../config/categoryfilterfields";

const AdminProductsList = ({ onEdit, onAddNew }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Number(searchParams.get("page")) || 1;

  // Local, uncommitted copy of the search box -- only written to the URL
  // (and therefore only triggers a fetch) on submit.
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  // Everything in the URL except the params that get their own dedicated
  // controls -- this is what the sidebar edits.
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
      const res = await API.get("/api/v1/products/admin/search", {
        params: { ...params, limit: 20 },
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
    if (sort !== "newest") next.set("sort", sort);
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ search: searchInput });
  };

  const handleToggleStatus = async (id) => {
    setActionError("");
    try {
      await API.patch(`/api/v1/products/${id}/toggle-status`);
      setProducts((prev) =>
        prev.map((p) => (p._id === id ? { ...p, isActive: !p.isActive } : p))
      );
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to toggle status.");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This also removes its images from storage. This cannot be undone.`)) {
      return;
    }
    setActionError("");
    try {
      await API.delete(`/api/v1/products/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to delete product.");
    }
  };

  const activeCategory = CATEGORIES.find((c) => c.key === category);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[22px] font-semibold text-[#14171C] tracking-tight">
            Inventory
          </h1>
          <p className="text-[13.5px] text-[#4B4F57] mt-1">
            {search ? `Results for "${search}" — ` : activeCategory ? `${activeCategory.label} — ` : ""}
            {pagination.total} product{pagination.total === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={onAddNew}
          className="rounded-full bg-[#14171C] text-white text-[14px] font-medium px-5 py-2.5 hover:bg-[#2F5DFF] transition-colors duration-150"
        >
          + Add product
        </button>
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
          {/* Search + sort bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name…"
                className="font-mono text-[13px] bg-white border border-[#E1E3DD] rounded-lg px-3.5 py-2 w-56 text-[#14171C] placeholder:text-[#9CA0A6] focus:outline-none focus:border-[#2F5DFF]"
              />
              <button
                type="submit"
                className="rounded-lg border border-[#E1E3DD] text-[13px] font-medium text-[#4B4F57] px-3.5 py-2 hover:border-[#14171C] hover:text-[#14171C]"
              >
                Search
              </button>
            </form>

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

          {actionError && (
            <div className="mb-4 rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
              {actionError}
            </div>
          )}

          {loading ? (
            <p className="text-[13.5px] text-[#4B4F57]">Loading…</p>
          ) : error ? (
            <div className="rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
              {error}
            </div>
          ) : products.length === 0 ? (
            <p className="text-[13.5px] text-[#4B4F57]">No products match these filters.</p>
          ) : (
            <div className="border border-[#E1E3DD] rounded-xl overflow-hidden bg-white">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="bg-[#F6F7F3] text-left font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6]">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Selling price</th>
                    <th className="px-4 py-3">Purchase price</th>
                    <th className="px-4 py-3">Negotiation</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id} className="border-t border-[#E1E3DD]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.images?.[0]?.url && (
                            <img
                              src={p.images[0].url}
                              alt={p.name}
                              className="w-9 h-9 rounded-md object-cover border border-[#E1E3DD]"
                            />
                          )}
                          <div>
                            <p className="font-medium text-[#14171C]">{p.name}</p>
                            <p className="text-[12px] text-[#9CA0A6]">{p.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize">{p.category}</td>
                      <td className="px-4 py-3 font-mono">₹{p.pricing?.sellingPrice}</td>
                      <td className="px-4 py-3 font-mono text-[#9CA0A6]">
                        {p.pricing?.purchasePrice !== undefined ? `₹${p.pricing.purchasePrice}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px]">
                        {p.pricing?.negotiation ? (
                          <div className="flex flex-col">
                            <span>₹{p.pricing.negotiation.minPrice ?? "—"}</span>
                            <span className="text-[#9CA0A6]">to ₹{p.pricing.negotiation.maxPrice ?? "—"}</span>
                          </div>
                        ) : (
                          <span className="text-[#9CA0A6]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{p.stock}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${
                            p.isActive
                              ? "bg-[#E6F4EA] text-[#1E7B3B]"
                              : "bg-[#F1F1EE] text-[#4B4F57]"
                          }`}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onEdit(p._id)}
                            className="text-[12.5px] font-medium text-[#2F5DFF] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(p._id)}
                            className="text-[12.5px] font-medium text-[#4B4F57] hover:text-[#14171C]"
                          >
                            {p.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDelete(p._id, p.name)}
                            className="text-[12.5px] font-medium text-[#C0402E] hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
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

export default AdminProductsList;