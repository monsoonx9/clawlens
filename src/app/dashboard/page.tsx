"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import { AGENTS } from "@/lib/constants";
import { getSkill } from "@/skills";
import type { SkillContext } from "@/skills";
import type { PortfolioAsset } from "@/types";
import { StatCard } from "@/components/portfolio/StatCard";
import { WatchlistWidget } from "@/components/dashboard/WatchlistWidget";
import { WhaleTrackerWidget } from "@/components/dashboard/WhaleTrackerWidget";
import { TrendingTokensWidget } from "@/components/dashboard/TrendingTokensWidget";
import { SmartMoneySignalsWidget } from "@/components/dashboard/SmartMoneySignalsWidget";
import { MemeRushWidget } from "@/components/dashboard/MemeRushWidget";
import { FearIndexGauge } from "@/components/dashboard/FearIndexGauge";
import { MarketMoversWidget } from "@/components/dashboard/MarketMoversWidget";
import { VolumePressureWidget } from "@/components/dashboard/VolumePressureWidget";
import { FuturesOverviewWidget } from "@/components/dashboard/FuturesOverviewWidget";
import { AddWatchlistModal } from "@/components/dashboard/AddWatchlistModal";
import { AddWhaleModal } from "@/components/dashboard/AddWhaleModal";
import { motion, Variants } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  Zap,
  Wallet,
  Shield,
  Users,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  PieChart,
  BarChart3,
  LayoutDashboard,
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  LOW: { label: "Low", color: "var(--color-risk-low)" },
  MODERATE: { label: "Moderate", color: "var(--color-risk-moderate)" },
  HIGH: { label: "High", color: "var(--color-risk-high)" },
  EXTREME: { label: "Extreme", color: "var(--color-risk-extreme)" },
};

export default function DashboardPage() {
  const { apiKeys, portfolio, preferences, sessions, setPortfolio } = useAppStore();
  const prefersReduced = useReducedMotion();
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [whaleOpen, setWhaleOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: prefersReduced ? { duration: 0 } : { staggerChildren: 0.08 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: prefersReduced
        ? { duration: 0 }
        : { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  // Auto-fetch portfolio on mount
  const fetchPortfolio = useCallback(async () => {
    if (!apiKeys?.binanceApiKey || !apiKeys?.binanceSecretKey) return;
    setIsFetching(true);
    try {
      const skill = getSkill("claw-council/portfolio-pulse");
      if (!skill) return;

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
        setPortfolio({
          totalValueUSD: (raw.totalValueUSD as number) ?? 0,
          totalPnlUSD: (raw.totalPnlUSD as number) ?? (raw.totalUnrealizedPnLUSD as number) ?? 0,
          totalPnlPercent:
            (raw.totalPnlPercent as number) ?? (raw.totalUnrealizedPnLPercent as number) ?? 0,
          change24hUSD: (raw.change24hUSD as number) ?? 0,
          change24hPercent: (raw.change24hPercent as number) ?? 0,
          riskScore: (raw.riskScore as number) ?? 0,
          assets: (raw.assets as PortfolioAsset[]) ?? [],
          lastUpdated: raw.lastUpdated ? new Date(raw.lastUpdated as string) : new Date(),
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load portfolio";
      console.warn("Dashboard portfolio fetch failed:", errorMessage);
      setPortfolioError(errorMessage);
    } finally {
      setIsFetching(false);
    }
  }, [apiKeys, preferences, setPortfolio]);

  useEffect(() => {
    if (apiKeys?.binanceApiKey && !portfolio) {
      fetchPortfolio();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enabledAgentCount = useMemo(
    () => preferences?.enabledAgents?.length || 0,
    [preferences?.enabledAgents],
  );

  const totalAgentCount = useMemo(
    () => Object.keys(AGENTS).filter((k) => k !== "THE_ARBITER").length,
    [],
  );

  const recentSessions = useMemo(() => (sessions || []).slice(-3).reverse(), [sessions]);

  const providerName = useMemo(
    () =>
      apiKeys?.llmProvider
        ? apiKeys.llmProvider.charAt(0).toUpperCase() + apiKeys.llmProvider.slice(1)
        : "AI",
    [apiKeys?.llmProvider],
  );

  const riskScore = useMemo(() => portfolio?.riskScore ?? 0, [portfolio?.riskScore]);

  const riskLabel = useMemo(
    () =>
      riskScore <= 3 ? "LOW" : riskScore <= 6 ? "MODERATE" : riskScore <= 8 ? "HIGH" : "EXTREME",
    [riskScore],
  );

  const riskMeta = useMemo(() => RISK_LABELS[riskLabel], [riskLabel]);

  return (
    <motion.div
      className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full animate-in fade-in duration-500"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── ROW 1: Welcome Hero ────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden glass-card p-8 sm:p-10 mb-6"
      >
        {/* Decorative glow */}
        <div
          className="absolute top-0 right-0 w-[300px] h-[300px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--color-accent), transparent 94%) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-widest mb-3">
            <LayoutDashboard className="w-4 h-4" />
            Command Center
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-2">
            {getGreeting()}, Operator
          </h1>
          <p className="text-text-secondary text-base max-w-lg mb-6">
            Your council of {enabledAgentCount} AI agents is standing by, powered by{" "}
            <span className="text-text-primary font-medium">{providerName}</span>. What would you
            like to investigate?
          </p>
          <Link
            href="/council"
            className="inline-flex items-center gap-2 bg-text-primary text-amoled font-bold px-6 py-3 rounded-full text-sm hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all group"
          >
            <Zap className="w-4 h-4" />
            Start New Council
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </motion.div>

      {/* ── ROW 2: Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={itemVariants}>
          <StatCard
            isLoading={isFetching && !portfolio}
            icon={Wallet}
            iconColor="var(--color-risk-low)"
            label="Portfolio Value"
            value={portfolio ? formatUSD(portfolio.totalValueUSD) : "—"}
            subtext={
              portfolioError
                ? "Connection failed"
                : portfolio
                  ? `${portfolio.change24hPercent >= 0 ? "+" : ""}${portfolio.change24hPercent.toFixed(2)}% today`
                  : "Not connected"
            }
            subtextColor={
              portfolioError
                ? "var(--color-risk-extreme)"
                : portfolio
                  ? portfolio.change24hPercent >= 0
                    ? "var(--color-risk-low)"
                    : "var(--color-risk-extreme)"
                  : "var(--color-text-muted)"
            }
            subtextIcon={
              portfolioError
                ? undefined
                : portfolio
                  ? portfolio.change24hPercent >= 0
                    ? ArrowUpRight
                    : ArrowDownRight
                  : undefined
            }
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            isLoading={isFetching && !portfolio}
            icon={Shield}
            iconColor={riskMeta.color}
            label="Risk Score"
            value={portfolio ? `${riskScore}/10` : "—"}
            subtext={portfolio ? riskMeta.label : "No data"}
            subtextColor={riskMeta.color}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            icon={Users}
            iconColor="var(--color-accent-shadow)"
            label="Active Agents"
            value={`${enabledAgentCount}/${totalAgentCount}`}
            subtext="Council members"
            subtextColor="var(--color-accent-shadow)"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            icon={Clock}
            iconColor="var(--color-accent-ledger)"
            label="Sessions"
            value={`${sessions?.length || 0}`}
            subtext={sessions?.length ? "Total queries" : "No sessions yet"}
            subtextColor="var(--color-accent-ledger)"
          />
        </motion.div>
      </div>

      {/* ── ROW 3: Recent Sessions + Quick Actions ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Recent Sessions */}
        <motion.div variants={itemVariants} className="glass-card p-5 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-text-primary font-bold text-lg tracking-tight">Recent Sessions</h2>
            <Link
              href="/history"
              className="text-accent text-xs font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="w-14 h-14 bg-card border border-card-border text-text-muted rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-text-primary font-semibold mb-1">No sessions yet</h3>
              <p className="text-text-secondary text-sm max-w-[220px] mx-auto">
                Ask the Council your first question to see results here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => {
                const riskLevel = session.verdict?.riskLevel || "LOW";
                const riskInfo = RISK_LABELS[riskLevel] || RISK_LABELS.LOW;
                return (
                  <Link
                    key={session.id}
                    href={`/history/${session.id}`}
                    className="block bg-card border border-card-border rounded-xl p-4 hover:bg-card hover:border-card-border-hover transition-all group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate group-hover:text-text-primary transition-colors">
                          {session.query}
                        </p>
                        <p className="text-text-muted text-xs mt-1">
                          {session.agentResponses.length} agents responded •{" "}
                          {timeAgo(session.timestamp)}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${riskInfo.color}, transparent 85%)`,
                          color: riskInfo.color,
                          border: `1px solid color-mix(in srgb, ${riskInfo.color}, transparent 70%)`,
                        }}
                      >
                        {riskInfo.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="glass-card p-5">
          <h2 className="text-text-primary font-bold text-lg tracking-tight mb-5">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: Zap,
                label: "Ask the Council",
                desc: "Start a new AI debate",
                href: "/council",
                color: "var(--color-risk-moderate)",
              },
              {
                icon: PieChart,
                label: "Portfolio",
                desc: "View your holdings",
                href: "/portfolio",
                color: "var(--color-risk-low)",
              },
              {
                icon: Clock,
                label: "History",
                desc: "Past council sessions",
                href: "/history",
                color: "var(--color-accent-ledger)",
              },
              {
                icon: BarChart3,
                label: "Analytics",
                desc: "Advanced trading tools",
                href: "/analytics",
                color: "var(--color-accent-shadow)",
              },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group bg-card border border-card-border rounded-xl p-4 hover:bg-card hover:border-card-border-hover transition-all flex flex-col gap-3"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${action.color}, transparent 85%)`,
                  }}
                >
                  <action.icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <div>
                  <div className="text-text-primary text-sm font-semibold group-hover:text-text-primary transition-colors">
                    {action.label}
                  </div>
                  <div className="text-text-muted text-xs">{action.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── ROW 4: Fear Index & Market Movers ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <motion.div variants={itemVariants}>
          <FearIndexGauge />
        </motion.div>
        <motion.div variants={itemVariants}>
          <MarketMoversWidget />
        </motion.div>
        <motion.div variants={itemVariants}>
          <VolumePressureWidget />
        </motion.div>
      </div>

      {/* ── ROW 5: Existing Widgets ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <motion.div variants={itemVariants}>
          <TrendingTokensWidget />
        </motion.div>
        <motion.div variants={itemVariants}>
          <SmartMoneySignalsWidget />
        </motion.div>
        <motion.div variants={itemVariants}>
          <MemeRushWidget />
        </motion.div>
      </div>

      {/* ── ROW 6: Futures & Portfolio Widgets ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div variants={itemVariants}>
          <FuturesOverviewWidget />
        </motion.div>
        <motion.div variants={itemVariants}>
          <WatchlistWidget onAddClick={() => setWatchlistOpen(true)} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <WhaleTrackerWidget onAddClick={() => setWhaleOpen(true)} />
        </motion.div>
      </div>

      {/* Modals */}
      <AddWatchlistModal isOpen={watchlistOpen} onClose={() => setWatchlistOpen(false)} />
      <AddWhaleModal isOpen={whaleOpen} onClose={() => setWhaleOpen(false)} />
    </motion.div>
  );
}
