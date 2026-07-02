// pages/admin/AdminProductForm.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api/axios";
import { CATEGORIES, categoryFieldConfig } from "./productFieldConfig";

const emptyCommonFields = {
  name: "",
  brand: "",
  description: "",
  stock: 0,
  purchasePrice: "",
  sellingPrice: "",
  negotiationMin: "",
  negotiationMax: "",
};

const buildInitialCategoryFields = (category) => {
  const config = categoryFieldConfig[category] || [];
  const initial = {};
  config.forEach((f) => {
    if (f.type === "boolean") initial[f.key] = false;
    else if (f.type === "multiselect") initial[f.key] = [];
    else initial[f.key] = f.default ?? "";
  });
  return initial;
};

const AdminProductForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [category, setCategory] = useState("mobile");
  const [common, setCommon] = useState(emptyCommonFields);
  const [categoryFields, setCategoryFields] = useState(buildInitialCategoryFields("mobile"));
  const [existingImages, setExistingImages] = useState([]); // [{url, publicId}] — edit mode only
  const [newImageFiles, setNewImageFiles] = useState([]); // File[] — create mode, or added during edit
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageActionError, setImageActionError] = useState("");

  // ---- Load existing product when editing ----
  useEffect(() => {
    if (!isEdit) return;

    const fetchProduct = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await API.get(`/api/v1/products/${id}`);
        const p = res.data.data;

        setCategory(p.category);
        setCommon({
          name: p.name || "",
          brand: p.brand || "",
          description: p.description || "",
          stock: p.stock ?? 0,
          purchasePrice: p.pricing?.purchasePrice ?? "",
          sellingPrice: p.pricing?.sellingPrice ?? "",
          negotiationMin: p.pricing?.negotiation?.minPrice ?? "",
          negotiationMax: p.pricing?.negotiation?.maxPrice ?? "",
        });
        setIsActive(p.isActive);
        setExistingImages(p.images || []);

        const config = categoryFieldConfig[p.category] || [];
        const fields = {};
        config.forEach((f) => {
          if (f.type === "boolean") fields[f.key] = Boolean(p[f.key]);
          else if (f.type === "multiselect") fields[f.key] = p[f.key] || [];
          else fields[f.key] = p[f.key] ?? (f.default ?? "");
        });
        setCategoryFields(fields);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load product.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, isEdit]);

  // ---- Category change (create mode only — category is locked on edit) ----
  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setCategoryFields(buildInitialCategoryFields(newCategory));
  };

  const handleCommonChange = (key, value) => {
    setCommon((prev) => ({ ...prev, [key]: value }));
  };

  const handleCategoryFieldChange = (key, value) => {
    setCategoryFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleMultiselectToggle = (key, option) => {
    setCategoryFields((prev) => {
      const current = prev[key] || [];
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  };

  const handleNewImagesSelected = (e) => {
    setNewImageFiles(Array.from(e.target.files || []));
  };

  // ---- Build FormData matching what the backend controller expects ----
  const buildFormData = () => {
    const fd = new FormData();

    fd.append("name", common.name);
    fd.append("brand", common.brand);
    fd.append("description", common.description);
    fd.append("stock", String(common.stock));

    if (!isEdit) {
      // category only matters on create — updateProduct strips it anyway
      fd.append("category", category);
    }

    const pricing = {
      purchasePrice: Number(common.purchasePrice),
      sellingPrice: Number(common.sellingPrice),
    };
    if (common.negotiationMin || common.negotiationMax) {
      pricing.negotiation = {
        ...(common.negotiationMin && { minPrice: Number(common.negotiationMin) }),
        ...(common.negotiationMax && { maxPrice: Number(common.negotiationMax) }),
      };
    }
    fd.append("pricing", JSON.stringify(pricing));

    const config = categoryFieldConfig[category] || [];
    config.forEach((f) => {
      const value = categoryFields[f.key];
      if (value === "" || value === undefined || value === null) return;

      if (f.type === "boolean") {
        fd.append(f.key, value ? "true" : "false");
      } else if (f.type === "multiselect") {
        value.forEach((v) => fd.append(f.key, v));
      } else {
        fd.append(f.key, String(value));
      }
    });

    if (!isEdit) {
      // images are required on create, handled separately via /:id/images on edit
      newImageFiles.forEach((file) => fd.append("images", file));
    }

    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isEdit && newImageFiles.length === 0) {
      setError("At least one product image is required.");
      return;
    }

    setSaving(true);
    try {
      const fd = buildFormData();

      if (isEdit) {
        await API.patch(`/api/v1/products/${id}`, fd);
      } else {
        await API.post("/api/v1/products", fd);
      }

      navigate("/admin/products");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Image management (edit mode only) ----
  const handleAddImages = async (e) => {
    e.preventDefault();
    if (newImageFiles.length === 0) return;

    setImageActionError("");
    try {
      const fd = new FormData();
      newImageFiles.forEach((file) => fd.append("images", file));
      const res = await API.post(`/api/v1/products/${id}/images`, fd);
      setExistingImages(res.data.data.images);
      setNewImageFiles([]);
    } catch (err) {
      setImageActionError(err.response?.data?.message || "Failed to add images.");
    }
  };

  const handleRemoveImage = async (publicId) => {
    if (existingImages.length <= 1) {
      setImageActionError("Product must have at least one image.");
      return;
    }
    if (!window.confirm("Remove this image?")) return;

    setImageActionError("");
    try {
      const res = await API.delete(`/api/v1/products/${id}/images`, {
        data: { publicId },
      });
      setExistingImages(res.data.data.images);
    } catch (err) {
      setImageActionError(err.response?.data?.message || "Failed to remove image.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 text-[13.5px] text-[#4B4F57]">
        Loading…
      </div>
    );
  }

  const config = categoryFieldConfig[category] || [];

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-8">
      <h1 className="font-display text-[22px] font-semibold text-[#14171C] tracking-tight mb-6">
        {isEdit ? "Edit product" : "Add product"}
      </h1>

      {error && (
        <div className="mb-5 rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category */}
        <div className="bg-white border border-[#E1E3DD] rounded-xl p-5">
          <label className="block font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6] mb-1.5">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={isEdit}
            className="w-full font-mono text-[14px] bg-[#F6F7F3] border border-[#E1E3DD] rounded-lg px-3.5 py-2.5 text-[#14171C] focus:outline-none focus:border-[#2F5DFF] disabled:opacity-60"
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          {isEdit && (
            <p className="text-[12px] text-[#9CA0A6] mt-1.5">
              Category can't be changed after creation.
            </p>
          )}
        </div>

        {/* Common fields */}
        <div className="bg-white border border-[#E1E3DD] rounded-xl p-5 space-y-4">
          <h2 className="text-[13px] font-semibold text-[#14171C]">Basic details</h2>

          <Field label="Name" required>
            <input
              type="text"
              value={common.name}
              onChange={(e) => handleCommonChange("name", e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Brand">
            <input
              type="text"
              value={common.brand}
              onChange={(e) => handleCommonChange("brand", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={common.description}
              onChange={(e) => handleCommonChange("description", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>

          <Field label="Stock">
            <input
              type="number"
              min="0"
              value={common.stock}
              onChange={(e) => handleCommonChange("stock", e.target.value)}
              className={inputClass}
            />
          </Field>

          {isEdit && (
            <Field label="Status">
              <label className="flex items-center gap-2 text-[13.5px] text-[#14171C]">
                <input
                  type="checkbox"
                  checked={isActive}
                  readOnly
                  className="w-4 h-4"
                />
                {isActive ? "Active" : "Inactive"}
                <span className="text-[12px] text-[#9CA0A6]">
                  (use the toggle on the inventory list to change this)
                </span>
              </label>
            </Field>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-white border border-[#E1E3DD] rounded-xl p-5 space-y-4">
          <h2 className="text-[13px] font-semibold text-[#14171C]">Pricing</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Purchase price" required>
              <input
                type="number"
                min="0"
                value={common.purchasePrice}
                onChange={(e) => handleCommonChange("purchasePrice", e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Selling price" required>
              <input
                type="number"
                min="0"
                value={common.sellingPrice}
                onChange={(e) => handleCommonChange("sellingPrice", e.target.value)}
                required
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Negotiation min (optional)">
              <input
                type="number"
                min="0"
                value={common.negotiationMin}
                onChange={(e) => handleCommonChange("negotiationMin", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Negotiation max (optional)">
              <input
                type="number"
                min="0"
                value={common.negotiationMax}
                onChange={(e) => handleCommonChange("negotiationMax", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Category-specific fields */}
        <div className="bg-white border border-[#E1E3DD] rounded-xl p-5 space-y-4">
          <h2 className="text-[13px] font-semibold text-[#14171C]">
            {CATEGORIES.find((c) => c.key === category)?.label} details
          </h2>

          {config.map((f) => (
            <Field key={f.key} label={f.label} required={f.required}>
              {f.type === "text" && (
                <input
                  type="text"
                  value={categoryFields[f.key] ?? ""}
                  onChange={(e) => handleCategoryFieldChange(f.key, e.target.value)}
                  required={f.required}
                  className={inputClass}
                />
              )}

              {f.type === "number" && (
                <input
                  type="number"
                  value={categoryFields[f.key] ?? ""}
                  onChange={(e) => handleCategoryFieldChange(f.key, e.target.value)}
                  required={f.required}
                  className={inputClass}
                />
              )}

              {f.type === "select" && (
                <select
                  value={categoryFields[f.key] ?? ""}
                  onChange={(e) => handleCategoryFieldChange(f.key, e.target.value)}
                  required={f.required}
                  className={inputClass}
                >
                  <option value="" disabled>Select…</option>
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {f.type === "boolean" && (
                <label className="flex items-center gap-2 text-[13.5px] text-[#14171C]">
                  <input
                    type="checkbox"
                    checked={Boolean(categoryFields[f.key])}
                    onChange={(e) => handleCategoryFieldChange(f.key, e.target.checked)}
                    className="w-4 h-4"
                  />
                  Yes
                </label>
              )}

              {f.type === "multiselect" && (
                <div className="flex flex-wrap gap-3">
                  {f.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 text-[13px] text-[#14171C]">
                      <input
                        type="checkbox"
                        checked={(categoryFields[f.key] || []).includes(opt)}
                        onChange={() => handleMultiselectToggle(f.key, opt)}
                        className="w-4 h-4"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </Field>
          ))}
        </div>

        {/* Images */}
        <div className="bg-white border border-[#E1E3DD] rounded-xl p-5 space-y-4">
          <h2 className="text-[13px] font-semibold text-[#14171C]">Images</h2>

          {imageActionError && (
            <div className="rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
              {imageActionError}
            </div>
          )}

          {isEdit && existingImages.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {existingImages.map((img) => (
                <div key={img.publicId} className="relative">
                  <img
                    src={img.url}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover border border-[#E1E3DD]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.publicId)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#C0402E] text-white text-[11px] flex items-center justify-center"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <Field label={isEdit ? "Add more images" : "Product images"} required={!isEdit}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleNewImagesSelected}
              className="text-[13px]"
            />
          </Field>

          {isEdit && newImageFiles.length > 0 && (
            <button
              type="button"
              onClick={handleAddImages}
              className="rounded-lg border border-[#E1E3DD] text-[13px] font-medium text-[#14171C] px-3.5 py-2 hover:border-[#14171C]"
            >
              Upload {newImageFiles.length} image{newImageFiles.length === 1 ? "" : "s"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#14171C] text-white text-[14px] font-medium px-6 py-2.5 hover:bg-[#2F5DFF] transition-colors duration-150 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/products")}
            className="text-[13.5px] font-medium text-[#4B4F57] hover:text-[#14171C]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const inputClass =
  "w-full font-mono text-[13.5px] bg-[#F6F7F3] border border-[#E1E3DD] rounded-lg px-3.5 py-2.5 text-[#14171C] placeholder:text-[#9CA0A6] focus:outline-none focus:border-[#2F5DFF] transition-colors";

const Field = ({ label, required, children }) => (
  <div>
    <label className="block font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6] mb-1.5">
      {label} {required && <span className="text-[#C0402E]">*</span>}
    </label>
    {children}
  </div>
);

export default AdminProductForm;