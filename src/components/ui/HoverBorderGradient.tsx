"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface HoverBorderGradientProps {
  children: React.ReactNode;
  containerClassName?: string;
  className?: string;
  as?: React.ElementType;
  style?: React.CSSProperties;
  color?: string; // Border pulse color
}

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "div",
  style,
  color = "var(--color-accent)",
}: HoverBorderGradientProps) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<"TOP" | "LEFT" | "BOTTOM" | "RIGHT">("TOP");

  const rotateDirection = (currentDirection: typeof direction) => {
    const directions: (typeof direction)[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % directions.length : 0;
    return directions[nextIndex];
  };

  const movingMap: Record<typeof direction, string> = {
    TOP: "radial-gradient(100px circle at 50% 0%, var(--border-color), transparent 100%)",
    LEFT: "radial-gradient(100px circle at 0% 50%, var(--border-color), transparent 100%)",
    BOTTOM: "radial-gradient(100px circle at 50% 100%, var(--border-color), transparent 100%)",
    RIGHT: "radial-gradient(100px circle at 100% 50%, var(--border-color), transparent 100%)",
  };

  const highlight =
    "radial-gradient(200px circle at 50% 50%, color-mix(in srgb, var(--color-text-primary), transparent 90%), transparent 100%)";

  useEffect(() => {
    if (!hovered) {
      const interval = setInterval(() => {
        setDirection((prevState) => rotateDirection(prevState));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [hovered]);

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative rounded-2xl p-[1px] group ${containerClassName || ""}`}
      style={
        {
          "--border-color": color,
          ...style,
        } as React.CSSProperties
      }
    >
      {/* Dynamic Hover/Pulse Inner Border */}
      <motion.div
        className="absolute inset-0 rounded-2xl z-[1] opacity-0 group-hover:opacity-100 transition duration-500"
        style={{
          background: movingMap[direction],
        }}
        animate={{
          background: hovered ? highlight : movingMap[direction],
        }}
        transition={{
          ease: "linear",
          duration: hovered ? 0.3 : 1.5,
          repeat: hovered ? 0 : Infinity,
        }}
      />
      {/* Subdued base border */}
      <div className="absolute inset-0 rounded-2xl z-[1] bg-card-border" />

      {/* Solid background mask to hide the gradient flowing inward */}
      <div
        className={`relative z-[2] bg-card backdrop-blur-md rounded-2xl h-full w-full ${className || ""}`}
      >
        {children}
      </div>
    </Tag>
  );
}
