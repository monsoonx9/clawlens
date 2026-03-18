"use client";

import { useEffect, useState } from "react";

/**
 * Mouse-reactive background effect
 * Creates a subtle zoom and wobble effect on background lines when mouse moves
 * ABSOLUTE SYNC FROM NEXTPDF
 */
export const MouseReactiveBackground = () => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkIsDesktop = () => {
      const isDt = window.matchMedia("(min-width: 1024px)").matches && !("ontouchstart" in window);
      setIsDesktop(isDt);
    };
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let animating = false;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!animating) {
        animating = true;
        animate();
      }
    };

    const animate = () => {
      // Smooth interpolation
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;

      // Update CSS custom properties
      document.documentElement.style.setProperty("--mouse-x", `${currentX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${currentY}px`);
      document.documentElement.style.setProperty("--mouse-active", "1");

      // Check if we should stop animating
      const dx = Math.abs(targetX - currentX);
      const dy = Math.abs(targetY - currentY);
      if (dx < 1 && dy < 1) {
        animating = false;
        return;
      }

      requestAnimationFrame(animate);
    };

    // Handle mouse leave
    const handleMouseLeave = () => {
      document.documentElement.style.setProperty("--mouse-active", "0");
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isDesktop]);

  if (!isDesktop) return null;

  return null; // This component only sets CSS variables
};
