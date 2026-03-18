import { Skill, SkillResult } from "../types";
import { getTakerBuySellRatio, DEFAULT_SYMBOLS } from "@/lib/futuresClient";

interface TakerResult {
  symbol: string;
  current_ratio: number;
  avg_ratio_30p: number;
  trend: "INCREASING" | "DECREASING" | "STABLE";
  pressure: "BUY" | "SELL" | "NEUTRAL";
}

async function analyzeSymbol(
  symbol: string,
): Promise<TakerResult | { symbol: string; error: string }> {
  try {
    const data = await getTakerBuySellRatio(symbol, "4h", 30);

    if (data.length < 2) {
      return { symbol, error: "Insufficient data" };
    }

    const ratios = data.map((d) => parseFloat(d.buySellRatio));
    const currentRatio = ratios[ratios.length - 1];
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

    const recentAvg = ratios.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const olderAvg = ratios.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;

    let trend: "INCREASING" | "DECREASING" | "STABLE";
    if (recentAvg > olderAvg * 1.05) trend = "INCREASING";
    else if (recentAvg < olderAvg * 0.95) trend = "DECREASING";
    else trend = "STABLE";

    let pressure: "BUY" | "SELL" | "NEUTRAL";
    if (currentRatio > 0.52) pressure = "BUY";
    else if (currentRatio < 0.48) pressure = "SELL";
    else pressure = "NEUTRAL";

    return {
      symbol,
      current_ratio: Math.round(currentRatio * 1000) / 1000,
      avg_ratio_30p: Math.round(avgRatio * 1000) / 1000,
      trend,
      pressure,
    };
  } catch (error) {
    return {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const takerPressure: Skill = {
  id: "binance/taker-pressure",
  name: "Taker Pressure",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Analyzes taker buy/sell volume ratio. Shows current ratio, 30-period average, trend direction, and pressure classification (BUY/SELL/NEUTRAL). Key indicator of aggressive order flow.",
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
      const results = await Promise.all(symbols.map(analyzeSymbol));

      const valid = results.filter((r): r is TakerResult => !("error" in r));
      valid.sort((a, b) => Math.abs(b.current_ratio - 0.5) - Math.abs(a.current_ratio - 0.5));

      const buyPressure = valid.filter((r) => r.pressure === "BUY").length;
      const sellPressure = valid.filter((r) => r.pressure === "SELL").length;
      const neutral = valid.filter((r) => r.pressure === "NEUTRAL").length;

      const summary =
        `📊 Taker Pressure (4h)\n\n` +
        `Summary: ${buyPressure} BUY | ${sellPressure} SELL | ${neutral} NEUTRAL\n\n` +
        valid
          .slice(0, 10)
          .map((r) => {
            const emoji = r.pressure === "BUY" ? "🟢" : r.pressure === "SELL" ? "🔴" : "⚪";
            const trendArrow =
              r.trend === "INCREASING" ? "↑" : r.trend === "DECREASING" ? "↓" : "→";
            return `${emoji} ${r.symbol}: ${r.current_ratio} (${r.pressure}) ${trendArrow}`;
          })
          .join("\n");

      return {
        success: true,
        data: { results: valid },
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to analyze taker pressure" },
        summary: "Taker pressure data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
