import { Skill, SkillResult } from "../types";
import { getFuturesKlines } from "@/lib/futuresClient";

interface DCAResult {
  symbol: string;
  dca: {
    total_invested: number;
    units: number;
    avg_price: number;
    roi_percent: number;
  };
  lump_sum: {
    total_invested: number;
    units: number;
    avg_price: number;
    roi_percent: number;
  };
  winner: "DCA" | "LUMP_SUM";
  advantage_percent: number;
  price_stats: {
    start: number;
    current: number;
    min: number;
    max: number;
  };
}

async function backtestDCA(
  symbol: string,
  amountPerInterval: number,
  intervalDays: number,
  totalDays: number,
): Promise<DCAResult> {
  const klines = await getFuturesKlines(symbol, "1d", totalDays + 30);

  if (klines.length < totalDays) {
    throw new Error("Insufficient historical data");
  }

  const prices = klines.slice(-totalDays).map((k) => k.close);
  const startPrice = prices[0];
  const currentPrice = prices[prices.length - 1];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const numIntervals = Math.floor(totalDays / intervalDays);
  let dcaUnits = 0;
  let dcaTotalInvested = 0;

  for (let i = 0; i < numIntervals; i++) {
    const dayIndex = i * intervalDays;
    if (dayIndex < prices.length) {
      dcaUnits += amountPerInterval / prices[dayIndex];
      dcaTotalInvested += amountPerInterval;
    }
  }

  const lumpSumUnits = dcaTotalInvested / startPrice;
  const dcaAvgPrice = dcaTotalInvested / dcaUnits;
  const lumpSumAvgPrice = dcaTotalInvested / lumpSumUnits;

  const dcaFinalValue = dcaUnits * currentPrice;
  const lumpSumFinalValue = lumpSumUnits * currentPrice;

  const dcaROI = ((dcaFinalValue - dcaTotalInvested) / dcaTotalInvested) * 100;
  const lumpSumROI = ((lumpSumFinalValue - dcaTotalInvested) / dcaTotalInvested) * 100;

  const winner = dcaROI > lumpSumROI ? "DCA" : "LUMP_SUM";
  const advantage = Math.abs(dcaROI - lumpSumROI);

  return {
    symbol,
    dca: {
      total_invested: Math.round(dcaTotalInvested * 100) / 100,
      units: Math.round(dcaUnits * 10000) / 10000,
      avg_price: Math.round(dcaAvgPrice * 100) / 100,
      roi_percent: Math.round(dcaROI * 100) / 100,
    },
    lump_sum: {
      total_invested: Math.round(dcaTotalInvested * 100) / 100,
      units: Math.round(lumpSumUnits * 10000) / 10000,
      avg_price: Math.round(lumpSumAvgPrice * 100) / 100,
      roi_percent: Math.round(lumpSumROI * 100) / 100,
    },
    winner,
    advantage_percent: Math.round(advantage * 100) / 100,
    price_stats: {
      start: Math.round(startPrice * 100) / 100,
      current: Math.round(currentPrice * 100) / 100,
      min: Math.round(minPrice * 100) / 100,
      max: Math.round(maxPrice * 100) / 100,
    },
  };
}

export const dcaBacktester: Skill = {
  id: "binance/dca-backtester",
  name: "DCA Backtester",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Compares Dollar-Cost Averaging vs Lump-Sum investing over historical data. Shows DCA: total invested, units, avg price, ROI. Lump-sum: units, ROI. Declares winner with advantage percentage.",
  inputSchema: {
    symbol: {
      type: "string",
      required: true,
      description: "Futures symbol (e.g., BTCUSDT)",
    },
    amount_per_interval: {
      type: "number",
      required: false,
      description: "USD amount per DCA purchase (default: 100)",
    },
    interval_days: {
      type: "number",
      required: false,
      description: "Days between DCA purchases (default: 7 = weekly)",
    },
    total_days: {
      type: "number",
      required: false,
      description: "Total backtest period in days (default: 365)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbol = String(input.symbol || "").toUpperCase();
      const amountPerInterval = Number(input.amount_per_interval) || 100;
      const intervalDays = Number(input.interval_days) || 7;
      const totalDays = Number(input.total_days) || 365;

      if (!symbol) {
        return {
          success: false,
          data: {},
          summary: "Symbol is required",
          error: "symbol is required",
        };
      }

      const result = await backtestDCA(symbol, amountPerInterval, intervalDays, totalDays);

      const winnerEmoji = result.winner === "DCA" ? "📊" : "💰";
      const summary =
        `📈 DCA Backtester: ${symbol}\n\n` +
        `Strategy: $${amountPerInterval} every ${intervalDays} days for ${totalDays} days\n\n` +
        `💰 DCA Results:\n` +
        `  Invested: $${result.dca.total_invested.toLocaleString()}\n` +
        `  Units: ${result.dca.units}\n` +
        `  Avg Price: $${result.dca.avg_price.toLocaleString()}\n` +
        `  ROI: ${result.dca.roi_percent}%\n\n` +
        `💵 Lump Sum Results:\n` +
        `  Invested: $${result.lump_sum.total_invested.toLocaleString()}\n` +
        `  Units: ${result.lump_sum.units}\n` +
        `  Avg Price: $${result.lump_sum.avg_price.toLocaleString()}\n` +
        `  ROI: ${result.lump_sum.roi_percent}%\n\n` +
        `${winnerEmoji} Winner: ${result.winner} (advantage: ${result.advantage_percent}%)\n\n` +
        `📊 Price: Start $${result.price_stats.start.toLocaleString()} → Current $${result.price_stats.current.toLocaleString()} (Min: $${result.price_stats.min.toLocaleString()}, Max: $${result.price_stats.max.toLocaleString()})`;

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to backtest DCA strategy" },
        summary: "DCA backtest data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
