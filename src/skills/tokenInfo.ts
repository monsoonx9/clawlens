import { Skill, SkillResult } from "./types";
import {
  searchTokens,
  getTokenMetadata,
  getTokenDynamicData,
  getTokenKlines,
  formatUSD,
  formatPercent,
  formatNumber,
  ChainId,
} from "@/lib/binanceWeb3Client";

export interface TokenInfoResult {
  type: "search" | "metadata" | "dynamic" | "klines";
  query?: string;
  contractAddress?: string;
  chainId?: string;
  searchResults?: Array<{
    symbol: string;
    name: string;
    chainId: string;
    contractAddress: string;
    price: string;
    marketCap: string;
    volume24h: string;
    percentChange24h: string;
  }>;
  metadata?: {
    name: string;
    symbol: string;
    description: string;
    decimals: number;
    creatorAddress: string;
    createTime: number;
    links: Array<{ label: string; link: string }>;
    isBlacklist: boolean;
    isWhitelist: boolean;
  };
  dynamic?: {
    price: string;
    priceHigh24h: string;
    priceLow24h: string;
    percentChange5m: string;
    percentChange1h: string;
    percentChange4h: string;
    percentChange24h: string;
    volume24h: string;
    marketCap: string;
    liquidity: string;
    holders: string;
    top10HolderPercent: string;
    circulatingSupply: string;
    totalSupply: string;
  };
  klines?: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export const tokenInfo: Skill = {
  id: "binance/query-token-info",
  name: "Token Info",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Query token details by keyword, contract address, or chain. Search tokens, get metadata, retrieve real-time market data, and fetch K-line candlestick charts for technical analysis.",
  inputSchema: {
    mode: {
      type: "string",
      required: false,
      description: "search, metadata, dynamic, or klines",
    },
    query: {
      type: "string",
      required: false,
      description: "Token symbol, name, or contract address for search",
    },
    contractAddress: {
      type: "string",
      required: false,
      description: "Token contract address",
    },
    chain: {
      type: "string",
      required: false,
      description: "bsc, base, solana",
    },
    interval: {
      type: "string",
      required: false,
      description: "Kline interval: 1m, 5m, 15m, 30m, 1h, 4h, 1d",
    },
    limit: {
      type: "number",
      required: false,
      description: "Number of klines (default 100)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const mode = String(input.mode || "search");
      const query = String(input.query || "").trim();
      const contractAddress = String(input.contractAddress || "").trim();
      const chain = String(input.chain || "bsc").toLowerCase();
      const interval = String(input.interval || "1h");
      const limit = Number(input.limit) || 100;

      const chainIdMap: Record<string, ChainId> = {
        bsc: "56",
        base: "8453",
        solana: "CT_501",
      };
      const chainId = chainIdMap[chain] || "56";

      const result: TokenInfoResult = {
        type: mode as TokenInfoResult["type"],
      };

      if (mode === "search") {
        if (!query) {
          return {
            success: false,
            data: {},
            summary: "Search query required for search mode.",
            error: "query is required",
          };
        }

        const searchResults = await searchTokens(query, [chainId]);
        result.query = query;
        result.searchResults = searchResults.slice(0, 20).map((t) => ({
          symbol: t.symbol,
          name: t.name,
          chainId: t.chainId,
          contractAddress: t.contractAddress,
          price: t.price,
          marketCap: t.marketCap,
          volume24h: t.volume24h,
          percentChange24h: t.percentChange24h,
        }));

        const summary =
          `🔍 Found ${result.searchResults.length} tokens matching "${query}": ` +
          result.searchResults
            .slice(0, 3)
            .map((t) => t.symbol)
            .join(", ");

        return {
          success: true,
          data: result as unknown as Record<string, unknown>,
          summary,
        };
      }

      if (!contractAddress) {
        return {
          success: false,
          data: {},
          summary: "Contract address required for metadata/dynamic/klines modes.",
          error: "contractAddress is required",
        };
      }

      result.contractAddress = contractAddress;
      result.chainId = chainId;

      if (mode === "metadata" || mode === "dynamic" || mode === "all") {
        const metadata = await getTokenMetadata(chainId, contractAddress);
        result.metadata = {
          name: metadata.name,
          symbol: metadata.symbol,
          description: metadata.description,
          decimals: metadata.decimals,
          creatorAddress: metadata.creatorAddress,
          createTime: metadata.createTime,
          links: metadata.links,
          isBlacklist: metadata.auditInfo.isBlacklist,
          isWhitelist: metadata.auditInfo.isWhitelist,
        };
      }

      if (mode === "dynamic" || mode === "all") {
        const dynamic = await getTokenDynamicData(chainId, contractAddress);
        result.dynamic = {
          price: dynamic.price,
          priceHigh24h: dynamic.priceHigh24h,
          priceLow24h: dynamic.priceLow24h,
          percentChange5m: dynamic.percentChange5m,
          percentChange1h: dynamic.percentChange1h,
          percentChange4h: dynamic.percentChange4h,
          percentChange24h: dynamic.percentChange24h,
          volume24h: dynamic.volume24h,
          marketCap: dynamic.marketCap,
          liquidity: dynamic.liquidity,
          holders: dynamic.holders,
          top10HolderPercent: dynamic.top10HoldersPercentage,
          circulatingSupply: dynamic.circulatingSupply,
          totalSupply: dynamic.totalSupply,
        };
      }

      if (mode === "klines") {
        const platformMap: Record<string, "bsc" | "base" | "solana" | "ethereum"> = {
          "56": "bsc",
          "8453": "base",
          CT_501: "solana",
          "1": "ethereum",
        };
        const platform = platformMap[chainId] || "bsc";

        const klines = await getTokenKlines(contractAddress, platform, interval, limit);
        result.klines = klines.map((k) => ({
          timestamp: k.timestamp,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
        }));
      }

      let summary = "";
      if (mode === "metadata" && result.metadata) {
        summary =
          `📋 ${result.metadata.name} (${result.metadata.symbol}): ` +
          `Decimals: ${result.metadata.decimals}, Creator: ${result.metadata.creatorAddress.slice(0, 6)}...`;
      } else if (mode === "dynamic" && result.dynamic) {
        summary =
          `📊 ${formatUSD(result.dynamic.price)} ` +
          `(${formatPercent(result.dynamic.percentChange24h)} 24h) | ` +
          `MC: ${formatUSD(result.dynamic.marketCap)} | ` +
          `Vol: ${formatUSD(result.dynamic.volume24h)} | ` +
          `Holders: ${formatNumber(result.dynamic.holders)}`;
      } else if (mode === "klines" && result.klines) {
        const latest = result.klines[result.klines.length - 1];
        const priceChangePercent =
          latest.open !== 0 ? ((latest.close - latest.open) / latest.open) * 100 : 0;
        summary =
          `📈 ${result.klines.length} ${interval} candles fetched. ` +
          `Latest: ${latest.close.toFixed(6)} (${formatPercent(priceChangePercent)})`;
      }

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch token info" },
        summary: "Token info unavailable. Check your API keys or try a different token.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
