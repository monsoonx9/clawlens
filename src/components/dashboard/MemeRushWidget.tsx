"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Rocket, Loader2, Flame, Zap, ExternalLink, ChevronDown } from "lucide-react";
import { getSkill } from "@/skills";

interface MemeToken {
  symbol: string;
  name: string;
  chainId: string;
  contractAddress: string;
  price: string;
  priceChange: string;
  marketCap: string;
  liquidity: string;
  volume: string;
  holders: number;
  progress: string;
  isExclusive: boolean;
  icon?: string;
  security: {
    top10HolderPercent: string;
    devPercent: string;
    isPumpfun: boolean;
    hasTax: boolean;
    taxRate: string;
  };
}

function formatUSD(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
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

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function getTradingUrl(token: { contractAddress: string; chainId?: string }): string {
  const chainId = token.chainId || "56";
  const chainPath =
    chainId === "CT_501" ? "sol" : chainId === "8453" ? "base" : chainId === "1" ? "eth" : "bsc";
  return `https://web3.binance.com/en/token/${chainPath}/${token.contractAddress}`;
}

function getTokenIcon(icon?: string): string {
  if (!icon) return "";
  if (icon.startsWith("http")) return icon;
  if (icon.startsWith("/")) return `https://bin.bnbstatic.com${icon}`;
  return `https://bin.bnbstatic.com${icon}`;
}

export function MemeRushWidget() {
  const [tokens, setTokens] = useState<MemeToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "finalizing" | "migrated">("new");

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const skill = getSkill("binance/meme-rush");
        if (!skill) {
          if (!silent) setError("Skill not found");
          return;
        }

        const result = await skill.execute(
          {
            mode: "meme-rush",
            stage: activeTab,
            chain: "solana",
            limit: 20,
          },
          { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
        );

        if (result.success && result.data) {
          const data = result.data as Record<string, unknown>;
          const tokenList = (data.tokens as MemeToken[]) || [];
          setTokens(tokenList.slice(0, 5));
        } else if (!silent) {
          setError(result.summary || "Failed to fetch");
        }
      } catch (err) {
        if (!silent) setError("Failed to load data");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [activeTab],
  );

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Silent background refresh (meme coins update less frequently)
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const tabOptions = [
    { id: "new", label: "New", icon: Zap },
    { id: "finalizing", label: "Finalizing", icon: Flame },
    { id: "migrated", label: "Migrated", icon: Rocket },
  ] as const;

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col h-[280px] sm:h-[320px] md:h-[340px] overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-risk-moderate" />
          <h3 className="text-text-primary font-bold text-sm tracking-tight">Meme Rush</h3>
        </div>
        <div className="flex gap-1">
          {tabOptions.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all flex items-center gap-1 ${
                activeTab === tab.id
                  ? "bg-risk-moderate text-amoled shadow-glow"
                  : "bg-card-border text-text-muted hover:text-text-secondary"
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
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
      ) : tokens.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-text-muted text-xs">No tokens found</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
            {tokens.map((token, i) => (
              <motion.div
                key={`${token.contractAddress}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between bg-[color-mix(in_srgb,var(--color-card-border),transparent_80%)] rounded-lg p-2 hover:bg-[color-mix(in_srgb,var(--color-card-border),transparent_70%)] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  {token.icon ? (
                    <img
                      src={getTokenIcon(token.icon)}
                      alt={token.symbol}
                      className="w-7 h-7 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-card-border flex items-center justify-center">
                      {token.isExclusive && <Zap className="w-3 h-3 text-risk-moderate" />}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-text-primary text-xs font-semibold">{token.symbol}</p>
                      {token.security.isPumpfun && (
                        <span className="text-[8px] bg-[color-mix(in_srgb,var(--color-agent-pulse),transparent_80%)] text-agent-pulse px-1 rounded">
                          PF
                        </span>
                      )}
                      <a
                        href={getTradingUrl(token)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="w-3 h-3 text-text-muted hover:text-text-primary" />
                      </a>
                    </div>
                    <p className="text-text-muted text-[10px]">
                      {token.progress} • {formatNumber(token.holders)} holders
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-text-primary text-xs font-medium">
                    {formatUSD(token.marketCap)}
                  </p>
                  <p
                    className={`text-[10px] font-medium ${
                      parseFloat(token.priceChange) >= 0 ? "text-risk-low" : "text-risk-extreme"
                    }`}
                  >
                    {formatPercent(token.priceChange)}
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
