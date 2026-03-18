// ---------------------------------------------------------------------------
// Security Client - GoPlus API
// Provides token security analysis, honeypot check, contract X-Ray, approval scanner
// Cache TTL: 5 minutes
// ---------------------------------------------------------------------------

import { cacheGet, cacheSet, generateCacheKey } from "./cache";
import { withRetry } from "./retry";
import { getRateLimiter } from "./rateLimiter";

const GOPLUS_BASE_URL = "https://api.gopluslabs.io/api/v1";
const CACHE_TTL = 300;

export interface TokenSecurityResponse {
  contract_address: string;
  is_honeypot: number;
  is_open_source: number;
  is_verified: number;
  mint_function: string;
  owner_address: string;
  owner_balance: string;
  total_supply: string;
  holders: Array<{ address: string; balance: string; percent: string }>;
  lp_holders: Array<{ address: string; balance: string; percent: string }>;
  lp_total_supply: string;
  is_mintable: number;
  owner_can_mint: number;
  can_take_back_ownership: number;
  hidden_owner: number;
  is_anti_whale: number;
  is_blacklisted: number;
  is_whitelisted: number;
}

export interface TokenSecurityResult {
  success: boolean;
  data?: TokenSecurityResponse;
  error?: string;
  source: "securityClient";
}

export interface ApprovalResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  source: "securityClient";
}

const rateLimiter = getRateLimiter();

async function fetchWithRetry<T>(
  url: string,
  cacheKey?: string,
): Promise<{ success: boolean; data?: T; error?: string }> {
  if (cacheKey) {
    const cached = await cacheGet<T>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }
  }

  const result = await withRetry<T>(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`GoPlus API error: ${response.status}`);
      }
      return response.json();
    },
    { maxAttempts: 3, baseDelay: 500 },
  );

  if (result.success && result.data && cacheKey) {
    await cacheSet(cacheKey, result.data, { ttl: CACHE_TTL });
  }

  return result;
}

export async function getTokenSecurity(
  chainId: number,
  tokenAddress: string,
): Promise<TokenSecurityResult> {
  const endpoint = `/token_security/${chainId}/${tokenAddress}`;
  const url = `${GOPLUS_BASE_URL}${endpoint}`;
  const cacheKey = generateCacheKey("goplus", "token_security", String(chainId), tokenAddress);

  return rateLimiter.execute(async () => {
    const result = await fetchWithRetry<TokenSecurityResponse>(url, cacheKey);

    if (!result.success) {
      return { success: false, error: result.error, source: "securityClient" };
    }

    return { success: true, data: result.data, source: "securityClient" };
  });
}

export async function getTokenSecurityMultiple(
  chainId: number,
  tokenAddresses: string[],
): Promise<Record<string, TokenSecurityResult>> {
  const results: Record<string, TokenSecurityResult> = {};

  const promises = tokenAddresses.map(async (address) => {
    const result = await getTokenSecurity(chainId, address);
    return { address, result };
  });

  const resolved = await Promise.all(promises);

  for (const { address, result } of resolved) {
    results[address] = result;
  }

  return results;
}

export async function getContractAudit(
  chainId: number,
  tokenAddress: string,
): Promise<TokenSecurityResult> {
  return getTokenSecurity(chainId, tokenAddress);
}

export async function checkHoneypot(
  chainId: number,
  tokenAddress: string,
): Promise<{ success: boolean; isHoneypot?: boolean; error?: string }> {
  const result = await getTokenSecurity(chainId, tokenAddress);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const isHoneypot = result.data.is_honeypot === 1;
  return { success: true, isHoneypot };
}

export async function getApprovals(chainId: number, address: string): Promise<ApprovalResult> {
  const endpoint = `/approve_list/${chainId}/${address}`;
  const url = `${GOPLUS_BASE_URL}${endpoint}`;
  const cacheKey = generateCacheKey("goplus", "approvals", String(chainId), address);

  return rateLimiter.execute(async () => {
    const result = await fetchWithRetry<Record<string, unknown>>(url, cacheKey);

    if (!result.success) {
      return { success: false, error: result.error, source: "securityClient" };
    }

    return { success: true, data: result.data, source: "securityClient" };
  });
}
