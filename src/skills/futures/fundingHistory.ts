import { Skill, SkillResult } from "../types";
import { getFundingRateHistory } from "@/lib/futuresClient";

interface FundingHistoryResult {
  symbol: string;
  statistics: {
    average: number;
    median: number;
    std_dev: number;
    min: number;
    max: number;
  };
  trend: "INCREASING" | "DECREASING" | "STABLE";
  cumulative_cost: number;
  annualized_cost: number;
  volatility_score: number;
  distribution: {
    positive: number;
    negative: number;
    zero: number;
  };
  extreme_count: number;
}

async function analyzeHistory(symbol: string, limit: number): Promise<FundingHistoryResult> {
  const data = await getFundingRateHistory(symbol, limit);

  const rates = data.map((d) => parseFloat(d.fundingRate));

  if (rates.length === 0) {
    throw new Error("No funding history available");
  }

  const sorted = [...rates].sort((a, b) => a - b);
  const sum = rates.reduce((a, b) => a + b, 0);
  const avg = sum / rates.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = rates.reduce((acc, r) => acc + Math.pow(r - avg, 2), 0) / rates.length;
  const stdDev = Math.sqrt(variance);

  const positive = rates.filter((r) => r > 0).length;
  const negative = rates.filter((r) => r < 0).length;
  const zero = rates.filter((r) => r === 0).length;

  const recentRates = rates.slice(-Math.floor(rates.length / 2));
  const olderRates = rates.slice(0, Math.floor(rates.length / 2));
  const recentAvg = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
  const olderAvg = olderRates.reduce((a, b) => a + b, 0) / olderRates.length;

  let trend: "INCREASING" | "DECREASING" | "STABLE";
  if (recentAvg > olderAvg * 1.2) trend = "INCREASING";
  else if (recentAvg < olderAvg * 0.8) trend = "DECREASING";
  else trend = "STABLE";

  const cumulativeCost = sum * ((8 * 365) / data.length);
  const annualizedCost = cumulativeCost * 100;

  const volatilityScore = Math.min(100, Math.round((stdDev / (Math.abs(avg) + 0.0001)) * 50));
  const extremeCount = rates.filter((r) => Math.abs(r) > 0.0005).length;

  return {
    symbol,
    statistics: {
      average: Math.round(avg * 1000000) / 10000,
      median: Math.round(median * 1000000) / 10000,
      std_dev: Math.round(stdDev * 1000000) / 10000,
      min: Math.round(Math.min(...rates) * 1000000) / 10000,
      max: Math.round(Math.max(...rates) * 1000000) / 10000,
    },
    trend,
    cumulative_cost: Math.round(cumulativeCost * 10000) / 10000,
    annualized_cost: Math.round(annualizedCost * 100) / 100,
    volatility_score: volatilityScore,
    distribution: { positive, negative, zero },
    extreme_count: extremeCount,
  };
}

export const fundingHistory: Skill = {
  id: "binance/funding-history",
  name: "Funding History",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Comprehensive funding rate history analysis. Shows statistics (avg, median, std dev, min, max), trend direction, cumulative cost, annualized cost, volatility score, and distribution.",
  inputSchema: {
    symbol: {
      type: "string",
      required: true,
      description: "Futures symbol (e.g., BTCUSDT)",
    },
    limit: {
      type: "number",
      required: false,
      description: "Number of funding periods (default: 500, max: 1000)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbol = String(input.symbol || "").toUpperCase();
      const limit = Math.min(Number(input.limit) || 500, 1000);

      if (!symbol) {
        return {
          success: false,
          data: {},
          summary: "Symbol is required",
          error: "symbol is required",
        };
      }

      const result = await analyzeHistory(symbol, limit);

      const summary =
        `📊 Funding History: ${symbol}\n\n` +
        `Statistics:\n` +
        `  Average: ${result.statistics.average}%\n` +
        `  Median: ${result.statistics.median}%\n` +
        `  Std Dev: ${result.statistics.std_dev}%\n` +
        `  Min: ${result.statistics.min}%\n` +
        `  Max: ${result.statistics.max}%\n\n` +
        `Trend: ${result.trend}\n` +
        `Cumulative Cost: ${result.cumulative_cost}%\n` +
        `Annualized Cost: ${result.annualized_cost}%\n` +
        `Volatility Score: ${result.volatility_score}/100\n\n` +
        `Distribution: ${result.distribution.positive} positive | ${result.distribution.negative} negative | ${result.distribution.zero} zero\n` +
        `Extreme Events: ${result.extreme_count}`;

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to analyze funding history" },
        summary: "Funding history data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
