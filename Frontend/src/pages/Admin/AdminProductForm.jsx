import { useEffect, useState } from "react";
import API from "../../api/axios";
import Select from "../../components/ui/Select";
import { CATEGORIES, categoryFieldConfig } from "./productFieldConfig";
import ai from "../../lib/gemini";

/* ---------------------------------------------------------------------- */
/* Icons -- small, dependency-free, matching the style used across the    */
/* shop/admin-list pages (stroke-based, currentColor, 1.4 weight)          */
/* ---------------------------------------------------------------------- */

const IconSparkle = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" {...props}>
    <path
      d="M10 2.5l1.4 4.1L15.5 8l-4.1 1.4L10 13.5l-1.4-4.1L4.5 8l4.1-1.4L10 2.5z"
      fill="currentColor"
    />
    <path d="M16 12.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7z" fill="currentColor" />
  </svg>
);
const IconLock = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="12" height="12" {...props}>
    <rect x="5" y="9" width="10" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconImage = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="15" height="15" {...props}>
    <rect x="3" y="4" width="14" height="12" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="7.3" cy="8" r="1.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3.8 14.5 8 10.5l2.3 2.2 2.7-3 3.2 4.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconPlus = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="15" height="15" {...props}>
    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconClose = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="13" height="13" {...props}>
    <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconTag = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" {...props}>
    <path d="M11 3H4v7l9 9 7-7-9-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="7.3" cy="6.7" r="1" fill="currentColor" />
  </svg>
);
const IconLayers = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" {...props}>
    <path d="M10 3l7 3.5-7 3.5-7-3.5L10 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M3 10.5L10 14l7-3.5M3 14L10 17.5 17 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconRupee = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" {...props}>
    <path d="M5 4h10M5 8h10M5 4c3 0 5 1.2 5 3.2S8 10.4 5 10.4h-.5L11 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------------------------------------------------------------------- */
/* Config helpers -- unchanged logic                                      */
/* ---------------------------------------------------------------------- */

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

const isFieldEmpty = (value) => {
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "boolean") return value === false;
  return value === "" || value === undefined || value === null;
};

// productId: string -> edit mode, loads and pre-fills that product
// productId: null/undefined -> create mode, blank form
// onDone: called after a successful save (or Cancel) -> parent switches back to the list
const AdminProductForm = ({ productId, onDone, onCancel }) => {
  const id = productId;
  const isEdit = Boolean(productId);

  const [category, setCategory] = useState("mobile");
  const [common, setCommon] = useState(emptyCommonFields);
  const [categoryFields, setCategoryFields] = useState(buildInitialCategoryFields("mobile"));
  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageActionError, setImageActionError] = useState("");

  // ---- AI auto-fill state ----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiFilledKeys, setAiFilledKeys] = useState(new Set()); // which fields came from AI
  const [aiFillCount, setAiFillCount] = useState(0);

  // ---- Load existing product when editing ----
  useEffect(() => {
    if (!isEdit) {
      // Reset to a clean blank form whenever we land in create mode
      // (e.g. user edits one product, saves, then clicks "Add product").
      setCategory("mobile");
      setCommon(emptyCommonFields);
      setCategoryFields(buildInitialCategoryFields("mobile"));
      setExistingImages([]);
      setNewImageFiles([]);
      setIsActive(true);
      setLoading(false);
      setError("");
      setAiFilledKeys(new Set());
      setAiFillCount(0);
      return;
    }

    const fetchProduct = async () => {
      setLoading(true);
      setError("");
      try {
        // Protected admin route — always returns full pricing (including
        // purchasePrice) and isn't filtered by isActive, unlike the public
        // GET /products/:id route which sanitizes pricing away when the
        // request isn't recognized as an authenticated admin.
        const res = await API.get(`/api/v1/products/admin/${id}`);
        const p = res?.data?.data;

        if (!p) {
          throw new Error("Product data missing from response");
        }

        setCategory(p.category || "mobile");
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
        setIsActive(p.isActive ?? true);
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
        setError(err.response?.data?.message || err.message || "Failed to load product.");
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
    setAiFilledKeys(new Set());
    setAiFillCount(0);
    setAiError("");
  };

  const handleCommonChange = (key, value) => {
    setCommon((prev) => ({ ...prev, [key]: value }));
    if (aiFilledKeys.has(key)) {
      setAiFilledKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleCategoryFieldChange = (key, value) => {
    setCategoryFields((prev) => ({ ...prev, [key]: value }));
    if (aiFilledKeys.has(key)) {
      setAiFilledKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleMultiselectToggle = (key, option) => {
    setCategoryFields((prev) => {
      const current = prev[key] || [];
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
    if (aiFilledKeys.has(key)) {
      setAiFilledKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // ---- AI auto-fill ----
  const handleAiAutofill = async () => {
    if (!common.name.trim()) {
      setAiError("Enter a product name first.");
      return;
    }

    setAiLoading(true);
    setAiError("");

    try {
      const config = categoryFieldConfig[category] || [];

      const fieldInstructions = config
        .map((field) => {
          if (field.type === "select") {
            return `
Field Name: ${field.key}
Description: ${field.label}
Type: Select
Allowed Values: ${field.options.join(", ")}
`;
          }

          if (field.type === "multiselect") {
            return `
Field Name: ${field.key}
Description: ${field.label}
Type: Array
Allowed Values: ${field.options.join(", ")}
`;
          }

          if (field.type === "boolean") {
            return `
Field Name: ${field.key}
Description: ${field.label}
Type: Boolean (true/false)
`;
          }

          return `
Field Name: ${field.key}
Description: ${field.label}
Type: ${field.type}
`;
        })
        .join("\n");

      const categoryFieldsTemplate = {};

      config.forEach((field) => {
        if (field.type === "boolean") {
          categoryFieldsTemplate[field.key] = false;
        } else if (field.type === "multiselect") {
          categoryFieldsTemplate[field.key] = [];
        } else {
          categoryFieldsTemplate[field.key] = "";
        }
      });

      const prompt = `
You are an expert electronics catalogue assistant.

Your task is to identify the specifications of the given product.

Category:
${category}

Product Name:
${common.name}

============================

VERY IMPORTANT RULES

1. Never guess specifications.

2. If you are not at least 95% confident,
leave the value empty.

3. Never generate prices.

4. Never generate stock.

5. Never explain anything.

6. Return ONLY JSON.

7. Boolean fields must be true or false.

8. Multiselect fields must be arrays.

9. Select fields MUST use one of the allowed values only.

10. Description should be around 40-70 words.

============================

Fill these fields:

${fieldInstructions}

============================

Return JSON exactly like this:

${JSON.stringify(
  {
    common: {
      name: common.name,
      brand: "",
      description: "",
    },
    categoryFields: categoryFieldsTemplate,
  },
  null,
  2
)}

Do not add markdown.
Do not wrap inside \`\`\`.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const rawText = response?.text;
      if (!rawText || !rawText.trim()) {
        throw new Error("Empty response from AI");
      }

      const text = rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const data = JSON.parse(text);

      const aiCommon = data.common || {};
      const aiCategoryFields = data.categoryFields || {};

      const filled = new Set();

      setCommon((prev) => {
        const next = { ...prev };

        if (isFieldEmpty(prev.brand) && aiCommon.brand) {
          next.brand = String(aiCommon.brand).trim();
          filled.add("brand");
        }

        if (isFieldEmpty(prev.description) && aiCommon.description) {
          next.description = String(aiCommon.description).trim();
          filled.add("description");
        }

        return next;
      });

      setCategoryFields((prev) => {
        const next = { ...prev };

        config.forEach((field) => {
          const val = aiCategoryFields[field.key];

          if (val === undefined || val === null) return;
          if (val === "") return;
          if (Array.isArray(val) && val.length === 0) return;

          if (!isFieldEmpty(prev[field.key])) return;

          // Guard against the AI returning an option outside the allowed list
          if (field.type === "select" && !field.options.includes(val)) return;
          if (field.type === "multiselect" && Array.isArray(val)) {
            const valid = val.filter((v) => field.options.includes(v));
            if (valid.length === 0) return;
            next[field.key] = valid;
            filled.add(field.key);
            return;
          }

          next[field.key] = val;
          filled.add(field.key);
        });

        return next;
      });

      setAiFilledKeys(filled);
      setAiFillCount(filled.size);

      if (filled.size === 0) {
        setAiError("AI couldn't confidently fill any empty fields.");
      }
    } catch (err) {
      console.error(err);
      setAiError("AI auto-fill failed.");
    } finally {
      setAiLoading(false);
    }
  };

  // Accumulate picks across multiple file-dialog opens instead of replacing
  // the selection each time -- picking one photo, then going back for a
  // second, shouldn't lose the first.
  const handleNewImagesSelected = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    setNewImageFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  };

  const handleRemoveNewImage = (index) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ---- Build FormData matching what the backend controller expects ----
  // NOTE: images are appended for BOTH create and edit mode. The backend's
  // updateProduct controller accepts req.files and $push-es them onto the
  // existing images array, so any newly picked images the admin hasn't
  // explicitly uploaded yet via "Upload N images" are still saved as part
  // of the main "Save changes" submit instead of being silently discarded.
  const buildFormData = () => {
    const fd = new FormData();

    fd.append("name", common.name);
    fd.append("brand", common.brand);
    fd.append("description", common.description);
    fd.append("stock", String(common.stock));

    if (!isEdit) {
      fd.append("category", category);
    }

    const pricing = {
      purchasePrice: Number(common.purchasePrice),
      sellingPrice: Number(common.sellingPrice),
    };
    // Explicit null (not "omit the key") tells the backend the admin wants
    // negotiation cleared. Since this form always sends a complete pricing
    // object, omitting the key would otherwise be ambiguous with "leave
    // whatever negotiation already exists on the product untouched."
    if (common.negotiationMin || common.negotiationMax) {
      pricing.negotiation = {
        ...(common.negotiationMin && { minPrice: Number(common.negotiationMin) }),
        ...(common.negotiationMax && { maxPrice: Number(common.negotiationMax) }),
      };
    } else {
      pricing.negotiation = null;
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

    newImageFiles.forEach((file) => fd.append("images", file));

    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    setSaving(true);
    try {
      const fd = buildFormData();

      if (isEdit) {
        await API.patch(`/api/v1/products/${id}`, fd);
      } else {
        await API.post("/api/v1/products", fd);
      }

      setNewImageFiles([]);
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Image management (edit mode only) ----
  // Lets the admin push newly picked images immediately, without waiting
  // for the full "Save changes" submit. Still fully optional — if left
  // unclicked, the images go out with the main submit instead (see
  // buildFormData above), so nothing gets lost either way.
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
      <div className="w-full max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 md:py-8">
        <div className="animate-pulse space-y-5">
          <div className="h-3 w-24 bg-slate-100 rounded" />
          <div className="h-7 w-56 bg-slate-100 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-5 lg:gap-6">
            <div className="space-y-5 order-2 lg:order-1">
              <div className="h-24 bg-slate-100 rounded-2xl" />
              <div className="h-44 bg-slate-100 rounded-2xl" />
              <div className="h-56 bg-slate-100 rounded-2xl" />
            </div>
            <div className="space-y-4 order-1 lg:order-2">
              <div className="h-64 bg-slate-100 rounded-2xl" />
              <div className="h-20 bg-slate-100 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const config = categoryFieldConfig[category] || [];
  const activeCategoryLabel = CATEGORIES.find((c) => c.key === category)?.label;

  return (
    <div className="w-full max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 md:py-8">
      <style>{`
        @keyframes formFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .form-section { animation: formFadeUp 0.32s cubic-bezier(.2,.8,.3,1.1) both; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .form-section { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 mb-1">
            Inventory {isEdit ? "· Edit" : "· New"}
          </p>
          <h1 className="font-display text-[20px] sm:text-[23px] font-semibold text-slate-900 tracking-tight">
            {isEdit ? "Edit product" : "Add product"}
          </h1>
        </div>
        {activeCategoryLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 backdrop-blur-md border border-slate-200 text-[12px] font-medium text-slate-500 px-3 py-1.5">
            <IconLayers />
            {activeCategoryLabel}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-rose-50/80 border border-rose-200 px-4 py-3 text-[13px] text-rose-600 flex items-start gap-2">
          <span className="font-semibold shrink-0">Couldn't save —</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="pb-4">
        {/* Desktop: main fields on the left, admin-input essentials (pricing/stock/status)
            pinned in a sticky right rail so they stay in view the whole time — no
            scrolling back up after AI auto-fill to find the price fields.
            Mobile/tablet: single column, sidebar content simply flows after Basic details. */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-5 lg:gap-6 items-start">
          {/* ---- Main column ---- */}
          <div className="space-y-5 sm:space-y-6 order-2 lg:order-1 min-w-0">
            {/* Category */}
            <section className="form-section bg-white/75 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-[0_18px_40px_-32px_rgba(217,70,239,0.3)]">
              <SectionHeading icon={<IconLayers />} title="Category" />
              <Select
                value={category}
                onChange={handleCategoryChange}
                disabled={isEdit}
                fullWidth
                options={CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
              />
              {isEdit && (
                <p className="flex items-center gap-1.5 text-[12px] text-slate-400 mt-2">
                  <IconLock /> Category can't be changed after creation.
                </p>
              )}
            </section>

            {/* Common fields */}
            <section
              className="form-section bg-white/75 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-[0_18px_40px_-32px_rgba(217,70,239,0.3)]"
              style={{ animationDelay: "40ms" }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <SectionHeading icon={<IconTag />} title="Basic details" bare />
                {aiFillCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                    <IconSparkle /> {aiFillCount} field{aiFillCount === 1 ? "" : "s"} AI-filled
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name" required className="sm:col-span-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={common.name}
                      onChange={(e) => handleCommonChange("name", e.target.value)}
                      required
                      placeholder="e.g. iPhone 15 Pro Max 256GB"
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={handleAiAutofill}
                      disabled={aiLoading || !common.name.trim()}
                      className="group shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[13px] font-medium px-4 py-2.5 shadow-[0_10px_24px_-10px_rgba(139,92,246,0.55)] hover:shadow-[0_14px_28px_-10px_rgba(139,92,246,0.65)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 w-full sm:w-auto"
                    >
                      {aiLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                          Filling…
                        </>
                      ) : (
                        <>
                          <IconSparkle className="group-hover:scale-110 transition-transform" />
                          Auto-fill with AI
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11.5px] text-slate-400 mt-1.5">
                    Fills brand, description, and spec fields below — only where empty. Price and stock are
                    never auto-filled — enter those in the panel{" "}
                    <span className="hidden lg:inline">on the right</span>
                    <span className="lg:hidden">below</span>.
                  </p>
                  {aiError && (
                    <p className="text-[12px] text-rose-600 mt-1.5">{aiError}</p>
                  )}
                </Field>

                <Field label="Brand">
                  <input
                    type="text"
                    value={common.brand}
                    onChange={(e) => handleCommonChange("brand", e.target.value)}
                    className={`${inputClass} ${aiFilledKeys.has("brand") ? aiFilledRing : ""}`}
                  />
                </Field>

                <Field label="Description" className="sm:col-span-2">
                  <textarea
                    value={common.description}
                    onChange={(e) => handleCommonChange("description", e.target.value)}
                    rows={3}
                    className={`${inputClass} ${aiFilledKeys.has("description") ? aiFilledRing : ""} resize-none`}
                  />
                </Field>
              </div>
            </section>

            {/* Category-specific fields */}
            <section
              className="form-section bg-white/75 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-[0_18px_40px_-32px_rgba(217,70,239,0.3)]"
              style={{ animationDelay: "80ms" }}
            >
              <SectionHeading icon={<IconLayers />} title={`${activeCategoryLabel || ""} details`} />

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {config.map((f) => {
                  const spanFull = f.type === "boolean" || f.type === "multiselect";
                  const isAiFilled = aiFilledKeys.has(f.key);
                  return (
                    <Field
                      key={f.key}
                      label={f.label}
                      required={f.required}
                      aiFilled={isAiFilled}
                      className={spanFull ? "sm:col-span-2 xl:col-span-3" : ""}
                    >
                      {f.type === "text" && (
                        <input
                          type="text"
                          value={categoryFields[f.key] ?? ""}
                          onChange={(e) => handleCategoryFieldChange(f.key, e.target.value)}
                          required={f.required}
                          className={`${inputClass} ${isAiFilled ? aiFilledRing : ""}`}
                        />
                      )}

                      {f.type === "number" && (
                        <input
                          type="number"
                          inputMode="decimal"
                          value={categoryFields[f.key] ?? ""}
                          onChange={(e) => handleCategoryFieldChange(f.key, e.target.value)}
                          required={f.required}
                          className={`${inputClass} ${isAiFilled ? aiFilledRing : ""}`}
                        />
                      )}

                      {f.type === "select" && (
                        <div className={isAiFilled ? `${aiFilledRing} rounded-xl` : ""}>
                          <Select
                            value={categoryFields[f.key] ?? ""}
                            onChange={(v) => handleCategoryFieldChange(f.key, v)}
                            fullWidth
                            options={f.options.map((opt) => ({ value: opt, label: opt }))}
                          />
                        </div>
                      )}

                      {f.type === "boolean" && (
                        <ToggleSwitch
                          checked={Boolean(categoryFields[f.key])}
                          onChange={(v) => handleCategoryFieldChange(f.key, v)}
                          highlighted={isAiFilled}
                        />
                      )}

                      {f.type === "multiselect" && (
                        <div className="flex flex-wrap gap-2">
                          {f.options.map((opt) => {
                            const selected = (categoryFields[f.key] || []).includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleMultiselectToggle(f.key, opt)}
                                aria-pressed={selected}
                                className={`shrink-0 px-3.5 py-1.5 rounded-full border text-[12.5px] font-mono transition-all duration-150 active:scale-95 ${
                                  selected
                                    ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 border-transparent text-white shadow-[0_8px_20px_-8px_rgba(217,70,239,0.5)]"
                                    : `bg-white/70 backdrop-blur-md border-slate-200 text-slate-500 hover:border-fuchsia-200 hover:text-slate-900 ${
                                        isAiFilled ? "ring-2 ring-violet-400/40" : ""
                                      }`
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </Field>
                  );
                })}
              </div>
            </section>

            {/* Images */}
            <section
              className="form-section bg-white/75 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_18px_40px_-32px_rgba(217,70,239,0.3)]"
              style={{ animationDelay: "120ms" }}
            >
              <SectionHeading icon={<IconImage />} title="Images" />

              {imageActionError && (
                <div className="rounded-xl bg-rose-50/80 border border-rose-200 px-3.5 py-2.5 text-[13px] text-rose-600">
                  {imageActionError}
                </div>
              )}

              {isEdit && existingImages.length > 0 && (
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 mb-2">
                    Current images
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {existingImages.map((img, i) => (
                      <div
                        key={img.publicId || `${img.url}-${i}`}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                      >
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/25 transition-colors" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.publicId)}
                          disabled={!img.publicId}
                          title={!img.publicId ? "This image has no publicId and can't be removed here" : "Remove image"}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 text-rose-600 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-0"
                          aria-label="Remove image"
                        >
                          <IconClose />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 mb-2">
                  {isEdit ? "Add more images (optional)" : "Product images (optional)"}
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {newImageFiles.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200"
                    >
                      <img src={newImagePreviews[i]} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/25 transition-colors" />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 text-rose-600 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label="Remove selected image"
                      >
                        <IconClose />
                      </button>
                      <span className="absolute bottom-1 left-1 right-1 truncate text-center text-[9.5px] font-mono text-white bg-slate-900/50 rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        New
                      </span>
                    </div>
                  ))}

                  <label className="aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 text-slate-400 cursor-pointer hover:border-fuchsia-300 hover:text-fuchsia-600 hover:bg-fuchsia-50/50 transition-colors duration-150">
                    <IconPlus />
                    <span className="text-[11px] font-medium">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleNewImagesSelected}
                      className="hidden"
                    />
                  </label>
                </div>

                {isEdit && newImageFiles.length > 0 && (
                  <p className="text-[11.5px] text-slate-400 mt-2.5">
                    These will upload when you click "Upload now" below, or automatically when you save changes.
                  </p>
                )}
              </div>

              {isEdit && newImageFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddImages}
                  className="rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 px-3.5 py-2 hover:border-fuchsia-300 hover:bg-fuchsia-50 transition-colors duration-150 w-full sm:w-auto"
                >
                  Upload {newImageFiles.length} image{newImageFiles.length === 1 ? "" : "s"} now
                </button>
              )}
            </section>
          </div>

          {/* ---- Right rail: everything the admin (not the AI) must fill in ----
              Sticky on desktop so pricing/stock stay reachable without scrolling,
              which is the whole point after using AI auto-fill higher up the page. */}
          <div className="space-y-4 order-1 lg:order-2 lg:sticky lg:top-6">
            <section className="form-section bg-gradient-to-b from-fuchsia-50 to-cyan-50 border border-fuchsia-200 rounded-2xl p-4 sm:p-5 shadow-[0_20px_44px_-24px_rgba(217,70,239,0.4)]">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-lg bg-white/80 backdrop-blur-md border border-fuchsia-200 text-fuchsia-600 flex items-center justify-center shrink-0">
                  <IconRupee />
                </span>
                <h2 className="text-[13px] font-semibold text-slate-900">Pricing &amp; stock</h2>
                <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.14em] text-fuchsia-600 bg-white/80 border border-fuchsia-200 rounded-full px-2 py-0.5 shrink-0">
                  You fill this
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mb-4">
                Never touched by AI auto-fill — always enter these yourself.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Purchase price" required className="col-span-1">
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
                <Field label="Selling price" required className="col-span-1">
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
                <Field label="Stock" className="col-span-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={common.stock}
                    onChange={(e) => handleCommonChange("stock", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Negotiation min (optional)" className="col-span-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={common.negotiationMin}
                    onChange={(e) => handleCommonChange("negotiationMin", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Negotiation max (optional)" className="col-span-1">
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
            </section>

            {isEdit && (
              <section
                className="form-section bg-white/75 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-[0_18px_40px_-32px_rgba(217,70,239,0.3)]"
                style={{ animationDelay: "40ms" }}
              >
                <h2 className="text-[13px] font-semibold text-slate-900 mb-3">Status</h2>
                <div className="flex items-center gap-2 text-[13.5px] text-slate-900">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-[12px] text-slate-400 mt-1.5">
                  Change this from the inventory list.
                </p>
              </section>
            )}

            {/* Desktop-only save actions live in the rail too, so there's no need
                to scroll to the bottom of a long form to submit. */}
            <div className="hidden lg:flex flex-col gap-2 bg-white/75 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-[0_18px_40px_-32px_rgba(217,70,239,0.3)]">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-[14px] font-medium px-6 py-2.5 shadow-[0_14px_32px_-16px_rgba(217,70,239,0.55)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-16px_rgba(217,70,239,0.65)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 w-full"
              >
                {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
              </button>
              <button
                type="button"
                onClick={onCancel || onDone}
                className="text-[13.5px] font-medium text-slate-500 hover:text-slate-900 px-3 py-2 w-full text-center transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Mobile/tablet sticky save bar (hidden on desktop — the rail above handles it there) */}
        <div className="lg:hidden sticky bottom-0 -mx-4 sm:-mx-6 mt-5 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3 shadow-[0_-8px_24px_-8px_rgba(217,70,239,0.2)]">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-[14px] font-medium px-6 py-2.5 shadow-[0_14px_32px_-16px_rgba(217,70,239,0.55)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex-1 sm:flex-none"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
          <button
            type="button"
            onClick={onCancel || onDone}
            className="text-[13.5px] font-medium text-slate-500 hover:text-slate-900 px-3 py-2.5 transition-colors duration-150"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

/* ---------------------------------------------------------------------- */
/* Presentational helpers                                                 */
/* ---------------------------------------------------------------------- */

const inputClass =
  "w-full font-mono text-[13.5px] bg-white/70 border border-slate-200 rounded-xl px-3.5 py-2.5 min-h-[42px] text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-fuchsia-300 focus:ring-[3px] focus:ring-fuchsia-400/15 focus:bg-white";

const aiFilledRing = "ring-2 ring-violet-400/40 border-violet-300";

const SectionHeading = ({ icon, title, bare }) => (
  <h2
    className={`flex items-center gap-2 text-[13px] font-semibold text-slate-900 capitalize ${
      bare ? "" : "mb-4"
    }`}
  >
    <span className="w-6 h-6 rounded-lg bg-gradient-to-r from-fuchsia-50 to-cyan-50 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
      {icon}
    </span>
    {title}
  </h2>
);

const Field = ({ label, required, aiFilled, children, className = "" }) => (
  <div className={className}>
    <label className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 mb-1.5">
      {label} {required && <span className="text-rose-500">*</span>}
      {aiFilled && (
        <span className="normal-case font-sans inline-flex items-center gap-0.5 text-[10px] font-medium text-violet-600 bg-violet-50 rounded-full px-1.5 py-0.5">
          <IconSparkle width="9" height="9" /> AI
        </span>
      )}
    </label>
    {children}
  </div>
);

// Modern pill toggle used for boolean fields, in place of a plain checkbox.
const ToggleSwitch = ({ checked, onChange, highlighted }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`inline-flex items-center gap-2.5 rounded-full border px-1 py-1 pr-3 transition-colors duration-150 ${
      checked ? "bg-fuchsia-50 border-fuchsia-200" : "bg-white/70 border-slate-200"
    } ${highlighted ? "ring-2 ring-violet-400/40" : ""}`}
  >
    <span
      className={`relative w-9 h-5 rounded-full transition-colors duration-150 ${
        checked ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-150 ${
          checked ? "left-[19px]" : "left-[3px]"
        }`}
      />
    </span>
    <span className={`text-[13px] font-medium ${checked ? "text-slate-900" : "text-slate-400"}`}>
      {checked ? "Yes" : "No"}
    </span>
  </button>
);

export default AdminProductForm;