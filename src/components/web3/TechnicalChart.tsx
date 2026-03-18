"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2, AlertCircle, RefreshCw, TrendingUp, Activity } from "lucide-react";
import { getSkill } from "@/skills";
import { clsx } from "clsx";

interface TechnicalChartData {
  symbol: string;
  price: number;
  rsi: { value: number; overbought: boolean; oversold: boolean };
  candles?: Array<{ time: number; open: number; high: number; low: number; close: number }>;
}

const popularSymbols = ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "AVAX"];

function formatUSD(value: number): string {
  if (isNaN(value)) return "—";
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(6)}`;
}

export function TechnicalChart({ contractAddress }: { contractAddress?: string }) {
  const [data, setData] = useState<TechnicalChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeInterval, setTimeInterval] = useState("1h");

  const fetchData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const skill = getSkill("binance/technical-indicators");
      if (!skill) {
        if (!silent) setError("Skill not found");
        return;
      }
      const result = await skill.execute(
        { symbol, interval: timeInterval, limit: 50, indicators: ["sma", "ema", "rsi"] },
        { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
      );
      if (result.success && result.data) {
        setData(result.data as unknown as TechnicalChartData);
      } else if (!silent) {
        setError(result.error || "Failed to fetch");
      }
    } catch {
      if (!silent) setError("Failed to fetch chart data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, [symbol, timeInterval]);

  // Silent background refresh
  useEffect(() => {
    const timer = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(timer);
  }, [symbol, timeInterval]);

  // Transform candle data for chart
  const chartData =
    data?.candles?.map((c) => ({
      time: new Date(c.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      price: c.close,
    })) || [];

  const intervals = [
    { value: "15m", label: "15m" },
    { value: "1h", label: "1H" },
    { value: "4h", label: "4H" },
    { value: "1d", label: "1D" },
  ];

  return (
    <div className="glass-card p-4 sm:p-5 h-[280px] sm:h-[320px] md:h-[340px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-text-primary font-bold text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-agent-lens" />
          Technical Analysis
        </h3>
        <button
          onClick={() => fetchData(false)}
          className="p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="glass-input px-3 py-2 rounded-lg text-text-primary text-sm"
        >
          {popularSymbols.map((s) => (
            <option key={s} value={`${s}USDT`}>
              {s}
            </option>
          ))}
        </select>
        {intervals.map((int) => (
          <button
            key={int.value}
            onClick={() => setTimeInterval(int.value)}
            className={clsx(
              "px-3 py-2 rounded-lg text-sm font-medium transition-all",
              timeInterval === int.value
                ? "bg-agent-lens text-white"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {int.label}
          </button>
        ))}
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
      ) : (
        <>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData : [{ time: "N/A", price: 0 }]}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
                <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={10} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-card-border)",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#chartGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="p-3 rounded-lg bg-card-hover/30">
              <div className="text-text-muted text-xs mb-1">RSI (14)</div>
              <div
                className={clsx(
                  "text-xl font-bold",
                  data?.rsi?.overbought
                    ? "text-risk-extreme"
                    : data?.rsi?.oversold
                      ? "text-risk-low"
                      : "text-text-primary",
                )}
              >
                {data?.rsi?.value?.toFixed(1) || "—"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-card-hover/30">
              <div className="text-text-muted text-xs mb-1">Current Price</div>
              <div className="text-xl font-bold text-text-primary">
                {formatUSD(data?.price || 0)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
