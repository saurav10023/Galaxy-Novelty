// components/ui/Select.jsx
//
// A dependency-free, keyboard-accessible custom dropdown to replace native
// <select> elements.
//
// Restyled to match the "Light Glass Tech" design language: frosted glass
// trigger + popup (backdrop-blur, white/70-85 fill), fuchsia-to-cyan focus
// ring, JetBrains Mono for the value/option text (system readout, not
// prose), fuchsia-tinted glow shadow on the open popup, rounded-2xl
// corners, and a snappy overshoot entrance instead of a flat fade.
//
// All positioning/portal/keyboard logic from the previous pass is
// untouched — the option list still renders through a React portal into
// document.body so no ancestor stacking context (from transformed
// form-section siblings) can clip or bury it. It still recalculates
// position with getBoundingClientRect, flips upward/downward based on
// real space, clamps height on short viewports, and closes on
// scroll/resize.
//
// Responsive notes:
//  - Trigger and popup both use the trigger's live width (rect.width), so
//    the popup always matches its parent's rendered width at every
//    breakpoint — no separate mobile/desktop layout needed.
//  - Font sizes and padding are held at a comfortable touch target
//    (py-2.5 = 40px+ tap height) on all screens rather than shrinking on
//    mobile, since dropdowns are a frequent tap target.
//  - Popup maxHeight is clamped against real viewport space, so it never
//    overflows a short mobile viewport in landscape.
//  - Motion (entrance, hover) is neutralized under
//    prefers-reduced-motion.
//
// Supports: click-to-open, click-outside-to-close, full keyboard nav
// (ArrowUp/Down, Enter, Escape, Home/End), disabled state, checkmark on
// the selected option, viewport-aware flip direction, and width-matching
// to the trigger.

import { useEffect, useRef, useState, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const IconChevron = ({ open }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    width="14"
    height="14"
    className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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

// Real cap on list height (matches max-h-64 = 256px) plus a little
// breathing room, used to decide flip direction and viewport clamping.
const LIST_MAX_HEIGHT = 256;
const VIEWPORT_MARGIN = 8;

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
  const [coords, setCoords] = useState(null); // { top, left, width, openUpward }
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const [instanceId] = useState(() => `select-${idCounter++}`);

  const selected = options.find((o) => String(o.value) === String(value));

  // Recompute the portal's fixed position from the trigger's current
  // on-screen rect. Called on open, and again on scroll/resize while open
  // so the popup never drifts away from its trigger.
  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < LIST_MAX_HEIGHT + VIEWPORT_MARGIN && spaceAbove > spaceBelow;

    setCoords({
      left: rect.left,
      width: rect.width,
      top: openUpward ? rect.top : rect.bottom,
      openUpward,
      // Clamp so the list can't run off the top/bottom edge on short
      // viewports (e.g. small phones in landscape, or a Select opened
      // near the very top/bottom of the screen).
      maxHeight: Math.max(
        120,
        Math.min(LIST_MAX_HEIGHT, (openUpward ? spaceAbove : spaceBelow) - VIEWPORT_MARGIN)
      ),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target) &&
        listRef.current &&
        !listRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onScrollOrResize = () => updatePosition();

    document.addEventListener("mousedown", onDocClick);
    // capture:true so this also catches scrolling inside any nested
    // scroll container (a modal body, a sticky rail, etc.), not just the
    // window itself.
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

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
    <div
      ref={rootRef}
      className={`relative ${fullWidth ? "w-full" : ""} ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`group inline-flex items-center justify-between gap-2 font-mono text-[13px] backdrop-blur-md rounded-2xl px-3.5 py-2.5 min-h-[42px] text-slate-900 border transition-all duration-200 ${
          fullWidth ? "w-full" : ""
        } ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-slate-50/80 border-slate-200"
            : open
            ? "bg-white/85 border-fuchsia-300 ring-2 ring-fuchsia-400/20 shadow-[0_10px_28px_-14px_rgba(217,70,239,0.45)]"
            : "bg-white/70 border-slate-200 hover:border-fuchsia-200 hover:bg-white/80"
        }`}
      >
        <span className={`truncate ${!selected ? "text-slate-400" : ""}`}>
          {selected ? selected.label : placeholder}
        </span>
        <IconChevron open={open} />
      </button>

      {open &&
        !disabled &&
        coords &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            id={instanceId}
            className="fixed z-[1000] overflow-auto bg-white/85 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-[0_24px_60px_-28px_rgba(217,70,239,0.4)] py-1.5 origin-top select-popup"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              transform: coords.openUpward ? "translateY(calc(-100% - 6px))" : "translateY(6px)",
              animation: "select-pop 0.22s cubic-bezier(.2,.8,.3,1.15) both",
            }}
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
                  className={`flex items-center justify-between gap-3 mx-1.5 px-3 py-2.5 min-h-[40px] rounded-xl font-mono text-[13px] cursor-pointer transition-colors duration-150 ${
                    i === activeIndex ? "bg-gradient-to-r from-fuchsia-50 to-cyan-50" : ""
                  } ${isSelected ? "text-slate-900 font-medium" : "text-slate-500"}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <IconCheck className="text-fuchsia-500 shrink-0" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}

      <style>{`
        @keyframes select-pop {
          from { opacity: 0; transform-origin: top; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .select-popup {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Select;