// components/ui/Select.jsx
//
// A dependency-free, keyboard-accessible custom dropdown to replace native
// <select> elements.
//
// FIX (this pass): the option list is now rendered through a React portal
// into document.body instead of as a normal absolutely-positioned child.
//
// Why: sibling sections on this page (e.g. the "form-section" cards) use a
// CSS animation that touches `transform` with `animation-fill-mode: both`.
// Any element with a non-"none" transform creates its own CSS stacking
// context, and that context persists forever once the fill-mode locks in
// the final `translateY(0)` frame. That means each form-section becomes a
// separate stacking context painted in DOM order — a dropdown's z-index
// set *inside* one section has no power over a later sibling section, so
// "Category" 's popup was getting drawn UNDER "Basic details" below it.
// Bumping z-index cannot fix this; it's not a z-index problem.
//
// Rendering the list into a portal on document.body sidesteps the whole
// class of bug: the popup is no longer a descendant of any transformed
// ancestor, so no ancestor stacking context or `overflow:hidden` container
// can clip or bury it. This also makes the popup layout correctly on
// small screens (it recalculates position with getBoundingClientRect,
// flips upward/downward based on real space, and closes on scroll/resize
// so it never floats away from a trigger that has moved).
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

      {open &&
        !disabled &&
        coords &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            id={instanceId}
            className="fixed z-[1000] overflow-auto bg-white border border-[#E1E3DD] rounded-lg shadow-lg py-1 origin-top"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              transform: coords.openUpward ? "translateY(-100%)" : "translateY(6px)",
              animation: "select-pop 0.12s ease both",
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
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px] cursor-pointer transition-colors duration-100 ${
                    i === activeIndex ? "bg-[#F6F7F3]" : ""
                  } ${isSelected ? "text-[#14171C] font-medium" : "text-[#4B4F57]"}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <IconCheck className="text-[#2F5DFF] shrink-0" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}

      <style>{`
        @keyframes select-pop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Select;