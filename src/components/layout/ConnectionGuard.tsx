"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

/**
 * ConnectionGuard protects dashboard routes.
 * - Not onboarded → redirect to /onboarding
 * - Onboarded but no API keys → redirect to /onboarding
 * - Fully connected → render children
 */
export function ConnectionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const apiKeys = useAppStore((s) => s.apiKeys);

  useEffect(() => {
    // Skip redirect if we're already on the onboarding page
    if (pathname === "/onboarding") return;

    if (!isOnboarded || !apiKeys?.llmApiKey) {
      router.replace("/onboarding");
    }
  }, [isOnboarded, apiKeys, router, pathname]);

  // While redirecting, show nothing
  if (!isOnboarded || !apiKeys?.llmApiKey) {
    if (pathname !== "/onboarding") {
      return null;
    }
  }

  return <>{children}</>;
}
