"use client";

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = requestAnimationFrame(() => setPrefersReduced(mql.matches));

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => {
      cancelAnimationFrame(frame);
      mql.removeEventListener("change", handler);
    };
  }, []);

  return prefersReduced;
}

export function getTransition(transition: object, prefersReduced: boolean) {
  return prefersReduced ? { duration: 0 } : transition;
}
