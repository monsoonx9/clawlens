"use client";

import { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getSkill } from "@/skills";
import { clsx } from "clsx";

interface TechnicalData {
  symbol: string;
  price: number;
  sma: Array<{ period: number; value: number }>;
  ema: Array<{ period: number; value: number }>;
  macd: { macd: number; signal: number; histogram: number };
  rsi: { period: number; value: number; overbought: boolean; oversold: boolean };
  bollingerBands: {
    period: number;
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    b: number;
  };
}

interface FuturesData {
  symbol: string;
  fundingRate: number;
  nextFundingTime: string;
  openInterest: string;
  volume24h: string;
  priceChange: string;
  longShortRatio: number;
}

interface WhaleAlert {
  walletAddress: string;
  walletNickname: string;
  alertType: "NEW_POSITION" | "EXIT" | "INCREASE" | "DECREASE";
  token: string;
  contractAddress: string;
  chain: string;
  currentValueUSD: number;
  timestamp: Date;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

function formatUSD(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  if (Math.abs(num) >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatPercent(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

export default function AnalyticsPage() {
  const prefersReduced = useReducedMotion();
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [loading, setLoading] = useState({ technical: true, futures: true, whales: true });
  const [error, setError] = useState({ technical: "", futures: "", whales: "" });
  const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
  const [futuresData, setFuturesData] = useState<FuturesData[]>([]);
  const [whaleAlerts, setWhaleAlerts] = useState<WhaleAlert[]>([]);
  const [activeTab, setActiveTab] = useState<"charts" | "futures" | "whales">("charts");

  const fetchTechnicalData = async () => {
    setLoading((prev) => ({ ...prev, technical: true }));
    setError((prev) => ({ ...prev, technical: "" }));
    try {
      const skill = getSkill("binance/technical-indicators");
      if (!skill) {
        setError((prev) => ({ ...prev, technical: "Technical indicators skill not found" }));
        return;
      }
      const result = await skill.execute(
        {
          symbol,
          interval: "1h",
          limit: 100,
          indicators: ["sma", "ema", "macd", "rsi", "bollinger"],
        },
        { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
      );
      if (result.success && result.data) {
        setTechnicalData(result.data as unknown as TechnicalData);
      } else {
        setError((prev) => ({ ...prev, technical: result.error || "Failed to fetch data" }));
      }
    } catch (err) {
      setError((prev) => ({ ...prev, technical: "Failed to fetch technical data" }));
    } finally {
      setLoading((prev) => ({ ...prev, technical: false }));
    }
  };

  const fetchFuturesData = async () => {
    setLoading((prev) => ({ ...prev, futures: true }));
    setError((prev) => ({ ...prev, futures: "" }));
    try {
      const skill = getSkill("binance/futures-data");
      if (!skill) {
        setError((prev) => ({ ...prev, futures: "Futures data skill not found" }));
        return;
      }
      const result = await skill.execute(
        {
          symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"],
          includeFunding: true,
          includeOI: true,
        },
        { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
      );
      if (result.success && result.data) {
        const data = result.data as { futures: FuturesData[] };
        setFuturesData(data.futures || []);
      } else {
        setError((prev) => ({ ...prev, futures: result.error || "Failed to fetch futures data" }));
      }
    } catch (err) {
      setError((prev) => ({ ...prev, futures: "Failed to fetch futures data" }));
    } finally {
      setLoading((prev) => ({ ...prev, futures: false }));
    }
  };

  const fetchWhaleAlerts = async () => {
    setLoading((prev) => ({ ...prev, whales: true }));
    setError((prev) => ({ ...prev, whales: "" }));
    try {
      const skill = getSkill("claw-council/whale-radar");
      if (!skill) {
        setError((prev) => ({ ...prev, whales: "Whale radar skill not found" }));
        return;
      }
      const result = await skill.execute(
        { walletSnapshots: [], sensitivityThreshold: 10 },
        {
          apiKeys: { binanceApiKey: "", binanceSecretKey: "" },
          preferences: {
            riskTolerance: 5,
            defaultInvestmentSize: 100,
            maxPerTrade: 500,
            maxPerToken: 1000,
            enabledAgents: [],
            watchlist: [],
            whaleWallets: [],
          },
        },
      );
      if (result.success && result.data) {
        const data = result.data as { alerts: WhaleAlert[] };
        setWhaleAlerts(data.alerts || []);
      } else {
        setError((prev) => ({ ...prev, whales: result.error || "Failed to fetch whale alerts" }));
      }
    } catch (err) {
      setError((prev) => ({ ...prev, whales: "Failed to fetch whale alerts" }));
    } finally {
      setLoading((prev) => ({ ...prev, whales: false }));
    }
  };

  useEffect(() => {
    fetchFuturesData();
    fetchWhaleAlerts();
  }, []);

  useEffect(() => {
    if (activeTab === "charts") {
      fetchTechnicalData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, activeTab]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: prefersReduced
        ? { duration: 0 }
        : { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  const popularSymbols = [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "XRPUSDT",
    "ADAUSDT",
    "DOGEUSDT",
    "AVAXUSDT",
  ];

  const renderTechnicalChart = () => {
    if (loading.technical) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      );
    }

    if (error.technical) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <AlertCircle className="w-10 h-10 text-risk-extreme mb-3" />
          <p className="text-text-secondary">{error.technical}</p>
        </div>
      );
    }

    if (!technicalData) return null;

    const priceData = Array.from({ length: 50 }, (_, i) => ({
      time: `${50 - i}h`,
      price: technicalData.price * (1 + (Math.random() - 0.5) * 0.02),
      sma20: technicalData.sma.find((s) => s.period === 20)?.value || technicalData.price,
      upper: technicalData.bollingerBands.upper,
      lower: technicalData.bollingerBands.lower,
    }));

    return (
      <div className="space-y-6">
        {/* Price Chart */}
        <div className="glass-card p-4">
          <h3 className="text-text-primary font-bold text-lg mb-4">Price & Bollinger Bands</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
                <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-card-border)",
                    borderRadius: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="sma20"
                  stroke="#3b82f6"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="upper"
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="lower"
                  stroke="#22c55e"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Indicators Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* RSI */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-muted text-sm">RSI (14)</span>
              <span
                className={clsx(
                  "text-xs font-bold px-2 py-1 rounded-full",
                  technicalData.rsi.value > 70
                    ? "bg-risk-extreme/20 text-risk-extreme"
                    : technicalData.rsi.value < 30
                      ? "bg-risk-low/20 text-risk-low"
                      : "bg-accent-secondary/20 text-accent-secondary",
                )}
              >
                {technicalData.rsi.overbought
                  ? "Overbought"
                  : technicalData.rsi.oversold
                    ? "Oversold"
                    : "Neutral"}
              </span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {technicalData.rsi.value.toFixed(1)}
            </div>
            <div className="h-2 bg-card-border rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-risk-low via-risk-moderate to-risk-extreme"
                style={{ width: `${technicalData.rsi.value}%` }}
              />
            </div>
          </div>

          {/* MACD */}
          <div className="glass-card p-4">
            <span className="text-text-muted text-sm block mb-2">MACD</span>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-text-secondary text-xs">MACD</span>
                <span className="text-text-primary text-sm font-mono">
                  {technicalData.macd.macd.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-xs">Signal</span>
                <span className="text-text-primary text-sm font-mono">
                  {technicalData.macd.signal.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-xs">Histogram</span>
                <span
                  className={clsx(
                    "text-sm font-mono",
                    technicalData.macd.histogram >= 0 ? "text-risk-low" : "text-risk-extreme",
                  )}
                >
                  {technicalData.macd.histogram >= 0 ? "+" : ""}
                  {technicalData.macd.histogram.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {/* Bollinger Bands */}
          <div className="glass-card p-4">
            <span className="text-text-muted text-sm block mb-2">Bollinger Bands</span>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-text-secondary text-xs">Upper</span>
                <span className="text-risk-extreme text-sm font-mono">
                  {formatUSD(technicalData.bollingerBands.upper)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-xs">Middle</span>
                <span className="text-text-primary text-sm font-mono">
                  {formatUSD(technicalData.bollingerBands.middle)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-xs">Lower</span>
                <span className="text-risk-low text-sm font-mono">
                  {formatUSD(technicalData.bollingerBands.lower)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-xs">Bandwidth</span>
                <span className="text-text-primary text-sm font-mono">
                  {technicalData.bollingerBands.bandwidth.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="glass-card p-4">
            <span className="text-text-muted text-sm block mb-2">Current Price</span>
            <div className="text-2xl font-bold text-text-primary">
              {formatUSD(technicalData.price)}
            </div>
            <div className="flex gap-2 mt-2">
              {technicalData.ema.slice(0, 2).map((e) => (
                <div key={e.period} className="text-xs">
                  <span className="text-text-muted">EMA{e.period}:</span>{" "}
                  <span className="text-text-secondary">{formatUSD(e.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFuturesTable = () => {
    if (loading.futures) {
      return (
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      );
    }

    if (error.futures) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-10 h-10 text-risk-extreme mb-3" />
          <p className="text-text-secondary">{error.futures}</p>
        </div>
      );
    }

    if (futuresData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 className="w-12 h-12 text-text-muted mb-3" />
          <h3 className="text-text-primary font-semibold mb-1">No futures data</h3>
          <p className="text-text-secondary text-sm">Connect your API to see futures data</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left text-text-muted text-xs font-semibold uppercase tracking-wider p-4">
                Pair
              </th>
              <th className="text-right text-text-muted text-xs font-semibold uppercase tracking-wider p-4">
                Price
              </th>
              <th className="text-right text-text-muted text-xs font-semibold uppercase tracking-wider p-4">
                24h Change
              </th>
              <th className="text-right text-text-muted text-xs font-semibold uppercase tracking-wider p-4">
                Funding Rate
              </th>
              <th className="text-right text-text-muted text-xs font-semibold uppercase tracking-wider p-4">
                Open Interest
              </th>
              <th className="text-right text-text-muted text-xs font-semibold uppercase tracking-wider p-4">
                Long/Short
              </th>
            </tr>
          </thead>
          <tbody>
            {futuresData.map((future, idx) => (
              <motion.tr
                key={future.symbol}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border-b border-card-border hover:bg-card-hover/50 transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-accent" />
                    </div>
                    <span className="text-text-primary font-semibold">
                      {future.symbol.replace("USDT", "")}
                    </span>
                    <span className="text-text-muted text-sm">USDT</span>
                  </div>
                </td>
                <td className="p-4 text-right text-text-primary font-mono">
                  {formatUSD(future.priceChange)}
                </td>
                <td className="p-4 text-right">
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 text-sm font-mono",
                      parseFloat(future.priceChange) >= 0 ? "text-risk-low" : "text-risk-extreme",
                    )}
                  >
                    {parseFloat(future.priceChange) >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {formatPercent(future.priceChange)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span
                    className={clsx(
                      "text-sm font-mono px-2 py-1 rounded-full",
                      parseFloat(String(future.fundingRate)) > 0
                        ? "bg-risk-extreme/20 text-risk-extreme"
                        : "bg-risk-low/20 text-risk-low",
                    )}
                  >
                    {formatPercent(future.fundingRate)}
                  </span>
                </td>
                <td className="p-4 text-right text-text-primary font-mono text-sm">
                  {formatNumber(future.openInterest)}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-card-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-risk-low"
                        style={{
                          width: `${(future.longShortRatio / (future.longShortRatio + 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-text-secondary text-sm font-mono">
                      {future.longShortRatio.toFixed(2)}
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderWhaleAlerts = () => {
    if (loading.whales) {
      return (
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      );
    }

    if (error.whales) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-10 h-10 text-risk-extreme mb-3" />
          <p className="text-text-secondary">{error.whales}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {whaleAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Activity className="w-12 h-12 text-text-muted mb-3" />
            <h3 className="text-text-primary font-semibold mb-1">No whale alerts</h3>
            <p className="text-text-secondary text-sm">
              Add whale wallets to track their movements
            </p>
          </div>
        ) : (
          whaleAlerts.map((alert, idx) => (
            <motion.div
              key={`${alert.walletAddress}-${idx}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    alert.severity === "HIGH"
                      ? "bg-risk-extreme/20"
                      : alert.severity === "MEDIUM"
                        ? "bg-risk-moderate/20"
                        : "bg-risk-low/20",
                  )}
                >
                  {alert.alertType === "NEW_POSITION" ? (
                    <TrendingUp className="w-5 h-5 text-risk-low" />
                  ) : alert.alertType === "EXIT" ? (
                    <TrendingDown className="w-5 h-5 text-risk-extreme" />
                  ) : alert.alertType === "INCREASE" ? (
                    <ArrowUpRight className="w-5 h-5 text-risk-moderate" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-risk-extreme" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary font-semibold">{alert.token}</span>
                    <span
                      className={clsx(
                        "text-xs px-2 py-0.5 rounded-full",
                        alert.severity === "HIGH"
                          ? "bg-risk-extreme/20 text-risk-extreme"
                          : alert.severity === "MEDIUM"
                            ? "bg-risk-moderate/20 text-risk-moderate"
                            : "bg-risk-low/20 text-risk-low",
                      )}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-text-muted text-sm">
                    {alert.walletNickname ||
                      `${alert.walletAddress.slice(0, 6)}...${alert.walletAddress.slice(-4)}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-text-primary font-semibold">
                  {formatUSD(alert.currentValueUSD)}
                </div>
                <p className="text-text-muted text-xs">{alert.chain}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    );
  };

  return (
    <motion.div
      className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-widest mb-3">
          <BarChart3 className="w-4 h-4" />
          Advanced Analytics
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-2">
          Trading Analytics
        </h1>
        <p className="text-text-secondary max-w-lg">
          Professional-grade technical analysis, futures data, and whale tracking in one place.
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: "charts", label: "Technical Charts", icon: Activity },
          { id: "futures", label: "Futures Data", icon: BarChart3 },
          { id: "whales", label: "Whale Alerts", icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-accent text-amoled"
                : "glass text-text-secondary hover:text-text-primary",
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Symbol Selector (for charts) */}
      {activeTab === "charts" && (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-6">
          {popularSymbols.map((sym) => (
            <button
              key={sym}
              onClick={() => setSymbol(sym)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                symbol === sym
                  ? "bg-agent-lens text-white"
                  : "glass text-text-secondary hover:text-text-primary",
              )}
            >
              {sym.replace("USDT", "")}
            </button>
          ))}
          <button
            onClick={fetchTechnicalData}
            className="p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Content */}
      <motion.div variants={itemVariants}>
        {activeTab === "charts" && renderTechnicalChart()}
        {activeTab === "futures" && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-primary font-bold text-lg">Futures Overview</h3>
              <button
                onClick={fetchFuturesData}
                className="p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {renderFuturesTable()}
          </div>
        )}
        {activeTab === "whales" && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-primary font-bold text-lg">Whale Alerts</h3>
              <button
                onClick={fetchWhaleAlerts}
                className="p-2 glass rounded-full text-text-secondary hover:text-text-primary transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {renderWhaleAlerts()}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
