"use client";

import { usePathname } from "next/navigation";
import { TrendingUp, TrendingDown, Box } from "lucide-react";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { ProfileDropdown } from "@/components/ui/ProfileDropdown";

const routeTitleMap: Record<string, string> = {
  "/": "Dashboard",
  "/council": "The Council",
  "/portfolio": "Portfolio",
  "/web3": "Web3 Intelligence",
  "/history": "History",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = usePathname();

  const title = useMemo(() => {
    return routeTitleMap[pathname] || "ClawLens";
  }, [pathname]);

  // Live BNB price
  const [bnbPrice, setBnbPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);

  // BSC Block info
  const [bscBlock, setBscBlock] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch("/api/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tickerPrice", params: { symbol: "BNBUSDT" } }),
      });
      const data = await res.json();
      if (data.success && data.data !== undefined) {
        setPrevPrice(bnbPrice);
        setBnbPrice(data.data);
      }
    } catch {
      // Silently fail — keep showing last known price
    }
  }, [bnbPrice]);

  const fetchBscBlock = useCallback(async () => {
    try {
      const res = await fetch("/api/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "latestBlock" }),
      });
      const data = await res.json();
      if (data.number) {
        setBscBlock(data.number);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchPrice();
      fetchBscBlock();
    }, 0);
    void delay; // Satisfy linter
    intervalRef.current = setInterval(fetchPrice, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBscBlock]); // eslint-disable-line react-hooks/exhaustive-deps

  const priceUp = prevPrice !== null && bnbPrice !== null && bnbPrice >= prevPrice;
  const priceColor =
    prevPrice === null ? "text-text-primary" : priceUp ? "text-risk-low" : "text-risk-extreme";

  return (
    <header className="bg-[color-mix(in_srgb,var(--color-bg),transparent_5%)] backdrop-blur-md border-b border-card-border px-4 lg:px-6 h-[60px] flex items-center justify-between sticky top-0 z-40 shrink-0">
      <div className="flex items-center min-w-0 pr-4">
        <h1 className="text-text-primary text-base font-bold tracking-tight truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* BNB Ticker Chip — Live */}
        <div className="hidden sm:flex items-center gap-2 bg-[color-mix(in_srgb,var(--color-card),transparent_40%)] backdrop-blur-md rounded-full px-3.5 py-1.5 border border-card-border">
          <span className="text-accent text-[11px] font-bold tracking-wider">BNB</span>
          <span className={`text-xs font-semibold ${priceColor} transition-colors`}>
            {bnbPrice !== null ? `$${bnbPrice.toFixed(2)}` : "—"}
          </span>
          {prevPrice !== null &&
            bnbPrice !== null &&
            (priceUp ? (
              <TrendingUp className="w-3 h-3 text-risk-low" />
            ) : (
              <TrendingDown className="w-3 h-3 text-risk-extreme" />
            ))}
        </div>

        {/* BSC Block Info */}
        <div className="hidden md:flex items-center gap-1.5 bg-[color-mix(in_srgb,var(--color-card),transparent_40%)] backdrop-blur-md rounded-full px-3 py-1.5 border border-card-border">
          <Box className="w-3 h-3 text-accent" />
          <span className="text-text-muted text-[10px] font-medium">Block</span>
          <span className="text-text-primary text-xs font-mono font-semibold">
            {bscBlock !== null ? `#${bscBlock.toLocaleString()}` : "—"}
          </span>
        </div>

        <ThemeToggle />

        {/* Notifications */}
        <NotificationBell />

        {/* Avatar */}
        <ProfileDropdown />
      </div>
    </header>
  );
}
