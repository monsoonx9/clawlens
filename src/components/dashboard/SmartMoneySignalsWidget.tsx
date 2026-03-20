"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Anchor, Loader2, TrendingUp, TrendingDown, ExternalLink, ChevronDown } from "lucide-react";
import { getSkill } from "@/skills";

interface SmartMoneySignal {
  id: number;
  ticker: string;
  contractAddress: string;
  chainId: string;
  direction: "buy" | "sell";
  status: "active" | "timeout" | "completed";
  smartMoneyCount: number;
  totalValueUSD: string;
  maxGain: string;
  exitRate: number;
  platform: string;
  logoUrl?: string;
}

function formatUSD(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatPercent(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

function getTradingUrl(signal: { contractAddress: string; chainId?: string }): string {
  const chainId = signal.chainId || "56";
  const chainPath =
    chainId === "CT_501" ? "sol" : chainId === "8453" ? "base" : chainId === "1" ? "eth" : "bsc";
  return `https://web3.binance.com/en/token/${chainPath}/${signal.contractAddress}`;
}

export function SmartMoneySignalsWidget() {
  const [signals, setSignals] = useState<SmartMoneySignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChain, setActiveChain] = useState<"solana" | "bsc">("solana");

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const skill = getSkill("binance/trading-signal");
        if (!skill) {
          if (!silent) setError("Skill not found");
          return;
        }

        const result = await skill.execute(
          {
            chain: activeChain,
            status: "all",
            limit: 50,
          },
          { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
        );

        if (result.success && result.data) {
          const data = result.data as Record<string, unknown>;
          const signalList = (data.signals as SmartMoneySignal[]) || [];
          setSignals(signalList.slice(0, 5));
        } else if (!silent) {
          setError(result.summary || "Failed to fetch");
        }
      } catch {
        if (!silent) setError("Failed to load data");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [activeChain],
  );

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Silent background refresh
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col h-[280px] sm:h-[320px] md:h-[340px] overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-agent-shadow" />
          <h3 className="text-text-primary font-bold text-sm tracking-tight">Smart Money</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveChain("solana")}
            className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all ${
              activeChain === "solana"
                ? "bg-agent-shadow text-white-fixed shadow-glow"
                : "bg-card-border text-text-muted hover:text-text-secondary"
            }`}
          >
            Solana
          </button>
          <button
            onClick={() => setActiveChain("bsc")}
            className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all ${
              activeChain === "bsc"
                ? "bg-agent-shadow text-white shadow-glow"
                : "bg-card-border text-text-muted hover:text-text-secondary"
            }`}
          >
            BSC
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-text-muted text-xs">{error}</p>
        </div>
      ) : signals.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-text-muted text-xs">No active signals</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
            {signals.map((signal, i) => (
              <motion.div
                key={`${signal.id}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between bg-[color-mix(in_srgb,var(--color-card-border),transparent_80%)] rounded-lg p-2 hover:bg-[color-mix(in_srgb,var(--color-card-border),transparent_70%)] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      signal.direction === "buy"
                        ? "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)]"
                        : "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)]"
                    }`}
                  >
                    {signal.direction === "buy" ? (
                      <TrendingUp className="w-4 h-4 text-risk-low" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-risk-extreme" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-text-primary text-xs font-semibold">{signal.ticker}</p>
                      <a
                        href={getTradingUrl(signal)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="w-3 h-3 text-text-muted hover:text-text-primary" />
                      </a>
                    </div>
                    <p className="text-text-muted text-[10px]">
                      {signal.smartMoneyCount} wallets • {signal.platform}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-text-primary text-xs font-medium">
                    {formatUSD(signal.totalValueUSD)}
                  </p>
                  <p
                    className={`text-[10px] font-medium ${signal.direction === "buy" ? "text-risk-low" : "text-risk-extreme"}`}
                  >
                    {signal.maxGain ? formatPercent(signal.maxGain) : "—"} potential
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          <Link
            href="/web3"
            className="mt-2 w-full py-2 text-center text-xs font-medium text-text-muted hover:text-text-primary border border-card-border bg-card/30 hover:bg-card/50 hover:border-card-border-hover rounded-lg transition-all flex items-center justify-center gap-1"
          >
            Show More <ChevronDown className="w-3 h-3" />
          </Link>
        </>
      )}
    </div>
  );
}
