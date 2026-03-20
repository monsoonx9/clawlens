import { ReactNode, HTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glowColor?: string;
}

export function Card({
  children,
  className,
  hover: _hover,
  glowColor,
  onClick,
  style,
  ...props
}: CardProps) {
  return (
    <div
      className={twMerge(clsx("glass-card", className))}
      onClick={onClick}
      style={{
        ...(glowColor
          ? {
              boxShadow: `0 0 24px color-mix(in srgb, ${glowColor}, transparent 90%), 0 0 8px color-mix(in srgb, ${glowColor}, transparent 95%)`,
            }
          : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
