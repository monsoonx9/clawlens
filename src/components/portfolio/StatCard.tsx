import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  subtext: React.ReactNode;
  subtextColor?: string;
  subtextIcon?: LucideIcon;
  isLoading?: boolean;
}

export function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  subtext,
  subtextColor,
  subtextIcon: SubIcon,
  isLoading,
}: StatCardProps) {
  return (
    <div className="glass-card p-4 sm:p-5">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${isLoading ? "animate-pulse" : ""}`}
        style={{ backgroundColor: `color-mix(in srgb, ${iconColor}, transparent 85%)` }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div className="text-text-muted text-xs uppercase tracking-wide mt-3">{label}</div>
      <div className="text-text-primary text-2xl font-bold mt-1">
        {isLoading ? <div className="h-8 w-24 bg-card-border rounded animate-pulse" /> : value}
      </div>
      <div
        className="text-sm mt-1 flex items-center gap-1"
        style={!isLoading && subtextColor ? { color: subtextColor } : undefined}
      >
        {isLoading ? (
          <div className="h-5 w-32 bg-card-border rounded animate-pulse" />
        ) : (
          <>
            {SubIcon && <SubIcon className="w-3 h-3" />}
            {subtext}
          </>
        )}
      </div>
    </div>
  );
}
