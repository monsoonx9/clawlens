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
