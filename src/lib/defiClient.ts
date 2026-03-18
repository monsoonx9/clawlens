// ---------------------------------------------------------------------------
// DeFi Client - DeFiLlama API
// Provides yield farming data, DeFi protocols, TVL, staking info
// Cache TTL: 2 minutes
// ---------------------------------------------------------------------------

import { cacheGet, cacheSet, generateCacheKey } from "./cache";
import { withRetry } from "./retry";
import { getRateLimiter } from "./rateLimiter";

const DEFI_LLAMA_BASE_URL = "https://api.llama.fi";
const CACHE_TTL = 120;

export interface Protocol {
  chainId: string;
  name: string;
  slug: string;
  symbol: string;
  tvl: number;
  chainTvls: Record<string, number>;
  change_1h: number;
  change_24h: number;
  change_7d: number;
  category: string;
  description?: string;
  url?: string;
  logo?: string;
}

export interface YieldPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  rewardTokens?: string[];
  underlyingTokens?: string[];
  url?: string;
}

export interface ChainTvl {
  name: string;
  tvl: number;
  tvlHistory: Array<{ date: number; totalLiquidityUSD: number }>;
}

export interface DeFiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: "defiClient";
}

const rateLimiter = getRateLimiter();

async function fetchWithCache<T>(
  endpoint: string,
  cachePrefix: string,
  ttl: number = CACHE_TTL,
): Promise<DeFiResult<T>> {
  const cacheKey = generateCacheKey(cachePrefix, endpoint);

  const cached = await cacheGet<T>(cacheKey);
  if (cached) {
    return { success: true, data: cached, source: "defiClient" };
  }

  const result = await withRetry<T>(
    async () => {
      const response = await fetch(`${DEFI_LLAMA_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`DeFiLlama API error: ${response.status}`);
      }
      return response.json();
    },
    { maxAttempts: 3, baseDelay: 500 },
  );

  if (result.success && result.data) {
    await cacheSet(cacheKey, result.data, { ttl });
  }

  if (!result.success) {
    return { success: false, error: result.error, source: "defiClient" };
  }

  return { success: true, data: result.data, source: "defiClient" };
}

export async function getProtocols(): Promise<DeFiResult<Protocol[]>> {
  return rateLimiter.execute(() => fetchWithCache<Protocol[]>("/protocols", "defi_protocols"));
}

export async function getProtocol(slug: string): Promise<DeFiResult<Protocol>> {
  return rateLimiter.execute(() =>
    fetchWithCache<Protocol>(`/protocol/${slug}`, `defi_protocol_${slug}`),
  );
}

export async function getChainTvls(): Promise<DeFiResult<ChainTvl[]>> {
  return rateLimiter.execute(() => fetchWithCache<ChainTvl[]>("/v2/chains", "defi_chains"));
}

export async function getYieldPools(
  chain?: string,
  minTvl?: number,
): Promise<DeFiResult<YieldPool[]>> {
  let endpoint = "/v2/yields";
  const params: string[] = [];

  if (chain) params.push(`chain=${chain}`);
  if (minTvl) params.push(`minTvl=${minTvl}`);

  if (params.length > 0) {
    endpoint += `?${params.join("&")}`;
  }

  return rateLimiter.execute(() =>
    fetchWithCache<YieldPool[]>(endpoint, `defi_yields_${chain || "all"}`, 60),
  );
}

export async function getYieldForPool(poolAddress: string): Promise<DeFiResult<YieldPool | null>> {
  return rateLimiter.execute(() =>
    fetchWithCache<YieldPool>(`/v2/yields/pool/${poolAddress}`, `defi_pool_${poolAddress}`, 60),
  );
}

export async function getStakingRewards(chain: string): Promise<DeFiResult<YieldPool[]>> {
  return rateLimiter.execute(() =>
    fetchWithCache<YieldPool[]>(
      `/v2/yields?chain=${chain}&category=Staking`,
      `defi_staking_${chain}`,
      60,
    ),
  );
}

export async function getDefiLeaderboard(
  sortBy: "tvl" | "change_24h" | "apy" = "tvl",
  limit: number = 50,
): Promise<DeFiResult<Protocol[]>> {
  const result = await getProtocols();

  if (!result.success || !result.data) {
    return result;
  }

  let sorted = [...result.data];

  switch (sortBy) {
    case "tvl":
      sorted = sorted.sort((a, b) => b.tvl - a.tvl);
      break;
    case "change_24h":
      sorted = sorted.sort((a, b) => b.change_24h - a.change_24h);
      break;
    case "apy":
      break;
  }

  return { success: true, data: sorted.slice(0, limit), source: "defiClient" };
}

export async function getTopYieldFarms(limit: number = 20): Promise<DeFiResult<YieldPool[]>> {
  const result = await getYieldPools();

  if (!result.success || !result.data) {
    return result;
  }

  const sorted = result.data
    .filter((p) => p.apy && p.apy > 0)
    .sort((a, b) => b.apy - a.apy)
    .slice(0, limit);

  return { success: true, data: sorted, source: "defiClient" };
}
