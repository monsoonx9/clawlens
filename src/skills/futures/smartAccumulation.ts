import { Skill, SkillResult } from "../types";
import {
  getFuturesKlines,
  getOpenInterestHist,
  getPremiumIndex,
  getTakerBuySellRatio,
  calculateLinearSlope,
  clamp,
  DEFAULT_SYMBOLS,
} from "@/lib/futuresClient";

interface AccumulationResult {
  symbol: string;
  scores: {
    volume_surge: number;
    oi_buildup: number;
    stealth_mode: number;
    buyer_aggression: number;
  };
  composite: number;
  signal: "STRONG" | "MODERATE" | "WEAK";
}

async function analyzeSymbol(
  symbol: string,
): Promise<AccumulationResult | { symbol: string; error: string }> {
  try {
    const [klines, oiHist, premium, taker] = await Promise.all([
      getFuturesKlines(symbol, "4h", 30),
      getOpenInterestHist(symbol, "4h", 30),
      getPremiumIndex(symbol),
      getTakerBuySellRatio(symbol, "4h", 30),
    ]);

    const volumes = klines.map((k) => k.volume);
    if (volumes.length < 2) {
      return { symbol, error: "insufficient data" };
    }

    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(volumes.length, 20);
    const currentVol = volumes[volumes.length - 1];
    const volRatio = avgVol > 0 ? currentVol / avgVol : 1;
    const volumeSurge = clamp((volRatio - 0.5) * 50, 0, 100);

    const oiValues = oiHist.map((o) => parseFloat(o.openInterest));
    let oiBuildup = 50;
    if (oiValues.length > 0) {
      const slope = calculateLinearSlope(oiValues);
      const meanOi = oiValues.reduce((a, b) => a + b, 0) / oiValues.length;
      const normalizedSlope = meanOi > 0 ? (slope / meanOi) * 100 : 0;
      oiBuildup = clamp(50 + normalizedSlope * 500, 0, 100);
    }

    const fundingRate = parseFloat(premium.lastFundingRate || "0");
    const stealthMode = clamp(100 - Math.abs(fundingRate) * 10000, 0, 100);

    const takerRatios: number[] = [];
    for (const t of taker) {
      const buyVol = parseFloat(t.buyVol);
      const sellVol = parseFloat(t.sellVol);
      if (buyVol + sellVol > 0) {
        takerRatios.push(buyVol / (buyVol + sellVol));
      }
    }
    let buyerAggression = 50;
    if (takerRatios.length > 0) {
      const latestRatio = takerRatios[takerRatios.length - 1];
      buyerAggression = clamp((latestRatio - 0.3) * 250, 0, 100);
    }

    const composite =
      volumeSurge * 0.25 + oiBuildup * 0.3 + stealthMode * 0.2 + buyerAggression * 0.25;

    return {
      symbol,
      scores: {
        volume_surge: Math.round(volumeSurge * 10) / 10,
        oi_buildup: Math.round(oiBuildup * 10) / 10,
        stealth_mode: Math.round(stealthMode * 10) / 10,
        buyer_aggression: Math.round(buyerAggression * 10) / 10,
      },
      composite: Math.round(composite * 10) / 10,
      signal: composite >= 70 ? "STRONG" : composite >= 45 ? "MODERATE" : "WEAK",
    };
  } catch (error) {
    return {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const smartAccumulation: Skill = {
  id: "binance/smart-accumulation",
  name: "Smart Accumulation Detector",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Detects smart accumulation by institutional/smart money using 4-factor composite analysis: volume surge, OI buildup, stealth mode, and buyer aggression. Scores 0-100 with STRONG/MODERATE/WEAK signals.",
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

      const valid = results.filter((r) => !("error" in r)) as AccumulationResult[];
      const errors = results.filter((r) => "error" in r);

      valid.sort((a, b) => b.composite - a.composite);

      const summary =
        `📊 Smart Accumulation Detector\n\n` +
        `Analyzed ${valid.length} symbols\n\n` +
        valid
          .slice(0, 5)
          .map(
            (r) =>
              `${r.symbol}: ${r.composite}/100 [${r.signal}]\n` +
              `  Volume: ${r.scores.volume_surge}, OI: ${r.scores.oi_buildup}, ` +
              `Stealth: ${r.scores.stealth_mode}, Aggression: ${r.scores.buyer_aggression}`,
          )
          .join("\n\n");

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
        data: { status: "unavailable", message: "Unable to analyze accumulation" },
        summary: "Smart accumulation data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
