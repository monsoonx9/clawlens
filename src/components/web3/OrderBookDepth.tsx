"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, RefreshCw, BarChart2, Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

const popularSymbols = ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "AVAX"];

function formatUSD(value: number): string {
  if (isNaN(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatPrice(value: number): string {
  if (isNaN(value)) return "—";
  if (value >= 1000) return `$${value.toFixed(2)}`;
  if (value >= 1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

export function OrderBookDepth({
  contractAddress: _contractAddress,
}: {
  contractAddress?: string;
}) {
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [spread, setSpread] = useState(0);
  const [midPrice, setMidPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [showSpoofing, setShowSpoofing] = useState(true);

  const fetchData = useCallback(
    async (silent = false, currentSymbol?: string) => {
      const activeSymbol = currentSymbol ?? symbol;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch("/api/market", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "orderBook",
            params: { symbol: activeSymbol, limit: 20 },
          }),
        });
        const result = await res.json();
        if (result.success && result.data) {
          const { bids: rawBids, asks: rawAsks, spread: rawSpread } = result.data;

          let bidCumulative = 0;
          const processedBids: OrderBookEntry[] = rawBids
            .slice(0, 10)
            .map(([price, qty]: [number, number]) => {
              bidCumulative += price * qty;
              return { price, quantity: qty, total: bidCumulative };
            });

          let askCumulative = 0;
          const processedAsks: OrderBookEntry[] = rawAsks
            .slice(0, 10)
            .map(([price, qty]: [number, number]) => {
              askCumulative += price * qty;
              return { price, quantity: qty, total: askCumulative };
            });

          setBids(processedBids);
          setAsks(processedAsks);
          setSpread(rawSpread);

          if (rawBids.length > 0 && rawAsks.length > 0) {
            setMidPrice((rawBids[0][0] + rawAsks[0][0]) / 2);
          }
        } else if (!silent) {
          setError(result.error || "Failed to fetch");
        }
      } catch {
        if (!silent) setError("Failed to fetch order book");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [symbol],
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const maxTotal =
    Math.max(
      bids.length > 0 ? bids[bids.length - 1].total : 0,
      asks.length > 0 ? asks[asks.length - 1].total : 0,
    ) || 1;

  return (
    <div className="glass-card p-4 sm:p-5 h-[280px] sm:h-[320px] md:h-[340px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-text-primary font-bold text-lg flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-agent-ledger" />
          Order Book Depth
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSpoofing(!showSpoofing)}
            className={clsx(
              "p-2 rounded-full transition-all",
              showSpoofing ? "glass text-agent-warden" : "text-text-muted",
            )}
            title="Toggle spoofing detection"
          >
            {showSpoofing ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => fetchData(false)}
            className="p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {popularSymbols.map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(`${s}USDT`)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              symbol === `${s}USDT`
                ? "bg-agent-ledger text-white"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {s}
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
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 rounded-lg bg-card-hover/30">
              <div className="text-text-muted text-xs mb-1">Spread</div>
              <div className="text-text-primary font-mono text-sm">{spread.toFixed(2)}%</div>
            </div>
            <div className="p-3 rounded-lg bg-card-hover/30">
              <div className="text-text-muted text-xs mb-1">Mid Price</div>
              <div className="text-xl font-bold text-text-primary">{formatPrice(midPrice)}</div>
            </div>
          </div>

          <div className="flex-1 flex gap-1 min-h-0">
            <div className="flex-1 flex flex-col-reverse">
              {bids.map((bid, i) => (
                <div key={i} className="relative h-[18px] mb-0.5">
                  <motion.div
                    className="absolute right-0 top-0 h-full bg-risk-low/30"
                    initial={{ width: 0 }}
                    animate={{ width: `${(bid.total / maxTotal) * 100}%` }}
                    transition={{ delay: i * 0.02 }}
                  />
                  <span className="absolute right-1 text-[9px] text-text-muted">
                    {bid.quantity.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
            <div className="w-px bg-card-border" />
            <div className="flex-1 flex flex-col">
              {asks.map((ask, i) => (
                <div key={i} className="relative h-[18px] mb-0.5">
                  <motion.div
                    className="absolute left-0 top-0 h-full bg-risk-extreme/30"
                    initial={{ width: 0 }}
                    animate={{ width: `${(ask.total / maxTotal) * 100}%` }}
                    transition={{ delay: i * 0.02 }}
                  />
                  <span className="absolute left-1 text-[9px] text-text-muted">
                    {ask.quantity.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
