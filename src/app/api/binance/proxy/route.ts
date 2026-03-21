export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getKeys } from "@/lib/keyVault";

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signQuery(
  params: Record<string, string | number>,
  secret: string,
): Promise<{ signature: string; timestamp: number; recvWindow: number }> {
  const queryParams = { ...params };
  const timestamp = Date.now();
  const recvWindow = 5000;

  queryParams.timestamp = timestamp;
  queryParams.recvWindow = recvWindow;

  const queryString = Object.entries(queryParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const messageData = encoder.encode(queryString);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData.buffer as ArrayBuffer);
  const signature = bufferToHex(signatureBuffer);
  return { signature, timestamp, recvWindow };
}

const ALLOWED_BINANCE_DOMAINS = [
  "api.binance.com",
  "api1.binance.com",
  "api2.binance.com",
  "api3.binance.com",
  "testnet.binance.vision",
  "web3.binance.com",
  "dquery.sintral.io",
  "www.binance.com",
  "fapi.binance.com",
];

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 200;
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_RATE_LIMIT_ENTRIES = 1000;

const proxyCache = new Map<string, { data: unknown; expiry: number }>();
const PROXY_CACHE_TTL = 5000;
const MAX_CACHE_SIZE = 100;

// Cleanup old entries periodically
function cleanupOldEntries(): void {
  const now = Date.now();

  // Cleanup rate limit map
  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
    // If still too large, clear oldest half
    if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES / 2) {
      const keysArray = Array.from(rateLimitMap.keys());
      keysArray.slice(0, MAX_RATE_LIMIT_ENTRIES / 2).forEach((k) => rateLimitMap.delete(k));
    }
  }
}

function generateCacheKey(
  sessionId: string,
  endpoint: string,
  params: Record<string, unknown>,
  baseUrl: string,
): string {
  return `user:${sessionId}:${baseUrl}:${endpoint}:${JSON.stringify(params)}`;
}

function getCachedResponse(key: string): unknown | null {
  const cached = proxyCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }
  if (cached) {
    proxyCache.delete(key);
  }
  return null;
}

function setCachedResponse(key: string, data: unknown): void {
  if (proxyCache.size > MAX_CACHE_SIZE) {
    const oldestKey = proxyCache.keys().next().value;
    if (oldestKey) proxyCache.delete(oldestKey);
  }
  proxyCache.set(key, { data, expiry: Date.now() + PROXY_CACHE_TTL });
}

function checkRateLimit(identifier: string): boolean {
  cleanupOldEntries();
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function getSessionId(request: NextRequest): string | null {
  return (
    request.cookies.get("clawlens_session")?.value || request.headers.get("x-session-id") || null
  );
}

const PUBLIC_BINANCE_DOMAINS = [
  "web3.binance.com",
  "api.binance.com",
  "api1.binance.com",
  "api2.binance.com",
  "api3.binance.com",
  "testnet.binance.vision",
  "www.binance.com",
];

function isPublicEndpoint(baseUrl: string): boolean {
  return PUBLIC_BINANCE_DOMAINS.some((d) => baseUrl.includes(d));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { baseUrl = "api.binance.com", sessionId: bodySessionId } = body;

  const isPublic = isPublicEndpoint(baseUrl);
  const sessionId = getSessionId(req) || bodySessionId || null;

  // Only require session for authenticated endpoints
  if (!isPublic && !sessionId) {
    return NextResponse.json(
      { error: "No session found. Please refresh the page." },
      { status: 401 },
    );
  }

  // Use session for rate limiting if available
  const rateLimitKey = sessionId || req.headers.get("x-forwarded-for") || "anonymous";

  if (!checkRateLimit(rateLimitKey)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 },
    );
  }

  try {
    // Use session-based key lookup only (more secure - keys never leave server)
    let binanceApiKey = "";
    let binanceSecretKey = "";
    if (sessionId) {
      const apiKeys = await getKeys(sessionId);
      binanceApiKey = apiKeys?.binanceApiKey || "";
      binanceSecretKey = apiKeys?.binanceSecretKey || "";
    }

    const {
      endpoint,
      method = "GET",
      params = {},
      baseUrl: requestBaseUrl = baseUrl,
      customHeaders = {},
      requiresSign = false,
      apiKey: bodyApiKey, // Fallback for onboarding
      signature: bodySignature, // Fallback for onboarding
    } = body;

    // Use body credentials if session ones are missing (onboarding flow)
    if (!binanceApiKey && bodyApiKey) {
      binanceApiKey = bodyApiKey;
    }

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    if (!ALLOWED_BINANCE_DOMAINS.some((d) => requestBaseUrl.endsWith(d) || requestBaseUrl === d)) {
      return NextResponse.json({ error: "Invalid base URL" }, { status: 400 });
    }

    if (endpoint.includes("..")) {
      return NextResponse.json({ error: "Invalid endpoint path" }, { status: 400 });
    }

    if (endpoint.length > 200) {
      return NextResponse.json({ error: "Endpoint path too long" }, { status: 400 });
    }

    const paramsString = JSON.stringify(params);
    if (paramsString.length > 10000) {
      return NextResponse.json({ error: "Request parameters too large" }, { status: 400 });
    }

    const cacheKey = generateCacheKey(sessionId || "public", endpoint, params, requestBaseUrl);
    if (method === "GET") {
      const cachedData = getCachedResponse(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData, {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
            "X-Cache": "HIT",
          },
        });
      }
    }

    const queryParams = new URLSearchParams();
    const paramsToSign: Record<string, string | number> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        const strValue = String(value);
        queryParams.append(key, strValue);
        paramsToSign[key] = strValue;
      }
    });

    let queryString = "";

    if (requiresSign && binanceSecretKey) {
      const { signature, timestamp, recvWindow } = await signQuery(paramsToSign, binanceSecretKey);

      queryParams.set("timestamp", String(timestamp));
      queryParams.set("recvWindow", String(recvWindow));
      queryParams.set("signature", signature);
      queryString = queryParams.toString();
    } else if (requiresSign && !binanceSecretKey && bodySignature) {
      // Use client-side signature for onboarding (connectivity test)
      // Note: queryParams already contains the client's timestamp and recvWindow
      queryParams.set("signature", bodySignature);
      queryString = queryParams.toString();
    } else {
      queryString = queryParams.toString();
    }

    const url = `https://${requestBaseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;

    const headers: Record<string, string> = {
      "Accept-Encoding": "identity",
      ...customHeaders,
    };

    if (requestBaseUrl.includes("web3")) {
      headers["User-Agent"] = "binance-web3/2.0 (Skill)";
    }

    if (binanceApiKey) {
      headers["X-MBX-APIKEY"] = binanceApiKey;
    }

    if (method === "POST") {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(params) : undefined,
    });

    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text, status: response.status };
      }
    }

    if (method === "GET" && response.ok) {
      setCachedResponse(cacheKey, data);
    }

    const cacheControl =
      method === "GET" ? "public, s-maxage=10, stale-while-revalidate=30" : "no-store, no-cache";

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": cacheControl,
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Binance Proxy Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
