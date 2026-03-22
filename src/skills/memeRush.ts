import { Skill, SkillResult } from "./types";
import {
  getMemeRushList,
  getTopicRushList,
  formatUSD,
  formatPercent,
  ChainId,
  MemeToken,
  TopicRush,
} from "@/lib/binanceWeb3Client";

export interface MemeRushResult {
  type: "meme-rush" | "topic-rush";
  stage?: "new" | "finalizing" | "migrated";
  tokens?: Array<{
    symbol: string;
    name: string;
    chainId: string;
    contractAddress: string;
    price: string;
    priceChange: string;
    marketCap: string;
    liquidity: string;
    volume: string;
    holders: number;
    progress: string;
    isExclusive: boolean;
    security: {
      top10HolderPercent: string;
      devPercent: string;
      sniperPercent: string;
      insiderPercent: string;
      isPumpfun: boolean;
      hasTax: boolean;
      taxRate: string;
    };
  }>;
  topics?: Array<{
    id: string;
    name: string;
    type: string;
    progress: string;
    netInflow: string;
    tokenCount: number;
    tokens: Array<{
      symbol: string;
      contractAddress: string;
      marketCap: string;
      netInflow: string;
      priceChange24h: string;
    }>;
  }>;
  totalFound: number;
}

export const memeRush: Skill = {
  id: "binance/meme-rush",
  name: "Meme Rush",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Real-time meme token discovery from launchpads (Pump.fun, Four.meme, etc.). Track new tokens on bonding curve, tokens about to migrate, and migrated tokens. Also provides AI-powered market hot topics with associated tokens.",
  inputSchema: {
    mode: {
      type: "string",
      required: false,
      description: "meme-rush or topic-rush",
    },
    stage: {
      type: "string",
      required: false,
      description: "For meme-rush: new, finalizing, migrated",
    },
    topicType: {
      type: "string",
      required: false,
      description: "For topic-rush: latest, rising, viral",
    },
    chain: {
      type: "string",
      required: false,
      description: "bsc or solana",
    },
    limit: {
      type: "number",
      required: false,
      description: "Number of results",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const mode = String(input.mode || "meme-rush");
      const stage = String(input.stage || "new").toLowerCase();
      const topicType = String(input.topicType || "latest").toLowerCase();
      const chain = String(input.chain || "bsc").toLowerCase();
      const limit = Number(input.limit) || 20;

      const chainIdMap: Record<string, ChainId> = {
        bsc: "56",
        solana: "CT_501",
      };
      const chainId = chainIdMap[chain] || "56";

      const result: MemeRushResult = {
        type: mode as "meme-rush" | "topic-rush",
        tokens: [],
        topics: [],
        totalFound: 0,
      };

      if (mode === "meme-rush") {
        const stageMap: Record<string, 10 | 20 | 30> = {
          new: 10,
          finalizing: 20,
          migrated: 30,
        };
        const rankType = stageMap[stage] || 10;
        result.stage = stage as "new" | "finalizing" | "migrated";

        const tokens = await getMemeRushList({
          chainId,
          rankType,
          limit,
        });

        result.tokens = tokens.map((t: MemeToken) => ({
          symbol: t.symbol,
          name: t.name,
          chainId: t.chainId,
          contractAddress: t.contractAddress,
          price: t.price,
          priceChange: t.priceChange,
          marketCap: t.marketCap,
          liquidity: t.liquidity,
          volume: t.volume,
          holders: t.holders,
          progress: t.progress,
          isExclusive: t.exclusive === 1,
          security: {
            top10HolderPercent: t.holdersTop10Percent,
            devPercent: t.holdersDevPercent,
            sniperPercent: t.holdersSniperPercent,
            insiderPercent: t.holdersInsiderPercent,
            isPumpfun: t.protocol === 1001 || t.protocol === 1003,
            hasTax: t.launchTaxEnable === 1,
            taxRate: t.taxRate,
          },
        }));
        result.totalFound = tokens.length;
      } else {
        const topicTypeMap: Record<string, 10 | 20 | 30> = {
          latest: 10,
          rising: 20,
          viral: 30,
        };
        const rankType = topicTypeMap[topicType] || 10;

        const topics = await getTopicRushList({
          chainId,
          rankType,
        });

        result.topics = topics.slice(0, limit).map((t: TopicRush) => ({
          id: t.topicId,
          name: t.name.topicNameEn || Object.values(t.name)[0],
          type: t.type,
          progress: t.progress,
          netInflow: t.topicNetInflow,
          tokenCount: t.tokenSize,
          tokens: t.tokenList.slice(0, 5).map((token) => ({
            symbol: token.symbol,
            contractAddress: token.contractAddress,
            marketCap: token.marketCap,
            netInflow: token.netInflow,
            priceChange24h: token.priceChange24h,
          })),
        }));
        result.totalFound = topics.length;
      }

      let summary = "";
      if (mode === "meme-rush") {
        const top = result.tokens?.[0];
        if (top) {
          summary =
            `🃏 ${stage.toUpperCase()} MEME: ${top.symbol} ` +
            `- MC: ${formatUSD(top.marketCap)} | ` +
            `Vol: ${formatUSD(top.volume)} | ` +
            `${top.progress} on bonding curve`;
        } else {
          summary = `No ${stage} meme tokens found.`;
        }
      } else {
        const top = result.topics?.[0];
        if (top) {
          summary =
            `🔥 HOT TOPIC: ${top.name} ` +
            `- ${top.tokenCount} tokens | ` +
            `Net Inflow: ${formatUSD(top.netInflow)}`;
        } else {
          summary = "No trending topics found.";
        }
      }

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      console.warn("[memeRush] API failed:", error);
      return {
        success: false,
        data: { status: "unavailable", error: "API unavailable" },
        summary:
          "[ERROR] Meme rush data unavailable - Binance Web3 API temporarily offline. Check internet connection or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
