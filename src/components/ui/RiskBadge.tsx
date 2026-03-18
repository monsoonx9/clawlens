import { RiskLevel } from "@/types";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const styles: Record<RiskLevel, string> = {
    LOW: "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] border-[color-mix(in_srgb,var(--color-risk-low),transparent_75%)] text-risk-low",
    MODERATE:
      "bg-[color-mix(in_srgb,var(--color-risk-moderate),transparent_90%)] border-[color-mix(in_srgb,var(--color-risk-moderate),transparent_75%)] text-risk-moderate",
    HIGH: "bg-[color-mix(in_srgb,var(--color-risk-high),transparent_90%)] border-[color-mix(in_srgb,var(--color-risk-high),transparent_75%)] text-risk-high",
    EXTREME:
      "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_75%)] text-risk-extreme",
  };

  return (
    <div
      className={twMerge(
        clsx(
          "border rounded-full px-3.5 py-1 text-sm font-bold uppercase whitespace-nowrap backdrop-blur-md",
          styles[level],
          className,
        ),
      )}
    >
      {level}
    </div>
  );
}
