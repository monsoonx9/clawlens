import { clsx } from "clsx";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-[3px]",
};

export function Spinner({
  size = "md",
  color = "var(--color-risk-moderate)",
  className,
}: SpinnerProps) {
  return (
    <div
      className={clsx("rounded-full animate-spin", sizeStyles[size], className)}
      style={{
        borderColor: `color-mix(in srgb, ${color}, transparent 85%)`,
        borderTopColor: color,
      }}
    />
  );
}
