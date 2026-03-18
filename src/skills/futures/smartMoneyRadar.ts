import { Skill, SkillResult } from "../types";
import {
  getFuturesKlines,
  getOpenInterestHist,
  getTopLongShortPositionRatio,
  getTopLongShortAccountRatio,
  getGlobalLongShortAccountRatio,
  getTakerBuySellRatio,
  normalizeRatio,
  trendScore,
  DEFAULT_SYMBOLS,
} from "@/lib/futuresClient";

interface SmartMoneyResult {
  symbol: string;
  factors: {
    top_position_ratio: number;
    top_account_ratio: number;
    global_ls_ratio: number;
    taker_ratio: number;
    oi_trend: number;
    price_momentum: number;
  };
  composite: number;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
}

async function analyzeSymbol(
  symbol: string,
): Promise<SmartMoneyResult | { symbol: string; error: string }> {
  try {
    const [posRatio, accRatio, globalRatio, taker, oiHist, klines] = await Promise.all([
      getTopLongShortPositionRatio(symbol, "4h", 30),
      getTopLongShortAccountRatio(symbol, "4h", 30),
      getGlobalLongShortAccountRatio(symbol, "4h", 30),
      getTakerBuySellRatio(symbol, "4h", 30),
      getOpenInterestHist(symbol, "4h", 30),
      getFuturesKlines(symbol, "4h", 30),
    ]);

    const f1 =
      posRatio.length > 0
        ? normalizeRatio(parseFloat(posRatio[posRatio.length - 1].longShortRatio), 1.0)
        : 0;

    const f2 =
      accRatio.length > 0
        ? normalizeRatio(parseFloat(accRatio[accRatio.length - 1].longShortRatio), 1.0)
        : 0;

    const f3 =
      globalRatio.length > 0
        ? normalizeRatio(parseFloat(globalRatio[globalRatio.length - 1].longShortRatio), 1.0)
        : 0;

    const f4 =
      taker.length > 0 ? normalizeRatio(parseFloat(taker[taker.length - 1].buySellRatio), 1.0) : 0;

    const oiValues = oiHist.map((o) => parseFloat(o.openInterest));
    const f5 = trendScore(oiValues);

    const closes = klines.map((k) => k.close);
    const f6 = trendScore(closes);

    const weights = [0.2, 0.15, 0.1, 0.2, 0.2, 0.15];
    const factors = [f1, f2, f3, f4, f5, f6];
    const raw = weights.reduce((sum, w, i) => sum + w * factors[i], 0);
    const composite = Math.max(0, Math.min(100, (raw + 1) * 50));

    return {
      symbol,
      factors: {
        top_position_ratio: Math.round(f1 * 1000) / 1000,
        top_account_ratio: Math.round(f2 * 1000) / 1000,
        global_ls_ratio: Math.round(f3 * 1000) / 1000,
        taker_ratio: Math.round(f4 * 1000) / 1000,
        oi_trend: Math.round(f5 * 1000) / 1000,
        price_momentum: Math.round(f6 * 1000) / 1000,
      },
      composite: Math.round(composite * 10) / 10,
      bias: composite >= 60 ? "BULLISH" : composite <= 40 ? "BEARISH" : "NEUTRAL",
    };
  } catch (error) {
    return {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const smartMoneyRadar: Skill = {
  id: "binance/smart-money-radar",
  name: "Smart Money Radar",
  namespace: "binance",
  version: "1.0.0",
  description:
    "6-factor composite analysis of institutional positioning using Binance-exclusive data: top trader position/account ratios, global L/S ratio, taker ratio, OI trend, and price momentum. Scores 0-100 with BULLISH/BEARISH/NEUTRAL bias.",
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

      const valid = results.filter((r) => !("error" in r)) as SmartMoneyResult[];
      const errors = results.filter((r) => "error" in r);

      valid.sort((a, b) => b.composite - a.composite);

      const top = valid[0];
      const summary =
        `🎯 Smart Money Radar\n\n` +
        `Top Signal: ${top?.symbol} - ${top?.composite}/100 [${top?.bias}]\n\n` +
        valid
          .slice(0, 5)
          .map(
            (r) =>
              `${r.symbol}: ${r.composite}/100 [${r.bias}]\n` +
              `  Position: ${r.factors.top_position_ratio > 0 ? "🟢" : "🔴"} ${r.factors.top_position_ratio.toFixed(2)}, ` +
              `Account: ${r.factors.top_account_ratio > 0 ? "🟢" : "🔴"} ${r.factors.top_account_ratio.toFixed(2)}, ` +
              `Taker: ${r.factors.taker_ratio > 0 ? "🟢" : "🔴"} ${r.factors.taker_ratio.toFixed(2)}`,
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
        data: { status: "unavailable", message: "Unable to analyze smart money radar" },
        summary: "Smart money radar unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
