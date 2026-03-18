import { Skill, SkillResult } from "./types";
import {
  getSocialHypeLeaderboard,
  getUnifiedTokenRank,
  getSmartMoneyInflowRank,
  getMemeRank,
  getAddressPnlRank,
  formatUSD,
  formatPercent,
  formatNumber,
  ChainId,
} from "@/lib/binanceWeb3Client";

export interface CryptoMarketRankResult {
  socialHype: {
    tokens: Array<{
      symbol: string;
      chainId: string;
      contractAddress: string;
      price: string;
      marketCap: string;
      priceChange: string;
      socialHype: number;
      sentiment: string;
      summary: string;
    }>;
    total: number;
  };
  trending: {
    tokens: Array<{
      symbol: string;
      name: string;
      chainId: string;
      contractAddress: string;
      price: string;
      marketCap: string;
      liquidity: string;
      volume24h: string;
      percentChange24h: string;
      holders: string;
    }>;
    total: number;
  };
  alpha: {
    tokens: Array<{
      symbol: string;
      name: string;
      chainId: string;
      contractAddress: string;
      price: string;
      marketCap: string;
      volume24h: string;
      tags: string[];
    }>;
    total: number;
  };
  smartMoneyInflow: {
    tokens: Array<{
      symbol: string;
      chainId: string;
      contractAddress: string;
      price: string;
      inflow: number;
      traders: number;
      priceChangeRate: string;
      marketCap: string;
    }>;
    total: number;
  };
  topTraders: {
    traders: Array<{
      address: string;
      label: string;
      realizedPnl: string;
      winRate: string;
      totalVolume: string;
      totalTxCnt: number;
    }>;
    total: number;
  };
}

export const cryptoMarketRank: Skill = {
  id: "binance/crypto-market-rank",
  name: "Crypto Market Rank",
  namespace: "claw-council",
  version: "2.0.0",
  description:
    "Comprehensive crypto market intelligence. Provides social hype rankings, trending tokens, Binance Alpha picks, smart money inflow rankings, and top trader PnL leaderboards. Use for market discovery and trend analysis.",
  inputSchema: {
    rankType: {
      type: "string",
      required: false,
      description: "Type of ranking: social-hype, trending, alpha, smart-money-inflow, top-traders",
    },
    chain: {
      type: "string",
      required: false,
      description: "Blockchain chain: bsc, base, solana, ethereum",
    },
    limit: {
      type: "number",
      required: false,
      description: "Number of results to return (default 20)",
    },
    page: {
      type: "number",
      required: false,
      description: "Page number for pagination (default 1)",
    },
    pageSize: {
      type: "number",
      required: false,
      description: "Results per page (default 20)",
    },
    search: {
      type: "string",
      required: false,
      description: "Search keyword for token name/symbol",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const rankType = String(input.rankType || "trending");
      const chain = String(input.chain || "bsc").toLowerCase();
      const limit = Number(input.limit) || 20;
      const page = Number(input.page) || 1;
      const pageSize = Number(input.pageSize) || 20;
      const search = String(input.search || "");

      const chainIdMap: Record<string, ChainId> = {
        bsc: "56",
        base: "8453",
        solana: "CT_501",
        ethereum: "1",
      };

      const chainId = chainIdMap[chain] || "56";

      const filters = search ? { keywords: [search] } : undefined;

      const result: CryptoMarketRankResult = {
        socialHype: { tokens: [], total: 0 },
        trending: { tokens: [], total: 0 },
        alpha: { tokens: [], total: 0 },
        smartMoneyInflow: { tokens: [], total: 0 },
        topTraders: { traders: [], total: 0 },
      };

      if (rankType === "social-hype" || rankType === "all") {
        try {
          const socialTokens = await getSocialHypeLeaderboard(chainId);
          result.socialHype = {
            tokens: socialTokens.slice(0, limit).map((t) => ({
              symbol: t.symbol,
              chainId: t.chainId,
              contractAddress: t.contractAddress,
              price: t.price,
              marketCap: t.marketCap,
              priceChange: t.priceChange,
              socialHype: t.socialHype,
              sentiment: t.sentiment,
              summary: t.socialSummaryBrief,
              icon: t.logo,
            })),
            total: socialTokens.length,
          };
        } catch (e) {
          console.error("Social hype error:", e);
        }
      }

      if (rankType === "trending" || rankType === "all") {
        try {
          const trendingTokens = await getUnifiedTokenRank({
            rankType: 10,
            chainId,
            page,
            size: pageSize,
            filters,
          });
          result.trending = {
            tokens: trendingTokens.tokens.map((t) => ({
              symbol: t.symbol,
              name: t.name,
              chainId: t.chainId,
              contractAddress: t.contractAddress,
              price: t.price,
              marketCap: t.marketCap,
              liquidity: t.liquidity,
              volume24h: t.volume24h,
              percentChange24h: t.percentChange24h,
              holders: t.holders,
              icon: t.icon,
            })),
            total: trendingTokens.total,
          };
        } catch (e) {
          console.error("Trending error:", e);
        }
      }

      if (rankType === "alpha" || rankType === "all") {
        try {
          const alphaTokens = await getUnifiedTokenRank({
            rankType: 20,
            chainId,
            page,
            size: pageSize,
            filters,
          });
          result.alpha = {
            tokens: alphaTokens.tokens.map((t) => ({
              symbol: t.symbol,
              name: t.name,
              chainId: t.chainId,
              contractAddress: t.contractAddress,
              price: t.price,
              marketCap: t.marketCap,
              volume24h: t.volume24h,
              tags: t.alphaInfo?.tagList || [],
              icon: t.icon,
            })),
            total: alphaTokens.total,
          };
        } catch (e) {
          console.error("Alpha error:", e);
        }
      }

      if (rankType === "smart-money-inflow" || rankType === "all") {
        try {
          const smartMoneyTokens = await getSmartMoneyInflowRank(chainId);
          result.smartMoneyInflow = {
            tokens: smartMoneyTokens.slice(0, limit).map((t) => ({
              symbol: t.tokenName,
              chainId: t.chainId,
              contractAddress: t.contractAddress,
              price: t.price,
              inflow: t.inflow,
              traders: t.traders,
              priceChangeRate: t.priceChangeRate,
              marketCap: t.marketCap,
            })),
            total: smartMoneyTokens.length,
          };
        } catch (e) {
          console.error("Smart money inflow error:", e);
        }
      }

      if (rankType === "top-traders" || rankType === "all") {
        try {
          const traders = await getAddressPnlRank(chainId, "30d", "ALL", 1, limit);
          result.topTraders = {
            traders: traders.data.map((trader) => ({
              address: trader.address,
              label: trader.addressLabel || trader.genericAddressTagList[0]?.tagName || "Unknown",
              realizedPnl: trader.realizedPnl,
              winRate: trader.winRate,
              totalVolume: trader.totalVolume,
              totalTxCnt: trader.totalTxCnt,
            })),
            total: traders.pages * limit,
          };
        } catch (e) {
          console.error("Top traders error:", e);
        }
      }

      let summary = "";
      if (rankType === "all") {
        summary =
          `📊 Market Overview (${chain.toUpperCase()}): ` +
          `${result.socialHype.tokens.length} social hype, ` +
          `${result.trending.tokens.length} trending, ` +
          `${result.alpha.tokens.length} alpha picks, ` +
          `${result.smartMoneyInflow.tokens.length} smart money inflow tokens.`;
      } else if (rankType === "social-hype") {
        const top = result.socialHype.tokens[0];
        summary = top
          ? `🔥 #1 Social Hype: ${top.symbol} (${top.socialHype.toLocaleString()} hype score)`
          : "No social hype data available.";
      } else if (rankType === "trending") {
        const top = result.trending.tokens[0];
        summary = top
          ? `📈 #1 Trending: ${top.symbol} - ${formatUSD(top.volume24h)} volume, ${formatPercent(top.percentChange24h)} 24h`
          : "No trending data available.";
      } else if (rankType === "alpha") {
        const top = result.alpha.tokens[0];
        summary = top
          ? `⭐ #1 Alpha Pick: ${top.symbol} - ${formatUSD(top.volume24h)} volume`
          : "No alpha picks available.";
      } else if (rankType === "smart-money-inflow") {
        const top = result.smartMoneyInflow.tokens[0];
        summary = top
          ? `🐋 Top Smart Money Inflow: ${top.symbol} - ${formatUSD(top.inflow)} by ${top.traders} traders`
          : "No smart money inflow data available.";
      } else if (rankType === "top-traders") {
        const top = result.topTraders.traders[0];
        summary = top
          ? `👑 #1 Trader: ${top.label} - ${formatUSD(top.realizedPnl)} PnL (${top.winRate}% win rate)`
          : "No trader data available.";
      }

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch market rankings" },
        summary: "Market rankings unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
