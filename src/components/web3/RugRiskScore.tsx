"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, RefreshCw, Shield, CheckCircle, XCircle } from "lucide-react";
import { getSkill } from "@/skills";
import { clsx } from "clsx";

interface RiskCheck {
  category: string;
  checks: Array<{
    title: string;
    description: string;
    isRisky: boolean;
    severity: "RISK" | "CAUTION";
  }>;
}

interface RugRiskData {
  contractAddress: string;
  chainId: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  riskScore: number;
  buyTax: string | null;
  sellTax: string | null;
  isVerified: boolean;
  riskChecks: RiskCheck[];
  summary: string;
  recommendation: string;
}

function getRiskColor(level: string): string {
  switch (level) {
    case "LOW":
      return "var(--color-risk-low)";
    case "MEDIUM":
      return "var(--color-risk-moderate)";
    case "HIGH":
      return "var(--color-risk-high)";
    default:
      return "var(--color-text-muted)";
  }
}

export function RugRiskScore({
  contractAddress,
  chain = "bsc",
}: {
  contractAddress?: string;
  chain?: string;
}) {
  const [data, setData] = useState<RugRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputAddress, setInputAddress] = useState(contractAddress || "");

  const fetchData = useCallback(async () => {
    if (!inputAddress) return;
    setLoading(true);
    setError(null);
    try {
      const skill = getSkill("binance/query-token-audit");
      if (!skill) {
        setError("Skill not found");
        return;
      }
      const result = await skill.execute(
        { contractAddress: inputAddress, chain },
        { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
      );
      if (result.success && result.data) {
        setData(result.data as unknown as RugRiskData);
      } else {
        setError(result.error || "Failed to fetch");
      }
    } catch {
      setError("Failed to fetch risk data");
    } finally {
      setLoading(false);
    }
  }, [inputAddress, chain]);

  useEffect(() => {
    if (contractAddress) {
      setInputAddress(contractAddress);
      fetchData();
    }
  }, [contractAddress, fetchData]);

  const circumference = 2 * Math.PI * 45;
  const score = data?.riskScore ?? 0;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card p-4 sm:p-5 h-[280px] sm:h-[320px] md:h-[340px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-text-primary font-bold text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-agent-warden" />
          Rug Risk Score
        </h3>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Contract address"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          className="flex-1 glass-input px-3 py-2 rounded-lg text-text-primary text-sm font-mono"
        />
        <button
          onClick={fetchData}
          className="p-2 bg-agent-warden text-white rounded-lg hover:bg-agent-warden/80 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
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
      ) : !data ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <Shield className="w-8 h-8 text-text-muted" />
          <p className="text-text-secondary text-sm">Enter a contract address to check</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-[100px] h-[100px]">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--color-card-border)"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={getRiskColor(data.riskLevel)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ filter: `drop-shadow(0 0 6px ${getRiskColor(data.riskLevel)})` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  className="text-xl font-bold"
                  style={{ color: getRiskColor(data.riskLevel) }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {data.riskScore}/100
                </motion.span>
                <span className="text-[8px] text-text-muted">{data.riskLevel}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 rounded-lg bg-card-hover/30 text-center">
              <div className="text-text-muted text-xs">Buy Tax</div>
              <div
                className={clsx(
                  "font-bold",
                  parseFloat(data.buyTax || "0") > 10 ? "text-risk-extreme" : "text-text-primary",
                )}
              >
                {data.buyTax || "0"}%
              </div>
            </div>
            <div className="p-2 rounded-lg bg-card-hover/30 text-center">
              <div className="text-text-muted text-xs">Sell Tax</div>
              <div
                className={clsx(
                  "font-bold",
                  parseFloat(data.sellTax || "0") > 10 ? "text-risk-extreme" : "text-text-primary",
                )}
              >
                {data.sellTax || "0"}%
              </div>
            </div>
          </div>

          <div
            className={clsx(
              "p-2 rounded-lg text-xs mb-2 flex-1 overflow-auto",
              data.riskLevel === "LOW"
                ? "bg-risk-low/10 text-risk-low"
                : data.riskLevel === "HIGH"
                  ? "bg-risk-extreme/10 text-risk-extreme"
                  : "bg-risk-moderate/10 text-risk-moderate",
            )}
          >
            {data.recommendation}
          </div>

          <div className="space-y-1 max-h-[60px] overflow-auto">
            {data.riskChecks?.slice(0, 3).flatMap((category, cIdx) =>
              category.checks.slice(0, 2).map((check, idx) => (
                <div
                  key={`${cIdx}-${idx}`}
                  className="flex items-center gap-2 p-1.5 rounded bg-card-hover/30"
                >
                  {check.isRisky ? (
                    <XCircle className="w-3 h-3 text-risk-extreme shrink-0" />
                  ) : (
                    <CheckCircle className="w-3 h-3 text-risk-low shrink-0" />
                  )}
                  <span className="text-[10px] text-text-secondary truncate">{check.title}</span>
                </div>
              )),
            )}
          </div>
        </>
      )}
    </div>
  );
}
