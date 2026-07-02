// components/ui/Select.jsx
//
// A dependency-free, keyboard-accessible custom dropdown to replace native
// <select> elements, which render inconsistently across browsers (Safari's
// vs Chrome's vs mobile's native picker all look and behave differently)
// and can't be styled to match the rest of the design system.
//
// Usage:
//   <Select
//     value={sort}
//     onChange={(v) => updateParams({ sort: v }, { resetPage: false })}
//     options={sortOptions}              // [{ value, label }]
//   />
//
// Supports: click-to-open, click-outside-to-close, full keyboard nav
// (ArrowUp/Down, Enter, Escape, Home/End), disabled state, and a checkmark
// on the selected option. Renders as a real <button> + <ul role="listbox">
// so it stays screen-reader friendly without a component library.

import { useEffect, useRef, useState } from "react";

const IconChevron = ({ open }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    width="14"
    height="14"
    className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
  >
    <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconCheck = (props) => (
  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" {...props}>
    <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

let idCounter = 0;

const Select = ({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  fullWidth = false,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const [instanceId] = useState(() => `select-${idCounter++}`);

  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => String(o.value) === String(value));
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[activeIndex];
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  const commit = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (options[activeIndex]) commit(options[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${fullWidth ? "w-full" : ""} ${className}`} onKeyDown={handleKeyDown}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center justify-between gap-2 font-mono text-[13px] bg-white border rounded-lg px-3.5 py-2.5 text-[#14171C] transition-colors duration-150 ${
          fullWidth ? "w-full" : ""
        } ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-[#F6F7F3] border-[#E1E3DD]"
            : open
            ? "border-[#2F5DFF] ring-2 ring-[#2F5DFF]/15"
            : "border-[#E1E3DD] hover:border-[#C7CAC3]"
        }`}
      >
        <span className={`truncate ${!selected ? "text-[#9CA0A6]" : ""}`}>
          {selected ? selected.label : placeholder}
        </span>
        <IconChevron open={open} />
      </button>

      {open && !disabled && (
        <ul
          ref={listRef}
          role="listbox"
          id={instanceId}
          className="absolute z-30 mt-1.5 min-w-full w-max max-w-[280px] max-h-64 overflow-auto bg-white border border-[#E1E3DD] rounded-lg shadow-lg py-1"
        >
          {options.map((opt, i) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(opt)}
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px] cursor-pointer transition-colors duration-100 ${
                  i === activeIndex ? "bg-[#F6F7F3]" : ""
                } ${isSelected ? "text-[#14171C] font-medium" : "text-[#4B4F57]"}`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <IconCheck className="text-[#2F5DFF] shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Select;