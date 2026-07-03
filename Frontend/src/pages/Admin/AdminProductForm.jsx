import { useEffect, useState } from "react";
import API from "../../api/axios";
import Select from "../../components/ui/Select";
import { CATEGORIES, categoryFieldConfig } from "./productFieldConfig";
import ai from "../../lib/gemini";

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
    <div className="w-full max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 md:py-8">
      <h1 className="font-display text-[19px] sm:text-[22px] font-semibold text-[#14171C] tracking-tight mb-6">
        {isEdit ? "Edit product" : "Add product"}
      </h1>

      {error && (
        <div className="mb-5 rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
          {error}
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-semibold text-[#14171C]">Basic details</h2>
                {aiFillCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B3FD9] bg-[#F1ECFC] px-2 py-0.5 rounded-full">
                    ✨ {aiFillCount} field{aiFillCount === 1 ? "" : "s"} AI-filled
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
                      className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#6B3FD9] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-[#5B34BD] transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                      {aiLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                          Filling…
                        </>
                      ) : (
                        <>✨ Auto-fill with AI</>
                      )}
                    </button>
                  </div>
                  <p className="text-[11.5px] text-[#9CA0A6] mt-1.5">
                    Fills brand, description, and spec fields below — only where empty. Price and stock are
                    never auto-filled — enter those in the panel{" "}
                    <span className="hidden lg:inline">on the right</span>
                    <span className="lg:hidden">below</span>.
                  </p>
                  {aiError && (
                    <p className="text-[12px] text-[#C0402E] mt-1.5">{aiError}</p>
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
                    className={`${inputClass} ${aiFilledKeys.has("description") ? aiFilledRing : ""}`}
                  />
                </Field>
              </div>
            </div>

            {/* Category-specific fields */}
            <div className="bg-white border border-[#E1E3DD] rounded-xl p-4 sm:p-5">
              <h2 className="text-[13px] font-semibold text-[#14171C] mb-4">
                {CATEGORIES.find((c) => c.key === category)?.label} details
              </h2>

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
                        <div className={isAiFilled ? `${aiFilledRing} rounded-lg` : ""}>
                          <Select
                            value={categoryFields[f.key] ?? ""}
                            onChange={(v) => handleCategoryFieldChange(f.key, v)}
                            fullWidth
                            options={f.options.map((opt) => ({ value: opt, label: opt }))}
                          />
                        </div>
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
                    {existingImages.map((img, i) => (
                      <div key={img.publicId || `${img.url}-${i}`} className="relative">
                        <img
                          src={img.url}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover border border-[#E1E3DD]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.publicId)}
                          disabled={!img.publicId}
                          title={!img.publicId ? "This image has no publicId and can't be removed here" : "Remove image"}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#C0402E] text-white text-[13px] flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
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
                  {isEdit ? "Add more images (Optional)" : "Product images (Optional)"}
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

                {isEdit && newImageFiles.length > 0 && (
                  <p className="text-[11.5px] text-[#9CA0A6] mt-2">
                    These will upload when you click "Upload now" below, or automatically when you save changes.
                  </p>
                )}
              </div>

              {isEdit && newImageFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddImages}
                  className="rounded-lg border border-[#E1E3DD] text-[13px] font-medium text-[#14171C] px-3.5 py-2 hover:border-[#14171C] w-full sm:w-auto"
                >
                  Upload {newImageFiles.length} image{newImageFiles.length === 1 ? "" : "s"} now
                </button>
              )}
            </div>
          </div>

          {/* ---- Right rail: everything the admin (not the AI) must fill in ----
              Sticky on desktop so pricing/stock stay reachable without scrolling,
              which is the whole point after using AI auto-fill higher up the page. */}
          <div className="space-y-4 order-1 lg:order-2 lg:sticky lg:top-6">
            <div className="bg-[#F3F6FF] border-2 border-[#2F5DFF]/25 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[13px] font-semibold text-[#14171C]">Pricing &amp; stock</h2>
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#2F5DFF] bg-white border border-[#2F5DFF]/30 rounded-full px-2 py-0.5">
                  You fill this
                </span>
              </div>
              <p className="text-[11.5px] text-[#6B6F76] mb-4">
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
            </div>

            {isEdit && (
              <div className="bg-white border border-[#E1E3DD] rounded-xl p-4 sm:p-5">
                <h2 className="text-[13px] font-semibold text-[#14171C] mb-3">Status</h2>
                <div className="flex items-center gap-2 text-[13.5px] text-[#14171C]">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      isActive ? "bg-[#E6F4EA] text-[#1E7B3B]" : "bg-[#F1F1EE] text-[#4B4F57]"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-[12px] text-[#9CA0A6] mt-1.5">
                  Change this from the inventory list.
                </p>
              </div>
            )}

            {/* Desktop-only save actions live in the rail too, so there's no need
                to scroll to the bottom of a long form to submit. */}
            <div className="hidden lg:flex flex-col gap-2 bg-white border border-[#E1E3DD] rounded-xl p-4 sm:p-5">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#14171C] text-white text-[14px] font-medium px-6 py-2.5 hover:bg-[#2F5DFF] transition-colors duration-150 disabled:opacity-50 w-full"
              >
                {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
              </button>
              <button
                type="button"
                onClick={onCancel || onDone}
                className="text-[13.5px] font-medium text-[#4B4F57] hover:text-[#14171C] px-3 py-2 w-full text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Mobile/tablet sticky save bar (hidden on desktop — the rail above handles it there) */}
        <div className="lg:hidden sticky bottom-0 -mx-4 sm:-mx-6 mt-5 bg-white/95 backdrop-blur border-t border-[#E1E3DD] px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#14171C] text-white text-[14px] font-medium px-6 py-2.5 hover:bg-[#2F5DFF] transition-colors duration-150 disabled:opacity-50 flex-1 sm:flex-none"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
          <button
            type="button"
            onClick={onCancel || onDone}
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

const aiFilledRing = "ring-2 ring-[#6B3FD9]/40 border-[#6B3FD9]";

const Field = ({ label, required, aiFilled, children, className = "" }) => (
  <div className={className}>
    <label className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6] mb-1.5">
      {label} {required && <span className="text-[#C0402E]">*</span>}
      {aiFilled && (
        <span className="normal-case font-sans text-[10px] text-[#6B3FD9]">· AI</span>
      )}
    </label>
    {children}
  </div>
);

export default AdminProductForm;