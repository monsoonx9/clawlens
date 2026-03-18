import { Skill, SkillResult } from "../types";
import { getFundingRateHistory } from "@/lib/futuresClient";

interface FundingExtremesResult {
  symbol: string;
  funding_rate: number;
  severity: "ELEVATED" | "HIGH" | "EXTREME";
  opportunity_score: number;
  urgency: "IMMINENT" | "SOON" | "UPCOMING";
  arbitrage_hint: string;
}

async function analyzeSymbol(
  symbol: string,
): Promise<FundingExtremesResult | { symbol: string; error: string }> {
  try {
    const data = await getFundingRateHistory(symbol, 1);

    if (data.length === 0) {
      return { symbol, error: "No funding data" };
    }

    const fundingRate = parseFloat(data[0].fundingRate);
    const absRate = Math.abs(fundingRate);

    let severity: "ELEVATED" | "HIGH" | "EXTREME";
    if (absRate > 0.001 || fundingRate < -0.0005) {
      severity = "EXTREME";
    } else if (absRate > 0.0005 || fundingRate < -0.0002) {
      severity = "HIGH";
    } else if (absRate > 0.0003) {
      severity = "ELEVATED";
    } else {
      return { symbol, error: "Normal funding rate" };
    }

    const opportunityScore = Math.min(100, Math.round(absRate * 100000));

    let urgency: "IMMINENT" | "SOON" | "UPCOMING";
    if (severity === "EXTREME") urgency = "IMMINENT";
    else if (severity === "HIGH") urgency = "SOON";
    else urgency = "UPCOMING";

    let arbitrageHint = "";
    if (fundingRate > 0) {
      arbitrageHint = "Long traders pay funding. Consider short if sentiment turns.";
    } else {
      arbitrageHint = "Short traders pay funding. Consider long if sentiment turns.";
    }

    return {
      symbol,
      funding_rate: Math.round(fundingRate * 1000000) / 10000,
      severity,
      opportunity_score: opportunityScore,
      urgency,
      arbitrage_hint: arbitrageHint,
    };
  } catch (error) {
    return {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const fundingExtremes: Skill = {
  id: "binance/funding-extremes",
  name: "Extreme Funding Detector",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Identifies abnormal funding rates for arbitrage opportunities. Severity: ELEVATED (>0.03%), HIGH (>0.05%), EXTREME (>0.1%). Shows urgency and arbitrage hints.",
  inputSchema: {
    symbols: {
      type: "array",
      required: false,
      description: "List of futures symbols to check (default: top 20 by volume)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbols = (input.symbols as string[] | undefined) || [
        "BTCUSDT",
        "ETHUSDT",
        "BNBUSDT",
        "SOLUSDT",
        "XRPUSDT",
        "DOGEUSDT",
        "ADAUSDT",
        "AVAXUSDT",
        "DOTUSDT",
        "MATICUSDT",
        "LINKUSDT",
        "LTCUSDT",
        "UNIUSDT",
        "ATOMUSDT",
        "ETCUSDT",
        "XLMUSDT",
        "TRXUSDT",
        "NEARUSDT",
        "FILUSDT",
        "APTUSDT",
      ];

      const results = await Promise.all(symbols.map(analyzeSymbol));

      const valid = results.filter((r): r is FundingExtremesResult => !("error" in r));
      valid.sort((a, b) => b.opportunity_score - a.opportunity_score);

      const extreme = valid.filter((r) => r.severity === "EXTREME");
      const high = valid.filter((r) => r.severity === "HIGH");
      const elevated = valid.filter((r) => r.severity === "ELEVATED");

      const summary =
        `⚠️ Extreme Funding Detector\n\n` +
        `EXTREME: ${extreme.length} | HIGH: ${high.length} | ELEVATED: ${elevated.length}\n\n` +
        valid
          .slice(0, 10)
          .map((r) => {
            const emoji = r.severity === "EXTREME" ? "🔴" : r.severity === "HIGH" ? "🟠" : "🟡";
            const urgencyEmoji =
              r.urgency === "IMMINENT" ? "🚨" : r.urgency === "SOON" ? "⚡" : "⏰";
            return (
              `${emoji} ${r.symbol}: ${r.funding_rate}% ${urgencyEmoji} ${r.urgency}\n` +
              `   ${r.arbitrage_hint}`
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
        data: { status: "unavailable", message: "Unable to detect funding extremes" },
        summary: "Funding extremes data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
