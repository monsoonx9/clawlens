"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Target,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { getSkill } from "@/skills";
import { useAppStore } from "@/store/useAppStore";
import { clsx } from "clsx";

interface TradeJournalData {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnl: string;
  avgWin: string;
  avgLoss: string;
  bestTrade: string;
  worstTrade: string;
}

function formatUSD(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  const sign = num >= 0 ? "+" : "";
  return `${sign}$${Math.abs(num).toFixed(2)}`;
}

export function TradeJournal() {
  const apiKeys = useAppStore((s) => s.apiKeys);
  const [data, setData] = useState<TradeJournalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const skill = getSkill("claw-council/trade-journal");
      if (!skill) {
        if (!silent) setError("Skill not found");
        return;
      }
      const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];
      const result = await skill.execute(
        { symbols },
        {
          apiKeys: {
            binanceApiKey: apiKeys?.binanceApiKey || "",
            binanceSecretKey: apiKeys?.binanceSecretKey || "",
          },
        },
      );
      if (result.success && result.data) {
        const rawData = result.data as {
          totalTrades?: number;
          winRate?: number;
          profitFactor?: number;
          totalRealizedPnLUSD?: number;
          avgWinPercent?: number;
          avgLossPercent?: number;
          largestWin?: { pnlUSD?: number };
          largestLoss?: { pnlUSD?: number };
        };
        const mappedData: TradeJournalData = {
          totalTrades: rawData.totalTrades || 0,
          winRate: rawData.winRate || 0,
          profitFactor: rawData.profitFactor || 0,
          totalPnl: String(rawData.totalRealizedPnLUSD || 0),
          avgWin: String(rawData.avgWinPercent || 0),
          avgLoss: String(rawData.avgLossPercent || 0),
          bestTrade: String(rawData.largestWin?.pnlUSD || 0),
          worstTrade: String(rawData.largestLoss?.pnlUSD || 0),
        };
        setData(mappedData);
      } else if (!silent) {
        setError(
          result.summary || "No trade history found. Execute some trades on Binance to see data.",
        );
      }
    } catch {
      if (!silent) setError("Failed to fetch trade journal");
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
    const interval = setInterval(() => fetchData(true), 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-4 sm:p-5 flex items-center justify-center h-[280px] sm:h-[320px] md:h-[340px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-4 sm:p-5 flex flex-col items-center justify-center h-[280px] sm:h-[320px] md:h-[340px] text-center gap-3">
        <AlertCircle className="w-10 h-10 text-risk-extreme" />
        <p className="text-text-secondary text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: "Win Rate",
      value: `${data.winRate?.toFixed(1) || 0}%`,
      color: data.winRate >= 50 ? "text-risk-low" : "text-risk-extreme",
    },
    {
      label: "Profit Factor",
      value: data.profitFactor?.toFixed(2) || "0",
      color: data.profitFactor >= 1 ? "text-risk-low" : "text-risk-extreme",
    },
    {
      label: "Total P&L",
      value: formatUSD(data.totalPnl || "0"),
      color: parseFloat(data.totalPnl || "0") >= 0 ? "text-risk-low" : "text-risk-extreme",
    },
    {
      label: "Total Trades",
      value: data.totalTrades?.toString() || "0",
      color: "text-text-primary",
    },
  ];

  return (
    <div className="glass-card p-4 sm:p-5 h-[280px] sm:h-[320px] md:h-[340px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-text-primary font-bold text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-agent-quill" />
          Trade Journal
        </h2>
        <button
          onClick={() => fetchData(false)}
          className="p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="text-center p-4 rounded-xl bg-card-hover/30"
          >
            <div className="text-text-muted text-xs mb-1">{stat.label}</div>
            <div className={clsx("text-xl font-bold", stat.color)}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-card-hover/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-risk-low" />
            <span className="text-text-muted text-sm">Best Trade</span>
          </div>
          <div className="text-risk-low font-bold text-lg">{formatUSD(data.bestTrade || "0")}</div>
        </div>
        <div className="p-4 rounded-xl bg-card-hover/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-risk-extreme" />
            <span className="text-text-muted text-sm">Worst Trade</span>
          </div>
          <div className="text-risk-extreme font-bold text-lg">
            {formatUSD(data.worstTrade || "0")}
          </div>
        </div>
      </div>
    </div>
  );
}
