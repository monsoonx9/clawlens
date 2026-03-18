"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ToastProvider } from "@/components/ui/Toast";
import { NotificationProvider } from "@/components/ui/NotificationProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CommandPaletteWithSuspense } from "@/components/ui/CommandPalette";
import { AnalyticsProvider } from "@/components/ui/AnalyticsProvider";
import { useHydration } from "@/store/useAppStore";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHydrated = useHydration();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    // Vault is now server-side - no client warning needed
  }, [mounted, isHydrated]);

  if (!mounted || !isHydrated) {
    return (
      <div className="min-h-screen bg-black-fixed flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  const isMarketing = pathname === "/" || pathname === "/onboarding";

  if (isMarketing) {
    return (
      <NotificationProvider>
        <ToastProvider>
          <ErrorBoundary>
            <CommandPaletteWithSuspense />
            <AnalyticsProvider>{children}</AnalyticsProvider>
          </ErrorBoundary>
        </ToastProvider>
      </NotificationProvider>
    );
  }

  return (
    <NotificationProvider>
      <div className="flex min-h-screen w-full overflow-hidden">
        {/* Desktop Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen relative">
          <TopBar />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <ToastProvider>
              <ErrorBoundary>
                <CommandPaletteWithSuspense />
                <AnalyticsProvider>{children}</AnalyticsProvider>
              </ErrorBoundary>
            </ToastProvider>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </NotificationProvider>
  );
}
