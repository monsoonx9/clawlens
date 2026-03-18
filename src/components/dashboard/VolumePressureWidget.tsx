"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Loader2, AlertCircle, RefreshCw, Activity } from "lucide-react";
import { getSkill } from "@/skills";
import { clsx } from "clsx";

interface VolumeData {
  symbol: string;
  volume: string;
  buyVolume: string;
  sellVolume: string;
  buyPressure: number;
  sellPressure: number;
  volumeChange: string;
}

function formatUSD(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(0)}`;
}

export function VolumePressureWidget() {
  const [data, setData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");

  const fetchData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const skill = getSkill("binance/volume-analysis");
      if (!skill) {
        if (!silent) setError("Skill not found");
        return;
      }
      const result = await skill.execute(
        { symbol: selectedSymbol, interval: "1h", lookback: 24 },
        { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
      );
      if (result.success && result.data) {
        const resultData = result.data as {
          buyVolume: number;
          sellVolume: number;
          buySellRatio: number;
          volumeChange: number;
          currentVolume24h: number;
          volumeRatio: number;
        };
        const totalVolume = resultData.buyVolume + resultData.sellVolume;
        const buyPressure = totalVolume > 0 ? (resultData.buyVolume / totalVolume) * 100 : 50;
        const sellPressure = totalVolume > 0 ? (resultData.sellVolume / totalVolume) * 100 : 50;

        const mappedData: VolumeData[] = [
          {
            symbol: selectedSymbol,
            volume: String(resultData.currentVolume24h || 0),
            buyVolume: String(resultData.buyVolume),
            sellVolume: String(resultData.sellVolume),
            buyPressure,
            sellPressure,
            volumeChange: String(resultData.volumeChange || 0),
          },
        ];
        setData(mappedData);
      } else if (!silent) {
        setError(result.error || "Failed to fetch");
      }
    } catch {
      if (!silent) setError("Failed to fetch volume data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  // Silent background refresh - fetchData intentionally not in deps to avoid interval reset
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];
  const currentData = data[data.length - 1];

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col h-[280px] sm:h-[320px] md:h-[340px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-text-primary font-bold text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-agent-lens" />
          Volume Pressure
        </h2>
        <button
          onClick={() => fetchData(false)}
          className="p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {symbols.map((sym) => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              selectedSymbol === sym
                ? "bg-agent-lens text-white"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {sym.replace("USDT", "")}
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
      ) : !currentData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <BarChart3 className="w-8 h-8 text-text-muted" />
          <p className="text-text-secondary text-sm">No data available</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-xs text-text-muted mb-2">Buy Pressure</div>
              <div className="text-3xl font-bold text-risk-low">
                {currentData.buyPressure?.toFixed(1) || 50}%
              </div>
            </div>
            <div className="h-12 w-px bg-card-border" />
            <div className="text-center">
              <div className="text-xs text-text-muted mb-2">Sell Pressure</div>
              <div className="text-3xl font-bold text-risk-extreme">
                {currentData.sellPressure?.toFixed(1) || 50}%
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">24h Volume</span>
              <span className="text-text-primary font-mono">
                {formatUSD(currentData.volume || "0")}
              </span>
            </div>
            <div className="h-4 bg-card-border rounded-full overflow-hidden flex">
              <motion.div
                className="h-full bg-risk-low"
                initial={{ width: 0 }}
                animate={{ width: `${currentData.buyPressure || 50}%` }}
                transition={{ duration: 0.5 }}
              />
              <motion.div
                className="h-full bg-risk-extreme"
                initial={{ width: 0 }}
                animate={{ width: `${currentData.sellPressure || 50}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
