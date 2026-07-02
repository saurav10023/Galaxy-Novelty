// pages/admin/AdminProductsList.jsx
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import { CATEGORIES } from "./productFieldConfig";

const AdminProductsList = () => {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // /search works with no category too (falls through to matching
      // everything), and since we're authenticated as admin, req.user is
      // set server-side -> isActive filter is lifted and full pricing shows.
      const res = await API.get("/api/v1/products/search", {
        params: {
          ...(category && { category }),
          ...(search && { search }),
          page,
          limit: 20,
          sort: "newest",
        },
      });
      setProducts(res.data.data.products);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [category, search, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
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

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[22px] font-semibold text-[#14171C] tracking-tight">
            Inventory
          </h1>
          <p className="text-[13.5px] text-[#4B4F57] mt-1">
            {pagination.total} product{pagination.total === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="rounded-full bg-[#14171C] text-white text-[14px] font-medium px-5 py-2.5 hover:bg-[#2F5DFF] transition-colors duration-150"
        >
          + Add product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="font-mono text-[13px] bg-white border border-[#E1E3DD] rounded-lg px-3 py-2 text-[#14171C] focus:outline-none focus:border-[#2F5DFF]"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        <p className="text-[13.5px] text-[#4B4F57]">No products found.</p>
      ) : (
        <div className="border border-[#E1E3DD] rounded-xl overflow-hidden bg-white">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="bg-[#F6F7F3] text-left font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6]">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Selling price</th>
                <th className="px-4 py-3">Purchase price</th>
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
                  {/* purchasePrice only ever appears here because we're an
                      authenticated admin — sanitizeProduct strips it otherwise */}
                  <td className="px-4 py-3 font-mono text-[#9CA0A6]">
                    {p.pricing?.purchasePrice !== undefined ? `₹${p.pricing.purchasePrice}` : "—"}
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
                      <Link
                        to={`/admin/products/${p._id}/edit`}
                        className="text-[12.5px] font-medium text-[#2F5DFF] hover:underline"
                      >
                        Edit
                      </Link>
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-[13px] font-medium text-[#4B4F57] disabled:opacity-40 hover:text-[#14171C]"
          >
            Previous
          </button>
          <span className="text-[13px] text-[#9CA0A6]">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            className="text-[13px] font-medium text-[#4B4F57] disabled:opacity-40 hover:text-[#14171C]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminProductsList;