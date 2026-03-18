import { InputHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
}

export function Input({
  label,
  error,
  helper,
  leftIcon,
  rightElement,
  className,
  disabled,
  ...props
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="text-text-secondary text-sm font-medium mb-1.5 block">{label}</label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          className={twMerge(
            clsx(
              "w-full bg-card backdrop-blur-md border border-card-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-dim focus:outline-none focus:border-[color-mix(in_srgb,var(--color-accent),transparent_60%)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent),transparent_85%),0_0_20px_color-mix(in_srgb,var(--color-accent),transparent_95%)] transition-all duration-200 text-sm",
              leftIcon && "pl-10",
              rightElement && "pr-10",
              error &&
                "border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_60%)] focus:border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_40%)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)]",
              disabled && "opacity-50 cursor-not-allowed",
            ),
          )}
          disabled={disabled}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {error && <p className="text-risk-extreme text-xs mt-1.5">{error}</p>}
      {!error && helper && <p className="text-text-muted text-xs mt-1.5">{helper}</p>}
    </div>
  );
}
