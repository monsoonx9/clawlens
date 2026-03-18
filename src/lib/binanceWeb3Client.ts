const WEB3_BASE_URL = "https://web3.binance.com";
const DQUERY_BASE_URL = "https://dquery.sintral.io";

import { dedupedFetch } from "./requestDedupe";

const DEFAULT_HEADERS = {
  "Accept-Encoding": "identity",
  "Content-Type": "application/json",
};

const createHeaders = (userAgent: string) => ({
  ...DEFAULT_HEADERS,
  "User-Agent": userAgent,
});

async function web3Fetch<T>(
  url: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
  userAgent: string = "binance-web3/1.0 (Skill)",
): Promise<T> {
  // Check if we are in the browser - use proxy to avoid CORS
  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    // Extract the path and base URL
    const isWeb3 = url.includes("web3.binance.com");
    const isDquery = url.includes("dquery.sintral.io");

    let baseUrl = "api.binance.com";
    let endpoint = url;

    if (isWeb3) {
      baseUrl = "web3.binance.com";
      endpoint = url.replace("https://web3.binance.com", "");
    } else if (isDquery) {
      baseUrl = "dquery.sintral.io";
      endpoint = url.replace("https://dquery.sintral.io", "");
    }

    // Use proxy with deduplication
    const fetchKey = `web3:${endpoint}:${JSON.stringify(body || {})}`;

    return dedupedFetch<T>(fetchKey, body || {}, async () => {
      const proxyResponse = await fetch("/api/binance/proxy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          method,
          params: body || {},
          baseUrl,
        }),
      });

      if (!proxyResponse.ok) {
        throw new Error(`Proxy error: ${proxyResponse.status} ${proxyResponse.statusText}`);
      }

      const data = await proxyResponse.json();

      if (data.code && data.code !== "000000") {
        throw new Error(`Web3 API error [${data.code}]: ${data.message || "Unknown error"}`);
      }

      return data;
    });
  }

  // Server-side: direct fetch
  const options: RequestInit = {
    method,
    headers: createHeaders(userAgent),
  };

  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Web3 API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.code && data.code !== "000000") {
    throw new Error(`Web3 API error [${data.code}]: ${data.message || "Unknown error"}`);
  }

  return data;
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

// ============================================================================
// Type Definitions
// ============================================================================

export type ChainId = "1" | "56" | "8453" | "CT_501";
export type ChainName = "Ethereum" | "BSC" | "Base" | "Solana";

export const CHAIN_INFO: Record<ChainId, { name: ChainName; platform: string }> = {
  "1": { name: "Ethereum", platform: "ethereum" },
  "56": { name: "BSC", platform: "bsc" },
  "8453": { name: "Base", platform: "base" },
  CT_501: { name: "Solana", platform: "solana" },
};

// ============================================================================
// Crypto Market Rank Types
// ============================================================================

export interface SocialHypeToken {
  chainId: string;
  contractAddress: string;
  symbol: string;
  logo: string;
  price: string;
  marketCap: string;
  priceChange: string;
  socialHype: number;
  sentiment: "Positive" | "Negative" | "Neutral";
  socialSummaryBrief: string;
  socialSummaryDetail: string;
}

export interface UnifiedToken {
  chainId: string;
  contractAddress: string;
  symbol: string;
  name: string;
  icon: string;
  price: string;
  marketCap: string;
  liquidity: string;
  holders: string;
  launchTime: string;
  decimals: number;
  percentChange1m: string;
  percentChange5m: string;
  percentChange1h: string;
  percentChange4h: string;
  percentChange24h: string;
  volume1m: string;
  volume5m: string;
  volume1h: string;
  volume4h: string;
  volume24h: string;
  count1m: string;
  count5m: string;
  count1h: string;
  count4h: string;
  count24h: string;
  uniqueTrader1m: string;
  uniqueTrader5m: string;
  uniqueTrader1h: string;
  uniqueTrader4h: string;
  uniqueTrader24h: string;
  alphaInfo?: {
    tagList: string[];
    description: string;
  };
  auditInfo?: {
    riskLevel: string;
    riskNum: number;
    cautionNum: number;
  };
  tokenTag?: Record<string, Array<{ tagName: string; languageKey: string }>>;
  kycHolders?: string;
  holdersTop10Percent?: string;
}

export interface SmartMoneyInflowToken {
  chainId: string;
  tokenName: string;
  tokenIconUrl: string;
  contractAddress: string;
  price: string;
  marketCap: string;
  volume: string;
  priceChangeRate: string;
  liquidity: string;
  holders: string;
  kycHolders: string;
  holdersTop10Percent: string;
  count: string;
  countBuy: string;
  countSell: string;
  inflow: number;
  traders: number;
  launchTime: number;
  tokenDecimals: number;
  tokenRiskLevel: number;
  link: Array<{ label: string; link: string }>;
  tokenTag: Record<string, Array<{ tagName: string; languageKey: string }>>;
}

export interface MemeToken {
  chainId: string;
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
  price: string;
  priceChange: string;
  priceChange7d: string;
  marketCap: string;
  liquidity: string;
  volume: string;
  holders: number;
  progress: string;
  protocol: number;
  exclusive: number;
  count: number;
  countBuy: number;
  countSell: number;
  holdersTop10Percent: string;
  holdersDevPercent: string;
  holdersSniperPercent: string;
  holdersInsiderPercent: string;
  bnHoldingPercent: string;
  kolHoldingPercent: string;
  proHoldingPercent: string;
  newWalletHoldingPercent: string;
  bundlerHoldingPercent: string;
  devAddress: string;
  devSellPercent: string;
  devMigrateCount: number;
  devPosition: number;
  migrateStatus: number;
  migrateTime: number;
  createTime: number;
  tagDevWashTrading: number;
  tagInsiderWashTrading: number;
  tagDevBurnedToken: number;
  tagPumpfunLiving: number;
  tagCmcBoost: number;
  paidOnDexScreener: number;
  launchTaxEnable: number;
  taxRate: string;
  globalFee: string;
  socials: {
    website?: string;
    twitter?: string;
    telegram?: string;
  };
  narrativeText?: {
    en?: string;
    cn?: string;
  };
}

export interface TopicRush {
  topicId: string;
  chainId: string;
  name: { topicNameEn: string; topicNameCn: string };
  type: string;
  close: number;
  topicLink: string;
  createTime: number;
  progress: string;
  aiSummary: { en: string; cn: string };
  topicNetInflow: string;
  topicNetInflow1h: string;
  topicNetInflowAth: string;
  tokenSize: number;
  deepAnalysisFlag: number;
  tokenList: Array<{
    chainId: string;
    contractAddress: string;
    symbol: string;
    icon: string;
    decimals: number;
    createTime: number;
    marketCap: string;
    liquidity: string;
    priceChange24h: string;
    netInflow: string;
    netInflow1h: string;
    volumeBuy: string;
    volumeSell: string;
    volume1hBuy: string;
    volume1hSell: string;
    uniqueTrader5m: number;
    uniqueTrader1h: number;
    uniqueTrader4h: number;
    uniqueTrader24h: number;
    count5m: number;
    count1h: number;
    count4h: number;
    count24h: number;
    holders: number;
    kolHolders: number;
    smartMoneyHolders: number;
    protocol: number;
    internal: number;
    migrateStatus: number;
  }>;
}

export interface AddressPnlRank {
  address: string;
  addressLogo: string;
  addressLabel: string;
  balance: string;
  tags: string[];
  realizedPnl: string;
  realizedPnlPercent: string;
  dailyPNL: Array<{ realizedPnl: string; dt: string }>;
  winRate: string;
  totalVolume: string;
  buyVolume: string;
  sellVolume: string;
  avgBuyVolume: string;
  totalTxCnt: number;
  buyTxCnt: number;
  sellTxCnt: number;
  totalTradedTokens: number;
  topEarningTokens: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    tokenUrl: string;
    realizedPnl: string;
    profitRate: string;
  }>;
  tokenDistribution: {
    gt500Cnt: number;
    between0And500Cnt: number;
    between0AndNegative50Cnt: number;
    ltNegative50Cnt: number;
  };
  lastActivity: number;
  genericAddressTagList: Array<{
    tagName: string;
    logoUrl: string;
    extraInfo: string;
  }>;
}

// ============================================================================
// Query Address Info Types
// ============================================================================

export interface AddressTokenBalance {
  chainId: string;
  address: string;
  contractAddress: string;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
  price: string;
  percentChange24h: string;
  remainQty: string;
}

export interface AddressBalanceResponse {
  offset: number;
  addressStatus: unknown;
  list: AddressTokenBalance[];
}

// ============================================================================
// Query Token Audit Types
// ============================================================================

export interface TokenAuditRiskItem {
  id: string;
  name: string;
  details: Array<{
    title: string;
    description: string;
    isHit: boolean;
    riskType: "RISK" | "CAUTION";
  }>;
}

export interface TokenAudit {
  requestId: string;
  hasResult: boolean;
  isSupported: boolean;
  riskLevelEnum: "LOW" | "MEDIUM" | "HIGH" | null;
  riskLevel: number;
  extraInfo: {
    buyTax: string | null;
    sellTax: string | null;
    isVerified: boolean;
  };
  riskItems: TokenAuditRiskItem[];
}

export interface TokenAuditResponse {
  requestId: string;
  hasResult: boolean;
  isSupported: boolean;
  riskLevelEnum: string;
  riskLevel: number;
  extraInfo: {
    buyTax: string | null;
    sellTax: string | null;
    isVerified: boolean;
  };
  riskItems: TokenAuditRiskItem[];
}

// ============================================================================
// Query Token Info Types
// ============================================================================

export interface TokenSearchResult {
  chainId: string;
  contractAddress: string;
  tokenId: string;
  name: string;
  symbol: string;
  icon: string;
  price: string;
  percentChange24h: string;
  volume24h: string;
  marketCap: string;
  liquidity: string;
  tagsInfo: Record<string, Array<{ tagName: string; languageKey: string }>>;
  links: Array<{ label: string; link: string }>;
  createTime: number;
  holdersTop10Percent: string;
  riskLevel: unknown;
}

export interface TokenMetadata {
  tokenId: string;
  name: string;
  symbol: string;
  chainId: string;
  chainName: string;
  chainIconUrl: string;
  contractAddress: string;
  decimals: number;
  icon: string;
  nativeAddressFlag: boolean;
  aiNarrativeFlag: number;
  links: Array<{ label: string; link: string }>;
  previewLink: {
    website: string[];
    x: string[];
    tg: string[];
  };
  createTime: number;
  creatorAddress: string;
  auditInfo: {
    isBlacklist: boolean;
    isWhitelist: boolean;
  };
  description: string;
}

export interface TokenDynamicData {
  price: string;
  nativeTokenPrice: string;
  volume24h: string;
  volume24hBuy: string;
  volume24hSell: string;
  volume4h: string;
  volume1h: string;
  volume5m: string;
  count24h: string;
  count24hBuy: string;
  count24hSell: string;
  percentChange5m: string;
  percentChange1h: string;
  percentChange4h: string;
  percentChange24h: string;
  marketCap: string;
  totalSupply: string;
  circulatingSupply: string;
  priceHigh24h: string;
  priceLow24h: string;
  holders: string;
  fdv: string;
  liquidity: string;
  launchTime: number;
  top10HoldersPercentage: string;
  kycHolderCount: string;
  kolHolders: string;
  kolHoldingPercent: string;
  devHoldingPercent: string;
  proHolders: string;
  proHoldingPercent: string;
  smartMoneyHolders: string;
  smartMoneyHoldingPercent: string;
}

export interface TokenKline {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  count: number;
}

// ============================================================================
// Trading Signal Types
// ============================================================================

export interface SmartMoneySignal {
  signalId: number;
  ticker: string;
  chainId: string;
  contractAddress: string;
  logoUrl: string;
  chainLogoUrl: string;
  tokenDecimals: number;
  isAlpha: boolean;
  launchPlatform: string;
  mark: unknown;
  isExclusiveLaunchpad: boolean;
  alphaPoint: unknown;
  tokenTag: Record<string, Array<{ tagName: string; languageKey: string }>>;
  smartSignalType: string;
  smartMoneyCount: number;
  direction: "buy" | "sell";
  timeFrame: number;
  signalTriggerTime: number;
  totalTokenValue: string;
  alertPrice: string;
  alertMarketCap: string;
  currentPrice: string;
  currentMarketCap: string;
  highestPrice: string;
  highestPriceTime: number;
  exitRate: number;
  status: "active" | "timeout" | "completed";
  maxGain: string;
  signalCount: number;
}

// ============================================================================
// API Functions - Crypto Market Rank
// ============================================================================

/**
 * Get social hype leaderboard - tokens with highest social buzz
 */
export async function getSocialHypeLeaderboard(
  chainId: ChainId = "56",
  sentiment: "All" | "Positive" | "Negative" | "Neutral" = "All",
  timeRange: 1 = 1,
  targetLanguage: string = "en",
): Promise<SocialHypeToken[]> {
  const params = buildQueryString({
    chainId,
    sentiment,
    targetLanguage,
    timeRange,
    socialLanguage: "ALL",
  });

  const response = await web3Fetch<{
    data: {
      leaderBoardList: Array<{
        metaInfo: {
          logo: string;
          symbol: string;
          chainId: string;
          contractAddress: string;
          tokenAge: number;
        };
        marketInfo: {
          marketCap: number;
          priceChange: number;
        };
        socialHypeInfo: {
          socialHype: number;
          sentiment: string;
          socialSummaryBrief: string;
          socialSummaryDetail: string;
        };
      }>;
    };
  }>(
    `${WEB3_BASE_URL}/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/pulse/social/hype/rank/leaderboard?${params}`,
  );

  return response.data.leaderBoardList.map((item) => ({
    chainId: item.metaInfo.chainId,
    contractAddress: item.metaInfo.contractAddress,
    symbol: item.metaInfo.symbol,
    logo: `https://bin.bnbstatic.com${item.metaInfo.logo}`,
    price: "",
    marketCap: String(item.marketInfo.marketCap),
    priceChange: String(item.marketInfo.priceChange),
    socialHype: item.socialHypeInfo.socialHype,
    sentiment: item.socialHypeInfo.sentiment as "Positive" | "Negative" | "Neutral",
    socialSummaryBrief: item.socialHypeInfo.socialSummaryBrief,
    socialSummaryDetail: item.socialHypeInfo.socialSummaryDetail,
  }));
}

/**
 * Get unified token rank - trending, alpha, stock tokens
 */
export interface UnifiedTokenRankParams {
  rankType: 10 | 11 | 20 | 40; // 10=Trending, 11=TopSearch, 20=Alpha, 40=Stock
  chainId?: ChainId;
  period?: 10 | 20 | 30 | 40 | 50;
  sortBy?: number;
  orderAsc?: boolean;
  page?: number;
  size?: number;
  filters?: {
    percentChangeMin?: number;
    percentChangeMax?: number;
    marketCapMin?: number;
    marketCapMax?: number;
    volumeMin?: number;
    volumeMax?: number;
    liquidityMin?: number;
    liquidityMax?: number;
    holdersMin?: number;
    holdersMax?: number;
    keywords?: string[];
    excludes?: string[];
  };
}

export async function getUnifiedTokenRank(params: UnifiedTokenRankParams): Promise<{
  tokens: UnifiedToken[];
  total: number;
  page: number;
  size: number;
}> {
  const body: Record<string, unknown> = {
    rankType: params.rankType,
    period: params.period || 50,
    sortBy: params.sortBy || 0,
    orderAsc: params.orderAsc || false,
    page: params.page || 1,
    size: params.size || 200,
  };

  if (params.chainId) body.chainId = params.chainId;
  if (params.filters) {
    Object.assign(body, params.filters);
  }

  const response = await web3Fetch<{
    data: {
      tokens: Array<Record<string, unknown>>;
      total: number;
      page: number;
      size: number;
    };
  }>(
    `${WEB3_BASE_URL}/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/pulse/unified/rank/list`,
    "POST",
    body,
  );

  return {
    tokens: response.data.tokens.map(parseUnifiedToken),
    total: response.data.total,
    page: response.data.page,
    size: response.data.size,
  };
}

function parseUnifiedToken(raw: Record<string, unknown>): UnifiedToken {
  return {
    chainId: String(raw.chainId),
    contractAddress: String(raw.contractAddress),
    symbol: String(raw.symbol),
    name: String(raw.name),
    icon: `https://bin.bnbstatic.com${raw.icon}`,
    price: String(raw.price),
    marketCap: String(raw.marketCap),
    liquidity: String(raw.liquidity),
    holders: String(raw.holders),
    launchTime: String(raw.launchTime),
    decimals: Number(raw.decimals),
    percentChange1m: String(raw.percentChange1m || 0),
    percentChange5m: String(raw.percentChange5m || 0),
    percentChange1h: String(raw.percentChange1h || 0),
    percentChange4h: String(raw.percentChange4h || 0),
    percentChange24h: String(raw.percentChange24h || 0),
    volume1m: String(raw.volume1m || 0),
    volume5m: String(raw.volume5m || 0),
    volume1h: String(raw.volume1h || 0),
    volume4h: String(raw.volume4h || 0),
    volume24h: String(raw.volume24h || 0),
    count1m: String(raw.count1m || 0),
    count5m: String(raw.count5m || 0),
    count1h: String(raw.count1h || 0),
    count4h: String(raw.count4h || 0),
    count24h: String(raw.count24h || 0),
    uniqueTrader1m: String(raw.uniqueTrader1m || 0),
    uniqueTrader5m: String(raw.uniqueTrader5m || 0),
    uniqueTrader1h: String(raw.uniqueTrader1h || 0),
    uniqueTrader4h: String(raw.uniqueTrader4h || 0),
    uniqueTrader24h: String(raw.uniqueTrader24h || 0),
    alphaInfo: raw.alphaInfo as UnifiedToken["alphaInfo"],
    auditInfo: raw.auditInfo as UnifiedToken["auditInfo"],
    tokenTag: raw.tokenTag as UnifiedToken["tokenTag"],
    kycHolders: String(raw.kycHolders || 0),
    holdersTop10Percent: String(raw.holdersTop10Percent || 0),
  };
}

/**
 * Get smart money inflow rank - tokens smart money is buying
 */
export async function getSmartMoneyInflowRank(
  chainId: ChainId = "56",
  period: "5m" | "1h" | "4h" | "24h" = "24h",
): Promise<SmartMoneyInflowToken[]> {
  const response = await web3Fetch<{ data: Array<Record<string, unknown>> }>(
    `${WEB3_BASE_URL}/bapi/defi/v1/public/wallet-direct/tracker/wallet/token/inflow/rank/query`,
    "POST",
    {
      chainId,
      period,
      tagType: 2, // Always 2 for smart money
    },
  );

  return response.data.map((item) => ({
    chainId,
    tokenName: String(item.tokenName),
    tokenIconUrl: `https://bin.bnbstatic.com${item.tokenIconUrl}`,
    contractAddress: String(item.ca),
    price: String(item.price),
    marketCap: String(item.marketCap),
    volume: String(item.volume),
    priceChangeRate: String(item.priceChangeRate),
    liquidity: String(item.liquidity),
    holders: String(item.holders),
    kycHolders: String(item.kycHolders),
    holdersTop10Percent: String(item.holdersTop10Percent),
    count: String(item.count),
    countBuy: String(item.countBuy),
    countSell: String(item.countSell),
    inflow: Number(item.inflow),
    traders: Number(item.traders),
    launchTime: Number(item.launchTime),
    tokenDecimals: Number(item.tokenDecimals),
    tokenRiskLevel: Number(item.tokenRiskLevel),
    link: (item.link as Array<{ label: string; link: string }>) || [],
    tokenTag:
      (item.tokenTag as Record<string, Array<{ tagName: string; languageKey: string }>>) || {},
  }));
}

/**
 * Get meme token rank from Pulse launchpad
 */
export async function getMemeRank(chainId: ChainId = "56"): Promise<MemeToken[]> {
  const params = buildQueryString({ chainId });

  const response = await web3Fetch<{
    data: { tokens: Array<Record<string, unknown>> };
  }>(
    `${WEB3_BASE_URL}/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/pulse/exclusive/rank/list?${params}`,
  );

  return response.data.tokens.map(parseMemeToken);
}

function parseMemeToken(raw: Record<string, unknown>): MemeToken {
  const metaInfo = (raw.metaInfo as Record<string, unknown>) || {};
  return {
    chainId: String(raw.chainId),
    contractAddress: String(raw.contractAddress),
    symbol: String(raw.symbol),
    name: String(metaInfo.name || raw.symbol),
    decimals: Number(raw.decimals || 18),
    icon: `https://bin.bnbstatic.com${raw.icon || metaInfo.icon || ""}`,
    price: String(raw.price),
    priceChange: String(raw.percentChange),
    priceChange7d: String(raw.percentChange7d),
    marketCap: String(raw.marketCap),
    liquidity: String(raw.liquidity),
    volume: String(raw.volume),
    holders: Number(raw.holders),
    progress: String(raw.progress),
    protocol: Number(raw.protocol),
    exclusive: Number(raw.exclusive),
    count: Number(raw.count),
    countBuy: Number(raw.countBnTotal) || Number(raw.countBuy) || 0,
    countSell: Number(raw.countSell) || 0,
    holdersTop10Percent: String(raw.holdersTop10Percent),
    holdersDevPercent: String(raw.holdersDevPercent),
    holdersSniperPercent: String(raw.holdersSniperPercent),
    holdersInsiderPercent: String(raw.holdersInsiderPercent),
    bnHoldingPercent: String(raw.bnHoldingPercent),
    kolHoldingPercent: String(raw.kolHoldingPercent),
    proHoldingPercent: String(raw.proHoldingPercent),
    newWalletHoldingPercent: String(raw.newWalletHoldingPercent),
    bundlerHoldingPercent: String(raw.bundlerHoldingPercent),
    devAddress: String(raw.devAddress || ""),
    devSellPercent: String(raw.devSellPercent),
    devMigrateCount: Number(raw.devMigrateCount),
    devPosition: Number(raw.devPosition),
    migrateStatus: Number(raw.migrateStatus),
    migrateTime: Number(raw.migrateTime),
    createTime: Number(raw.createTime),
    tagDevWashTrading: Number(raw.tagDevWashTrading),
    tagInsiderWashTrading: Number(raw.tagInsiderWashTrading),
    tagDevBurnedToken: Number(raw.tagDevBurnedToken),
    tagPumpfunLiving: Number(raw.tagPumpfunLiving),
    tagCmcBoost: Number(raw.tagCmcBoost),
    paidOnDexScreener: Number(raw.paidOnDexScreener),
    launchTaxEnable: Number(raw.launchTaxEnable),
    taxRate: String(raw.taxRate),
    globalFee: String(raw.globalFee),
    socials: (raw.previewLink as Record<string, string[]>) || {},
    narrativeText: raw.narrativeText as MemeToken["narrativeText"],
  };
}

/**
 * Get address PnL leaderboard - top traders
 */
export async function getAddressPnlRank(
  chainId: ChainId = "56",
  period: "7d" | "30d" | "90d" = "30d",
  tag: "ALL" | "KOL" = "ALL",
  pageNo: number = 1,
  pageSize: number = 25,
  sortBy: number = 0,
  orderBy: number = 0,
): Promise<{
  data: AddressPnlRank[];
  current: number;
  size: number;
  pages: number;
}> {
  const params = buildQueryString({
    chainId,
    period,
    tag,
    pageNo,
    pageSize,
    sortBy,
    orderBy,
  });

  const response = await web3Fetch<{
    data: {
      data: AddressPnlRank[];
      current: number;
      size: number;
      pages: number;
    };
  }>(`${WEB3_BASE_URL}/bapi/defi/v1/public/wallet-direct/market/leaderboard/query?${params}`);

  return response.data;
}

// ============================================================================
// API Functions - Meme Rush
// ============================================================================

export interface MemeRushParams {
  chainId: ChainId;
  rankType: 10 | 20 | 30; // 10=New, 20=Finalizing, 30=Migrated
  limit?: number;
  keywords?: string[];
  excludes?: string[];
  filters?: {
    progressMin?: number;
    progressMax?: number;
    holdersMin?: number;
    holdersMax?: number;
    liquidityMin?: number;
    liquidityMax?: number;
    volumeMin?: number;
    volumeMax?: number;
    marketCapMin?: number;
    marketCapMax?: number;
    holdersTop10PercentMin?: number;
    holdersTop10PercentMax?: number;
    holdersDevPercentMax?: number;
    excludeDevWashTrading?: boolean;
    excludeInsiderWashTrading?: boolean;
    devBurnedToken?: boolean;
  };
}

export async function getMemeRushList(params: MemeRushParams): Promise<MemeToken[]> {
  const body: Record<string, unknown> = {
    chainId: params.chainId,
    rankType: params.rankType,
    limit: params.limit || 40,
  };

  if (params.keywords) body.keywords = params.keywords;
  if (params.excludes) body.excludes = params.excludes;
  if (params.filters) {
    Object.assign(body, params.filters);
  }

  const response = await web3Fetch<{ data: Array<Record<string, unknown>> }>(
    `${WEB3_BASE_URL}/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/pulse/rank/list`,
    "POST",
    body,
  );

  return response.data.map(parseMemeToken);
}

export interface TopicRushParams {
  chainId: ChainId;
  rankType: 10 | 20 | 30; // 10=Latest, 20=Rising, 30=Viral
  sort?: 10 | 20 | 30;
  asc?: boolean;
  keywords?: string;
  tokenSizeMin?: number;
  tokenSizeMax?: number;
  netInflowMin?: number;
  netInflowMax?: number;
}

export async function getTopicRushList(params: TopicRushParams): Promise<TopicRush[]> {
  const queryParams: Record<string, unknown> = {
    chainId: params.chainId,
    rankType: params.rankType,
    sort: params.sort || (params.rankType === 30 ? 30 : 10),
  };

  if (params.asc !== undefined) queryParams.asc = params.asc;
  if (params.keywords) queryParams.keywords = params.keywords;
  if (params.tokenSizeMin) queryParams.tokenSizeMin = params.tokenSizeMin;
  if (params.tokenSizeMax) queryParams.tokenSizeMax = params.tokenSizeMax;
  if (params.netInflowMin) queryParams.netInflowMin = params.netInflowMin;
  if (params.netInflowMax) queryParams.netInflowMax = params.netInflowMax;

  const response = await web3Fetch<{ data: Array<Record<string, unknown>> }>(
    `${WEB3_BASE_URL}/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/social-rush/rank/list?${buildQueryString(queryParams)}`,
  );

  return response.data.map((item) => ({
    topicId: String(item.topicId),
    chainId: String(item.chainId),
    name: item.name as TopicRush["name"],
    type: String(item.type),
    close: Number(item.close),
    topicLink: String(item.topicLink),
    createTime: Number(item.createTime),
    progress: String(item.progress),
    aiSummary: item.aiSummary as TopicRush["aiSummary"],
    topicNetInflow: String(item.topicNetInflow),
    topicNetInflow1h: String(item.topicNetInflow1h),
    topicNetInflowAth: String(item.topicNetInflowAth),
    tokenSize: Number(item.tokenSize),
    deepAnalysisFlag: Number(item.deepAnalysisFlag),
    tokenList: (item.tokenList as Array<Record<string, unknown>>)?.map(parseTopicToken) || [],
  }));
}

function parseTopicToken(raw: Record<string, unknown>) {
  return {
    chainId: String(raw.chainId),
    contractAddress: String(raw.contractAddress),
    symbol: String(raw.symbol),
    icon: `https://bin.bnbstatic.com${raw.icon}`,
    decimals: Number(raw.decimals),
    createTime: Number(raw.createTime),
    marketCap: String(raw.marketCap),
    liquidity: String(raw.liquidity),
    priceChange24h: String(raw.priceChange24h),
    netInflow: String(raw.netInflow),
    netInflow1h: String(raw.netInflow1h),
    volumeBuy: String(raw.volumeBuy),
    volumeSell: String(raw.volumeSell),
    volume1hBuy: String(raw.volume1hBuy),
    volume1hSell: String(raw.volume1hSell),
    uniqueTrader5m: Number(raw.uniqueTrader5m),
    uniqueTrader1h: Number(raw.uniqueTrader1h),
    uniqueTrader4h: Number(raw.uniqueTrader4h),
    uniqueTrader24h: Number(raw.uniqueTrader24h),
    count5m: Number(raw.count5m),
    count1h: Number(raw.count1h),
    count4h: Number(raw.count4h),
    count24h: Number(raw.count24h),
    holders: Number(raw.holders),
    kolHolders: Number(raw.kolHolders),
    smartMoneyHolders: Number(raw.smartMoneyHolders),
    protocol: Number(raw.protocol),
    internal: Number(raw.internal),
    migrateStatus: Number(raw.migrateStatus),
  };
}

// ============================================================================
// API Functions - Query Address Info
// ============================================================================

export async function getAddressTokenBalance(
  address: string,
  chainId: ChainId = "56",
  offset: number = 0,
): Promise<AddressBalanceResponse> {
  const params = buildQueryString({
    address,
    chainId,
    offset,
  });

  const response = await web3Fetch<AddressBalanceResponse>(
    `${WEB3_BASE_URL}/bapi/defi/v3/public/wallet-direct/buw/wallet/address/pnl/active-position-list?${params}`,
    "GET",
    undefined,
    "binance-web3/1.0 (Skill)",
  );

  return {
    ...response,
    list: response.list.map((item) => ({
      ...item,
      icon: item.icon ? `https://bin.bnbstatic.com${item.icon}` : "",
    })),
  };
}

// ============================================================================
// API Functions - Query Token Audit
// ============================================================================

export async function getTokenAudit(
  chainId: ChainId,
  contractAddress: string,
): Promise<TokenAudit> {
  const response = await web3Fetch<TokenAuditResponse>(
    `${WEB3_BASE_URL}/bapi/defi/v1/public/wallet-direct/security/token/audit`,
    "POST",
    {
      binanceChainId: chainId,
      contractAddress,
      requestId: crypto.randomUUID(),
    },
    "binance-web3/1.4 (Skill)",
  );

  return {
    requestId: response.requestId,
    hasResult: response.hasResult,
    isSupported: response.isSupported,
    riskLevelEnum: response.riskLevelEnum as TokenAudit["riskLevelEnum"],
    riskLevel: response.riskLevel,
    extraInfo: response.extraInfo,
    riskItems: response.riskItems,
  };
}

// ============================================================================
// API Functions - Query Token Info
// ============================================================================

export async function searchTokens(
  keyword: string,
  chainIds?: ChainId[],
  orderBy: string = "volume24h",
): Promise<TokenSearchResult[]> {
  const params: Record<string, unknown> = {
    keyword,
    orderBy,
  };

  if (chainIds && chainIds.length > 0) {
    params.chainIds = chainIds.join(",");
  }

  const response = await web3Fetch<{ data: TokenSearchResult[] }>(
    `${WEB3_BASE_URL}/bapi/defi/v5/public/wallet-direct/buw/wallet/market/token/search?${buildQueryString(params)}`,
  );

  return response.data.map((item) => ({
    ...item,
    icon: item.icon ? `https://bin.bnbstatic.com${item.icon}` : "",
  }));
}

export async function getTokenMetadata(
  chainId: ChainId,
  contractAddress: string,
): Promise<TokenMetadata> {
  const params = buildQueryString({ chainId, contractAddress });

  const response = await web3Fetch<{ data: TokenMetadata }>(
    `${WEB3_BASE_URL}/bapi/defi/v1/public/wallet-direct/buw/wallet/dex/market/token/meta/info?${params}`,
  );

  return {
    ...response.data,
    icon: response.data.icon ? `https://bin.bnbstatic.com${response.data.icon}` : "",
    chainIconUrl: response.data.chainIconUrl || "",
  };
}

export async function getTokenDynamicData(
  chainId: ChainId,
  contractAddress: string,
): Promise<TokenDynamicData> {
  const params = buildQueryString({ chainId, contractAddress });

  const response = await web3Fetch<{ data: TokenDynamicData }>(
    `${WEB3_BASE_URL}/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info?${params}`,
  );

  return response.data;
}

export async function getTokenKlines(
  contractAddress: string,
  platform: "ethereum" | "bsc" | "solana" | "base",
  interval: string = "1h",
  limit: number = 100,
  from?: number,
  to?: number,
): Promise<TokenKline[]> {
  const params: Record<string, unknown> = {
    address: contractAddress,
    platform,
    interval,
    limit,
  };

  if (from) params.from = from;
  if (to) params.to = to;

  const response = await web3Fetch<{ data: number[][] }>(
    `${DQUERY_BASE_URL}/u-kline/v1/k-line/candles?${buildQueryString(params)}`,
    "GET",
    undefined,
    "binance-web3/1.0 (Skill)",
  );

  return response.data.map((item) => ({
    open: item[0],
    high: item[1],
    low: item[2],
    close: item[3],
    volume: item[4],
    timestamp: item[5],
    count: item[6],
  }));
}

// ============================================================================
// API Functions - Trading Signal
// ============================================================================

export async function getSmartMoneySignals(
  chainId: ChainId = "CT_501",
  page: number = 1,
  pageSize: number = 100,
): Promise<SmartMoneySignal[]> {
  const response = await web3Fetch<{ data: SmartMoneySignal[] }>(
    `${WEB3_BASE_URL}/bapi/defi/v1/public/wallet-direct/buw/wallet/web/signal/smart-money`,
    "POST",
    {
      smartSignalType: "",
      page,
      pageSize,
      chainId,
    },
  );

  return response.data.map((item) => ({
    ...item,
    logoUrl: item.logoUrl ? `https://bin.bnbstatic.com${item.logoUrl}` : "",
  }));
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatUSD(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

export function formatPercent(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

export function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toLocaleString();
}
