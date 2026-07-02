// src/hooks/useScrollReveal.js
//
// Attaches an IntersectionObserver to a ref; once the element is ~15% into
// view it flips `revealed` to true (and stays true -- no re-hiding on
// scroll-out, which reads as flicker rather than "modern"). Honors
// prefers-reduced-motion by skipping the animation entirely and just
// showing content immediately.

import { useEffect, useRef, useState } from "react";

export const useScrollReveal = ({ threshold = 0.15, rootMargin = "0px 0px -40px 0px" } = {}) => {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setRevealed(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, revealed };
};