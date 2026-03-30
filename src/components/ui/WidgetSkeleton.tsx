"use client";

import {
  Skeleton,
  SkeletonAvatar,
  SkeletonChart,
  SkeletonBadge,
  SkeletonTable,
  SkeletonList,
} from "./Skeleton";

interface WidgetSkeletonProps {
  title?: string;
  className?: string;
  variant?: "default" | "chart" | "table" | "list" | "stats";
  rows?: number;
}

export function WidgetSkeleton({
  title,
  className,
  variant = "default",
  rows = 4,
}: WidgetSkeletonProps) {
  return (
    <div className={`glass-card p-4 sm:p-5 ${className}`}>
      {title && (
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-32" />
          <SkeletonBadge />
        </div>
      )}

      {variant === "default" && (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonAvatar size="sm" />
              <div className="flex-1">
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-2 w-16" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      )}

      {variant === "chart" && <SkeletonChart height={180} />}

      {variant === "table" && <SkeletonTable rows={rows} columns={4} />}

      {variant === "list" && <SkeletonList items={rows} />}

      {variant === "stats" && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-xl bg-card border border-card-border">
              <Skeleton className="h-8 w-8 rounded-full mb-2" />
              <Skeleton className="h-2 w-12 mb-1" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 sm:p-5">
          <Skeleton className="h-10 w-10 rounded-full mb-3" />
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-20 mt-1" />
        </div>
      ))}
    </div>
  );
}
