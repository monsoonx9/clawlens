import { ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "secondary"
  | "custom";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  customColor?: string;
  size?: BadgeSize;
  className?: string;
}

const variantStyles: Record<Exclude<BadgeVariant, "custom">, string> = {
  default: "bg-card text-text-secondary border border-card-border",
  accent:
    "bg-[color-mix(in_srgb,var(--color-accent),transparent_90%)] border-[color-mix(in_srgb,var(--color-accent),transparent_80%)] text-accent backdrop-blur-md",
  secondary:
    "bg-[color-mix(in_srgb,var(--color-accent-secondary),transparent_90%)] border-[color-mix(in_srgb,var(--color-accent-secondary),transparent_80%)] text-accent-secondary backdrop-blur-md",
  success:
    "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] text-risk-low border-[color-mix(in_srgb,var(--color-risk-low),transparent_80%)]",
  warning:
    "bg-[color-mix(in_srgb,var(--color-risk-moderate),transparent_90%)] text-risk-moderate border-[color-mix(in_srgb,var(--color-risk-moderate),transparent_80%)]",
  danger:
    "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] text-risk-extreme border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)]",
  info: "bg-[color-mix(in_srgb,var(--color-info),transparent_90%)] text-info border-[color-mix(in_srgb,var(--color-info),transparent_80%)]",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2.5 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
};

export function Badge({
  children,
  variant = "default",
  customColor,
  size = "sm",
  className,
}: BadgeProps) {
  if (variant === "custom" && customColor) {
    return (
      <span
        className={twMerge(
          clsx(
            "inline-flex items-center rounded-full font-semibold whitespace-nowrap backdrop-blur-md",
            sizeStyles[size], // Use updated sizeStyles
            className,
          ),
        )}
        style={{
          backgroundColor: `color-mix(in srgb, ${customColor}, transparent 90%)`,
          color: customColor,
          border: `1px solid color-mix(in srgb, ${customColor}, transparent 80%)`,
        }}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center rounded-full font-semibold whitespace-nowrap backdrop-blur-md",
          variantStyles[variant === "custom" ? "default" : variant],
          sizeStyles[size],
          className,
        ),
      )}
    >
      {children}
    </span>
  );
}
