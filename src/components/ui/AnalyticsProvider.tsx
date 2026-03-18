"use client";
import { createContext, useContext, useEffect, ReactNode } from "react";

interface Analytics {
  trackEvent: (event: string, data?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<Analytics>({
  trackEvent: () => {},
});

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      const stats = JSON.parse(
        localStorage.getItem("clawlens_stats") || '{"sessions":0,"queries":0,"firstUsed":null}',
      );
      if (!stats.firstUsed) stats.firstUsed = new Date().toISOString();
      localStorage.setItem("clawlens_stats", JSON.stringify(stats));
    } catch {
      // localStorage may not be available in private browsing mode
    }
  }, []);

  const trackEvent = (event: string, data?: Record<string, unknown>) => {
    try {
      const stats = JSON.parse(localStorage.getItem("clawlens_stats") || "{}");
      if (event === "council_query") stats.queries = (stats.queries || 0) + 1;
      if (event === "session_complete") stats.sessions = (stats.sessions || 0) + 1;
      stats.lastEvent = { event, data, timestamp: new Date().toISOString() };
      localStorage.setItem("clawlens_stats", JSON.stringify(stats));
    } catch {
      /* silent fail */
    }
  };

  return <AnalyticsContext.Provider value={{ trackEvent }}>{children}</AnalyticsContext.Provider>;
}
