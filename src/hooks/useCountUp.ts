"use client";

import { useState, useEffect, useRef, useMemo } from "react";

interface UseCountUpOptions {
  duration?: number;
  startValue?: number;
  decimals?: number;
  easing?: boolean;
}

export function useCountUp(endValue: number, options: UseCountUpOptions = {}) {
  const { duration = 1000, startValue = 0, decimals = 2, easing = true } = options;
  const [count, setCount] = useState(startValue);
  const startTimeRef = useRef<number | null>(null);
  const prevEndValueRef = useRef(endValue);

  const easeOutQuart = useMemo(() => (t: number) => 1 - Math.pow(1 - t, 4), []);

  useEffect(() => {
    if (prevEndValueRef.current !== endValue) {
      prevEndValueRef.current = endValue;
      startTimeRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(startValue);
    }
  }, [endValue, startValue]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    let animationId: number;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = easing ? easeOutQuart(progress) : progress;
      const currentValue = startValue + (endValue - startValue) * easedProgress;

      setCount(currentValue);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [endValue, duration, startValue, easing, easeOutQuart]);

  const formatted = decimals > 0 ? count.toFixed(decimals) : Math.round(count).toString();

  return { value: count, formatted };
}

export function useCountUpCurrency(
  endValue: number,
  options: UseCountUpOptions & { prefix?: string; suffix?: string } = {},
) {
  const { prefix = "$", suffix = "", ...rest } = options;
  const { value, formatted } = useCountUp(endValue, rest);

  const display = `${prefix}${Number(formatted).toLocaleString(undefined, {
    minimumFractionDigits: rest.decimals ?? 2,
    maximumFractionDigits: rest.decimals ?? 2,
  })}${suffix}`;

  return { value, formatted: display };
}
