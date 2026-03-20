// ---------------------------------------------------------------------------
// Binance REST API Client for ClawLens
// Uses SubtleCrypto (Web Crypto API) for HMAC-SHA256 signing so it works
// in both Node.js 18+ and browser environments (Next.js SSR + CSR).
// Keys are always passed as parameters — never stored in this module.
// ---------------------------------------------------------------------------

import { cacheGet, cacheSet, generateCacheKey } from "./cache";
import { dedupedFetch } from "./requestDedupe";

const BASE_URL = "https://api.binance.com";

// ---------------------------------------------------------------------------
// Response Interfaces — matching Binance API response shapes
// ---------------------------------------------------------------------------

/** A single balance entry from the Binance account endpoint. */
export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

/** Response from GET /api/v3/account. */
export interface BinanceAccount {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  commissionRates: {
    maker: string;
    taker: string;
    buyer: string;
    seller: string;
  };
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  brokered: boolean;
  requireSelfTradePrevention: boolean;
  preventSor: boolean;
  updateTime: number;
  accountType: string;
  balances: BinanceBalance[];
  permissions: string[];
  uid: number;
}

/** Response from GET /api/v3/ticker/24hr. */
export interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

/** Response shape from GET /api/v3/myTrades. */
export interface BinanceTrade {
  symbol: string;
  id: number;
  orderId: number;
  orderListId: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch: boolean;
}

/** Response shape from GET /api/v3/openOrders. */
export interface BinanceOrder {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  stopPrice: string;
  icebergQty: string;
  time: number;
  updateTime: number;
  isWorking: boolean;
  workingTime: number;
  origQuoteOrderQty: string;
  selfTradePreventionMode: string;
}

/** Binance API error response shape. */
interface BinanceErrorResponse {
  code: number;
  msg: string;
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 Signing (browser + Node.js compatible via SubtleCrypto)
// ---------------------------------------------------------------------------

/**
 * @param symbol - if omitted, returns all symbols
 */
export async function getExchangeInfo(symbol?: string): Promise<{
  success: boolean;
  data?: BinanceSymbolInfo | BinanceSymbolInfo[];
  error?: string;
}> {
  // Check cache first (15 minute TTL for exchange info)
  const cacheKey = generateCacheKey("exchange", symbol || "all");
  const cached = await cacheGet<BinanceSymbolInfo | BinanceSymbolInfo[]>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }

  try {
    const params: Record<string, string | number> = {};
    if (symbol) params.symbol = symbol;
    const raw = await binanceFetch<{ symbols: Record<string, unknown>[] }>(
      "/api/v3/exchangeInfo",
      "",
      null,
      params,
    );
    if (symbol) {
      const found = raw.symbols.find((s) => String(s.symbol) === symbol);
      if (!found) throw new Error(`Symbol ${symbol} not found in exchange info.`);
      const parsed = parseSymbolInfo(found);
      await cacheSet(cacheKey, parsed, { ttl: 900 }); // 15 minutes
      return { success: true, data: parsed };
    }
    const parsed = raw.symbols.map(parseSymbolInfo);
    await cacheSet(cacheKey, parsed, { ttl: 900 }); // 15 minutes
    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Converts an ArrayBuffer to a lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates an HMAC-SHA256 signature for Binance signed endpoints.
 * Adds `timestamp` and `recvWindow` to the params before signing.
 *
 * @param params  - Key-value query parameters
 * @param secret  - Binance API secret key
 * @returns The hex-encoded HMAC-SHA256 signature string
 */
async function signQuery(params: Record<string, string | number>, secret: string): Promise<string> {
  // Inject required fields
  params.timestamp = Date.now();
  params.recvWindow = 5000;

  // Build the query string to sign
  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  // Import key and sign
  const secretData = encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    secretData.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const messageData = encode(queryString);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData.buffer as ArrayBuffer);
  return bufferToHex(signatureBuffer);
}

// ---------------------------------------------------------------------------
// Fetch Wrapper
// ---------------------------------------------------------------------------

/**
 * Converts a string to Uint8Array using TextEncoder.
 */
function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Generic fetch wrapper for Binance REST API endpoints.
 * Handles query string building, request signing, header injection,
 * and Binance-specific error response parsing.
 *
 * @param endpoint     - API path, e.g. `/api/v3/account`
 * @param apiKey       - Binance API key (sent as X-MBX-APIKEY header)
 * @param secret       - Binance API secret (used for signing; null if unsigned)
 * @param params       - Query parameters
 * @param requiresSign - Whether the endpoint requires HMAC signature
 * @returns Parsed JSON response of type T
 * @throws Error with Binance error code and message on failure
 */
async function binanceFetch<T>(
  endpoint: string,
  apiKey: string,
  secret: string | null,
  params: Record<string, string | number> = {},
  requiresSign: boolean = false,
): Promise<T> {
  // Clone params to avoid mutating the original
  const queryParams = { ...params };

  // Sign if required
  let signature: string | null = null;
  if (requiresSign && secret) {
    signature = await signQuery(queryParams, secret);
  }

  // Check if we are in the browser
  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    // Use our proxy to avoid CORS - with deduplication
    // IMPORTANT: Don't send signature to proxy - proxy will sign server-side using real keys from Redis
    const fetchKey = `${endpoint}:${JSON.stringify(queryParams)}`;

    return dedupedFetch<T>(fetchKey, queryParams, async () => {
      const response = await fetch("/api/binance/proxy", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint,
          apiKey,
          method: "GET",
          params: queryParams,
          requiresSign,
          signature, // Send pre-computed signature for onboarding/test connectivity
        }),
      });

      if (!response.ok) {
        let errorMessage = `Proxy Error: ${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.json();
          if (errorBody.error) errorMessage = errorBody.error;
          if (errorBody.msg) errorMessage = errorBody.msg;
        } catch (e) {
          console.warn("Failed to parse error response body:", e);
        }
        throw new Error(errorMessage);
      }

      return response.json() as Promise<T>;
    });
  }

  // Server-side: direct fetch to Binance
  const queryEntries = Object.entries(queryParams).map(
    ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`,
  );

  if (signature) {
    queryEntries.push(`signature=${signature}`);
  }

  const queryString = queryEntries.length > 0 ? `?${queryEntries.join("&")}` : "";
  const url = `${BASE_URL}${endpoint}${queryString}`;

  const headers: HeadersInit = {};
  if (apiKey) {
    headers["X-MBX-APIKEY"] = apiKey;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    let errorMessage = `Binance API error: ${response.status} ${response.statusText}`;
    try {
      const errorBody: BinanceErrorResponse = await response.json();
      if (errorBody.code && errorBody.msg) {
        errorMessage = `Binance API error [${errorBody.code}]: ${errorBody.msg}`;
      }
    } catch (e) {
      console.warn("Failed to parse Binance error response:", e);
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API Functions
// ---------------------------------------------------------------------------

/**
 * Fetches the user's Binance account info including all balances.
 * Returns only non-zero balances (where free or locked > 0).
 *
 * @param apiKey - Binance API key
 * @param secret - Binance API secret
 * @returns BinanceAccount with filtered non-zero balances
 */
export async function getAccountInfo(
  apiKey: string,
  secret: string,
): Promise<{ success: boolean; data?: BinanceAccount; error?: string }> {
  try {
    const account = await binanceFetch<BinanceAccount>("/api/v3/account", apiKey, secret, {}, true);
    account.balances = account.balances.filter(
      (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0,
    );
    return { success: true, data: account };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetches 24hr ticker data for all trading pairs.
 * No authentication required.
 *
 * @returns Array of all ticker data
 */
export async function getAllTickers(): Promise<{
  success: boolean;
  data?: BinanceTicker[];
  error?: string;
}> {
  try {
    const data = await binanceFetch<BinanceTicker[]>("/api/v3/ticker/24hr", "", null);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetches the current price for a single trading pair.
 * No authentication required.
 *
 * @param symbol - Trading pair symbol, e.g. 'BNBUSDT'
 * @returns The current price as a number
 */
export async function getTickerPrice(
  symbol: string,
): Promise<{ success: boolean; data?: number; error?: string }> {
  try {
    const result = await binanceFetch<{ symbol: string; price: string }>(
      "/api/v3/ticker/price",
      "",
      null,
      { symbol },
    );
    return { success: true, data: parseFloat(result.price) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetches current prices for multiple trading pairs in a single request.
 * No authentication required.
 *
 * @param symbols - Array of trading pair symbols, e.g. ['BNBUSDT', 'ETHUSDT']
 * @returns A map of symbol to price
 */
export async function getMultipleTickerPrices(symbols: string[]): Promise<{
  success: boolean;
  data?: Record<string, number>;
  error?: string;
}> {
  try {
    const result = await binanceFetch<Array<{ symbol: string; price: string }>>(
      "/api/v3/ticker/price",
      "",
      null,
      { symbols: JSON.stringify(symbols) },
    );
    const priceMap: Record<string, number> = {};
    for (const item of result) {
      priceMap[item.symbol] = parseFloat(item.price);
    }
    return { success: true, data: priceMap };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetches the user's trade history for a specific trading pair.
 * Requires authenticated (signed) request.
 *
 * @param symbol  - Trading pair symbol, e.g. 'BNBUSDT'
 * @param apiKey  - Binance API key
 * @param secret  - Binance API secret
 * @param limit   - Max number of trades to return (default 100, max 1000)
 * @returns Array of trade records
 */
export async function getTradeHistory(
  symbol: string,
  apiKey: string,
  secret: string,
  limit: number = 100,
): Promise<{ success: boolean; data?: BinanceTrade[]; error?: string }> {
  try {
    const data = await binanceFetch<BinanceTrade[]>(
      "/api/v3/myTrades",
      apiKey,
      secret,
      { symbol, limit },
      true,
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetches all currently open orders across all trading pairs.
 * Requires authenticated (signed) request.
 *
 * @param apiKey - Binance API key
 * @param secret - Binance API secret
 * @returns Array of open orders
 */
export async function getOpenOrders(
  apiKey: string,
  secret: string,
): Promise<{ success: boolean; data?: BinanceOrder[]; error?: string }> {
  try {
    const data = await binanceFetch<BinanceOrder[]>("/api/v3/openOrders", apiKey, secret, {}, true);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Tests the API key connectivity by calling the account endpoint
 * and returning a summary of the connection status and permissions.
 *
 * @param apiKey - Binance API key
 * @param secret - Binance API secret
 * @returns Connection status summary
 */
export async function testConnectivity(
  apiKey: string,
  secret: string,
): Promise<{
  success: boolean;
  accountType: string;
  canTrade: boolean;
  canWithdraw: boolean;
  permissions: string[];
}> {
  try {
    const account = await binanceFetch<BinanceAccount>("/api/v3/account", apiKey, secret, {}, true);

    return {
      success: true,
      accountType: account.accountType,
      canTrade: account.canTrade,
      canWithdraw: account.canWithdraw,
      permissions: account.permissions,
    };
  } catch {
    return {
      success: false,
      accountType: "UNKNOWN",
      canTrade: false,
      canWithdraw: false,
      permissions: [],
    };
  }
}

// ---------------------------------------------------------------------------
// K-Line / Candlestick Data
// ---------------------------------------------------------------------------

/** A single candlestick from GET /api/v3/klines. */
export interface BinanceKline {
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

/**
 * Fetches OHLCV candlestick (K-Line) data for a trading pair.
 * No authentication needed.
 */
export async function getKlines(
  symbol: string,
  interval: "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w",
  limit: number = 100,
): Promise<{ success: boolean; data?: BinanceKline[]; error?: string }> {
  try {
    const raw = await binanceFetch<unknown[][]>("/api/v3/klines", "", null, {
      symbol,
      interval,
      limit,
    });
    const data = raw.map((k) => ({
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
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ---------------------------------------------------------------------------
// Order Book Depth
// ---------------------------------------------------------------------------

/** Order book response with computed analytics. */
export interface BinanceOrderBook {
  lastUpdateId: number;
  bids: Array<[price: number, quantity: number]>;
  asks: Array<[price: number, quantity: number]>;
  totalBidVolumeUSD: number;
  totalAskVolumeUSD: number;
  spread: number;
  topBidWall: { price: number; sizeUSD: number };
  topAskWall: { price: number; sizeUSD: number };
}

/**
 * Fetches order book depth — bid and ask walls.
 * No authentication needed.
 */
export async function getOrderBook(
  symbol: string,
  limit: 5 | 10 | 20 | 50 | 100 = 20,
): Promise<{ success: boolean; data?: BinanceOrderBook; error?: string }> {
  try {
    const raw = await binanceFetch<{
      lastUpdateId: number;
      bids: string[][];
      asks: string[][];
    }>("/api/v3/depth", "", null, { symbol, limit });
    const bids: Array<[number, number]> = raw.bids.map(([p, q]) => [parseFloat(p), parseFloat(q)]);
    const asks: Array<[number, number]> = raw.asks.map(([p, q]) => [parseFloat(p), parseFloat(q)]);
    let totalBidVolumeUSD = 0;
    let topBidWall = { price: 0, sizeUSD: 0 };
    for (const [price, qty] of bids) {
      const usd = price * qty;
      totalBidVolumeUSD += usd;
      if (usd > topBidWall.sizeUSD) topBidWall = { price, sizeUSD: usd };
    }
    let totalAskVolumeUSD = 0;
    let topAskWall = { price: 0, sizeUSD: 0 };
    for (const [price, qty] of asks) {
      const usd = price * qty;
      totalAskVolumeUSD += usd;
      if (usd > topAskWall.sizeUSD) topAskWall = { price, sizeUSD: usd };
    }
    const highestBid = bids.length > 0 ? bids[0][0] : 0;
    const lowestAsk = asks.length > 0 ? asks[0][0] : 0;
    const spread = highestBid > 0 ? ((lowestAsk - highestBid) / highestBid) * 100 : 0;
    return {
      success: true,
      data: {
        lastUpdateId: raw.lastUpdateId,
        bids,
        asks,
        totalBidVolumeUSD,
        totalAskVolumeUSD,
        spread,
        topBidWall,
        topAskWall,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ---------------------------------------------------------------------------
// Full 24hr Ticker Statistics
// ---------------------------------------------------------------------------

/** Rich 24hr ticker statistics. */
export interface BinanceTicker24hr {
  symbol: string;
  priceChange: number;
  priceChangePercent: number;
  weightedAvgPrice: number;
  prevClosePrice: number;
  lastPrice: number;
  lastQty: number;
  bidPrice: number;
  bidQty: number;
  askPrice: number;
  askQty: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  openTime: number;
  closeTime: number;
  count: number;
}

function parseTicker24hr(raw: Record<string, unknown>): BinanceTicker24hr {
  return {
    symbol: String(raw.symbol),
    priceChange: parseFloat(String(raw.priceChange)),
    priceChangePercent: parseFloat(String(raw.priceChangePercent)),
    weightedAvgPrice: parseFloat(String(raw.weightedAvgPrice)),
    prevClosePrice: parseFloat(String(raw.prevClosePrice)),
    lastPrice: parseFloat(String(raw.lastPrice)),
    lastQty: parseFloat(String(raw.lastQty)),
    bidPrice: parseFloat(String(raw.bidPrice)),
    bidQty: parseFloat(String(raw.bidQty)),
    askPrice: parseFloat(String(raw.askPrice)),
    askQty: parseFloat(String(raw.askQty)),
    openPrice: parseFloat(String(raw.openPrice)),
    highPrice: parseFloat(String(raw.highPrice)),
    lowPrice: parseFloat(String(raw.lowPrice)),
    volume: parseFloat(String(raw.volume)),
    quoteVolume: parseFloat(String(raw.quoteVolume)),
    openTime: Number(raw.openTime),
    closeTime: Number(raw.closeTime),
    count: Number(raw.count),
  };
}

/**
 * Fetches full 24hr ticker stats. No authentication needed.
 * @param symbol - if omitted, returns all symbols
 */
export async function getTicker24hr(symbol?: string): Promise<{
  success: boolean;
  data?: BinanceTicker24hr | BinanceTicker24hr[];
  error?: string;
}> {
  // Check cache first (30 second TTL for price data)
  const cacheKey = generateCacheKey("ticker", symbol || "all");
  const cached = await cacheGet<BinanceTicker24hr | BinanceTicker24hr[]>(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }

  try {
    if (symbol) {
      const raw = await binanceFetch<Record<string, unknown>>("/api/v3/ticker/24hr", "", null, {
        symbol,
      });
      const parsed = parseTicker24hr(raw);
      // Cache for 30 seconds
      await cacheSet(cacheKey, parsed, { ttl: 30 });
      return { success: true, data: parsed };
    }
    const rawArr = await binanceFetch<Record<string, unknown>[]>("/api/v3/ticker/24hr", "", null);
    const parsed = rawArr.map(parseTicker24hr);
    // Cache for 30 seconds
    await cacheSet(cacheKey, parsed, { ttl: 30 });
    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ---------------------------------------------------------------------------
// Exchange Info
// ---------------------------------------------------------------------------

/** Flattened exchange info for a single symbol. */
export interface BinanceSymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isSpotTradingAllowed: boolean;
  filters: {
    minQty: number;
    maxQty: number;
    stepSize: number;
    minPrice: number;
    maxPrice: number;
    tickSize: number;
    minNotional: number;
  };
}

function parseSymbolInfo(raw: Record<string, unknown>): BinanceSymbolInfo {
  const rawFilters = (raw.filters || []) as Array<Record<string, string>>;
  let minQty = 0,
    maxQty = 0,
    stepSize = 0,
    minPrice = 0,
    maxPrice = 0,
    tickSize = 0,
    minNotional = 0;

  for (const f of rawFilters) {
    switch (f.filterType) {
      case "LOT_SIZE":
        minQty = parseFloat(f.minQty || "0");
        maxQty = parseFloat(f.maxQty || "0");
        stepSize = parseFloat(f.stepSize || "0");
        break;
      case "PRICE_FILTER":
        minPrice = parseFloat(f.minPrice || "0");
        maxPrice = parseFloat(f.maxPrice || "0");
        tickSize = parseFloat(f.tickSize || "0");
        break;
      case "NOTIONAL":
      case "MIN_NOTIONAL":
        minNotional = parseFloat(f.minNotional || "0");
        break;
    }
  }

  return {
    symbol: String(raw.symbol),
    status: String(raw.status),
    baseAsset: String(raw.baseAsset),
    quoteAsset: String(raw.quoteAsset),
    isSpotTradingAllowed: Boolean(raw.isSpotTradingAllowed),
    filters: {
      minQty,
      maxQty,
      stepSize,
      minPrice,
      maxPrice,
      tickSize,
      minNotional,
    },
  };
}

// ---------------------------------------------------------------------------
// Open OCO Orders
// ---------------------------------------------------------------------------

/** OCO (One-Cancels-the-Other) order. */
export interface BinanceOCOOrder {
  orderListId: number;
  symbol: string;
  listStatusType: string;
  listOrderStatus: string;
  orders: Array<{ symbol: string; orderId: number; clientOrderId: string }>;
  transactionTime: number;
}

/**
 * Fetches all open OCO orders on the account. Requires authentication.
 */
export async function getOpenOCOOrders(
  apiKey: string,
  secret: string,
): Promise<{ success: boolean; data?: BinanceOCOOrder[]; error?: string }> {
  try {
    const data = await binanceFetch<BinanceOCOOrder[]>(
      "/api/v3/allOrderList",
      apiKey,
      secret,
      {},
      true,
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ---------------------------------------------------------------------------
// OCO Order Template Builder
// ---------------------------------------------------------------------------

/** A template for an OCO bracket order (never placed automatically). */
export interface BinanceOCOTemplate {
  symbol: string;
  side: "SELL";
  quantity: number;
  price: number;
  stopPrice: number;
  stopLimitPrice: number;
  stopLimitTimeInForce: "GTC";
  summary: string;
  riskRewardRatio: number;
}

/**
 * Generates an OCO order template object. Does NOT place any order.
 * Used by LEDGER to suggest bracket stop-loss / take-profit levels.
 */
export function buildOCOTemplate(
  symbol: string,
  quantity: number,
  takeProfitPrice: number,
  stopLossPrice: number,
  stopLimitPrice: number,
  entryPrice?: number,
): BinanceOCOTemplate {
  const entry = entryPrice || (takeProfitPrice + stopLossPrice) / 2;
  const reward = takeProfitPrice - entry;
  const risk = entry - stopLossPrice;
  const riskRewardRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0;

  return {
    symbol,
    side: "SELL",
    quantity,
    price: takeProfitPrice,
    stopPrice: stopLossPrice,
    stopLimitPrice,
    stopLimitTimeInForce: "GTC",
    summary: `Take profit at $${takeProfitPrice.toFixed(4)} or stop loss at $${stopLossPrice.toFixed(4)}`,
    riskRewardRatio,
  };
}

// ---------------------------------------------------------------------------
// Order Trading Endpoints (Require User Confirmation)
// ---------------------------------------------------------------------------

export type OrderSide = "BUY" | "SELL";
export type OrderType =
  | "MARKET"
  | "LIMIT"
  | "STOP_LOSS"
  | "STOP_LOSS_LIMIT"
  | "TAKE_PROFIT"
  | "TAKE_PROFIT_LIMIT"
  | "LIMIT_MAKER";
export type TimeInForce = "GTC" | "IOC" | "FOK";

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity?: number;
  quoteOrderQty?: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  newClientOrderId?: string;
}

export interface BinanceOrderResponse {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  workingTime: number;
  selfTradePreventionMode: string;
}

async function signedPostFetch<T>(
  endpoint: string,
  apiKey: string,
  secret: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  params.timestamp = Date.now();
  params.recvWindow = 5000;

  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const signature = await signQuery(params, secret);

  const url = `${BASE_URL}${endpoint}?${queryString}&signature=${signature}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-MBX-APIKEY": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = `Binance API error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      if (errorBody.code && errorBody.msg) {
        errorMessage = `Binance API error [${errorBody.code}]: ${errorBody.msg}`;
      }
    } catch (e) {
      console.warn("Failed to parse Binance error response:", e);
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

async function signedDeleteFetch<T>(
  endpoint: string,
  apiKey: string,
  secret: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  params.timestamp = Date.now();
  params.recvWindow = 5000;

  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const signature = await signQuery(params, secret);

  const url = `${BASE_URL}${endpoint}?${queryString}&signature=${signature}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "X-MBX-APIKEY": apiKey,
    },
  });

  if (!response.ok) {
    let errorMessage = `Binance API error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      if (errorBody.code && errorBody.msg) {
        errorMessage = `Binance API error [${errorBody.code}]: ${errorBody.msg}`;
      }
    } catch (e) {
      console.warn("Failed to parse Binance error response:", e);
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export interface PlaceOrderResult {
  success: boolean;
  orderId?: number;
  clientOrderId?: string;
  price?: string;
  origQty?: string;
  executedQty?: string;
  status?: string;
  error?: string;
}

export async function placeOrder(
  apiKey: string,
  secret: string,
  order: OrderRequest,
): Promise<PlaceOrderResult> {
  try {
    const params: Record<string, string | number> = {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
    };

    if (order.quantity) params.quantity = order.quantity;
    if (order.quoteOrderQty) params.quoteOrderQty = order.quoteOrderQty;
    if (order.price) params.price = order.price;
    if (order.stopPrice) params.stopPrice = order.stopPrice;
    if (order.timeInForce) params.timeInForce = order.timeInForce;
    if (order.newClientOrderId) params.newClientOrderId = order.newClientOrderId;

    const response = await signedPostFetch<BinanceOrderResponse>(
      "/api/v3/order",
      apiKey,
      secret,
      params,
    );

    return {
      success: true,
      orderId: response.orderId,
      clientOrderId: response.clientOrderId,
      price: response.price,
      origQty: response.origQty,
      executedQty: response.executedQty,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface CancelOrderResult {
  success: boolean;
  orderId?: number;
  clientOrderId?: string;
  status?: string;
  error?: string;
}

export async function cancelOrder(
  apiKey: string,
  secret: string,
  symbol: string,
  orderId?: number,
  clientOrderId?: string,
): Promise<CancelOrderResult> {
  try {
    const params: Record<string, string | number> = { symbol };
    if (orderId) params.orderId = orderId;
    if (clientOrderId) params.origClientOrderId = clientOrderId;

    const response = await signedDeleteFetch<BinanceOrderResponse>(
      "/api/v3/order",
      apiKey,
      secret,
      params,
    );

    return {
      success: true,
      orderId: response.orderId,
      clientOrderId: response.clientOrderId,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface TestOrderResult {
  success: boolean;
  error?: string;
}

export async function testOrder(
  apiKey: string,
  secret: string,
  order: OrderRequest,
): Promise<TestOrderResult> {
  try {
    const params: Record<string, string | number> = {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity || 1,
    };

    if (order.price) params.price = order.price;
    if (order.stopPrice) params.stopPrice = order.stopPrice;
    if (order.timeInForce) params.timeInForce = order.timeInForce;

    await signedPostFetch<Record<string, unknown>>("/api/v3/order/test", apiKey, secret, params);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface GetOrderResult {
  success: boolean;
  order?: BinanceOrder;
  error?: string;
}

export async function getOrder(
  apiKey: string,
  secret: string,
  symbol: string,
  orderId?: number,
  clientOrderId?: string,
): Promise<GetOrderResult> {
  try {
    const params: Record<string, string | number> = { symbol };
    if (orderId) params.orderId = orderId;
    if (clientOrderId) params.origClientOrderId = clientOrderId;

    params.timestamp = Date.now();
    params.recvWindow = 5000;

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const signature = await signQuery(params, secret);

    const url = `${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      headers: { "X-MBX-APIKEY": apiKey },
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.msg || "Failed to get order");
    }

    const order = await response.json();

    return {
      success: true,
      order: {
        symbol: order.symbol,
        orderId: order.orderId,
        orderListId: order.orderListId,
        clientOrderId: order.clientOrderId,
        price: order.price,
        origQty: order.origQty,
        executedQty: order.executedQty,
        cummulativeQuoteQty: order.cummulativeQuoteQty,
        status: order.status,
        timeInForce: order.timeInForce,
        type: order.type,
        side: order.side,
        stopPrice: order.stopPrice,
        icebergQty: order.icebergQty,
        time: order.time,
        updateTime: order.updateTime,
        isWorking: order.isWorking,
        workingTime: order.workingTime,
        origQuoteOrderQty: order.origQuoteOrderQty,
        selfTradePreventionMode: order.selfTradePreventionMode,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface GetAllOrdersResult {
  success: boolean;
  orders?: BinanceOrder[];
  error?: string;
}

export async function getAllOrders(
  apiKey: string,
  secret: string,
  symbol: string,
  limit: number = 100,
): Promise<GetAllOrdersResult> {
  try {
    const params: Record<string, string | number> = { symbol, limit };
    params.timestamp = Date.now();
    params.recvWindow = 5000;

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const signature = await signQuery(params, secret);

    const url = `${BASE_URL}/api/v3/allOrders?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      headers: { "X-MBX-APIKEY": apiKey },
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.msg || "Failed to get orders");
    }

    const orders = await response.json();

    return {
      success: true,
      orders: orders.map((o: Record<string, unknown>) => ({
        symbol: String(o.symbol),
        orderId: Number(o.orderId),
        orderListId: Number(o.orderListId),
        clientOrderId: String(o.clientOrderId),
        price: String(o.price),
        origQty: String(o.origQty),
        executedQty: String(o.executedQty),
        cummulativeQuoteQty: String(o.cummulativeQuoteQty),
        status: String(o.status),
        timeInForce: String(o.timeInForce),
        type: String(o.type),
        side: String(o.side),
        stopPrice: String(o.stopPrice),
        icebergQty: String(o.icebergQty),
        time: Number(o.time),
        updateTime: Number(o.updateTime),
        isWorking: Boolean(o.isWorking),
        workingTime: Number(o.workingTime),
        origQuoteOrderQty: String(o.origQuoteOrderQty),
        selfTradePreventionMode: String(o.selfTradePreventionMode),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface CommissionRateResult {
  success: boolean;
  commission?: {
    maker: string;
    taker: string;
  };
  error?: string;
}

export async function getCommissionRate(
  apiKey: string,
  secret: string,
  symbol: string,
): Promise<CommissionRateResult> {
  try {
    const params: Record<string, string | number> = { symbol };
    params.timestamp = Date.now();
    params.recvWindow = 5000;

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const signature = await signQuery(params, secret);

    const url = `${BASE_URL}/api/v3/account/commission?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      headers: { "X-MBX-APIKEY": apiKey },
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.msg || "Failed to get commission rate");
    }

    const data = await response.json();

    return {
      success: true,
      commission: {
        maker: data.maker,
        taker: data.taker,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
