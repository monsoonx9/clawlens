"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { getSkill } from "@/skills";
import { Select } from "@/components/ui/Select";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  Search,
  Rocket,
  Anchor,
  Loader2,
  ExternalLink,
  RefreshCw,
  Filter,
  X,
  TrendingUp,
  TrendingDown,
  Shield,
  Wallet,
  BarChart3,
} from "lucide-react";

import { TokenSearchModal } from "@/components/web3/TokenSearchModal";
import { TokenAuditModal } from "@/components/web3/TokenAuditModal";
import { AddressLookupModal } from "@/components/web3/AddressLookupModal";
import { TechnicalChart } from "@/components/web3/TechnicalChart";
import { OrderBookDepth } from "@/components/web3/OrderBookDepth";
import { RugRiskScore } from "@/components/web3/RugRiskScore";

interface Web3Token {
  symbol: string;
  name: string;
  chainId: string;
  contractAddress: string;
  price: string;
  marketCap: string;
  volume24h: string;
  percentChange24h: string;
  icon?: string;
}

interface SmartMoneySignal {
  id: number;
  ticker: string;
  contractAddress: string;
  chainId: string;
  direction: "buy" | "sell";
  status: "active" | "timeout" | "completed";
  smartMoneyCount: number;
  totalValueUSD: string;
  maxGain: string;
  platform: string;
}

interface MemeToken {
  symbol: string;
  name: string;
  chainId: string;
  contractAddress: string;
  price: string;
  priceChange: string;
  marketCap: string;
  volume: string;
  holders: number;
  progress: string;
  isExclusive: boolean;
  icon?: string;
  security: {
    isPumpfun: boolean;
  };
}

interface PaginationData {
  tokens: Web3Token[];
  total: number;
  page: number;
  pageSize: number;
}

interface Filters {
  sortBy: "volume" | "marketCap" | "price" | "change";
  sortOrder: "asc" | "desc";
  priceChangeFilter: "all" | "gainers" | "losers";
  minMarketCap: string;
  maxMarketCap: string;
  minVolume: string;
  maxVolume: string;
}

function formatUSD(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(4)}`;
}

function formatPercent(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

function getTradingUrl(token: { contractAddress: string; chainId?: string }): string {
  const chainId = token.chainId || "56";
  const chainPath =
    chainId === "CT_501" ? "sol" : chainId === "8453" ? "base" : chainId === "1" ? "eth" : "bsc";
  return `https://web3.binance.com/en/token/${chainPath}/${token.contractAddress}`;
}

function getChainName(chainId?: string): string {
  const id = chainId || "56";
  if (id === "CT_501") return "solana";
  if (id === "8453") return "base";
  if (id === "1") return "ethereum";
  return "bsc";
}

function getTokenIcon(icon?: string): string {
  if (!icon) return "";
  if (icon.startsWith("http")) return icon;
  if (icon.startsWith("/")) return `https://bin.bnbstatic.com${icon}`;
  return `https://bin.bnbstatic.com${icon}`;
}

const CHAIN_OPTIONS = [
  { id: "solana", label: "Solana", chainId: "CT_501" },
  { id: "bsc", label: "BSC", chainId: "56" },
  { id: "base", label: "Base", chainId: "8453" },
  { id: "ethereum", label: "Ethereum", chainId: "1" },
];

const SORT_OPTIONS = [
  { value: "volume", label: "Volume" },
  { value: "marketCap", label: "Market Cap" },
  { value: "price", label: "Price" },
  { value: "change", label: "24h Change" },
];

export default function Web3Page() {
  const prefersReduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState<"discover" | "signals" | "memes" | "analysis">(
    "discover",
  );
  const [activeChain, setActiveChain] = useState<"bsc" | "solana" | "base" | "ethereum">("solana");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState<Filters>({
    sortBy: "volume",
    sortOrder: "desc",
    priceChangeFilter: "all",
    minMarketCap: "",
    maxMarketCap: "",
    minVolume: "",
    maxVolume: "",
  });

  const [activeSubTab, setActiveSubTab] = useState<
    "trending" | "alpha" | "smart-money" | "new" | "finalizing" | "migrated"
  >("trending");

  const [trendingData, setTrendingData] = useState<PaginationData>({
    tokens: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [alphaData, setAlphaData] = useState<PaginationData>({
    tokens: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [smartMoneyData, setSmartMoneyData] = useState<PaginationData>({
    tokens: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [signals, setSignals] = useState<SmartMoneySignal[]>([]);
  const [memeTokens, setMemeTokens] = useState<MemeToken[]>([]);
  const [signalsPagination, setSignalsPagination] = useState({
    page: 1,
    pageSize: 20,
  });
  const [memesPagination, setMemesPagination] = useState({
    page: 1,
    pageSize: 20,
  });

  const [tokenSearchOpen, setTokenSearchOpen] = useState(false);
  const [tokenAuditOpen, setTokenAuditOpen] = useState(false);
  const [addressLookupOpen, setAddressLookupOpen] = useState(false);
  const [auditToken, setAuditToken] = useState<{
    address: string;
    chain: string;
    symbol?: string;
  } | null>(null);

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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInput);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    if (!isSmartMoneySupported) {
      setSmartMoneyData({ tokens: [], total: 0, page: 1, pageSize: 20 });
    }

    try {
      const marketRankSkill = getSkill("binance/crypto-market-rank");
      const tradingSignalSkill = getSkill("binance/trading-signal");
      const memeRushSkill = getSkill("binance/meme-rush");

      const currentFilters = filters;
      const apiFilters: Record<string, unknown> = {};

      if (currentFilters.priceChangeFilter === "gainers") {
        apiFilters.percentChangeMin = 0;
      } else if (currentFilters.priceChangeFilter === "losers") {
        apiFilters.percentChangeMax = 0;
      }
      if (currentFilters.minMarketCap)
        apiFilters.marketCapMin = Number(currentFilters.minMarketCap);
      if (currentFilters.maxMarketCap)
        apiFilters.marketCapMax = Number(currentFilters.maxMarketCap);
      if (currentFilters.minVolume) apiFilters.volumeMin = Number(currentFilters.minVolume);
      if (currentFilters.maxVolume) apiFilters.volumeMax = Number(currentFilters.maxVolume);

      if (marketRankSkill) {
        // Execute all skill calls in parallel for better performance
        const skillContext = {
          apiKeys: { binanceApiKey: "", binanceSecretKey: "" },
        };

        const [trendingResult, alphaResult, smartMoneyResult] = await Promise.all([
          marketRankSkill.execute(
            {
              rankType: "trending",
              chain: activeChain,
              page: pagination.page,
              pageSize: pagination.pageSize,
              search: searchQuery,
            },
            skillContext,
          ),
          marketRankSkill.execute(
            {
              rankType: "alpha",
              chain: activeChain,
              page: pagination.page,
              pageSize: pagination.pageSize,
              search: searchQuery,
            },
            skillContext,
          ),
          isSmartMoneySupported
            ? marketRankSkill.execute(
                {
                  rankType: "smart-money-inflow",
                  chain: activeChain,
                  page: pagination.page,
                  pageSize: pagination.pageSize,
                  search: searchQuery,
                },
                skillContext,
              )
            : Promise.resolve({
                success: false,
                data: null,
                error: "Not supported",
              }),
        ]);

        // Process trending data
        if (trendingResult.success && trendingResult.data) {
          const data = trendingResult.data as Record<string, unknown>;
          const trending = data.trending as { tokens?: Web3Token[]; total?: number } | undefined;
          setTrendingData({
            tokens: (trending?.tokens || []) as Web3Token[],
            total: trending?.total || 0,
            page: pagination.page,
            pageSize: pagination.pageSize,
          });
        }

        // Process alpha data
        if (alphaResult.success && alphaResult.data) {
          const data = alphaResult.data as Record<string, unknown>;
          const alpha = data.alpha as { tokens?: Web3Token[]; total?: number } | undefined;
          setAlphaData({
            tokens: (alpha?.tokens || []) as Web3Token[],
            total: alpha?.total || 0,
            page: pagination.page,
            pageSize: pagination.pageSize,
          });
        }

        // Process smart money data
        if (isSmartMoneySupported && smartMoneyResult.success && smartMoneyResult.data) {
          const data = smartMoneyResult.data as Record<string, unknown>;
          const smartMoney = data.smartMoneyInflow as
            | { tokens?: Web3Token[]; total?: number }
            | undefined;
          setSmartMoneyData({
            tokens: (smartMoney?.tokens || []) as Web3Token[],
            total: smartMoney?.total || 0,
            page: pagination.page,
            pageSize: pagination.pageSize,
          });
        }
      }

      if (tradingSignalSkill) {
        const signalsResult = await tradingSignalSkill.execute(
          {
            chain: activeChain,
            status: "all",
            limit: 50,
          },
          { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
        );

        if (signalsResult.success && signalsResult.data) {
          const data = signalsResult.data as Record<string, unknown>;
          setSignals((data.signals as SmartMoneySignal[]) || []);
        }
      }

      if (memeRushSkill && activeTab === "memes") {
        const memeStage =
          activeSubTab === "new"
            ? "new"
            : activeSubTab === "finalizing"
              ? "finalizing"
              : "migrated";
        const memesResult = await memeRushSkill.execute(
          {
            mode: "meme-rush",
            stage: memeStage,
            chain: activeChain,
            limit: 50,
          },
          { apiKeys: { binanceApiKey: "", binanceSecretKey: "" } },
        );

        if (memesResult.success && memesResult.data) {
          const data = memesResult.data as Record<string, unknown>;
          setMemeTokens((data.tokens as MemeToken[]) || []);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch data. Please try again.";
      console.error("Failed to fetch Web3 data:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChain, pagination.page, pagination.pageSize, searchQuery, activeTab, activeSubTab]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize: newSize, page: 1 }));
  };

  const handleSignalsPageChange = (newPage: number) => {
    setSignalsPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleSignalsPageSizeChange = (newSize: number) => {
    setSignalsPagination((prev) => ({ ...prev, pageSize: newSize, page: 1 }));
  };

  const handleMemesPageChange = (newPage: number) => {
    setMemesPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleMemesPageSizeChange = (newSize: number) => {
    setMemesPagination((prev) => ({ ...prev, pageSize: newSize, page: 1 }));
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      sortBy: "volume",
      sortOrder: "desc",
      priceChangeFilter: "all",
      minMarketCap: "",
      maxMarketCap: "",
      minVolume: "",
      maxVolume: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const tabs = [
    { id: "discover", label: "Discover", icon: Search },
    { id: "memes", label: "Memes", icon: Rocket },
    { id: "signals", label: "Signals", icon: Anchor },
    { id: "analysis", label: "Analysis", icon: BarChart3 },
  ];

  const discoverSubTabs = [
    { id: "trending", label: "Trending" },
    { id: "alpha", label: "Alpha" },
    { id: "smart-money", label: "Smart Money" },
  ] as const;

  const memeSubTabs = [
    { id: "new", label: "New" },
    { id: "finalizing", label: "Finalizing" },
    { id: "migrated", label: "Migrated" },
  ] as const;

  const isSmartMoneySupported = activeChain === "solana" || activeChain === "bsc";

  useEffect(() => {
    if (!isSmartMoneySupported) {
      if (activeSubTab === "smart-money") {
        setActiveSubTab("trending");
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
      setSmartMoneyData({ tokens: [], total: 0, page: 1, pageSize: 20 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChain, isSmartMoneySupported]);

  const getCurrentData = (): PaginationData => {
    if (activeTab === "discover") {
      if (activeSubTab === "trending") return trendingData;
      if (activeSubTab === "alpha") return alphaData;
      if (activeSubTab === "smart-money") return smartMoneyData;
    }
    return { tokens: [], total: 0, page: 1, pageSize: 20 };
  };

  const sortAndFilterTokens = useCallback(
    (tokens: Web3Token[]): Web3Token[] => {
      let result = [...tokens];

      if (filters.priceChangeFilter !== "all") {
        result = result.filter((t) => {
          const change = parseFloat(t.percentChange24h || "0");
          if (filters.priceChangeFilter === "gainers") return change > 0;
          if (filters.priceChangeFilter === "losers") return change < 0;
          return true;
        });
      }

      if (filters.minMarketCap) {
        result = result.filter(
          (t) => parseFloat(t.marketCap || "0") >= Number(filters.minMarketCap),
        );
      }
      if (filters.maxMarketCap) {
        result = result.filter(
          (t) => parseFloat(t.marketCap || "0") <= Number(filters.maxMarketCap),
        );
      }
      if (filters.minVolume) {
        result = result.filter((t) => parseFloat(t.volume24h || "0") >= Number(filters.minVolume));
      }
      if (filters.maxVolume) {
        result = result.filter((t) => parseFloat(t.volume24h || "0") <= Number(filters.maxVolume));
      }

      result.sort((a, b) => {
        let aVal: number, bVal: number;
        switch (filters.sortBy) {
          case "marketCap":
            aVal = parseFloat(a.marketCap || "0");
            bVal = parseFloat(b.marketCap || "0");
            break;
          case "price":
            aVal = parseFloat(a.price || "0");
            bVal = parseFloat(b.price || "0");
            break;
          case "change":
            aVal = parseFloat(a.percentChange24h || "0");
            bVal = parseFloat(b.percentChange24h || "0");
            break;
          default:
            aVal = parseFloat(a.volume24h || "0");
            bVal = parseFloat(b.volume24h || "0");
        }
        return filters.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      });

      return result;
    },
    [filters],
  );

  const currentData = getCurrentData();
  const filteredTokens = sortAndFilterTokens(currentData.tokens);
  const _totalPages = Math.ceil(currentData.total / pagination.pageSize);

  const getDisplayTokens = () => {
    if (activeTab === "discover") {
      return filteredTokens.map((t) => ({
        ...t,
        displayPrice: formatUSD(t.price),
        displayChange: formatPercent(t.percentChange24h),
        displayVolume: formatUSD(t.volume24h),
        displayMcap: formatUSD(t.marketCap),
      }));
    }
    if (activeTab === "signals") {
      const start = (signalsPagination.page - 1) * signalsPagination.pageSize;
      const paginatedSignals = signals.slice(start, start + signalsPagination.pageSize);
      return paginatedSignals.map((s) => ({
        symbol: s.ticker,
        name: s.ticker,
        chainId: s.chainId,
        contractAddress: s.contractAddress,
        price: s.totalValueUSD,
        marketCap: "",
        volume24h: s.totalValueUSD,
        percentChange24h: s.maxGain,
        icon: undefined as string | undefined,
        displayPrice: formatUSD(s.totalValueUSD),
        displayChange: formatPercent(s.maxGain),
        displayVolume: formatUSD(s.totalValueUSD),
        displayMcap: "—",
        direction: s.direction,
      }));
    }
    const memeStart = (memesPagination.page - 1) * memesPagination.pageSize;
    const paginatedMemes = memeTokens.slice(memeStart, memeStart + memesPagination.pageSize);
    return paginatedMemes.map((m) => ({
      ...m,
      displayPrice: formatUSD(m.price),
      displayChange: formatPercent(m.priceChange),
      displayVolume: formatUSD(m.volume),
      displayMcap: formatUSD(m.marketCap),
    }));
  };

  const displayTokens = getDisplayTokens();

  const hasActiveFilters = useMemo(() => {
    return (
      filters.priceChangeFilter !== "all" ||
      filters.minMarketCap !== "" ||
      filters.maxMarketCap !== "" ||
      filters.minVolume !== "" ||
      filters.maxVolume !== "" ||
      searchQuery !== ""
    );
  }, [filters, searchQuery]);

  const renderPagination = (
    tabPagination: { page: number; pageSize: number; total: number },
    onPageChange: (p: number) => void,
    onSizeChange: (s: number) => void,
    label: string,
  ) => {
    const { page, pageSize, total } = tabPagination;
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    const tp = Math.ceil(total / pageSize);

    const isExtraSmall = typeof window !== "undefined" && window.innerWidth < 480;
    const pageNumbers: number[] = [];
    // Extremely compact on mobile to zero-out horizontal debt
    const maxVisiblePages = isExtraSmall ? 1 : 5;
    let sp = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    const ep = Math.min(tp, sp + maxVisiblePages - 1);

    if (ep - sp + 1 < maxVisiblePages) {
      sp = Math.max(1, ep - maxVisiblePages + 1);
    }

    for (let i = sp; i <= ep; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-card-border w-full">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-text-muted w-full sm:w-auto">
          <span className="whitespace-nowrap">
            Showing {total > 0 ? start : 0}-{end} of {total} {label}
          </span>
          <Select
            value={String(pageSize)}
            onChange={(value) => onSizeChange(Number(value))}
            options={[
              { value: "20", label: "20 / page" },
              { value: "50", label: "50 / page" },
              { value: "100", label: "100 / page" },
            ]}
            className="w-full sm:w-auto"
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-card-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {"<"}
          </button>
          {sp > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-card-border transition-colors flex items-center justify-center"
              >
                1
              </button>
              {sp > 2 && <span className="px-1 text-text-muted">...</span>}
            </>
          )}
          {pageNumbers.map((num) => (
            <button
              key={num}
              onClick={() => onPageChange(num)}
              className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                page === num ? "bg-accent text-amoled" : "text-text-secondary hover:bg-card-border"
              }`}
            >
              {num}
            </button>
          ))}
          {ep < tp && (
            <>
              {ep < tp - 1 && <span className="px-1 text-text-muted">...</span>}
              <button
                onClick={() => onPageChange(tp)}
                className="min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-card-border transition-colors flex items-center justify-center"
              >
                {tp}
              </button>
            </>
          )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= tp}
            className="min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-card-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {">"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full animate-in fade-in duration-500"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              Web3 Intelligence
            </h1>
            <p className="text-text-secondary mt-1 text-sm sm:text-base">
              On-chain data, smart money signals, and meme token discovery
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setTokenSearchOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-card-border rounded-xl text-sm font-medium text-text-primary hover:bg-card-hover transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
            <button
              onClick={() => setAddressLookupOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-card-border rounded-xl text-sm font-medium text-text-primary hover:bg-card-hover transition-all"
            >
              <Wallet className="w-4 h-4" />
              <span>Lookup</span>
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-card-border rounded-xl text-sm font-medium text-text-primary hover:bg-card-hover transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
      >
        <div className="flex overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 pb-1 sm:pb-0 w-full sm:w-auto">
          <div className="flex gap-2 min-w-max pr-4 sm:pr-0">
            {tabs.map((tab) => {
              const isTabDisabled = tab.id === "signals" && !isSmartMoneySupported;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (isTabDisabled) return;
                    setActiveTab(tab.id as typeof activeTab);
                    if (tab.id === "discover") {
                      setActiveSubTab("trending");
                    } else if (tab.id === "memes") {
                      setActiveSubTab("new");
                    }
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-accent text-amoled"
                      : isTabDisabled
                        ? "bg-card border border-card-border text-text-muted opacity-50 cursor-not-allowed"
                        : "bg-card border border-card-border text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 pb-1 sm:pb-0 w-full sm:w-auto">
          <div className="flex gap-2 min-w-max pr-4 sm:pr-0">
            {CHAIN_OPTIONS.map((chain) => {
              const isOnSmartMoneyTab = activeTab === "signals";
              const isUnsupportedChain = chain.id === "base" || chain.id === "ethereum";
              const isDisabled = isOnSmartMoneyTab && isUnsupportedChain;

              return (
                <button
                  key={chain.id}
                  onClick={() => {
                    if (isDisabled) return;
                    setActiveChain(chain.id as typeof activeChain);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeChain === chain.id
                      ? "bg-agent-shadow text-white-fixed shadow-glow"
                      : isDisabled
                        ? "bg-card border border-card-border text-text-muted opacity-50 cursor-not-allowed"
                        : "bg-card border border-card-border text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {chain.label}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-4">
        {activeTab === "discover" && (
          <div className="flex overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 mb-4 pb-1 sm:pb-0 w-full">
            <div className="flex gap-2 min-w-max pr-4 sm:pr-0">
              {discoverSubTabs.map((subTab) => {
                const isDisabled = subTab.id === "smart-money" && !isSmartMoneySupported;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => {
                      if (isDisabled) {
                        return;
                      }
                      setActiveSubTab(subTab.id as typeof activeSubTab);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all whitespace-nowrap ${
                      activeSubTab === subTab.id
                        ? "bg-accent text-amoled"
                        : isDisabled
                          ? "bg-card-border text-text-muted opacity-50 cursor-not-allowed"
                          : "bg-card border border-card-border text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {subTab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {activeTab === "memes" && (
          <div className="flex overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 mb-4 pb-1 sm:pb-0 w-full">
            <div className="flex gap-2 min-w-max pr-4 sm:pr-0">
              {memeSubTabs.map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => {
                    setActiveSubTab(subTab.id as typeof activeSubTab);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all whitespace-nowrap ${
                    activeSubTab === subTab.id
                      ? "bg-risk-moderate text-amoled shadow-glow"
                      : "bg-card border border-card-border text-text-muted hover:text-text-primary"
                  }`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchInput}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-3 bg-card border border-card-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              showFilters || hasActiveFilters
                ? "bg-accent text-amoled"
                : "bg-card border border-card-border text-text-secondary hover:text-text-primary"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 bg-amoled text-accent text-xs rounded-full">
                {(filters.priceChangeFilter !== "all" ? 1 : 0) +
                  (filters.minMarketCap || filters.maxMarketCap ? 1 : 0) +
                  (filters.minVolume || filters.maxVolume ? 1 : 0) +
                  (searchQuery ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, maxHeight: 0 }}
            animate={{ opacity: 1, maxHeight: 500 }}
            exit={{ opacity: 0, maxHeight: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 p-4 bg-card border border-card-border rounded-xl overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">Sort By</label>
                <Select
                  value={filters.sortBy}
                  onChange={(value) => updateFilter("sortBy", value as Filters["sortBy"])}
                  options={SORT_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">Order</label>
                <Select
                  value={filters.sortOrder}
                  onChange={(value) => updateFilter("sortOrder", value as Filters["sortOrder"])}
                  options={[
                    { value: "desc", label: "Descending" },
                    { value: "asc", label: "Ascending" },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">
                  Price Change
                </label>
                <Select
                  value={filters.priceChangeFilter}
                  onChange={(value) =>
                    updateFilter("priceChangeFilter", value as Filters["priceChangeFilter"])
                  }
                  options={[
                    { value: "all", label: "All" },
                    { value: "gainers", label: "Gainers" },
                    { value: "losers", label: "Losers" },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">
                  Quick Filters
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFilter("priceChangeFilter", "gainers")}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                      filters.priceChangeFilter === "gainers"
                        ? "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_80%)] text-risk-low"
                        : "bg-card-border text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" /> Gainers
                  </button>
                  <button
                    onClick={() => updateFilter("priceChangeFilter", "losers")}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                      filters.priceChangeFilter === "losers"
                        ? "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] text-risk-extreme"
                        : "bg-card-border text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <TrendingDown className="w-3 h-3" /> Losers
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">
                  Min Market Cap ($)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1000000"
                  value={filters.minMarketCap}
                  onChange={(e) => updateFilter("minMarketCap", e.target.value)}
                  className="w-full px-3 py-2 bg-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">
                  Max Market Cap ($)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100000000"
                  value={filters.maxMarketCap}
                  onChange={(e) => updateFilter("maxMarketCap", e.target.value)}
                  className="w-full px-3 py-2 bg-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">
                  Min Volume ($)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  value={filters.minVolume}
                  onChange={(e) => updateFilter("minVolume", e.target.value)}
                  className="w-full px-3 py-2 bg-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">
                  Max Volume ($)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1000000"
                  value={filters.maxVolume}
                  onChange={(e) => updateFilter("maxVolume", e.target.value)}
                  className="w-full px-3 py-2 bg-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-card-border">
                <button
                  onClick={clearFilters}
                  className="text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
            Trending Tokens
          </p>
          <p className="text-2xl font-bold text-text-primary mt-1">{trendingData.total}</p>
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
            Alpha Picks
          </p>
          <p className="text-2xl font-bold text-text-primary mt-1">{alphaData.total}</p>
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
            Active Signals
          </p>
          <p className="text-2xl font-bold text-agent-shadow mt-1">
            {signals.filter((s) => s.status === "active").length}
          </p>
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider">New Memes</p>
          <p className="text-2xl font-bold text-risk-moderate mt-1">{memeTokens.length}</p>
        </div>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-text-muted animate-spin" />
        </div>
      )}

      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_70%)] rounded-xl p-4 mb-4"
        >
          <p className="text-risk-extreme text-sm font-medium">Error loading data</p>
          <p className="text-[color-mix(in_srgb,var(--color-risk-extreme),transparent_20%)] text-xs mt-1">
            {error}
          </p>
          <button
            onClick={fetchData}
            className="mt-3 text-xs bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] hover:bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_70%)] text-risk-extreme px-3 py-1.5 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      )}

      {!loading && activeTab === "discover" && (
        <motion.div
          variants={itemVariants}
          className="bg-card border border-card-border rounded-2xl overflow-hidden"
        >
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border">
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Token
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Price
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    24h Change
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Volume
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    MCap
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayTokens.map((token: any, i: number) => {
                  const tradingUrl = getTradingUrl({
                    contractAddress: token.contractAddress,
                    chainId: token.chainId,
                  });

                  return (
                    <tr
                      key={`${token.contractAddress}-${i}`}
                      className="border-b border-[color-mix(in_srgb,var(--color-text),transparent_90%)] hover:bg-[color-mix(in_srgb,var(--color-card-border),transparent_70%)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {token.icon ? (
                            <img
                              src={getTokenIcon(token.icon)}
                              alt={token.symbol}
                              className="w-8 h-8 rounded-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-card-border flex items-center justify-center text-xs font-bold text-text-secondary">
                              {token.symbol?.slice(0, 2) || "??"}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-text-primary font-semibold text-sm">
                                {token.symbol}
                              </p>
                              {token.direction && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    token.direction === "buy"
                                      ? "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_80%)] text-risk-low"
                                      : "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] text-risk-extreme"
                                  }`}
                                >
                                  {token.direction.toUpperCase()}
                                </span>
                              )}
                              {token.security?.isPumpfun && (
                                <span className="text-[10px] bg-[color-mix(in_srgb,var(--color-agent-shadow),transparent_80%)] text-[var(--color-agent-shadow)] px-1.5 py-0.5 rounded">
                                  PF
                                </span>
                              )}
                            </div>
                            <p className="text-text-muted text-xs">{token.name || token.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 text-text-primary font-medium text-sm">
                        {token.displayPrice}
                      </td>
                      <td
                        className={`text-right px-4 py-3 font-medium text-sm ${
                          parseFloat(
                            token.displayChange?.replace("%", "").replace("+", "") || "0",
                          ) >= 0
                            ? "text-risk-low"
                            : "text-risk-extreme"
                        }`}
                      >
                        {token.displayChange || "—"}
                      </td>
                      <td className="text-right px-4 py-3 text-text-secondary text-sm">
                        {token.displayVolume || "—"}
                      </td>
                      <td className="text-right px-4 py-3 text-text-secondary text-sm">
                        {token.displayMcap || "—"}
                      </td>
                      <td className="text-right px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setAuditToken({
                                address: token.contractAddress,
                                chain: getChainName(token.chainId),
                                symbol: token.symbol,
                              });
                              setTokenAuditOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-card-border hover:bg-card-border-hover text-text-muted hover:text-accent transition-colors"
                            title="Audit Token"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <a
                            href={tradingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent text-amoled text-xs font-bold rounded-full hover:scale-105 transition-transform"
                          >
                            Trade <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-card-border">
            {displayTokens.map((token: any, i: number) => {
              const tradingUrl = getTradingUrl({
                contractAddress: token.contractAddress,
                chainId: token.chainId,
              });
              return (
                <div key={`${token.contractAddress}-${i}`} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {token.icon ? (
                        <img
                          src={getTokenIcon(token.icon)}
                          alt={token.symbol}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-card-border flex items-center justify-center text-sm font-bold text-text-secondary">
                          {token.symbol?.slice(0, 2) || "??"}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-text-primary font-bold">{token.symbol}</p>
                          {token.security?.isPumpfun && (
                            <span className="text-[10px] bg-[color-mix(in_srgb,var(--color-agent-shadow),transparent_80%)] text-[var(--color-agent-shadow)] px-1.5 py-0.5 rounded font-bold">
                              PF
                            </span>
                          )}
                        </div>
                        <p className="text-text-muted text-xs">{token.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-text-primary font-bold">{token.displayPrice}</p>
                      <p
                        className={`text-xs font-bold ${
                          parseFloat(
                            token.displayChange?.replace("%", "").replace("+", "") || "0",
                          ) >= 0
                            ? "text-risk-low"
                            : "text-risk-extreme"
                        }`}
                      >
                        {token.displayChange}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-y border-card-border/50">
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        Volume
                      </p>
                      <p className="text-sm text-text-secondary font-medium">
                        {token.displayVolume}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        Market Cap
                      </p>
                      <p className="text-sm text-text-secondary font-medium">{token.displayMcap}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setAuditToken({
                          address: token.contractAddress,
                          chain: getChainName(token.chainId),
                          symbol: token.symbol,
                        });
                        setTokenAuditOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-card-border hover:bg-card-border-hover text-text-secondary font-bold text-sm transition-all"
                    >
                      <Shield className="w-4 h-4" />
                      Audit
                    </button>
                    <a
                      href={tradingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-accent text-amoled font-bold rounded-xl text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Trade <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {displayTokens.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-text-muted">No data available</p>
            </div>
          )}

          {displayTokens.length > 0 &&
            renderPagination(currentData, handlePageChange, handlePageSizeChange, "tokens")}
        </motion.div>
      )}

      {!loading && activeTab === "signals" && (
        <motion.div
          variants={itemVariants}
          className="bg-card border border-card-border rounded-2xl overflow-hidden"
        >
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border">
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Token
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Direction
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Value
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Max Gain
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Traders
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayTokens.map((signal: any, i: number) => {
                  const tradingUrl = getTradingUrl({
                    contractAddress: signal.contractAddress,
                    chainId: signal.chainId,
                  });

                  return (
                    <tr
                      key={`${signal.contractAddress}-${i}`}
                      className="border-b border-[color-mix(in_srgb,var(--color-text),transparent_90%)] hover:bg-[color-mix(in_srgb,var(--color-card-border),transparent_70%)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-card-border flex items-center justify-center text-xs font-bold text-text-secondary">
                            {signal.symbol?.slice(0, 2) || "??"}
                          </div>
                          <div>
                            <p className="text-text-primary font-semibold text-sm">
                              {signal.symbol}
                            </p>
                            <p className="text-text-muted text-xs">{signal.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                            signal.direction === "buy"
                              ? "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_80%)] text-risk-low"
                              : "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] text-risk-extreme"
                          }`}
                        >
                          {signal.direction?.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-text-primary font-medium text-sm">
                        {signal.displayVolume}
                      </td>
                      <td
                        className={`text-right px-4 py-3 font-medium text-sm ${
                          parseFloat(
                            signal.displayChange?.replace("%", "").replace("+", "") || "0",
                          ) >= 0
                            ? "text-risk-low"
                            : "text-risk-extreme"
                        }`}
                      >
                        {signal.displayChange || "—"}
                      </td>
                      <td className="text-right px-4 py-3 text-text-secondary text-sm">
                        {signal.smartMoneyCount || "—"}
                      </td>
                      <td className="text-right px-4 py-3">
                        <a
                          href={tradingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent text-amoled text-xs font-bold rounded-full hover:scale-105 transition-transform"
                        >
                          Trade <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signals Mobile Card View */}
          <div className="sm:hidden divide-y divide-card-border">
            {displayTokens.map((signal: any, i: number) => {
              const tradingUrl = getTradingUrl({
                contractAddress: signal.contractAddress,
                chainId: signal.chainId,
              });
              return (
                <div key={`${signal.contractAddress}-${i}`} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-card-border flex items-center justify-center text-sm font-bold text-text-secondary">
                        {signal.symbol?.slice(0, 2) || "??"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-text-primary font-bold">{signal.symbol}</p>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              signal.direction === "buy"
                                ? "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_80%)] text-risk-low"
                                : "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] text-risk-extreme"
                            }`}
                          >
                            {signal.direction?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-text-muted text-xs">{signal.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-text-primary font-bold">{signal.displayVolume}</p>
                      <p
                        className={`text-xs font-bold ${
                          parseFloat(
                            signal.displayChange?.replace("%", "").replace("+", "") || "0",
                          ) >= 0
                            ? "text-risk-low"
                            : "text-risk-extreme"
                        }`}
                      >
                        Max Gain: {signal.displayChange}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3 py-2 border-y border-card-border/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-agent-shadow animate-pulse shrink-0" />
                      <p className="text-sm text-text-secondary font-medium truncate">
                        Smart Money:{" "}
                        <span className="text-text-primary font-bold">
                          {signal.smartMoneyCount || 0} Traders
                        </span>
                      </p>
                    </div>
                    <a
                      href={tradingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-6 py-2 bg-accent text-amoled font-bold rounded-xl text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Trade <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {displayTokens.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-text-muted">No signals available</p>
            </div>
          )}

          {signals.length > 0 &&
            renderPagination(
              { ...signalsPagination, total: signals.length },
              handleSignalsPageChange,
              handleSignalsPageSizeChange,
              "signals",
            )}
        </motion.div>
      )}

      {!loading && activeTab === "memes" && (
        <motion.div
          variants={itemVariants}
          className="bg-card border border-card-border rounded-2xl overflow-hidden"
        >
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border">
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Token
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Price
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    24h Change
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Volume
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    MCap
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Holders
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayTokens.map((token: any, i: number) => {
                  const tradingUrl = getTradingUrl({
                    contractAddress: token.contractAddress,
                    chainId: token.chainId,
                  });

                  return (
                    <tr
                      key={`${token.contractAddress}-${i}`}
                      className="border-b border-[color-mix(in_srgb,var(--color-text),transparent_90%)] hover:bg-[color-mix(in_srgb,var(--color-card-border),transparent_70%)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {token.icon ? (
                            <img
                              src={getTokenIcon(token.icon)}
                              alt={token.symbol}
                              className="w-8 h-8 rounded-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-card-border flex items-center justify-center text-xs font-bold text-text-secondary">
                              {token.symbol?.slice(0, 2) || "??"}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-text-primary font-semibold text-sm">
                                {token.symbol}
                              </p>
                              {token.security?.isPumpfun && (
                                <span className="text-[10px] bg-[color-mix(in_srgb,var(--color-agent-shadow),transparent_80%)] text-[var(--color-agent-shadow)] px-1.5 py-0.5 rounded">
                                  PF
                                </span>
                              )}
                            </div>
                            <p className="text-text-muted text-xs">{token.name || token.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 text-text-primary font-medium text-sm">
                        {token.displayPrice}
                      </td>
                      <td
                        className={`text-right px-4 py-3 font-medium text-sm ${
                          parseFloat(
                            token.displayChange?.replace("%", "").replace("+", "") || "0",
                          ) >= 0
                            ? "text-risk-low"
                            : "text-risk-extreme"
                        }`}
                      >
                        {token.displayChange || "—"}
                      </td>
                      <td className="text-right px-4 py-3 text-text-secondary text-sm">
                        {token.displayVolume || "—"}
                      </td>
                      <td className="text-right px-4 py-3 text-text-secondary text-sm">
                        {token.displayMcap || "—"}
                      </td>
                      <td className="text-right px-4 py-3 text-text-secondary text-sm">
                        {token.holders ? token.holders.toLocaleString() : "—"}
                      </td>
                      <td className="text-right px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setAuditToken({
                                address: token.contractAddress,
                                chain: getChainName(token.chainId),
                                symbol: token.symbol,
                              });
                              setTokenAuditOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-card-border hover:bg-card-border-hover text-text-muted hover:text-accent transition-colors"
                            title="Audit Token"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <a
                            href={tradingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent text-amoled text-xs font-bold rounded-full hover:scale-105 transition-transform"
                          >
                            Trade <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Memes Mobile Card View */}
          <div className="sm:hidden divide-y divide-card-border">
            {displayTokens.map((token: any, i: number) => {
              const tradingUrl = getTradingUrl({
                contractAddress: token.contractAddress,
                chainId: token.chainId,
              });
              return (
                <div key={`${token.contractAddress}-${i}`} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {token.icon ? (
                        <img
                          src={getTokenIcon(token.icon)}
                          alt={token.symbol}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-card-border flex items-center justify-center text-sm font-bold text-text-secondary">
                          {token.symbol?.slice(0, 2) || "??"}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-text-primary font-bold">{token.symbol}</p>
                          {token.security?.isPumpfun && (
                            <span className="text-[10px] bg-[color-mix(in_srgb,var(--color-agent-shadow),transparent_80%)] text-[var(--color-agent-shadow)] px-1.5 py-0.5 rounded font-bold">
                              PF
                            </span>
                          )}
                        </div>
                        <p className="text-text-muted text-xs">{token.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-text-primary font-bold">{token.displayPrice}</p>
                      <p
                        className={`text-xs font-bold ${
                          parseFloat(
                            token.displayChange?.replace("%", "").replace("+", "") || "0",
                          ) >= 0
                            ? "text-risk-low"
                            : "text-risk-extreme"
                        }`}
                      >
                        {token.displayChange}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-card-border/50 text-center">
                    <div>
                      <p className="text-[9px] text-text-muted uppercase tracking-wider font-bold">
                        Vol
                      </p>
                      <p className="text-xs text-text-secondary font-bold">{token.displayVolume}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-text-muted uppercase tracking-wider font-bold">
                        MCap
                      </p>
                      <p className="text-xs text-text-secondary font-bold">{token.displayMcap}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-text-muted uppercase tracking-wider font-bold">
                        Holders
                      </p>
                      <p className="text-xs text-text-secondary font-bold">
                        {token.holders ? token.holders.toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setAuditToken({
                          address: token.contractAddress,
                          chain: getChainName(token.chainId),
                          symbol: token.symbol,
                        });
                        setTokenAuditOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-card-border hover:bg-card-border-hover text-text-secondary font-bold text-sm transition-all"
                    >
                      <Shield className="w-4 h-4" />
                      Audit
                    </button>
                    <a
                      href={tradingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-accent text-amoled font-bold rounded-xl text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Trade <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {displayTokens.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-text-muted">No meme tokens available</p>
            </div>
          )}

          {memeTokens.length > 0 &&
            renderPagination(
              { ...memesPagination, total: memeTokens.length },
              handleMemesPageChange,
              handleMemesPageSizeChange,
              "memes",
            )}
        </motion.div>
      )}

      {activeTab === "analysis" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TechnicalChart />
            <OrderBookDepth />
            <RugRiskScore />
          </div>
        </motion.div>
      )}

      <TokenSearchModal isOpen={tokenSearchOpen} onClose={() => setTokenSearchOpen(false)} />

      <TokenAuditModal
        isOpen={tokenAuditOpen}
        onClose={() => {
          setTokenAuditOpen(false);
          setAuditToken(null);
        }}
        contractAddress={auditToken?.address || ""}
        chain={auditToken?.chain || "56"}
        tokenSymbol={auditToken?.symbol}
      />

      <AddressLookupModal isOpen={addressLookupOpen} onClose={() => setAddressLookupOpen(false)} />
    </motion.div>
  );
}
