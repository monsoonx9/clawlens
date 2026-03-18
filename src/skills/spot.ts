import { Skill, SkillContext, SkillResult } from "./types";

const BASE_URL = "https://api.binance.com";

const ENDPOINTS: Record<string, { method: string; auth: boolean; description: string }> = {
  "/api/v3/exchangeInfo": {
    method: "GET",
    auth: false,
    description: "Exchange information",
  },
  "/api/v3/ping": {
    method: "GET",
    auth: false,
    description: "Test connectivity",
  },
  "/api/v3/time": {
    method: "GET",
    auth: false,
    description: "Check server time",
  },
  "/api/v3/aggTrades": {
    method: "GET",
    auth: false,
    description: "Compressed/Aggregate trades list",
  },
  "/api/v3/avgPrice": {
    method: "GET",
    auth: false,
    description: "Current average price",
  },
  "/api/v3/depth": { method: "GET", auth: false, description: "Order book" },
  "/api/v3/historicalTrades": {
    method: "GET",
    auth: false,
    description: "Old trade lookup",
  },
  "/api/v3/klines": {
    method: "GET",
    auth: false,
    description: "Kline/Candlestick data",
  },
  "/api/v3/ticker": {
    method: "GET",
    auth: false,
    description: "Rolling window price change statistics",
  },
  "/api/v3/ticker/24hr": {
    method: "GET",
    auth: false,
    description: "24hr ticker price change statistics",
  },
  "/api/v3/ticker/bookTicker": {
    method: "GET",
    auth: false,
    description: "Symbol order book ticker",
  },
  "/api/v3/ticker/price": {
    method: "GET",
    auth: false,
    description: "Symbol price ticker",
  },
  "/api/v3/ticker/tradingDay": {
    method: "GET",
    auth: false,
    description: "Trading Day Ticker",
  },
  "/api/v3/trades": {
    method: "GET",
    auth: false,
    description: "Recent trades list",
  },
  "/api/v3/uiKlines": { method: "GET", auth: false, description: "UIKlines" },
  "/api/v3/account": {
    method: "GET",
    auth: true,
    description: "Account information",
  },
  "/api/v3/account/commission": {
    method: "GET",
    auth: true,
    description: "Query Commission Rates",
  },
  "/api/v3/allOrderList": {
    method: "GET",
    auth: true,
    description: "Query all Order lists",
  },
  "/api/v3/allOrders": { method: "GET", auth: true, description: "All orders" },
  "/api/v3/myTrades": {
    method: "GET",
    auth: true,
    description: "Account trade list",
  },
  "/api/v3/openOrders": {
    method: "GET",
    auth: true,
    description: "Current open orders",
  },
  "/api/v3/order": { method: "GET", auth: true, description: "Query order" },
};

async function binanceRequest(
  endpoint: string,
  method: string,
  params: Record<string, unknown>,
  apiKey?: string,
  secretKey?: string,
): Promise<unknown> {
  const config = ENDPOINTS[endpoint];
  if (!config) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }

  const needsAuth = config.auth;
  if (needsAuth && (!apiKey || !secretKey)) {
    throw new Error(`Endpoint ${endpoint} requires authentication`);
  }

  const queryString = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

  const url = queryString ? `${BASE_URL}${endpoint}?${queryString}` : `${BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "binance-spot/1.0.1 (Skill)",
  };

  if (needsAuth && apiKey) {
    headers["X-MBX-APIKEY"] = apiKey;

    const timestamp = Date.now();
    const signaturePayload = `${queryString ? queryString + "&" : ""}timestamp=${timestamp}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(signaturePayload);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const finalUrl = `${url}&signature=${signatureHex}`;

    const response = await fetch(finalUrl, {
      method,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.msg || `API error: ${response.status}`);
    }

    return response.json();
  }

  const response = await fetch(url, {
    method,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.msg || `API error: ${response.status}`);
  }

  return response.json();
}

export const spot: Skill = {
  id: "binance/spot",
  name: "Binance Spot",
  namespace: "binance",
  version: "1.0.1",
  description:
    "Binance Spot API - Read-only access to account balances, prices, market data, " +
    "trade history, order book, and klines. Requires API key and secret for authenticated " +
    "endpoints. All trading-related endpoints (place order, cancel order, etc.) are excluded.",
  inputSchema: {
    endpoint: {
      type: "string",
      required: true,
      description: `API endpoint path. Read-only endpoints: ${Object.keys(ENDPOINTS)
        .filter(
          (e) =>
            !ENDPOINTS[e].method.includes("POST") &&
            !ENDPOINTS[e].method.includes("DELETE") &&
            !ENDPOINTS[e].method.includes("PUT"),
        )
        .join(", ")}`,
    },
    symbol: {
      type: "string",
      required: false,
      description: "Trading symbol (e.g., BTCUSDT)",
    },
    symbols: {
      type: "array",
      required: false,
      description: "Array of trading symbols",
    },
    interval: {
      type: "string",
      required: false,
      description:
        "Kline interval: 1s, 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M",
    },
    limit: {
      type: "number",
      required: false,
      description: "Number of records to return (default 500, max 1000)",
    },
    startTime: {
      type: "number",
      required: false,
      description: "Start time in milliseconds",
    },
    endTime: {
      type: "number",
      required: false,
      description: "End time in milliseconds",
    },
    fromId: {
      type: "number",
      required: false,
      description: "ID to get aggregate trades from INCLUSIVE",
    },
    windowSize: {
      type: "string",
      required: false,
      description:
        "Window size for rolling window ticker: 1m, 2m, 3m, 4m, 5m, 6m, 7m, 8m, 9m, 10m, 11m, 12m, 13m, 14m, 15m, 16m, 17m, 18m, 19m, 20m, 21m, 22m, 23m, 24m, 25m, 26m, 27m, 28m, 29m, 30m, 31m, 32m, 33m, 34m, 35m, 36m, 37m, 38m, 39m, 40m, 41m, 42m, 43m, 44m, 45m, 46m, 47m, 48m, 49m, 50m, 51m, 52m, 53m, 54m, 55m, 56m, 57m, 58m, 59m",
    },
    type: {
      type: "string",
      required: false,
      description: "Ticker type: FULL, MINI",
    },
    symbolStatus: {
      type: "string",
      required: false,
      description: "Symbol status: TRADING, END_OF_DAY, HALT, BREAK",
    },
    permissions: {
      type: "array",
      required: false,
      description: "List of permissions to query",
    },
    showPermissionSets: {
      type: "boolean",
      required: false,
      description: "Show permission sets",
    },
    timeZone: {
      type: "string",
      required: false,
      description: "Timezone: default 0 (UTC)",
    },
    orderId: {
      type: "number",
      required: false,
      description: "Order ID",
    },
    origClientOrderId: {
      type: "string",
      required: false,
      description: "Original client order ID",
    },
    recvWindow: {
      type: "number",
      required: false,
      description: "Receive window (max 60000ms)",
    },
    omitZeroBalances: {
      type: "boolean",
      required: false,
      description: "Omit zero balances",
    },
  },

  async execute(input: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    try {
      const endpoint = String(input.endpoint || "");
      const config = ENDPOINTS[endpoint];

      if (!config) {
        return {
          success: false,
          data: {},
          error: `Invalid endpoint. Available: ${Object.keys(ENDPOINTS).join(", ")}`,
          summary: `Invalid endpoint: ${endpoint}`,
        };
      }

      const {
        symbol,
        symbols,
        interval,
        limit,
        startTime,
        endTime,
        fromId,
        windowSize,
        type,
        symbolStatus,
        permissions,
        showPermissionSets,
        timeZone,
        orderId,
        origClientOrderId,
        recvWindow,
        omitZeroBalances,
        ...restParams
      } = input;

      const params: Record<string, unknown> = { ...restParams };

      if (symbol) params.symbol = symbol;
      if (symbols) params.symbols = JSON.stringify(symbols);
      if (interval) params.interval = interval;
      if (limit) params.limit = limit;
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
      if (fromId) params.fromId = fromId;
      if (windowSize) params.windowSize = windowSize;
      if (type) params.type = type;
      if (symbolStatus) params.symbolStatus = symbolStatus;
      if (permissions) params.permissions = JSON.stringify(permissions);
      if (showPermissionSets !== undefined) params.showPermissionSets = showPermissionSets;
      if (timeZone) params.timeZone = timeZone;
      if (orderId) params.orderId = orderId;
      if (origClientOrderId) params.origClientOrderId = origClientOrderId;
      if (recvWindow) params.recvWindow = recvWindow;
      if (omitZeroBalances !== undefined) params.omitZeroBalances = omitZeroBalances;

      const result = await binanceRequest(
        endpoint,
        config.method,
        params,
        context.apiKeys.binanceApiKey,
        context.apiKeys.binanceSecretKey,
      );

      return {
        success: true,
        data: result as Record<string, unknown>,
        summary: `Successfully fetched ${endpoint}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: true,
        data: { status: "unavailable", error: message },
        error: message,
        summary: `Spot data unavailable. Check your Binance API keys or try again later.`,
      };
    }
  },
};
