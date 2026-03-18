import { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type ButtonVariant = "primary" | "neon" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-text-primary text-amoled font-bold hover:bg-text-secondary hover:shadow-glow",
  neon: "bg-accent text-amoled font-bold hover:bg-risk-low hover:shadow-glow-accent",
  secondary:
    "bg-card backdrop-blur-md border border-card-border text-text-primary hover:bg-card-hover hover:border-card-border-hover active:bg-card-border",
  outline:
    "bg-transparent border border-card-border-hover text-text-primary hover:bg-card-hover hover:border-card-border-hover",
  ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-card-hover",
  danger:
    "bg-transparent border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_60%)] text-risk-extreme hover:bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] hover:border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_40%)]",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer whitespace-nowrap rounded-full hover:scale-105 active:scale-95",
          variantStyles[variant],
          size === "sm" && "h-9 px-4 text-xs font-bold leading-none",
          size === "md" && "h-11 px-6 text-sm font-bold leading-none",
          size === "lg" && "h-13 px-8 text-base font-bold leading-none",
          (disabled || isLoading) && "opacity-50 cursor-not-allowed pointer-events-none",
          className,
        ),
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}
