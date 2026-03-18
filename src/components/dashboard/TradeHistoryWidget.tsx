"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, AlertTriangle, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface BinanceTrade {
  id: number;
  price: string;
  qty: string;
  quoteQty: string;
  time: number;
  isBuyer: boolean;
  isBuyerMaker: boolean;
  symbol: string;
}

const TOP_PAIRS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];

export function TradeHistoryWidget() {
  const apiKeys = useAppStore((s) => s.apiKeys);
  const [trades, setTrades] = useState<BinanceTrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTrades = useCallback(async () => {
    if (!apiKeys?.binanceApiKey || !apiKeys?.binanceSecretKey) return;
    setIsLoading(true);
    setError("");
    try {
      const allTrades: BinanceTrade[] = [];
      for (const symbol of TOP_PAIRS) {
        try {
          const res = await fetch("/api/binance/proxy", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: "/api/v3/myTrades",
              method: "GET",
              params: { symbol, limit: 10 },
              requiresSign: true,
            }),
          });
          const result = await res.json();
          if (Array.isArray(result)) {
            allTrades.push(...result);
          }
        } catch {
          /* skip */
        }
      }
      allTrades.sort((a, b) => b.time - a.time);
      setTrades(allTrades.slice(0, 8));
    } catch {
      setError("Failed to fetch trade history. Check API key permissions.");
    } finally {
      setIsLoading(false);
    }
  }, [apiKeys]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const hasKeys = !!apiKeys?.binanceApiKey && !!apiKeys?.binanceSecretKey;

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col h-[280px] sm:h-[320px] md:h-[340px] transition-all duration-300">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h2 className="text-text-primary font-bold text-lg">Trade History</h2>
        {isLoading && <Loader2 className="w-4 h-4 text-text-muted animate-spin" />}
      </div>

      {!hasKeys ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-12 h-12 bg-card border border-card-border text-text-muted rounded-full flex items-center justify-center mb-3">
            <BarChart className="w-5 h-5" />
          </div>
          <h3 className="text-text-primary font-semibold mb-1 text-sm">No API keys connected</h3>
          <p className="text-text-secondary text-xs max-w-[220px] mx-auto">
            Connect your Binance API to view your trade history.
          </p>
        </div>
      ) : isLoading && trades.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <Loader2 className="w-8 h-8 text-text-muted animate-spin mb-3" />
          <p className="text-text-secondary text-sm">Loading trades...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-12 h-12 bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] text-risk-extreme rounded-full flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-text-primary font-semibold mb-1 text-sm">Error</h3>
          <p className="text-text-secondary text-xs max-w-[220px] mx-auto">{error}</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-12 h-12 bg-card border border-card-border text-text-muted rounded-full flex items-center justify-center mb-3">
            <BarChart className="w-5 h-5" />
          </div>
          <h3 className="text-text-primary font-semibold mb-1 text-sm">No trades found</h3>
          <p className="text-text-secondary text-xs max-w-[220px] mx-auto mb-3">
            No recent spot trades on your Binance account.
          </p>
          <div className="flex items-center gap-2 text-text-muted text-xs bg-card border border-card-border px-3 py-2 rounded-xl text-left">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Enable Spot trading permission on your API Key.</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 min-h-0">
          {trades.map((trade) => {
            const isBuy = trade.isBuyer;
            const quoteQty = parseFloat(trade.quoteQty);
            const time = new Date(trade.time);
            return (
              <div
                key={`${trade.symbol}-${trade.id}`}
                className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-card-hover transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${isBuy ? "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] text-risk-low" : "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] text-risk-extreme"}`}
                  >
                    {isBuy ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold uppercase ${isBuy ? "text-risk-low" : "text-risk-extreme"}`}
                      >
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                      <span className="text-text-primary font-semibold text-sm">
                        {trade.symbol.replace("USDT", "")}
                      </span>
                    </div>
                    <span className="text-text-dim text-[11px]">
                      {time.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      ·{" "}
                      {time.toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-text-primary text-sm font-semibold tabular-nums">
                    $
                    {quoteQty.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-text-dim text-[11px] tabular-nums">
                    {parseFloat(trade.qty).toFixed(4)} {trade.symbol.replace("USDT", "")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
