import { Skill, SkillResult } from "../types";
import { getFuturesOrderBook, getFuturesKlines } from "@/lib/futuresClient";

interface MarketImpactResult {
  symbol: string;
  side: "BUY" | "SELL";
  amount_usd: number;
  levels_consumed: number;
  average_fill_price: number;
  worst_fill_price: number;
  slippage_percent: number;
  impact_rating: "NEGLIGIBLE" | "LOW" | "MODERATE" | "HIGH" | "SEVERE";
}

function simulateOrderBookWalk(
  orderBook: {
    bids: { price: number; quantity: number }[];
    asks: { price: number; quantity: number }[];
  },
  side: "BUY" | "SELL",
  amountUsd: number,
): MarketImpactResult {
  const levels = side === "BUY" ? orderBook.asks : orderBook.bids;
  let remainingUsd = amountUsd;
  let totalQty = 0;
  let totalCost = 0;
  let levelsConsumed = 0;
  let worstPrice = 0;

  for (let i = 0; i < levels.length && remainingUsd > 0; i++) {
    const level = levels[i];
    const levelUsd = level.price * level.quantity;

    if (levelUsd >= remainingUsd) {
      const qtyNeeded = remainingUsd / level.price;
      totalQty += qtyNeeded;
      totalCost += remainingUsd;
      worstPrice = level.price;
      remainingUsd = 0;
      levelsConsumed++;
      break;
    } else {
      totalQty += level.quantity;
      totalCost += levelUsd;
      remainingUsd -= levelUsd;
      worstPrice = level.price;
      levelsConsumed++;
    }
  }

  const avgFillPrice = totalQty > 0 ? totalCost / totalQty : 0;
  const slippagePercent = avgFillPrice > 0 ? ((worstPrice - avgFillPrice) / avgFillPrice) * 100 : 0;

  let impactRating: "NEGLIGIBLE" | "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  const absSlippage = Math.abs(slippagePercent);
  if (absSlippage < 0.01) impactRating = "NEGLIGIBLE";
  else if (absSlippage < 0.05) impactRating = "LOW";
  else if (absSlippage < 0.2) impactRating = "MODERATE";
  else if (absSlippage < 1) impactRating = "HIGH";
  else impactRating = "SEVERE";

  return {
    symbol: "",
    side,
    amount_usd: amountUsd,
    levels_consumed: levelsConsumed,
    average_fill_price: Math.round(avgFillPrice * 100) / 100,
    worst_fill_price: Math.round(worstPrice * 100) / 100,
    slippage_percent: Math.round(slippagePercent * 10000) / 10000,
    impact_rating: impactRating,
  };
}

export const marketImpact: Skill = {
  id: "binance/market-impact",
  name: "Market Impact Simulator",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Simulates how a large market order would execute against the order book. Shows levels consumed, average/worst fill price, slippage percentage, and impact rating (NEGLIGIBLE/LOW/MODERATE/HIGH/SEVERE).",
  inputSchema: {
    symbol: {
      type: "string",
      required: true,
      description: "Futures symbol (e.g., BTCUSDT)",
    },
    side: {
      type: "string",
      required: false,
      description: "Order side: BUY or SELL (default: BUY)",
    },
    amount_usd: {
      type: "number",
      required: false,
      description: "Order amount in USD (default: 100000)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbol = String(input.symbol || "").toUpperCase();
      const side = String(input.side || "BUY").toUpperCase() as "BUY" | "SELL";
      const amountUsd = Number(input.amount_usd) || 100000;

      if (!symbol) {
        return {
          success: false,
          data: {},
          summary: "Symbol is required",
          error: "symbol is required",
        };
      }

      const [orderBook, klines] = await Promise.all([
        getFuturesOrderBook(symbol, 1000),
        getFuturesKlines(symbol, "1h", 1),
      ]);

      const result = simulateOrderBookWalk(orderBook, side, amountUsd);
      result.symbol = symbol;

      const currentPrice = klines.length > 0 ? klines[klines.length - 1].close : 0;
      const ratingEmoji = {
        NEGLIGIBLE: "✅",
        LOW: "🟢",
        MODERATE: "🟡",
        HIGH: "🟠",
        SEVERE: "🔴",
      }[result.impact_rating];

      const summary =
        `📉 Market Impact Simulator\n\n` +
        `${symbol} | ${side} $${amountUsd.toLocaleString()}\n\n` +
        `Current Price: $${currentPrice.toLocaleString()}\n` +
        `Levels Consumed: ${result.levels_consumed}\n` +
        `Avg Fill Price: $${result.average_fill_price.toLocaleString()}\n` +
        `Worst Fill Price: $${result.worst_fill_price.toLocaleString()}\n` +
        `Slippage: ${result.slippage_percent}%\n` +
        `Impact: ${ratingEmoji} ${result.impact_rating}`;

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to simulate market impact" },
        summary: "Market impact data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
