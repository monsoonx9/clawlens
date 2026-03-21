"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/components/ui/Toast";
import { PortfolioSnapshot, PortfolioAsset } from "@/types";
import { StatCard } from "@/components/portfolio/StatCard";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { AllocationChart } from "@/components/portfolio/AllocationChart";
import { TradeJournal } from "@/components/portfolio/TradeJournal";
import { DCAScheduler } from "@/components/portfolio/DCAScheduler";
import { PriceAlertsPanel } from "@/components/portfolio/PriceAlertsPanel";
import { getSkill } from "@/skills";
import type { SkillContext } from "@/skills";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { WifiOff, Loader2, TrendingUp, ArrowRight } from "lucide-react";
import {
  Wallet,
  Shield,
  BarChart2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Zap,
  Send,
} from "lucide-react";

const QUICK_ASK_CHIPS = [
  "What is my highest risk position?",
  "Am I too concentrated anywhere?",
  "Which holding has the best risk/reward right now?",
];

export default function PortfolioPage() {
  const router = useRouter();
  const { apiKeys, portfolio, setPortfolio, preferences } = useAppStore();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // DCA Plan state
  const [showDcaForm, setShowDcaForm] = useState(false);
  const [dcaAsset, setDcaAsset] = useState("");
  const [dcaBudget, setDcaBudget] = useState(1000);
  const [dcaDuration, setDcaDuration] = useState(12);
  const [dcaRisk, setDcaRisk] = useState(5);
  const [dcaLoading, setDcaLoading] = useState(false);
  const [dcaResult, setDcaResult] = useState<Record<string, unknown> | null>(null);
  const [dcaError, setDcaError] = useState<string | null>(null);

  // Ask Ledger state
  const [showLedgerInput, setShowLedgerInput] = useState(false);
  const [ledgerQuery, setLedgerQuery] = useState("");

  const fetchPortfolio = useCallback(async () => {
    if (!apiKeys?.binanceApiKey || !apiKeys?.binanceSecretKey) {
      toast("warning", "Binance API keys not configured. Connect in Settings.");
      return;
    }

    setIsRefreshing(true);
    setFetchError(null);
    try {
      const skill = getSkill("claw-council/portfolio-pulse");
      if (!skill) throw new Error("Portfolio Pulse skill not found");

      const context: SkillContext = {
        apiKeys: {
          binanceApiKey: apiKeys.binanceApiKey,
          binanceSecretKey: apiKeys.binanceSecretKey,
        },
        preferences,
      };

      const result = await skill.execute({}, context);

      if (result.success && result.data) {
        const raw = result.data as Record<string, unknown>;
        const mapped: PortfolioSnapshot = {
          totalValueUSD: (raw.totalValueUSD as number) ?? 0,
          totalPnlUSD: (raw.totalPnlUSD as number) ?? (raw.totalUnrealizedPnLUSD as number) ?? 0,
          totalPnlPercent:
            (raw.totalPnlPercent as number) ?? (raw.totalUnrealizedPnLPercent as number) ?? 0,
          change24hUSD: (raw.change24hUSD as number) ?? 0,
          change24hPercent: (raw.change24hPercent as number) ?? 0,
          riskScore: (raw.riskScore as number) ?? 0,
          assets: (raw.assets as PortfolioAsset[]) ?? [],
          lastUpdated: raw.lastUpdated ? new Date(raw.lastUpdated as string) : new Date(),
        };
        setPortfolio(mapped);
        toast("success", "Portfolio refreshed successfully");
      } else {
        throw new Error(result.error || "Failed to fetch portfolio");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to fetch portfolio";
      setFetchError(msg);
      toast("error", msg);
    } finally {
      setIsRefreshing(false);
    }
  }, [apiKeys, preferences, setPortfolio, toast]);

  // Auto-fetch on mount - intentionally runs once
  useEffect(() => {
    if (apiKeys?.binanceApiKey && !portfolio) {
      fetchPortfolio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set default DCA asset from largest holding
  useEffect(() => {
    if (portfolio && portfolio.assets.length > 0 && !dcaAsset) {
      const sorted = [...portfolio.assets].sort((a, b) => b.allocation - a.allocation);
      setDcaAsset(sorted[0]?.symbol || "");
      setDcaBudget(preferences.defaultInvestmentSize * 10);
      setDcaRisk(preferences.riskTolerance);
    }
  }, [portfolio, dcaAsset, preferences]);

  const handleGenerateDca = async () => {
    // Comprehensive validation
    if (!dcaAsset.trim()) {
      setDcaError("Please enter a target asset symbol (e.g., BTC, SOL)");
      return;
    }

    // Validate asset format (2-10 uppercase letters)
    if (!/^[A-Z]{2,10}$/.test(dcaAsset.trim().toUpperCase())) {
      setDcaError("Invalid asset symbol. Use 2-10 letters (e.g., BTC, ETH, SOL)");
      return;
    }

    if (dcaBudget <= 0) {
      setDcaError("Budget must be greater than $0");
      return;
    }

    if (dcaBudget < 10) {
      setDcaError("Minimum budget is $10");
      return;
    }

    if (dcaBudget > 1000000) {
      setDcaError("Maximum budget is $1,000,000");
      return;
    }

    if (dcaDuration < 1) {
      setDcaError("Duration must be at least 1 week");
      return;
    }

    if (dcaDuration > 52) {
      setDcaError("Maximum duration is 52 weeks");
      return;
    }

    setDcaLoading(true);
    setDcaError(null);
    setDcaResult(null);

    try {
      const skill = getSkill("claw-council/dca-strategist");
      if (!skill) throw new Error("DCA Strategist skill not found");

      const context: SkillContext = {
        apiKeys: {
          binanceApiKey: apiKeys?.binanceApiKey || "",
          binanceSecretKey: apiKeys?.binanceSecretKey || "",
        },
        preferences,
      };

      const result = await skill.execute(
        {
          targetAsset: dcaAsset.toUpperCase(),
          totalBudgetUSD: dcaBudget,
          durationWeeks: dcaDuration,
          riskTolerance: dcaRisk,
        },
        context,
      );

      if (result.success && result.data) {
        setDcaResult(result.data as Record<string, unknown>);
      } else {
        throw new Error(result.error || "Failed to generate DCA plan");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to generate DCA plan";
      setDcaError(msg);
    } finally {
      setDcaLoading(false);
    }
  };

  const handleShareToCouncil = () => {
    const query = `I have a DCA plan for ${dcaAsset.toUpperCase()} over ${dcaDuration} weeks with $${dcaBudget} total. Review this strategy and tell me if it's optimal given current market conditions.`;
    router.push(`/council?query=${encodeURIComponent(query)}`);
  };

  const handleAskLedger = () => {
    if (!ledgerQuery.trim()) return;

    const top3 =
      portfolio?.assets
        .slice(0, 3)
        .map((a) => `${a.symbol} (${a.allocation.toFixed(1)}%)`)
        .join(", ") || "none";
    const total = portfolio?.totalValueUSD || 0;

    const query = `${ledgerQuery.trim()} [CONTEXT: My portfolio - ${top3} - Total value: $${total.toLocaleString()}]`;
    router.push(`/council?query=${encodeURIComponent(query)}`);
  };

  const handleQuickAsk = (chip: string) => {
    setLedgerQuery(chip);
  };

  // If no portfolio data yet
  if (!portfolio) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 w-full animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">Portfolio</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full relative overflow-hidden bg-card border border-card-border rounded-3xl p-8 lg:p-16 place-items-center min-h-[400px]">
          <Wallet
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 text-text-primary opacity-5 pointer-events-none"
            strokeWidth={0.5}
          />

          <div className="col-span-2 lg:col-span-4 flex flex-col items-center justify-center text-center relative z-10 w-full max-w-md">
            {isRefreshing ? (
              <>
                <SkeletonCard className="w-full" />
              </>
            ) : (
              <>
                <Wallet className="w-12 h-12 text-text-muted mb-5" />
                <p className="text-text-primary text-lg font-semibold mb-2">No portfolio data</p>
                <p className="text-text-secondary text-sm mb-6">
                  {apiKeys?.binanceApiKey
                    ? "Click refresh to fetch your portfolio from Binance."
                    : "Connect your Binance API keys in Settings to get started."}
                </p>
                {apiKeys?.binanceApiKey ? (
                  <button
                    onClick={fetchPortfolio}
                    className="bg-accent text-amoled font-bold px-6 py-2.5 rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 hover:shadow-glow-accent transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Fetch Portfolio
                  </button>
                ) : (
                  <button
                    onClick={() => (window.location.href = "/settings")}
                    className="bg-text-primary text-amoled font-bold px-6 py-2.5 rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all"
                  >
                    Go to Settings
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {fetchError && !isRefreshing && (
          <div className="bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] rounded-2xl p-6 flex flex-col items-center justify-center text-center mb-6 w-full">
            <WifiOff className="w-8 h-8 text-risk-extreme mb-3" />
            <h3 className="text-risk-extreme font-bold mb-1">Failed to load portfolio</h3>
            <p className="text-[color-mix(in_srgb,var(--color-risk-extreme),transparent_20%)] text-sm mb-4 max-w-md">
              {fetchError}
            </p>
            <button
              onClick={fetchPortfolio}
              className="border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] text-risk-extreme font-bold px-5 py-2 rounded-full flex items-center gap-2 hover:bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {isRefreshing && (
          <div className="grid lg:grid-cols-5 gap-6 w-full">
            <div className="lg:col-span-3 glass-card p-5">
              <Skeleton className="h-6 w-32 mb-6" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
            <div className="lg:col-span-2">
              <SkeletonCard className="h-64" />
            </div>
          </div>
        )}
      </div>
    );
  }

  const p = portfolio;
  const isPositive24h = (p.change24hUSD ?? 0) >= 0;
  const isPositivePnl = (p.totalPnlUSD ?? 0) >= 0;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 w-full animate-in fade-in duration-500">
      {/* PAGE HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-text-primary text-2xl font-bold tracking-tight">Portfolio</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLedgerInput(!showLedgerInput)}
            className="border border-[color-mix(in_srgb,var(--color-agent-ledger),transparent_60%)] text-agent-ledger rounded-full px-4 py-2 text-sm hover:bg-[color-mix(in_srgb,var(--color-agent-ledger),transparent_90%)] transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Ask Ledger
          </button>
          <button
            onClick={fetchPortfolio}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-text-muted text-sm hover:text-text-primary transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ASK LEDGER INPUT */}
      {showLedgerInput && (
        <div className="mb-6 bg-card border border-card-border rounded-2xl p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_ASK_CHIPS.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleQuickAsk(chip)}
                className="bg-amoled border border-card-border rounded-full px-3 py-1 text-xs text-text-secondary hover:border-accent hover:text-accent transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={ledgerQuery}
              onChange={(e) => setLedgerQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskLedger()}
              placeholder="Ask Ledger about your portfolio..."
              className="flex-1 bg-card border border-card-border rounded-[12px] px-4 py-3 text-text-primary placeholder-text-dim outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={handleAskLedger}
              disabled={!ledgerQuery.trim()}
              className="bg-agent-ledger text-amoled font-bold px-4 py-2 rounded-[12px] hover:bg-[color-mix(in_srgb,var(--color-agent-ledger),transparent_10%)] transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Wallet}
          iconColor="var(--color-accent-ledger)"
          label="Total Value"
          value={`$${(p.totalValueUSD ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtext={`${isPositive24h ? "+" : ""}$${(p.change24hUSD ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} today`}
          subtextColor={isPositive24h ? "var(--color-risk-low)" : "var(--color-risk-extreme)"}
          subtextIcon={isPositive24h ? ArrowUpRight : ArrowDownRight}
        />
        <StatCard
          icon={TrendingUp}
          iconColor={isPositivePnl ? "var(--color-risk-low)" : "var(--color-risk-extreme)"}
          label="Total P&L"
          value={`${isPositivePnl ? "+" : ""}$${(p.totalPnlUSD ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtext={`${isPositivePnl ? "+" : ""}${(p.totalPnlPercent ?? 0).toFixed(2)}% all time`}
          subtextColor={isPositivePnl ? "var(--color-risk-low)" : "var(--color-risk-extreme)"}
          subtextIcon={isPositivePnl ? ArrowUpRight : ArrowDownRight}
        />
        <StatCard
          icon={Shield}
          iconColor="var(--color-risk-moderate)"
          label="Risk Score"
          value={`${p.riskScore} / 10`}
          subtext={p.riskScore <= 3 ? "Low Risk" : p.riskScore <= 6 ? "Moderate Risk" : "High Risk"}
          subtextColor={
            p.riskScore <= 3
              ? "var(--color-risk-low)"
              : p.riskScore <= 6
                ? "var(--color-risk-moderate)"
                : "var(--color-risk-extreme)"
          }
        />
        <StatCard
          icon={BarChart2}
          iconColor="var(--color-accent-shadow)"
          label="24h Change"
          value={`${isPositive24h ? "+" : ""}${(p.change24hPercent ?? 0).toFixed(2)}%`}
          subtext={`${isPositive24h ? "+" : ""}$${(p.change24hUSD ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtextColor={isPositive24h ? "var(--color-risk-low)" : "var(--color-risk-extreme)"}
          subtextIcon={isPositive24h ? ArrowUpRight : ArrowDownRight}
        />
      </div>

      {/* INTELLIGENCE BANNER — Ledger's Insight */}
      <div className="mb-6 group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--color-agent-ledger),transparent_95%)] via-[color-mix(in_srgb,var(--color-agent-ledger),transparent_92%)] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
        <div className="relative glass-card border-[color-mix(in_srgb,var(--color-agent-ledger),transparent_80%)] p-5 flex items-center gap-5 shadow-[0_8px_32px_color-mix(in_srgb,var(--color-agent-ledger),transparent_95%)]">
          <div className="w-12 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--color-agent-ledger),transparent_90%)] flex items-center justify-center shrink-0 shadow-glow-ledger border border-[color-mix(in_srgb,var(--color-agent-ledger),transparent_80%)]">
            <Crown className="w-6 h-6 text-agent-ledger animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-agent-ledger text-xs font-bold uppercase tracking-wider">
                Intelligence Briefing
              </span>
              <div className="h-1 w-1 rounded-full bg-agent-ledger animate-pulse" />
              <span className="text-text-muted text-[10px] uppercase font-medium">
                Arbiter-Verified
              </span>
            </div>
            <h3 className="text-text-primary font-bold text-lg mb-1 leading-tight">
              Ledger&apos;s Insight
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed max-w-3xl">
              {p.assets.length > 0
                ? `Your portfolio is ${p.assets
                    .slice(0, 2)
                    .reduce((s, a) => s + a.allocation, 0)
                    .toFixed(
                      1,
                    )}% concentrated in two assets (${p.assets[0]?.symbol} + ${p.assets[1]?.symbol}). LEDGER recommends diversifying into 2-3 uncorrelated assets.`
                : "No holdings detected. Start by depositing assets to your Binance account."}
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
            <div className="text-[10px] text-text-muted uppercase font-bold">Confidence Score</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full ${i <= 4 ? "bg-agent-ledger" : "bg-card-border"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN — Holdings Table */}
        <div className="lg:col-span-3">
          <HoldingsTable assets={p.assets} />
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Allocation Chart */}
          <AllocationChart assets={p.assets} />
        </div>
      </div>

      {/* DCA PLANNER CARD */}
      <div className="glass-card p-5 mt-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-semibold">DCA Strategist</span>
            <Zap className="w-4 h-4 text-agent-ledger" />
          </div>
          <button
            onClick={() => setShowDcaForm(!showDcaForm)}
            className="bg-text-primary text-amoled px-4 py-2 rounded-full text-sm font-bold hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all whitespace-nowrap"
          >
            {showDcaForm ? "Cancel" : "Generate DCA Plan"}
          </button>
        </div>

        {/* DCA Form */}
        {showDcaForm && (
          <div className="bg-card border border-card-border rounded-2xl p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-text-muted text-xs mb-1">Target Asset</label>
                <input
                  type="text"
                  value={dcaAsset}
                  onChange={(e) => setDcaAsset(e.target.value)}
                  placeholder="BTC, ETH, SOL..."
                  className="w-full bg-amoled border border-card-border rounded-lg px-3 py-2 text-text-primary outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-text-muted text-xs mb-1">Total Budget (USD)</label>
                <input
                  type="number"
                  value={dcaBudget}
                  onChange={(e) => setDcaBudget(Number(e.target.value))}
                  className="w-full bg-amoled border border-card-border rounded-lg px-3 py-2 text-text-primary outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-text-muted text-xs mb-1">Duration (weeks)</label>
                <input
                  type="number"
                  value={dcaDuration}
                  onChange={(e) => setDcaDuration(Number(e.target.value))}
                  className="w-full bg-amoled border border-card-border rounded-lg px-3 py-2 text-text-primary outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-text-muted text-xs mb-1">
                  Risk Tolerance: {dcaRisk}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={dcaRisk}
                  onChange={(e) => setDcaRisk(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            </div>
            <button
              onClick={handleGenerateDca}
              disabled={dcaLoading || !dcaAsset.trim()}
              className="w-full bg-agent-ledger text-amoled font-bold py-2 rounded-lg hover:bg-[color-mix(in_srgb,var(--color-agent-ledger),transparent_10%)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {dcaLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {dcaLoading ? "Generating..." : "Generate Plan"}
            </button>
            {dcaError && <p className="text-risk-extreme text-sm mt-2">{dcaError}</p>}
          </div>
        )}

        {/* DCA Results */}
        {dcaResult && (
          <div className="space-y-4">
            {/* Schedule Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border">
                    <th className="text-left text-text-muted py-2 px-3">Week</th>
                    <th className="text-left text-text-muted py-2 px-3">Date</th>
                    <th className="text-left text-text-muted py-2 px-3">Amount (USD)</th>
                    <th className="text-left text-text-muted py-2 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    (dcaResult.schedule as Array<{
                      weekNumber: number;
                      scheduledDate: string;
                      adjustedAmountUSD: number;
                      triggerNote?: string;
                    }>) || []
                  ).map(
                    (
                      item: {
                        weekNumber: number;
                        scheduledDate: string;
                        adjustedAmountUSD: number;
                        triggerNote?: string;
                      },
                      i: number,
                    ) => (
                      <tr
                        key={i}
                        className="border-b border-[color-mix(in_srgb,var(--color-card-border),transparent_50%)]"
                      >
                        <td className="py-2 px-3 text-text-primary">{item.weekNumber}</td>
                        <td className="py-2 px-3 text-text-secondary">{item.scheduledDate}</td>
                        <td className="py-2 px-3 text-accent font-medium">
                          ${item.adjustedAmountUSD.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-text-muted text-xs">
                          {item.triggerNote || "-"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {/* Scenario Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {(["bull", "bear", "crab"] as const).map((scenario) => {
                const scenarioData =
                  (dcaResult.scenarios as Record<
                    string,
                    {
                      avgCostBasis: number;
                      projectedValue: number;
                      returnPercent: number;
                    }
                  >) || {};
                const data = scenarioData[scenario];
                return (
                  <div
                    key={scenario}
                    className={`p-3 rounded-xl border ${
                      scenario === "bull"
                        ? "border-[color-mix(in_srgb,var(--color-risk-low),transparent_70%)] bg-[color-mix(in_srgb,var(--color-risk-low),transparent_95%)]"
                        : scenario === "bear"
                          ? "border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_70%)] bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_95%)]"
                          : "border-[color-mix(in_srgb,var(--color-risk-moderate),transparent_70%)] bg-[color-mix(in_srgb,var(--color-risk-moderate),transparent_95%)]"
                    }`}
                  >
                    <div
                      className={`text-xs font-bold mb-1 ${
                        scenario === "bull"
                          ? "text-risk-low"
                          : scenario === "bear"
                            ? "text-risk-extreme"
                            : "text-risk-moderate"
                      }`}
                    >
                      {scenario === "bull"
                        ? "🟢 Bull"
                        : scenario === "bear"
                          ? "🔴 Bear"
                          : "🟡 Crab"}
                    </div>
                    <div className="text-text-primary font-semibold text-sm sm:text-base">
                      ${data?.projectedValue?.toFixed(2) || "0.00"}
                    </div>
                    <div className="text-text-muted text-[10px] sm:text-xs">
                      Avg cost: ${data?.avgCostBasis?.toFixed(2) || "0.00"}
                    </div>
                    <div
                      className={`text-xs ${(data?.returnPercent || 0) >= 0 ? "text-risk-low" : "text-risk-extreme"}`}
                    >
                      {(data?.returnPercent || 0) >= 0 ? "+" : ""}
                      {data?.returnPercent?.toFixed(1) || "0.0"}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Share to Council */}
            <button
              onClick={handleShareToCouncil}
              className="w-full border border-[color-mix(in_srgb,var(--color-accent),transparent_70%)] text-accent font-medium py-2 rounded-lg hover:bg-[color-mix(in_srgb,var(--color-accent),transparent_90%)] transition-all"
            >
              Share to Council for Review →
            </button>
          </div>
        )}
      </div>

      {/* ── TRADE JOURNAL ───────────────────────────────────────────── */}
      <div className="mt-6">
        <TradeJournal />
      </div>

      {/* ── DCA SCHEDULER ───────────────────────────────────────────── */}
      <div className="mt-6">
        <DCAScheduler />
      </div>

      {/* ── PRICE ALERTS ───────────────────────────────────────────── */}
      <div className="mt-6">
        <PriceAlertsPanel />
      </div>
    </div>
  );
}
