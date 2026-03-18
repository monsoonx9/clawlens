// ---------------------------------------------------------------------------
// Dex Client - DexScreener API
// Provides DEX pair analytics, token pairs, liquidity data, price charts
// Cache TTL: 30 seconds
// ---------------------------------------------------------------------------

import { cacheGet, cacheSet, generateCacheKey } from "./cache";
import { withRetry } from "./retry";
import { getRateLimiter } from "./rateLimiter";

const DEX_SCREENER_BASE_URL = "https://api.dexscreener.com/latest";
const CACHE_TTL = 30;

export interface Token {
  address: string;
  name: string;
  symbol: string;
  logo?: string;
  priceNative: string;
  priceUsd?: string;
  transacted?: boolean;
}

export interface DexPair {
  address: string;
  chainId: string;
  dexId: string;
  pairAddress: string;
  token0: Token;
  token1: Token;
  priceUsd: string;
  priceNative: string;
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  pairLiquidity: {
    token0: number;
    token1: number;
    usd: number;
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  txns: {
    h24: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    m5: { buys: number; sells: number };
  };
  info: {
    openTime: number;
    website?: string;
    twitter?: string;
  };
}

export interface DexSearchResult {
  schema: string;
  count: number;
  pairs: DexPair[];
}

export interface DexPairResult {
  pair: DexPair;
}

export interface DexResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: "dexClient";
}

const rateLimiter = getRateLimiter();

async function fetchWithCache<T>(
  url: string,
  cachePrefix: string,
  ttl: number = CACHE_TTL,
): Promise<DexResult<T>> {
  const cacheKey = generateCacheKey(cachePrefix, url);

  const cached = await cacheGet<T>(cacheKey);
  if (cached) {
    return { success: true, data: cached, source: "dexClient" };
  }

  const result = await withRetry<T>(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }
      return response.json();
    },
    { maxAttempts: 3, baseDelay: 500 },
  );

  if (result.success && result.data) {
    await cacheSet(cacheKey, result.data, { ttl });
  }

  if (!result.success) {
    return { success: false, error: result.error, source: "dexClient" };
  }

  return { success: true, data: result.data, source: "dexClient" };
}

export async function getPairByAddress(
  chainId: string,
  pairAddress: string,
): Promise<DexResult<DexPairResult>> {
  const url = `${DEX_SCREENER_BASE_URL}/dex/pairs/${chainId}/${pairAddress}`;
  return rateLimiter.execute(() =>
    fetchWithCache<DexPairResult>(url, `dex_pair_${chainId}_${pairAddress}`, CACHE_TTL),
  );
}

export async function getTokenPairs(tokenAddress: string): Promise<DexResult<DexSearchResult>> {
  const url = `${DEX_SCREENER_BASE_URL}/tokens/${tokenAddress}`;
  return rateLimiter.execute(() =>
    fetchWithCache<DexSearchResult>(url, `dex_token_${tokenAddress}`, CACHE_TTL),
  );
}

export async function searchPairs(query: string): Promise<DexResult<DexSearchResult>> {
  const url = `${DEX_SCREENER_BASE_URL}/search?q=${encodeURIComponent(query)}`;
  return rateLimiter.execute(() =>
    fetchWithCache<DexSearchResult>(url, `dex_search_${query}`, CACHE_TTL),
  );
}

export async function getTrendingPairs(limit: number = 10): Promise<DexResult<DexSearchResult>> {
  const url = `${DEX_SCREENER_BASE_URL}/dex/trending`;
  const result = await rateLimiter.execute(() =>
    fetchWithCache<DexSearchResult>(url, "dex_trending", CACHE_TTL),
  );

  if (result.success && result.data) {
    result.data.pairs = result.data.pairs.slice(0, limit);
    result.data.count = result.data.pairs.length;
  }

  return result;
}

export async function getPairsByChain(
  chainId: string,
  sortBy: "pairAddress" | "liquidity" | "volume" | "priceChange" = "liquidity",
  limit: number = 20,
): Promise<DexResult<DexSearchResult>> {
  const url = `${DEX_SCREENER_BASE_URL}/dex/pairs/${chainId}?sort=${sortBy}&limit=${limit}`;
  return rateLimiter.execute(() =>
    fetchWithCache<DexSearchResult>(url, `dex_chain_${chainId}`, CACHE_TTL),
  );
}

export async function getDexArbitrageOpportunities(
  minLiquidity: number = 10000,
): Promise<DexResult<Array<{ pair1: DexPair; pair2: DexPair; profitPercent: number }>>> {
  const result = await getTrendingPairs(50);

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || "Failed to fetch trending pairs",
      source: "dexClient",
    };
  }

  const opportunities: Array<{
    pair1: DexPair;
    pair2: DexPair;
    profitPercent: number;
  }> = [];

  for (let i = 0; i < result.data.pairs.length; i++) {
    for (let j = i + 1; j < result.data.pairs.length; j++) {
      const pair1 = result.data.pairs[i];
      const pair2 = result.data.pairs[j];

      if (
        pair1.token0.address === pair2.token0.address ||
        pair1.token0.address === pair2.token1.address ||
        pair1.token1.address === pair2.token0.address ||
        pair1.token1.address === pair2.token1.address
      ) {
        const price1 = parseFloat(pair1.priceUsd || "0");
        const price2 = parseFloat(pair2.priceUsd || "0");

        if (price1 > 0 && price2 > 0 && Math.abs(price1 - price2) / price1 > 0.02) {
          const profitPercent = (Math.abs(price1 - price2) / Math.min(price1, price2)) * 100;

          if (pair1.liquidity.usd > minLiquidity && pair2.liquidity.usd > minLiquidity) {
            opportunities.push({ pair1, pair2, profitPercent });
          }
        }
      }
    }
  }

  opportunities.sort((a, b) => b.profitPercent - a.profitPercent);

  return {
    success: true,
    data: opportunities.slice(0, 10),
    source: "dexClient",
  };
}

export async function getTokenBattleData(
  tokenAddress1: string,
  tokenAddress2: string,
): Promise<
  DexResult<{
    token1: {
      pairs: DexPair[];
      totalLiquidity: number;
      totalVolume24h: number;
    };
    token2: {
      pairs: DexPair[];
      totalLiquidity: number;
      totalVolume24h: number;
    };
  }>
> {
  const [result1, result2] = await Promise.all([
    getTokenPairs(tokenAddress1),
    getTokenPairs(tokenAddress2),
  ]);

  if (!result1.success || !result2.success) {
    return {
      success: false,
      error: "Failed to fetch token data",
      source: "dexClient",
    };
  }

  const getStats = (pairs: DexPair[]) => ({
    pairs,
    totalLiquidity: pairs.reduce((sum, p) => sum + p.liquidity.usd, 0),
    totalVolume24h: pairs.reduce((sum, p) => sum + p.volume.h24, 0),
  });

  return {
    success: true,
    data: {
      token1: getStats(result1.data?.pairs || []),
      token2: getStats(result2.data?.pairs || []),
    },
    source: "dexClient",
  };
}
