"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, RefreshCw, Calendar } from "lucide-react";
import { getSkill } from "@/skills";
import { useAppStore } from "@/store/useAppStore";

interface DCASchedule {
  week: number;
  date: string;
  amount: number;
  price: number;
  totalInvested: number;
  projectedValue: number;
  scenario: "bull" | "bear" | "base";
}

interface DCAStrategistData {
  asset: string;
  totalBudget: number;
  durationWeeks: number;
  weeklyAmount: number;
  schedule: DCASchedule[];
  summary: string;
}

function formatUSD(value: number): string {
  if (isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

export function DCAScheduler() {
  const apiKeys = useAppStore((s) => s.apiKeys);
  const apiKeysRef = useRef(apiKeys);
  const [data, setData] = useState<DCAStrategistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asset, setAsset] = useState("BTC");
  const [budget, setBudget] = useState(1000);
  const [weeks, setWeeks] = useState(12);

  useEffect(() => {
    apiKeysRef.current = apiKeys;
  }, [apiKeys]);

  const fetchData = useCallback(async () => {
    const currentApiKeys = apiKeysRef.current;
    setLoading(true);
    setError(null);
    try {
      const skill = getSkill("claw-council/dca-strategist");
      if (!skill) {
        setError("Skill not found");
        return;
      }
      const result = await skill.execute(
        { targetAsset: asset, totalBudgetUSD: budget, durationWeeks: weeks, riskTolerance: 5 },
        {
          apiKeys: {
            binanceApiKey: currentApiKeys?.binanceApiKey || "",
            binanceSecretKey: currentApiKeys?.binanceSecretKey || "",
          },
        },
      );
      if (result.success && result.data) {
        setData(result.data as unknown as DCAStrategistData);
      } else {
        setError(result.error || "Failed to generate DCA plan");
      }
    } catch {
      setError("Failed to generate DCA plan");
    } finally {
      setLoading(false);
    }
  }, [asset, budget, weeks]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  return (
    <div className="glass-card p-4 sm:p-5 h-[280px] sm:h-[320px] md:h-[340px] flex flex-col">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h2 className="text-text-primary font-bold text-base sm:text-lg flex items-center gap-2">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-agent-sage" />
          DCA Strategist
        </h2>
        <button
          onClick={fetchData}
          className="p-1.5 sm:p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
        >
          <RefreshCw className="w-3 h-4 sm:w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 sm:mb-4">
        <div>
          <label className="text-text-muted text-[10px] sm:text-xs block mb-1">Asset</label>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="w-full glass-input px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg text-text-primary text-xs"
          >
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
            <option value="BNB">BNB</option>
            <option value="SOL">SOL</option>
          </select>
        </div>
        <div>
          <label className="text-text-muted text-[10px] sm:text-xs block mb-1">Budget ($)</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full glass-input px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg text-text-primary text-xs"
          />
        </div>
        <div>
          <label className="text-text-muted text-[10px] sm:text-xs block mb-1">Weeks</label>
          <input
            type="number"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="w-full glass-input px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg text-text-primary text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-[350px]">
          <table className="w-full text-[10px] sm:text-xs">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left text-text-muted p-1">Wk</th>
                <th className="text-right text-text-muted p-1">Amt</th>
                <th className="text-right text-text-muted p-1">Inv</th>
                <th className="text-right text-text-muted p-1">Bull</th>
                <th className="text-right text-text-muted p-1">Base</th>
                <th className="text-right text-text-muted p-1">Bear</th>
              </tr>
            </thead>
            <tbody>
              {data.schedule?.slice(0, 6).map((week, idx) => (
                <motion.tr
                  key={week.week || `week-${idx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-b border-card-border/50"
                >
                  <td className="p-1 text-text-primary font-medium">W{week.week}</td>
                  <td className="p-1 text-right text-text-secondary">{formatUSD(week.amount)}</td>
                  <td className="p-1 text-right text-text-secondary">
                    {formatUSD(week.totalInvested)}
                  </td>
                  <td className="p-1 text-right text-risk-low">
                    {formatUSD(week.scenario === "bull" ? week.projectedValue : 0)}
                  </td>
                  <td className="p-1 text-right text-text-primary">
                    {formatUSD(week.scenario === "base" ? week.projectedValue : 0)}
                  </td>
                  <td className="p-1 text-right text-risk-extreme">
                    {formatUSD(week.scenario === "bear" ? week.projectedValue : 0)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
