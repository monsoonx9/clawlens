"use client";

import { useState, useEffect } from "react";
import {
  X,
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getSkill } from "@/skills";
import type { SkillContext } from "@/skills/types";

interface TokenAuditData {
  contractAddress: string;
  chainId: string;
  audit: {
    hasResult: boolean;
    isSupported: boolean;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
    riskScore: number;
    buyTax: string | null;
    sellTax: string | null;
    isVerified: boolean;
  };
  riskChecks: Array<{
    category: string;
    checks: Array<{
      title: string;
      description: string;
      isRisky: boolean;
      severity: "RISK" | "CAUTION";
    }>;
  }>;
  summary: string;
  recommendation: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contractAddress: string;
  chain: string;
  tokenSymbol?: string;
}

const CHAIN_LABELS: Record<string, string> = {
  "56": "BSC",
  "8453": "Base",
  CT_501: "Solana",
  "1": "Ethereum",
};

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LOW: {
    bg: "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)]",
    text: "text-risk-low",
    border: "border-[color-mix(in_srgb,var(--color-risk-low),transparent_80%)]",
  },
  MEDIUM: {
    bg: "bg-[color-mix(in_srgb,var(--color-risk-moderate),transparent_90%)]",
    text: "text-risk-moderate",
    border: "border-[color-mix(in_srgb,var(--color-risk-moderate),transparent_80%)]",
  },
  HIGH: {
    bg: "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)]",
    text: "text-risk-extreme",
    border: "border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)]",
  },
  UNKNOWN: {
    bg: "bg-[color-mix(in_srgb,var(--color-text-muted),transparent_90%)]",
    text: "text-text-muted",
    border: "border-[color-mix(in_srgb,var(--color-text-muted),transparent_80%)]",
  },
};

export function TokenAuditModal({ isOpen, onClose, contractAddress, chain, tokenSymbol }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TokenAuditData | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && contractAddress) {
      fetchAudit();
    }
  }, [isOpen, contractAddress, chain]);

  const fetchAudit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const skill = getSkill("binance/query-token-audit");
      if (!skill) throw new Error("Token Audit skill not found");

      const context: SkillContext = {
        apiKeys: { binanceApiKey: "", binanceSecretKey: "" },
      };

      const response = await skill.execute({ contractAddress, chain }, context);

      if (response.success && response.data) {
        setResult(response.data as unknown as TokenAuditData);
      } else {
        setError(response.error || "Failed to fetch audit");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audit");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const getRiskStyle = (level: string) => RISK_COLORS[level] || RISK_COLORS.UNKNOWN;

  if (!isOpen) return null;

  const chainLabel = CHAIN_LABELS[chain] || chain;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg),transparent_20%)] backdrop-blur-md p-4">
      <div className="glass-card w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-card-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--color-accent),transparent_80%)] flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-text-primary font-bold text-lg">Token Audit</h2>
              <p className="text-text-muted text-sm">
                {tokenSymbol || contractAddress.slice(0, 8)}...
                {contractAddress.slice(-4)} • {chainLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-2"
            aria-label="Close audit modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent animate-spin mb-3" />
              <p className="text-text-muted text-sm">Running security audit...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="w-10 h-10 text-risk-extreme mb-3" />
              <p className="text-text-primary font-semibold mb-1">Audit Failed</p>
              <p className="text-text-muted text-sm">{error}</p>
              <button
                onClick={fetchAudit}
                className="mt-4 px-4 py-2 bg-accent text-amoled text-sm font-bold rounded-full hover:scale-105 transition-transform"
              >
                Retry
              </button>
            </div>
          )}

          {result && !loading && !error && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1.5 rounded-full text-sm font-bold ${getRiskStyle(result.audit.riskLevel).bg} ${getRiskStyle(result.audit.riskLevel).text} border ${getRiskStyle(result.audit.riskLevel).border}`}
                  >
                    {result.audit.riskLevel} RISK
                  </span>
                  <span className="text-text-muted text-sm">Score: {result.audit.riskScore}/5</span>
                </div>
                {result.audit.isVerified && (
                  <span className="flex items-center gap-1.5 text-risk-low text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4">
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Buy Tax</p>
                  <p className="text-text-primary font-bold text-xl">
                    {result.audit.buyTax ? `${result.audit.buyTax}%` : "—"}
                  </p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Sell Tax</p>
                  <p className="text-text-primary font-bold text-xl">
                    {result.audit.sellTax ? `${result.audit.sellTax}%` : "—"}
                  </p>
                </div>
              </div>

              {result.summary && (
                <div className="glass-card p-4">
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Summary</p>
                  <p className="text-text-secondary text-sm">{result.summary}</p>
                </div>
              )}

              {result.recommendation && (
                <div
                  className={`p-4 rounded-xl border ${
                    result.audit.riskLevel === "HIGH"
                      ? "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)]"
                      : result.audit.riskLevel === "MEDIUM"
                        ? "bg-[color-mix(in_srgb,var(--color-risk-moderate),transparent_90%)] border-[color-mix(in_srgb,var(--color-risk-moderate),transparent_80%)]"
                        : "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] border-[color-mix(in_srgb,var(--color-risk-low),transparent_80%)]"
                  }`}
                >
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-1">
                    Recommendation
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      result.audit.riskLevel === "HIGH"
                        ? "text-risk-extreme"
                        : result.audit.riskLevel === "MEDIUM"
                          ? "text-risk-moderate"
                          : "text-risk-low"
                    }`}
                  >
                    {result.recommendation}
                  </p>
                </div>
              )}

              {result.riskChecks && result.riskChecks.length > 0 && (
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-3">
                    Security Checks
                  </p>
                  <div className="space-y-2">
                    {result.riskChecks.map((category) => {
                      const hasRiskyChecks = category.checks.some((c) => c.isRisky);
                      const isExpanded = expandedCategories.has(category.category);

                      return (
                        <div key={category.category} className="glass-card overflow-hidden">
                          <button
                            onClick={() => toggleCategory(category.category)}
                            className="w-full flex items-center justify-between p-4 hover:bg-card-hover transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  hasRiskyChecks ? "bg-risk-extreme" : "bg-risk-low"
                                }`}
                              />
                              <span className="text-text-primary font-medium text-sm">
                                {category.category.replace(/_/g, " ")}
                              </span>
                              <span className="text-text-muted text-xs">
                                ({category.checks.filter((c) => c.isRisky).length}/
                                {category.checks.length} issues)
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-text-muted" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-text-muted" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-2">
                              {category.checks.map((check, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-start gap-2 p-2 rounded-lg ${
                                    check.isRisky
                                      ? check.severity === "RISK"
                                        ? "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)]"
                                        : "bg-[color-mix(in_srgb,var(--color-risk-moderate),transparent_90%)]"
                                      : "bg-[color-mix(in_srgb,var(--color-card-border),transparent_50%)]"
                                  }`}
                                >
                                  {check.isRisky ? (
                                    <AlertTriangle
                                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                        check.severity === "RISK"
                                          ? "text-risk-extreme"
                                          : "text-risk-moderate"
                                      }`}
                                    />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-risk-low" />
                                  )}
                                  <div>
                                    <p
                                      className={`text-sm font-medium ${
                                        check.isRisky ? "text-text-primary" : "text-text-secondary"
                                      }`}
                                    >
                                      {check.title}
                                    </p>
                                    {check.description && (
                                      <p className="text-xs text-text-muted mt-0.5">
                                        {check.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-card-border shrink-0">
          <a
            href={`https://web3.binance.com/en/token/security/${chain === "CT_501" ? "sol" : chain === "8453" ? "base" : chain === "1" ? "eth" : "bsc"}/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 glass hover:glass-strong text-text-primary text-sm font-medium rounded-xl transition-all"
          >
            View on Binance <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
