"use client";

import { useCallback } from "react";

type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

export function useHaptic() {
  const trigger = useCallback((type: HapticType = "light") => {
    if (typeof window === "undefined") return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile || !("vibrate" in navigator)) return;

    const patterns: Record<HapticType, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 40,
      success: [0, 30, 50, 30],
      warning: [0, 30, 30, 30],
      error: [0, 40, 30, 40],
    };

    navigator.vibrate(patterns[type]);
  }, []);

  return { trigger };
}

export function haptic(type: HapticType = "light") {
  if (typeof window === "undefined") return;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!isMobile || !("vibrate" in navigator)) return;

  const patterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 40,
    success: [0, 30, 50, 30],
    warning: [0, 30, 30, 30],
    error: [0, 40, 30, 40],
  };

  navigator.vibrate(patterns[type]);
}
