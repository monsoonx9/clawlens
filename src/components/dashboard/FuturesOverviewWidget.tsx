"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { getSkill } from "@/skills";
import { clsx } from "clsx";

interface FuturesOverviewData {
  symbol: string;
  fundingRate: number;
  openInterest: string;
  priceChange: string;
}

function formatNumber(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

function formatPercent(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(4)}%`;
}

export function FuturesOverviewWidget() {
  const [data, setData] = useState<FuturesOverviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const skill = getSkill("binance/futures-data");
      if (!skill) {
        if (!silent) setError("Skill not found");
        return;
      }
      const result = await skill.execute(
        { mode: "funding" },
        { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
      );
      if (result.success && result.data) {
        const resultData = result.data as {
          contracts?: Array<{
            symbol: string;
            fundingRate: number;
            openInterest: number;
            priceChange: number;
          }>;
        };
        const mappedData = (resultData.contracts || []).map((c) => ({
          symbol: c.symbol,
          fundingRate: c.fundingRate,
          openInterest: String(c.openInterest),
          priceChange: String(c.priceChange),
        }));
        setData(mappedData);
      } else if (!silent) {
        setError(result.error || "Failed to fetch");
      }
    } catch {
      if (!silent) setError("Failed to fetch futures data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, []);

  // Silent background refresh
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col h-[280px] sm:h-[320px] md:h-[340px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-text-primary font-bold text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-agent-ledger" />
          Futures Overview
        </h2>
        <button
          onClick={() => fetchData(false)}
          className="p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
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
      ) : data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <TrendingUp className="w-8 h-8 text-text-muted" />
          <p className="text-text-secondary text-sm">No futures data</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-3">
          {data.map((item, idx) => (
            <motion.div
              key={item.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-card-hover/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-agent-ledger/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-agent-ledger" />
                </div>
                <div>
                  <div className="text-text-primary font-semibold text-sm">
                    {item.symbol.replace("USDT", "")}
                  </div>
                  <div className="text-text-muted text-xs">
                    OI: {formatNumber(item.openInterest)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "text-xs font-mono px-2 py-1 rounded",
                      parseFloat(String(item.fundingRate)) > 0
                        ? "bg-risk-extreme/20 text-risk-extreme"
                        : "bg-risk-low/20 text-risk-low",
                    )}
                  >
                    {formatPercent(item.fundingRate)}
                  </span>
                  <span
                    className={clsx(
                      "text-sm font-mono flex items-center gap-1",
                      parseFloat(item.priceChange) >= 0 ? "text-risk-low" : "text-risk-extreme",
                    )}
                  >
                    {parseFloat(item.priceChange) >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {formatPercent(item.priceChange)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
