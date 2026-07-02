// src/components/filters/DynamicFilterSidebar.jsx
//
// Renders category-specific filters (from categoryFilterFields.js) plus the
// shared price range control. Talks to GET /api/v1/products/filters/:category
// to fill in options for "dynamic" fields (free-text schema fields like
// company/color) and to override the static enum lists when the backend
// switches to Model.distinct() (see "Known Gaps" in the docs) -- if the
// backend ever returns an array for a "select" field's key, we prefer it
// over the hardcoded list automatically, so this component keeps working
// either way.

import { useEffect, useState } from "react";
import API from "../../api/axios";
import { categoryFilterFields } from "../../config/categoryfilterfields";

const inputBase =
  "font-mono text-[13px] bg-white border border-[#E1E3DD] rounded-lg px-3 py-2 text-[#14171C] focus:outline-none focus:border-[#2F5DFF] w-full";

const FieldLabel = ({ children }) => (
  <h4 className="font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6] mb-2">
    {children}
  </h4>
);

const SelectField = ({ field, value, options, onChange }) => (
  <div className="filter-group mb-5">
    <FieldLabel>{field.label}</FieldLabel>
    <select
      value={value ?? ""}
      onChange={(e) => onChange(field.key, e.target.value || undefined)}
      className={inputBase}
    >
      <option value="">Any</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const CheckboxField = ({ field, value, onChange }) => (
  <div className="filter-group mb-5">
    <label className="flex items-center gap-2 text-[13.5px] text-[#14171C] cursor-pointer">
      <input
        type="checkbox"
        checked={value === "true"}
        onChange={(e) => onChange(field.key, e.target.checked ? "true" : undefined)}
        className="w-4 h-4 rounded border-[#E1E3DD] accent-[#2F5DFF]"
      />
      {field.label}
    </label>
  </div>
);

const RangeField = ({ field, values, onChange }) => (
  <div className="filter-group mb-5">
    <FieldLabel>{field.label}</FieldLabel>
    <div className="flex items-center gap-2">
      <input
        type="number"
        placeholder="Min"
        value={values[field.minKey] ?? ""}
        onChange={(e) => onChange(field.minKey, e.target.value || undefined)}
        className={inputBase}
      />
      <span className="text-[#9CA0A6] text-[13px]">–</span>
      <input
        type="number"
        placeholder="Max"
        value={values[field.maxKey] ?? ""}
        onChange={(e) => onChange(field.maxKey, e.target.value || undefined)}
        className={inputBase}
      />
    </div>
  </div>
);

const DynamicFilterSidebar = ({ category, filters, onFilterChange }) => {
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(true);

  const fields = categoryFilterFields[category] || [];

  useEffect(() => {
    let cancelled = false;
    setLoadingOptions(true);
    setDynamicOptions({});

    API.get(`/api/v1/products/filters/${category}`)
      .then((res) => {
        if (!cancelled) setDynamicOptions(res.data?.data || {});
      })
      .catch(() => {
        if (!cancelled) setDynamicOptions({});
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  const handleFieldChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    if (value === undefined) delete updated[key];
    onFilterChange(updated);
  };

  const handleReset = () => onFilterChange({});

  const activeCount = Object.keys(filters).filter(
    (k) => k !== "category" && k !== "search" && filters[k] !== undefined && filters[k] !== ""
  ).length;

  return (
    <div className="filter-sidebar w-full md:w-64 shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-[15px] font-semibold text-[#14171C]">Filters</h3>
        {activeCount > 0 && (
          <button
            onClick={handleReset}
            className="text-[12.5px] font-medium text-[#2F5DFF] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Price range -- shared across every category */}
      <div className="filter-group mb-5">
        <FieldLabel>Price range</FieldLabel>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice ?? ""}
            onChange={(e) => handleFieldChange("minPrice", e.target.value || undefined)}
            className={inputBase}
          />
          <span className="text-[#9CA0A6] text-[13px]">–</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice ?? ""}
            onChange={(e) => handleFieldChange("maxPrice", e.target.value || undefined)}
            className={inputBase}
          />
        </div>
      </div>

      {loadingOptions ? (
        <p className="text-[12.5px] text-[#9CA0A6]">Loading filters…</p>
      ) : (
        fields.map((field) => {
          if (field.type === "range") {
            return <RangeField key={field.key} field={field} values={filters} onChange={handleFieldChange} />;
          }
          if (field.type === "checkbox") {
            return (
              <CheckboxField
                key={field.key}
                field={field}
                value={filters[field.key]}
                onChange={handleFieldChange}
              />
            );
          }
          // "select" (static enum) or "dynamic" (backend-supplied options)
          const options = dynamicOptions[field.key] ?? field.options ?? [];
          if (options.length === 0) return null; // nothing to filter by yet
          return (
            <SelectField
              key={field.key}
              field={field}
              value={filters[field.key]}
              options={options}
              onChange={handleFieldChange}
            />
          );
        })
      )}
    </div>
  );
};

export default DynamicFilterSidebar;