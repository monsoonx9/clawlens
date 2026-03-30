import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={twMerge(clsx("bg-card-border animate-shimmer rounded-lg", className))} />;
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={clsx("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={clsx("h-3", i === lines - 1 ? "w-3/4" : "w-full")} />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={twMerge(clsx("glass-card p-5", className))}>
      <Skeleton className="h-10 w-10 rounded-full mb-4" />
      <Skeleton className="h-3 w-1/3 mb-2" />
      <Skeleton className="h-6 w-2/3 mb-3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

interface SkeletonTableRowProps {
  columns?: number;
}

export function SkeletonTableRow({ columns = 5 }: SkeletonTableRowProps) {
  return (
    <tr className="border-b border-card-border">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton
            className={clsx(
              "h-4",
              i === 0 ? "w-16" : i === columns - 1 ? "w-20 ml-auto" : "w-full",
            )}
          />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      <div className="flex gap-4 px-4 py-3 border-b border-card-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={clsx("h-3", i === 0 ? "w-16" : "w-20")} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };
  return <Skeleton className={clsx("rounded-full", sizeClasses[size])} />;
}

export function SkeletonBadge() {
  return <Skeleton className="h-5 w-16 rounded-full" />;
}

export function SkeletonChart({ height = 180 }: { height?: number }) {
  return (
    <div className="relative" style={{ height }}>
      <Skeleton className="absolute inset-0 rounded-lg" />
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 pb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-4 rounded-sm" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl">
          <SkeletonAvatar size="sm" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2 w-1/4" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}
