"use client";

import { useState } from "react";
import { X, Plus, Loader2, Bell, TrendingUp, TrendingDown } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { WatchlistToken } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddWatchlistModal({ isOpen, onClose }: Props) {
  const [symbol, setSymbol] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertCondition, setAlertCondition] = useState<"above" | "below">("above");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const addToWatchlist = useAppStore((s) => s.addToWatchlist);

  const resetForm = () => {
    setSymbol("");
    setAlertEnabled(false);
    setAlertPrice("");
    setAlertCondition("above");
    setError("");
  };

  if (!isOpen) return null;

  const handleAdd = async () => {
    const trimmed = symbol.trim().toUpperCase();
    if (!trimmed) return;

    setError("");
    setIsVerifying(true);

    try {
      const apiRes = await fetch("/api/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tickerPrice", params: { symbol: `${trimmed}USDT` } }),
      });
      const data = await apiRes.json();
      if (!data.success || data.data === undefined) {
        throw new Error(data.error || "Token not found");
      }

      const token: WatchlistToken = {
        symbol: trimmed,
        contractAddress: trimmed,
        chain: "BSC",
        addedAt: new Date(),
        ...(alertEnabled &&
          alertPrice && {
            alertPrice: parseFloat(alertPrice),
            alertCondition,
          }),
      };

      addToWatchlist(token);
      resetForm();
      onClose();
    } catch {
      setError(`"${trimmed}USDT" not found on Binance. Try a valid symbol like BTC, ETH, SOL.`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg),transparent_20%)] backdrop-blur-md">
      <div className="glass-card p-6 w-full max-w-sm mx-4 relative">
        <button
          onClick={() => {
            resetForm();
            onClose();
          }}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close add to watchlist modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-text-primary font-bold text-lg mb-1">Add to Watchlist</h3>
        <p className="text-text-secondary text-sm mb-5">Enter a token symbol to track its price.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-text-primary text-sm font-medium mb-1.5">
              Token Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="e.g. BTC, ETH, SOL"
              className="w-full glass-input px-4 py-3 text-sm font-mono uppercase placeholder-text-dim"
              autoFocus
            />
          </div>

          <div className="border-t border-card-border pt-4">
            <button
              type="button"
              onClick={() => setAlertEnabled(!alertEnabled)}
              className="flex items-center gap-2 text-text-primary text-sm font-medium w-full"
            >
              <div
                className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${
                  alertEnabled ? "bg-accent" : "bg-card-border"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-amoled transition-transform ${
                    alertEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <Bell className="w-4 h-4 text-text-muted" />
              Set Price Alert
            </button>

            {alertEnabled && (
              <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAlertCondition("above")}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                      alertCondition === "above"
                        ? "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] text-risk-low border border-[color-mix(in_srgb,var(--color-risk-low),transparent_80%)]"
                        : "bg-card border border-card-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Above
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertCondition("below")}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                      alertCondition === "below"
                        ? "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] text-risk-extreme border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)]"
                        : "bg-card border border-card-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    Below
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                    placeholder="Target price"
                    className="w-full glass-input pl-7 pr-4 py-2.5 text-sm font-mono placeholder-text-dim"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-risk-extreme text-xs bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_85%)] rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleAdd}
            disabled={!symbol.trim() || isVerifying}
            className="w-full bg-accent text-amoled font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-target"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add Token
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
