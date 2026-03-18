"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, RefreshCw, Gauge } from "lucide-react";
import { getSkill } from "@/skills";

interface FearIndexData {
  score: number;
  label: string;
  components: {
    socialSentiment?: { score: number; weight: number; explanation: string };
    priceMomentum?: { score: number; weight: number; explanation: string };
    smartMoney?: { score: number; weight: number; explanation: string };
    technicalRSI?: { score: number; weight: number; explanation: string };
  };
}

function getFearColor(score: number): string {
  if (score <= 25) return "var(--color-risk-extreme)";
  if (score <= 45) return "var(--color-risk-high)";
  if (score <= 55) return "var(--color-risk-moderate)";
  if (score <= 75) return "var(--color-agent-pulse)";
  return "var(--color-risk-low)";
}

function getFearLabel(score: number): string {
  if (score <= 25) return "Extreme Fear";
  if (score <= 45) return "Fear";
  if (score <= 55) return "Neutral";
  if (score <= 75) return "Greed";
  return "Extreme Greed";
}

const componentLabels: Record<string, string> = {
  socialSentiment: "Social",
  priceMomentum: "Momentum",
  smartMoney: "Smart $",
  technicalRSI: "RSI",
};

export function FearIndexGauge() {
  const [data, setData] = useState<FearIndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const skill = getSkill("claw-council/fear-index");
      if (!skill) {
        if (!silent) setError("Skill not found");
        return;
      }
      const result = await skill.execute(
        {
          token: "MARKET",
          socialHypeScore: 65,
          memeRushMomentum: 55,
          smartMoneyDirection: 60,
          priceChange24h: 2.5,
        },
        { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
      );
      if (result.success && result.data) {
        const resultData = result.data as unknown as FearIndexData;
        setData(resultData);
      } else if (!silent) {
        setError(result.error || "Failed to fetch");
      }
    } catch {
      if (!silent) setError("Failed to fetch fear index");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, []);

  // Silent background refresh (fear index changes slowly, 5 min interval)
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 300000);
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
        <button
          onClick={() => fetchData(false)}
          className="p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const score = data?.score ?? 50;
  const color = getFearColor(score);
  const label = getFearLabel(score);
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col h-[280px] sm:h-[320px] md:h-[340px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-text-primary font-bold text-lg flex items-center gap-2">
          <Gauge className="w-5 h-5 text-agent-pulse" />
          Fear & Greed Index
        </h2>
        <button
          onClick={() => fetchData(false)}
          className="p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-[160px] h-[160px]">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="var(--color-card-border)"
              strokeWidth="12"
            />
            <motion.circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{
                filter: `drop-shadow(0 0 8px ${color})`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-4xl font-bold"
              style={{ color }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              {score}
            </motion.span>
            <span className="text-text-secondary text-sm">{label}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-2">
        {data?.components &&
          Object.entries(data.components).map(([key, comp], idx) => (
            <div key={idx} className="text-center p-3 rounded-xl bg-card-hover/30">
              <div className="text-xs text-text-muted">{componentLabels[key] || key}</div>
              <div
                className="text-lg font-bold"
                style={{
                  color:
                    (comp?.score ?? 50) > 50
                      ? "var(--color-risk-low)"
                      : "var(--color-risk-extreme)",
                }}
              >
                {typeof comp?.score === "number" ? comp.score.toFixed(0) : "—"}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
