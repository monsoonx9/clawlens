"use client";

import { useHydration } from "@/store/useAppStore";
import { ReactNode } from "react";
import { Skeleton } from "./Skeleton";

interface HydratedProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function Hydrated({ children, fallback }: HydratedProps) {
  const isHydrated = useHydration();

  if (!isHydrated) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-32 h-4" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
