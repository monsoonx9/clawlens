// ---------------------------------------------------------------------------
// Binance Futures API Client for ClawLens
// Public endpoints - no API key required
// Includes proxy routing for geo-restricted endpoints
// ---------------------------------------------------------------------------

import { cacheGet, cacheSet, generateCacheKey } from "./cache";
import { dedupedFetch } from "./requestDedupe";

const FUTURES_BASE = "https://fapi.binance.com";

// Proxy routing for geo-restricted environments
const PROXY_FRANKFURT = "http://134.122.77.171:9500";
const PROXY_AUTOTRADE = "http://46.101.148.181:9500";
const PROXY_TESTNET = "https://testnet.binancefuture.com";

const PROXY_ROUTES: Record<string, { base: string; path: string | null }> = {
  "/fapi/v1/klines": { base: PROXY_FRANKFURT, path: "/fapi/klines" },
  "/fapi/v1/premiumIndex": {
    base: PROXY_FRANKFURT,
    path: "/fapi/premiumIndex",
  },
  "/fapi/v1/fundingInfo": { base: PROXY_AUTOTRADE, path: null },
  "/fapi/v1/fundingRate": { base: PROXY_AUTOTRADE, path: null },
  "/fapi/v1/aggTrades": { base: PROXY_TESTNET, path: null },
  "/fapi/v1/depth": { base: PROXY_TESTNET, path: null },
  "/futures/data/openInterestHist": { base: PROXY_AUTOTRADE, path: null },
  "/futures/data/topLongShortPositionRatio": {
    base: PROXY_AUTOTRADE,
    path: null,
  },
  "/futures/data/topLongShortAccountRatio": {
    base: PROXY_AUTOTRADE,
    path: null,
  },
  "/futures/data/globalLongShortAccountRatio": {
    base: PROXY_FRANKFURT,
    path: null,
  },
  "/futures/data/takerlongshortRatio": { base: PROXY_AUTOTRADE, path: null },
};

const DEFAULT_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "DOTUSDT",
  "MATICUSDT",
  "LINKUSDT",
  "LTCUSDT",
];

// ---------------------------------------------------------------------------
// Response Interfaces
// ---------------------------------------------------------------------------

export interface FuturesKline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  numTrades: number;
  takerBuyBaseVolume: number;
  takerBuyQuoteVolume: number;
}

export interface AggTrade {
  aggTradeId: number;
  price: number;
  quantity: number;
  firstTradeId: number;
  lastTradeId: number;
  timestamp: number;
  isBuyerMaker: boolean;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  lastUpdateId: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface PremiumIndex {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  estimatedSettlePrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  interestRate: string;
  time: number;
}

export interface FundingInfo {
  symbol: string;
  adjustedFundingRateCap: string;
  adjustedFundingRateFloor: string;
  fundingIntervalHours: number;
}

export interface FundingRate {
  symbol: string;
  fundingTime: number;
  fundingRate: string;
  lastFundingTime: number;
}

export interface OpenInterestHist {
  symbol: string;
  openInterest: string;
  timestamp: number;
}

export interface TopLongShortPositionRatio {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

export interface TopLongShortAccountRatio {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

export interface GlobalLongShortAccountRatio {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

export interface TakerBuySellRatio {
  symbol: string;
  buyVol: string;
  sellVol: string;
  buySellRatio: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Fetch Functions
// ---------------------------------------------------------------------------

async function futuresFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  useCache: boolean = true,
  cacheTtl: number = 30,
): Promise<T> {
  const cacheKey = generateCacheKey("futures", `${endpoint}${JSON.stringify(params)}`);

  if (useCache) {
    const cached = await cacheGet<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const isBrowser = typeof window !== "undefined";
  let url: string;
  let proxyRoute: { base: string; path: string | null } | undefined;

  if (endpoint in PROXY_ROUTES) {
    proxyRoute = PROXY_ROUTES[endpoint];
  }

  if (isBrowser) {
    const fetchKey = `futures:${endpoint}:${JSON.stringify(params)}`;

    return dedupedFetch<T>(fetchKey, params, async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => searchParams.append(k, String(v)));

      if (proxyRoute && proxyRoute.path) {
        url = `${proxyRoute.base}${proxyRoute.path}?${searchParams}`;
      } else {
        url = `${FUTURES_BASE}${endpoint}?${searchParams}`;
      }

      const response = await fetch("/api/binance/proxy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: proxyRoute?.path || endpoint,
          method: "GET",
          params,
          baseUrl: proxyRoute?.base || FUTURES_BASE,
        }),
      });

      if (!response.ok) {
        throw new Error(`Futures proxy error: ${response.status}`);
      }

      const data = await response.json();
      if (useCache && cacheTtl > 0) {
        await cacheSet(cacheKey, data, { ttl: cacheTtl });
      }
      return data as T;
    });
  }

  // Server-side: direct fetch with proxy fallback
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => searchParams.append(k, String(v)));

  let finalUrl: string;
  if (proxyRoute && proxyRoute.path) {
    finalUrl = `${proxyRoute.base}${proxyRoute.path}?${searchParams}`;
  } else {
    finalUrl = `${FUTURES_BASE}${endpoint}?${searchParams}`;
  }

  const response = await fetch(finalUrl);
  if (!response.ok) {
    throw new Error(`Futures API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (useCache && cacheTtl > 0) {
    await cacheSet(cacheKey, data, { ttl: cacheTtl });
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

export async function getFuturesKlines(
  symbol: string,
  interval: "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w" = "4h",
  limit: number = 30,
): Promise<FuturesKline[]> {
  const raw = await futuresFetch<unknown[][]>(
    "/fapi/v1/klines",
    {
      symbol,
      interval,
      limit,
    },
    true,
    30,
  );

  return raw.map((k) => ({
    openTime: k[0] as number,
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
    closeTime: k[6] as number,
    quoteVolume: parseFloat(k[7] as string),
    numTrades: k[8] as number,
    takerBuyBaseVolume: parseFloat(k[9] as string),
    takerBuyQuoteVolume: parseFloat(k[10] as string),
  }));
}

export async function getAggTrades(symbol: string, limit: number = 500): Promise<AggTrade[]> {
  const raw = await futuresFetch<unknown[]>(
    "/fapi/v1/aggTrades",
    {
      symbol,
      limit,
    },
    true,
    10,
  );

  return raw.map((t: any) => ({
    aggTradeId: t.a,
    price: parseFloat(t.p),
    quantity: parseFloat(t.q),
    firstTradeId: t.f,
    lastTradeId: t.l,
    timestamp: t.T,
    isBuyerMaker: t.m,
  }));
}

export async function getFuturesOrderBook(
  symbol: string,
  limit: number = 1000,
): Promise<OrderBook> {
  const raw = await futuresFetch<{
    lastUpdateId: number;
    bids: string[][];
    asks: string[][];
  }>("/fapi/v1/depth", { symbol, limit }, true, 5);

  return {
    lastUpdateId: raw.lastUpdateId,
    bids: raw.bids.map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    asks: raw.asks.map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
  };
}

export async function getPremiumIndex(symbol: string): Promise<PremiumIndex> {
  return futuresFetch<PremiumIndex>("/fapi/v1/premiumIndex", { symbol }, true, 30);
}

export async function getPremiumIndexAll(): Promise<PremiumIndex[]> {
  return futuresFetch<PremiumIndex[]>("/fapi/v1/premiumIndex", {}, true, 30);
}

export async function getFundingInfo(): Promise<FundingInfo[]> {
  return futuresFetch<FundingInfo[]>("/fapi/v1/fundingInfo", {}, true, 300);
}

export async function getFundingRateHistory(
  symbol: string,
  limit: number = 500,
): Promise<FundingRate[]> {
  return futuresFetch<FundingRate[]>("/fapi/v1/fundingRate", { symbol, limit }, true, 60);
}

export async function getOpenInterestHist(
  symbol: string,
  period: "5m" | "15m" | "30m" | "1h" | "4h" | "1d" = "4h",
  limit: number = 30,
): Promise<OpenInterestHist[]> {
  return futuresFetch<OpenInterestHist[]>(
    "/futures/data/openInterestHist",
    {
      symbol,
      period,
      limit,
    },
    true,
    30,
  );
}

export async function getTopLongShortPositionRatio(
  symbol: string,
  period: "5m" | "15m" | "30m" | "1h" | "4h" | "1d" = "4h",
  limit: number = 30,
): Promise<TopLongShortPositionRatio[]> {
  return futuresFetch<TopLongShortPositionRatio[]>(
    "/futures/data/topLongShortPositionRatio",
    {
      symbol,
      period,
      limit,
    },
    true,
    30,
  );
}

export async function getTopLongShortAccountRatio(
  symbol: string,
  period: "5m" | "15m" | "30m" | "1h" | "4h" | "1d" = "4h",
  limit: number = 30,
): Promise<TopLongShortAccountRatio[]> {
  return futuresFetch<TopLongShortAccountRatio[]>(
    "/futures/data/topLongShortAccountRatio",
    {
      symbol,
      period,
      limit,
    },
    true,
    30,
  );
}

export async function getGlobalLongShortAccountRatio(
  symbol: string,
  period: "5m" | "15m" | "30m" | "1h" | "4h" | "1d" = "4h",
  limit: number = 30,
): Promise<GlobalLongShortAccountRatio[]> {
  return futuresFetch<GlobalLongShortAccountRatio[]>(
    "/futures/data/globalLongShortAccountRatio",
    {
      symbol,
      period,
      limit,
    },
    true,
    30,
  );
}

export async function getTakerBuySellRatio(
  symbol: string,
  period: "5m" | "15m" | "30m" | "1h" | "4h" | "1d" = "4h",
  limit: number = 30,
): Promise<TakerBuySellRatio[]> {
  return futuresFetch<TakerBuySellRatio[]>(
    "/futures/data/takerlongshortRatio",
    {
      symbol,
      period,
      limit,
    },
    true,
    30,
  );
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

export function calculateLinearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  const numerator = values.reduce((sum, v, i) => sum + (i - xMean) * (v - yMean), 0);
  const denominator = values.reduce((sum, _, i) => sum + Math.pow(i - xMean, 2), 0);
  return denominator === 0 ? 0 : numerator / denominator;
}

export function normalizeRatio(value: number, neutral: number = 1.0): number {
  if (neutral === 0) return 0;
  const deviation = (value - neutral) / neutral;
  return Math.max(-1, Math.min(1, deviation * 2));
}

export function trendScore(values: number[]): number {
  if (values.length < 4) return 0;
  const mid = Math.floor(values.length / 2);
  const oldAvg = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const newAvg = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
  if (oldAvg === 0) return 0;
  const change = (newAvg - oldAvg) / oldAvg;
  return Math.max(-1, Math.min(1, change * 5));
}

export function clamp(value: number, lo: number = 0, hi: number = 100): number {
  return Math.max(lo, Math.min(hi, value));
}

export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14,
): number {
  if (highs.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    );
    trs.push(tr);
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14,
): number {
  if (highs.length < period * 2) return 0;

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trs: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const highDiff = highs[i] - highs[i - 1];
    const lowDiff = lows[i - 1] - lows[i];
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    trs.push(
      Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      ),
    );
  }

  const smoothedTR = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  const smoothedPlusDM = plusDM.slice(-period).reduce((a, b) => a + b, 0) / period;
  const smoothedMinusDM = minusDM.slice(-period).reduce((a, b) => a + b, 0) / period;

  if (smoothedTR === 0) return 0;

  const plusDI = (smoothedPlusDM / smoothedTR) * 100;
  const minusDI = (smoothedMinusDM / smoothedTR) * 100;

  if (plusDI + minusDI === 0) return 0;

  const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
  return dx;
}

export { DEFAULT_SYMBOLS };
