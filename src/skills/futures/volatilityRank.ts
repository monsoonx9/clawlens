import { Skill, SkillResult } from "../types";
import { getFuturesKlines, DEFAULT_SYMBOLS } from "@/lib/futuresClient";

interface VolatilityResult {
  symbol: string;
  volatility_score: number;
  rank: number;
  price_high_30d: number;
  price_low_30d: number;
  price_change_30d: number;
}

async function calculateVolatility(
  symbol: string,
): Promise<VolatilityResult | { symbol: string; error: string }> {
  try {
    const klines = await getFuturesKlines(symbol, "1d", 30);

    if (klines.length < 20) {
      return { symbol, error: "Insufficient data" };
    }

    const closes = klines.map((k) => k.close);
    const returns: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const volatilityScore = Math.round(stdDev * 100 * 100) / 100;

    const high30d = Math.max(...klines.map((k) => k.high));
    const low30d = Math.min(...klines.map((k) => k.low));
    const priceChange = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;

    return {
      symbol,
      volatility_score: volatilityScore,
      rank: 0,
      price_high_30d: Math.round(high30d * 100) / 100,
      price_low_30d: Math.round(low30d * 100) / 100,
      price_change_30d: Math.round(priceChange * 100) / 100,
    };
  } catch (error) {
    return {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const volatilityRank: Skill = {
  id: "binance/volatility-rank",
  name: "Volatility Rank",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Calculates volatility score (standard deviation of daily returns) for futures pairs. Ranks symbols by volatility. Shows 30-day high/low and price change. Useful for risk management.",
  inputSchema: {
    symbols: {
      type: "array",
      required: false,
      description: "List of futures symbols to analyze (default: top 12 pairs)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbols = (input.symbols as string[] | undefined) || DEFAULT_SYMBOLS;
      const results = await Promise.all(symbols.map(calculateVolatility));

      const valid = results.filter((r): r is VolatilityResult => !("error" in r));
      valid.sort((a, b) => b.volatility_score - a.volatility_score);

      valid.forEach((r, i) => (r.rank = i + 1));

      const summary =
        `📊 Volatility Rank (30-day)\n\n` +
        valid
          .slice(0, 10)
          .map((r) => {
            const emoji = r.volatility_score > 5 ? "🔴" : r.volatility_score > 3 ? "🟡" : "🟢";
            return (
              `${r.rank}. ${emoji} ${r.symbol}: ${r.volatility_score}% volatility\n` +
              `   30d Range: $${r.price_low_30d.toLocaleString()} - $${r.price_high_30d.toLocaleString()}\n` +
              `   30d Change: ${r.price_change_30d >= 0 ? "+" : ""}${r.price_change_30d}%`
            );
          })
          .join("\n\n");

      return {
        success: true,
        data: { results: valid },
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to calculate volatility rank" },
        summary: "Volatility rank unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
