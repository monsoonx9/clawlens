"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { getSkill } from "@/skills";
import { useAppStore } from "@/store/useAppStore";
import { clsx } from "clsx";

interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: "above" | "below";
  currentPrice: number;
  triggered: boolean;
  createdAt: string;
}

function formatUSD(value: number): string {
  if (isNaN(value)) return "—";
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(6)}`;
}

export function PriceAlertsPanel() {
  const apiKeys = useAppStore((s) => s.apiKeys);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSymbol, setNewSymbol] = useState("BTC");
  const [newPrice, setNewPrice] = useState("");
  const [newCondition, setNewCondition] = useState<"above" | "below">("above");

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const skill = getSkill("binance/price-alerts");
      if (!skill) {
        setError("Skill not found");
        return;
      }
      const result = await skill.execute(
        { action: "list" },
        {
          apiKeys: {
            binanceApiKey: apiKeys?.binanceApiKey || "",
            binanceSecretKey: apiKeys?.binanceSecretKey || "",
          },
        },
      );
      if (result.success && result.data) {
        const data = result.data as { alerts?: PriceAlert[] };
        setAlerts(data.alerts || []);
      } else {
        setError(result.error || "Failed to fetch alerts");
      }
    } catch {
      setError("Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    if (!newPrice) return;
    try {
      const skill = getSkill("binance/price-alerts");
      if (!skill) return;
      await skill.execute(
        {
          action: "create",
          symbol: newSymbol,
          targetPrice: parseFloat(newPrice),
          condition: newCondition,
        },
        {
          apiKeys: {
            binanceApiKey: apiKeys?.binanceApiKey || "",
            binanceSecretKey: apiKeys?.binanceSecretKey || "",
          },
        },
      );
      setNewPrice("");
      fetchAlerts();
    } catch {
      console.error("Failed to create alert");
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const skill = getSkill("binance/price-alerts");
      if (!skill) return;
      await skill.execute(
        { action: "delete", alertId: id },
        {
          apiKeys: {
            binanceApiKey: apiKeys?.binanceApiKey || "",
            binanceSecretKey: apiKeys?.binanceSecretKey || "",
          },
        },
      );
      fetchAlerts();
    } catch {
      console.error("Failed to delete alert");
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const symbols = ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "AVAX"];

  return (
    <div className="glass-card p-4 sm:p-5 h-[280px] sm:h-[320px] md:h-[340px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-text-primary font-bold text-lg flex items-center gap-2">
          <Bell className="w-5 h-5 text-agent-pulse" />
          Price Alerts
        </h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          className="glass-input px-2 sm:px-3 py-2 rounded-lg text-text-primary text-xs sm:text-sm min-w-[70px]"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={newCondition}
          onChange={(e) => setNewCondition(e.target.value as "above" | "below")}
          className="glass-input px-2 sm:px-3 py-2 rounded-lg text-text-primary text-xs sm:text-sm min-w-[70px]"
        >
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
        <input
          type="number"
          placeholder="Price"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          className="glass-input px-2 sm:px-3 py-2 rounded-lg text-text-primary text-xs sm:text-sm flex-1 min-w-[80px]"
        />
        <button
          onClick={createAlert}
          className="p-2 bg-accent text-amoled rounded-lg hover:bg-accent/80 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
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
      ) : alerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <Bell className="w-8 h-8 text-text-muted" />
          <p className="text-text-secondary text-sm">No alerts set</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {alerts.map((alert, idx) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={clsx(
                "flex items-center justify-between p-3 rounded-lg",
                alert.triggered ? "bg-risk-low/10" : "bg-card-hover/30",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    alert.condition === "above" ? "bg-risk-low/20" : "bg-risk-extreme/20",
                  )}
                >
                  {alert.condition === "above" ? (
                    <ArrowUpRight className="w-5 h-5 text-risk-low" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-risk-extreme" />
                  )}
                </div>
                <div>
                  <div className="text-text-primary font-semibold">{alert.symbol}USDT</div>
                  <div className="text-text-muted text-xs">
                    {alert.condition === "above" ? "Above" : "Below"} {formatUSD(alert.targetPrice)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {alert.triggered && (
                  <span className="text-xs px-2 py-1 rounded-full bg-risk-low/20 text-risk-low">
                    Triggered
                  </span>
                )}
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="p-2 text-text-muted hover:text-risk-extreme transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
