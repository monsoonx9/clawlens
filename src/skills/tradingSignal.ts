import { Skill, SkillResult } from "./types";
import {
  getSmartMoneySignals,
  formatUSD,
  formatPercent,
  ChainId,
  SmartMoneySignal,
} from "@/lib/binanceWeb3Client";

export interface TradingSignalResult {
  chainId: string;
  signals: Array<{
    id: number;
    ticker: string;
    contractAddress: string;
    direction: "buy" | "sell";
    status: "active" | "timeout" | "completed";
    smartMoneyCount: number;
    totalValueUSD: string;
    alertPrice: string;
    currentPrice: string;
    maxGain: string;
    exitRate: number;
    signalTime: number;
    platform: string;
    tags: string[];
  }>;
  summary: {
    activeSignals: number;
    buySignals: number;
    sellSignals: number;
    totalValueTracked: number;
  };
}

export const tradingSignal: Skill = {
  id: "binance/trading-signal",
  name: "Trading Signal",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Retrieve on-chain smart money trading signals. Monitor professional investor activities including buy/sell signals, trigger prices, current prices, max gains, and exit rates. Use to discover early trading opportunities.",
  inputSchema: {
    chain: {
      type: "string",
      required: false,
      description: "bsc or solana",
    },
    direction: {
      type: "string",
      required: false,
      description: "Filter: buy, sell, or all",
    },
    status: {
      type: "string",
      required: false,
      description: "Filter: active, timeout, completed, or all",
    },
    limit: {
      type: "number",
      required: false,
      description: "Number of signals to return",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const chain = String(input.chain || "solana").toLowerCase();
      const directionFilter = String(input.direction || "all").toLowerCase();
      const statusFilter = String(input.status || "all").toLowerCase();
      const limit = Number(input.limit) || 50;

      const chainIdMap: Record<string, ChainId> = {
        bsc: "56",
        solana: "CT_501",
      };
      const chainId = chainIdMap[chain] || "CT_501";

      const allSignals = await getSmartMoneySignals(chainId, 1, 100);

      let filteredSignals = allSignals;

      if (directionFilter !== "all") {
        filteredSignals = filteredSignals.filter((s) => s.direction === directionFilter);
      }

      if (statusFilter !== "all") {
        filteredSignals = filteredSignals.filter((s) => s.status === statusFilter);
      }

      const signals = filteredSignals.slice(0, limit).map((s: SmartMoneySignal) => {
        const tags: string[] = [];
        if (s.tokenTag) {
          Object.values(s.tokenTag)
            .flat()
            .forEach((t) => tags.push(t.tagName));
        }

        return {
          id: s.signalId,
          ticker: s.ticker,
          contractAddress: s.contractAddress,
          direction: s.direction,
          status: s.status,
          smartMoneyCount: s.smartMoneyCount,
          totalValueUSD: s.totalTokenValue,
          alertPrice: s.alertPrice,
          currentPrice: s.currentPrice,
          maxGain: s.maxGain,
          exitRate: s.exitRate,
          signalTime: s.signalTriggerTime,
          platform: s.launchPlatform,
          tags,
        };
      });

      const activeSignals = signals.filter((s) => s.status === "active");
      const buySignals = signals.filter((s) => s.direction === "buy");
      const sellSignals = signals.filter((s) => s.direction === "sell");
      const totalValueTracked = signals.reduce((sum, s) => sum + parseFloat(s.totalValueUSD), 0);

      const result: TradingSignalResult = {
        chainId,
        signals,
        summary: {
          activeSignals: activeSignals.length,
          buySignals: buySignals.length,
          sellSignals: sellSignals.length,
          totalValueTracked,
        },
      };

      let summary = "";
      if (chain === "solana") {
        summary = `🐋 Smart Money Signals (Solana): `;
      } else {
        summary = `🐋 Smart Money Signals (BSC): `;
      }

      summary +=
        `${signals.length} signals found. ` +
        `${activeSignals.length} active, ` +
        `${buySignals.length} buy, ` +
        `${sellSignals.length} sell. ` +
        `Total value: ${formatUSD(totalValueTracked)}`;

      const topActive = activeSignals[0];
      if (topActive) {
        summary +=
          ` | Top: ${topActive.ticker} ${topActive.direction === "buy" ? "🟢" : "🔴"} ` +
          `${formatPercent(parseFloat(topActive.maxGain))} potential gain`;
      }

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch trading signals" },
        summary: "Trading signals unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
