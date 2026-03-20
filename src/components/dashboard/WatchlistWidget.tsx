"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Star, Plus, X, TrendingUp, TrendingDown, Loader2, Bell } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { WatchlistToken } from "@/types";

interface Props {
  onAddClick: () => void;
}

interface TokenPriceData {
  price: number;
  prevPrice: number | null;
}

export function WatchlistWidget({ onAddClick }: Props) {
  const watchlist = useAppStore((s) => s.preferences.watchlist);
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const removeFromWatchlist = useAppStore((s) => s.removeFromWatchlist);
  const [prices, setPrices] = useState<Record<string, TokenPriceData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertCondition, setAlertCondition] = useState<"above" | "below">("above");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const pricesRef = useRef<Record<string, TokenPriceData>>({});

  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  const fetchPrices = useCallback(async () => {
    if (watchlist.length === 0) return;
    setIsLoading(true);

    const currentPrices = pricesRef.current;

    const pricePromises = watchlist.map(async (token): Promise<[string, TokenPriceData | null]> => {
      try {
        const res = await fetch("/api/market", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "tickerPrice",
            params: { symbol: `${token.symbol}USDT` },
          }),
        });
        const data = await res.json();
        if (!data.success || data.data === undefined) {
          throw new Error(data.error || "Failed to fetch");
        }
        return [
          token.symbol,
          {
            price: data.data,
            prevPrice: currentPrices[token.symbol]?.price ?? null,
          },
        ];
      } catch {
        if (currentPrices[token.symbol]) {
          return [token.symbol, currentPrices[token.symbol]];
        }
        return [token.symbol, null];
      }
    });

    const results = await Promise.all(pricePromises);
    const newPrices: Record<string, TokenPriceData> = {};

    for (const [symbol, priceData] of results) {
      if (priceData) {
        newPrices[symbol] = priceData;
      }
    }

    setPrices(newPrices);
    setIsLoading(false);
  }, [watchlist]);

  useEffect(() => {
    fetchPrices();

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchPrices();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(fetchPrices, 60000);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchPrices]);

  const handleRemoveAlert = (symbol: string) => {
    const updated = watchlist.map((t) =>
      t.symbol === symbol ? { ...t, alertPrice: undefined, alertCondition: undefined } : t,
    );
    updatePreferences({ watchlist: updated });
  };

  const handleSaveAlert = (symbol: string) => {
    if (!alertPrice) return;
    const updated = watchlist.map((t) =>
      t.symbol === symbol ? { ...t, alertPrice: parseFloat(alertPrice), alertCondition } : t,
    );
    updatePreferences({ watchlist: updated });
    setEditingAlert(null);
    setAlertPrice("");
  };

  const startEditAlert = (token: WatchlistToken) => {
    setEditingAlert(token.symbol);
    setAlertPrice(token.alertPrice?.toString() || "");
    setAlertCondition(token.alertCondition || "above");
  };

  const tokensWithAlerts = watchlist.filter((t) => t.alertPrice);

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col h-[280px] sm:h-[320px] md:h-[340px] transition-all duration-300">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-text-primary font-bold text-lg">Watchlist</h2>
          {tokensWithAlerts.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-accent bg-[color-mix(in_srgb,var(--color-accent),transparent_90%)] px-2 py-0.5 rounded-full">
              <Bell className="w-3 h-3" />
              {tokensWithAlerts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-sm">
            {watchlist.length} token{watchlist.length !== 1 ? "s" : ""}
          </span>
          {isLoading && <Loader2 className="w-3 h-3 text-text-muted animate-spin" />}
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-12 h-12 bg-card border border-card-border text-text-muted rounded-full flex items-center justify-center mb-3">
            <Star className="w-5 h-5" />
          </div>
          <h3 className="text-text-primary font-semibold mb-1 text-sm">No tokens tracked</h3>
          <p className="text-text-secondary text-xs max-w-[200px] mx-auto mb-4">
            Add tokens to your watchlist to track their performance.
          </p>
          <button
            onClick={onAddClick}
            className="glass text-text-primary text-sm font-semibold px-5 py-2 rounded-full flex items-center gap-2 hover:bg-card-hover transition-all touch-target"
          >
            <Plus className="w-4 h-4" />
            Add Token
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {watchlist.map((token) => {
              const data = prices[token.symbol];
              const isUp = data && data.prevPrice !== null ? data.price >= data.prevPrice : true;
              const hasAlert = token.alertPrice && token.alertCondition;
              const percentAway =
                hasAlert && data
                  ? Math.abs((token.alertPrice! - data.price) / data.price) * 100
                  : null;

              return (
                <div
                  key={token.symbol}
                  className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-card-hover transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-bg flex items-center justify-center text-accent text-xs font-bold">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <span className="text-text-primary font-semibold text-sm">
                        {token.symbol}
                      </span>
                      <span className="text-text-dim text-xs ml-1.5">/ USDT</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {data ? (
                      <div className="text-right">
                        <div className="text-text-primary text-sm font-semibold tabular-nums">
                          $
                          {data.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div
                          className={`flex items-center gap-0.5 text-[11px] justify-end ${
                            isUp ? "text-risk-low" : "text-risk-extreme"
                          }`}
                        >
                          {isUp ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
                    )}

                    {hasAlert && data && (
                      <button
                        onClick={() => startEditAlert(token)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--color-accent),transparent_90%)] text-accent text-[10px] font-medium hover:bg-[color-mix(in_srgb,var(--color-accent),transparent_80%)] transition-colors"
                        title={`Alert: ${token.alertCondition} $${token.alertPrice?.toLocaleString()}`}
                      >
                        <Bell className="w-3 h-3" />
                        {percentAway !== null && <span>{percentAway.toFixed(0)}%</span>}
                      </button>
                    )}

                    {editingAlert === token.symbol ? (
                      <div className="flex items-center gap-1 animate-in fade-in duration-150">
                        <select
                          value={alertCondition}
                          onChange={(e) => setAlertCondition(e.target.value as "above" | "below")}
                          className="bg-card border border-card-border text-text-primary text-xs py-1 px-1 rounded"
                        >
                          <option value="above">↑</option>
                          <option value="below">↓</option>
                        </select>
                        <input
                          type="number"
                          value={alertPrice}
                          onChange={(e) => setAlertPrice(e.target.value)}
                          placeholder="$$$"
                          className="w-16 bg-card border border-card-border text-text-primary text-xs py-1 px-1 rounded font-mono"
                        />
                        <button
                          onClick={() => handleSaveAlert(token.symbol)}
                          className="p-1 text-risk-low hover:bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] rounded"
                        >
                          <Loader2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingAlert(null);
                            handleRemoveAlert(token.symbol);
                          }}
                          className="p-1 text-risk-extreme hover:bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditAlert(token)}
                        className={`opacity-0 group-hover:opacity-100 p-1 transition-all ${
                          hasAlert ? "text-accent" : "text-text-muted hover:text-text-primary"
                        }`}
                        title={hasAlert ? "Edit alert" : "Set alert"}
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => removeFromWatchlist(token.contractAddress)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-risk-extreme transition-all"
                      aria-label={`Remove ${token.symbol} from watchlist`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={onAddClick}
            className="mt-2 shrink-0 w-full border border-dashed border-card-border text-text-secondary text-sm font-medium py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-card-hover hover:border-card-border-hover transition-all touch-target"
          >
            <Plus className="w-4 h-4" />
            Add Token
          </button>
        </div>
      )}
    </div>
  );
}
