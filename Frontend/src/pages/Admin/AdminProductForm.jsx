// pages/admin/AdminProductForm.jsx
//
// UX pass on top of the original: fields regroup into a responsive grid
// (single column on phone, two-up on tablet/desktop) so related fields sit
// side by side instead of one long scroll; number inputs get the right
// mobile keyboard; checkboxes get real touch targets; new image picks get
// a preview + per-file remove before you ever hit save; and the save/cancel
// actions live in a sticky bar so they're reachable without scrolling back
// down a long form. All data flow, API calls, and validation are unchanged.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api/axios";
import Select from "../../components/ui/Select";
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
  const [newImagePreviews, setNewImagePreviews] = useState([]); // object URLs, mirrors newImageFiles
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

  // ---- Preview thumbnails for newly picked (not-yet-uploaded) images ----
  useEffect(() => {
    const urls = newImageFiles.map((file) => URL.createObjectURL(file));
    setNewImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [newImageFiles]);

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

  // Accumulate picks across multiple file-dialog opens instead of replacing
  // the selection each time -- picking one photo, then going back for a
  // second, shouldn't lose the first.
  const handleNewImagesSelected = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    setNewImageFiles((prev) => [...prev, ...picked]);
    e.target.value = ""; // allow re-picking the same file again if removed
  };

  const handleRemoveNewImage = (index) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 bg-[#F1F1EE] rounded" />
          <div className="h-32 bg-[#F1F1EE] rounded-xl" />
          <div className="h-48 bg-[#F1F1EE] rounded-xl" />
          <div className="h-40 bg-[#F1F1EE] rounded-xl" />
        </div>
      </div>
    );
  }

  const config = categoryFieldConfig[category] || [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8">
      <h1 className="font-display text-[19px] sm:text-[22px] font-semibold text-[#14171C] tracking-tight mb-6">
        {isEdit ? "Edit product" : "Add product"}
      </h1>

      {error && (
        <div className="mb-5 rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 pb-4">
        {/* Category */}
        <div className="bg-white border border-[#E1E3DD] rounded-xl p-4 sm:p-5">
          <label className="block font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6] mb-1.5">
            Category
          </label>
          <Select
            value={category}
            onChange={handleCategoryChange}
            disabled={isEdit}
            fullWidth
            options={CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
          />
          {isEdit && (
            <p className="text-[12px] text-[#9CA0A6] mt-1.5">
              Category can't be changed after creation.
            </p>
          )}
        </div>

        {/* Common fields */}
        <div className="bg-white border border-[#E1E3DD] rounded-xl p-4 sm:p-5">
          <h2 className="text-[13px] font-semibold text-[#14171C] mb-4">Basic details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <Field label="Description" className="sm:col-span-2">
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
                inputMode="numeric"
                min="0"
                value={common.stock}
                onChange={(e) => handleCommonChange("stock", e.target.value)}
                className={inputClass}
              />
            </Field>

            {isEdit && (
              <Field label="Status">
                <div className="flex items-center gap-2 text-[13.5px] text-[#14171C] min-h-[42px]">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      isActive ? "bg-[#E6F4EA] text-[#1E7B3B]" : "bg-[#F1F1EE] text-[#4B4F57]"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="text-[12px] text-[#9CA0A6]">
                    Change this from the inventory list
                  </span>
                </div>
              </Field>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white border border-[#E1E3DD] rounded-xl p-4 sm:p-5">
          <h2 className="text-[13px] font-semibold text-[#14171C] mb-4">Pricing</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Purchase price" required>
              <input
                type="number"
                inputMode="decimal"
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
                inputMode="decimal"
                min="0"
                value={common.sellingPrice}
                onChange={(e) => handleCommonChange("sellingPrice", e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Negotiation min (optional)">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={common.negotiationMin}
                onChange={(e) => handleCommonChange("negotiationMin", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Negotiation max (optional)">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={common.negotiationMax}
                onChange={(e) => handleCommonChange("negotiationMax", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Category-specific fields */}
        <div className="bg-white border border-[#E1E3DD] rounded-xl p-4 sm:p-5">
          <h2 className="text-[13px] font-semibold text-[#14171C] mb-4">
            {CATEGORIES.find((c) => c.key === category)?.label} details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config.map((f) => {
              const spanFull = f.type === "boolean" || f.type === "multiselect";
              return (
                <Field key={f.key} label={f.label} required={f.required} className={spanFull ? "sm:col-span-2" : ""}>
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
                      inputMode="decimal"
                      value={categoryFields[f.key] ?? ""}
                      onChange={(e) => handleCategoryFieldChange(f.key, e.target.value)}
                      required={f.required}
                      className={inputClass}
                    />
                  )}

                  {f.type === "select" && (
                    <Select
                      value={categoryFields[f.key] ?? ""}
                      onChange={(v) => handleCategoryFieldChange(f.key, v)}
                      fullWidth
                      options={f.options.map((opt) => ({ value: opt, label: opt }))}
                    />
                  )}

                  {f.type === "boolean" && (
                    <label className="flex items-center gap-2 text-[13.5px] text-[#14171C] min-h-[40px] px-1 -mx-1 rounded-lg hover:bg-[#F6F7F3] cursor-pointer w-fit">
                      <input
                        type="checkbox"
                        checked={Boolean(categoryFields[f.key])}
                        onChange={(e) => handleCategoryFieldChange(f.key, e.target.checked)}
                        className="w-[18px] h-[18px] accent-[#2F5DFF]"
                      />
                      Yes
                    </label>
                  )}

                  {f.type === "multiselect" && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {f.options.map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-1.5 text-[13px] text-[#14171C] min-h-[38px] px-1 -mx-1 rounded-lg hover:bg-[#F6F7F3] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={(categoryFields[f.key] || []).includes(opt)}
                            onChange={() => handleMultiselectToggle(f.key, opt)}
                            className="w-[18px] h-[18px] accent-[#2F5DFF]"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                </Field>
              );
            })}
          </div>
        </div>

        {/* Images */}
        <div className="bg-white border border-[#E1E3DD] rounded-xl p-4 sm:p-5 space-y-4">
          <h2 className="text-[13px] font-semibold text-[#14171C]">Images</h2>

          {imageActionError && (
            <div className="rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
              {imageActionError}
            </div>
          )}

          {isEdit && existingImages.length > 0 && (
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6] mb-2">
                Current images
              </p>
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
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#C0402E] text-white text-[13px] flex items-center justify-center shadow-sm"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6] mb-1.5">
              {isEdit ? "Add more images" : "Product images"} {!isEdit && <span className="text-[#C0402E]">*</span>}
            </label>

            <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#C7CAC3] bg-[#F6F7F3] text-[13px] font-medium text-[#4B4F57] px-4 py-2.5 cursor-pointer hover:border-[#2F5DFF] hover:text-[#14171C] transition-colors w-full sm:w-auto justify-center">
              + Choose images
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleNewImagesSelected}
                className="hidden"
              />
            </label>

            {newImageFiles.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {newImageFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="relative">
                    <img
                      src={newImagePreviews[i]}
                      alt=""
                      className="w-20 h-20 rounded-lg object-cover border border-[#E1E3DD]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNewImage(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#C0402E] text-white text-[13px] flex items-center justify-center shadow-sm"
                      aria-label="Remove selected image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isEdit && newImageFiles.length > 0 && (
            <button
              type="button"
              onClick={handleAddImages}
              className="rounded-lg border border-[#E1E3DD] text-[13px] font-medium text-[#14171C] px-3.5 py-2 hover:border-[#14171C] w-full sm:w-auto"
            >
              Upload {newImageFiles.length} image{newImageFiles.length === 1 ? "" : "s"}
            </button>
          )}
        </div>

        {/* Sticky save bar -- stays reachable without scrolling back down */}
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 md:-mx-10 mt-2 bg-white/95 backdrop-blur border-t border-[#E1E3DD] px-4 sm:px-6 md:px-10 py-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#14171C] text-white text-[14px] font-medium px-6 py-2.5 hover:bg-[#2F5DFF] transition-colors duration-150 disabled:opacity-50 flex-1 sm:flex-none"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/products")}
            className="text-[13.5px] font-medium text-[#4B4F57] hover:text-[#14171C] px-3 py-2.5"
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

const Field = ({ label, required, children, className = "" }) => (
  <div className={className}>
    <label className="block font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6] mb-1.5">
      {label} {required && <span className="text-[#C0402E]">*</span>}
    </label>
    {children}
  </div>
);

export default AdminProductForm;