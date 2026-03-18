import { Skill, SkillResult } from "../types";
import {
  getFuturesKlines,
  getOpenInterestHist,
  DEFAULT_SYMBOLS,
  calculateATR,
  calculateADX,
} from "@/lib/futuresClient";

interface RegimeResult {
  symbol: string;
  regime: "TRENDING" | "RANGING" | "VOLATILE_BREAKOUT" | "LOW_ACTIVITY";
  direction: "UP" | "DOWN" | "SIDEWAYS";
  adx: number;
  atr: number;
  volume_change_percent: number;
}

async function analyzeSymbol(
  symbol: string,
): Promise<RegimeResult | { symbol: string; error: string }> {
  try {
    const [klines, oiHist] = await Promise.all([
      getFuturesKlines(symbol, "4h", 50),
      getOpenInterestHist(symbol, "4h", 24),
    ]);

    const highs = klines.map((k) => k.high);
    const lows = klines.map((k) => k.low);
    const closes = klines.map((k) => k.close);
    const volumes = klines.map((k) => k.volume);

    const adx = calculateADX(highs, lows, closes, 14);
    const atr = calculateATR(highs, lows, closes, 14);

    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const olderVolume = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    const volumeChange = olderVolume > 0 ? ((recentVolume - olderVolume) / olderVolume) * 100 : 0;

    const currentClose = closes[closes.length - 1];
    const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    let direction: "UP" | "DOWN" | "SIDEWAYS";
    if (currentClose > sma20 * 1.02) direction = "UP";
    else if (currentClose < sma20 * 0.98) direction = "DOWN";
    else direction = "SIDEWAYS";

    let regime: "TRENDING" | "RANGING" | "VOLATILE_BREAKOUT" | "LOW_ACTIVITY";

    if (adx >= 25 && atr > 0) {
      if (volumeChange > 30) {
        regime = "VOLATILE_BREAKOUT";
      } else {
        regime = "TRENDING";
      }
    } else if (volumeChange < -30 || volumes.slice(-5).reduce((a, b) => a + b, 0) < 1000000) {
      regime = "LOW_ACTIVITY";
    } else {
      regime = "RANGING";
    }

    return {
      symbol,
      regime,
      direction,
      adx: Math.round(adx * 10) / 10,
      atr: Math.round(atr * 100) / 100,
      volume_change_percent: Math.round(volumeChange * 10) / 10,
    };
  } catch (error) {
    return {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const regime: Skill = {
  id: "binance/market-regime",
  name: "Market Regime Classifier",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Classifies current market conditions using ADX, ATR, and volume analysis. Identifies regimes: TRENDING, RANGING, VOLATILE_BREAKOUT, LOW_ACTIVITY. Helps select appropriate trading strategies.",
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

      const valid = results.filter((r): r is RegimeResult => !("error" in r));
      const errors = results.filter((r) => "error" in r);

      const trending = valid.filter((r) => r.regime === "TRENDING");
      const ranging = valid.filter((r) => r.regime === "RANGING");
      const volatile = valid.filter((r) => r.regime === "VOLATILE_BREAKOUT");
      const lowActivity = valid.filter((r) => r.regime === "LOW_ACTIVITY");

      const summary =
        `📊 Market Regime Classifier\n\n` +
        `Summary: ${trending.length} TRENDING | ${ranging.length} RANGING | ${volatile.length} VOLATILE | ${lowActivity.length} LOW_ACTIVITY\n\n` +
        valid
          .map((r) => {
            const emoji =
              r.regime === "TRENDING"
                ? "📈"
                : r.regime === "RANGING"
                  ? "↔️"
                  : r.regime === "VOLATILE_BREAKOUT"
                    ? "💥"
                    : "😴";
            const dir = r.direction === "UP" ? "↑" : r.direction === "DOWN" ? "↓" : "↔";
            return `${emoji} ${r.symbol}: ${r.regime} ${dir} (ADX: ${r.adx})`;
          })
          .join("\n");

      return {
        success: true,
        data: {
          results: valid,
          errors: errors.map((e) => e.symbol + ": " + e.error),
        },
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to classify market regimes" },
        summary: "Market regime data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
