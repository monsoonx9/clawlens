"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Loader2, AlertCircle, RefreshCw, BarChart3 } from "lucide-react";
import { getSkill } from "@/skills";
import { clsx } from "clsx";

interface MarketMover {
  symbol: string;
  price: string;
  priceChange: string;
  volume: string;
}

function formatUSD(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(4)}`;
}

function formatPercent(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

export function MarketMoversWidget() {
  const [gainers, setGainers] = useState<MarketMover[]>([]);
  const [losers, setLosers] = useState<MarketMover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"gainers" | "losers">("gainers");

  const fetchData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const skill = getSkill("binance/exchange-stats");
      if (!skill) {
        if (!silent) setError("Skill not found");
        return;
      }
      const result = await skill.execute(
        { mode: "top-movers", limit: 10 },
        { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
      );
      if (result.success && result.data) {
        const data = result.data as {
          topGainers?: Array<{
            symbol: string;
            price: number;
            changePercent: number;
            volume: number;
          }>;
          topLosers?: Array<{
            symbol: string;
            price: number;
            changePercent: number;
            volume: number;
          }>;
        };
        const mappedGainers = (data.topGainers || []).map((t) => ({
          symbol: t.symbol,
          price: String(t.price),
          priceChange: String(t.changePercent),
          volume: String(t.volume),
        }));
        const mappedLosers = (data.topLosers || []).map((t) => ({
          symbol: t.symbol,
          price: String(t.price),
          priceChange: String(t.changePercent),
          volume: String(t.volume),
        }));
        setGainers(mappedGainers);
        setLosers(mappedLosers);
      } else if (!silent) {
        setError(result.error || "Failed to fetch");
      }
    } catch {
      if (!silent) setError("Failed to fetch market data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, []);

  // Silent background refresh (market movers update less frequently)
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 180000);
    return () => clearInterval(interval);
  }, []);

  const displayData = activeTab === "gainers" ? gainers : losers;

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col h-[280px] sm:h-[320px] md:h-[340px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-text-primary font-bold text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          Market Movers
        </h2>
        <button
          onClick={() => fetchData(false)}
          className="p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("gainers")}
          className={clsx(
            "flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-all",
            activeTab === "gainers"
              ? "bg-risk-low/20 text-risk-low"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Gainers
        </button>
        <button
          onClick={() => setActiveTab("losers")}
          className={clsx(
            "flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-all",
            activeTab === "losers"
              ? "bg-risk-extreme/20 text-risk-extreme"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <TrendingDown className="w-4 h-4" />
          Losers
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="w-8 h-8 text-risk-extreme" />
          <p className="text-text-secondary text-sm">{error}</p>
        </div>
      ) : displayData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <BarChart3 className="w-8 h-8 text-text-muted" />
          <p className="text-text-secondary text-sm">No data available</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {displayData.slice(0, 6).map((item, idx) => (
            <motion.div
              key={item.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-card-hover/50 transition-colors"
            >
              <div>
                <div className="text-text-primary font-semibold text-sm">
                  {item.symbol.replace("USDT", "")}
                </div>
                <div className="text-text-muted text-xs">{formatUSD(item.volume)} vol</div>
              </div>
              <div className="text-right">
                <div className="text-text-primary font-mono text-sm">{formatUSD(item.price)}</div>
                <div
                  className={clsx(
                    "text-xs font-mono",
                    parseFloat(item.priceChange) >= 0 ? "text-risk-low" : "text-risk-extreme",
                  )}
                >
                  {formatPercent(item.priceChange)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
