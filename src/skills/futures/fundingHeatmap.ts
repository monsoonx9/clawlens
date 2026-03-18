import { Skill, SkillResult } from "../types";
import { getFundingInfo, getPremiumIndexAll } from "@/lib/futuresClient";

interface FundingData {
  symbol: string;
  funding_rate: number;
  funding_rate_annualized: number;
  mark_price: number;
  index_price: number;
  minutes_to_funding: number;
  direction: "LONGS_PAY" | "SHORTS_PAY" | "NEUTRAL";
}

async function getFundingHeatmapData(): Promise<FundingData[]> {
  const [fundingInfo, premiumIndices] = await Promise.all([getFundingInfo(), getPremiumIndexAll()]);

  const now = Date.now();
  const results: FundingData[] = [];

  for (const info of fundingInfo) {
    const premium = premiumIndices.find((p) => p.symbol === info.symbol);
    if (!premium) continue;

    const fundingRate = parseFloat(premium.lastFundingRate || "0");
    const annualized = fundingRate * 3 * 24 * 365;
    const markPrice = parseFloat(premium.markPrice);
    const indexPrice = parseFloat(premium.indexPrice);
    const nextFunding = premium.nextFundingTime;
    const minutesToFunding = Math.max(0, Math.floor((nextFunding - now) / 60000));

    let direction: "LONGS_PAY" | "SHORTS_PAY" | "NEUTRAL";
    if (fundingRate > 0.0001) direction = "LONGS_PAY";
    else if (fundingRate < -0.0001) direction = "SHORTS_PAY";
    else direction = "NEUTRAL";

    results.push({
      symbol: info.symbol,
      funding_rate: Math.round(fundingRate * 1000000) / 10000,
      funding_rate_annualized: Math.round(annualized * 100) / 100,
      mark_price: markPrice,
      index_price: indexPrice,
      minutes_to_funding: minutesToFunding,
      direction,
    });
  }

  return results.sort((a, b) => Math.abs(b.funding_rate) - Math.abs(a.funding_rate));
}

export const fundingHeatmap: Skill = {
  id: "binance/funding-heatmap",
  name: "Funding Rate Heatmap",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Scans all futures pairs for current funding rates. Shows funding %, annualized APR, mark/index premium, minutes to next funding, and direction (LONGS_PAY/SHORTS_PAY/NEUTRAL).",
  inputSchema: {
    top_n: {
      type: "number",
      required: false,
      description: "Number of top symbols to return (default: 20)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const topN = Number(input.top_n) || 20;
      const results = await getFundingHeatmapData();

      const topResults = results.slice(0, topN);

      const longsPay = results.filter((r) => r.direction === "LONGS_PAY").length;
      const shortsPay = results.filter((r) => r.direction === "SHORTS_PAY").length;
      const neutral = results.filter((r) => r.direction === "NEUTRAL").length;
      const avgRate = results.reduce((sum, r) => sum + r.funding_rate, 0) / results.length;

      const summary =
        `💰 Funding Rate Heatmap\n\n` +
        `Summary: ${longsPay} LONGS_PAY | ${shortsPay} SHORTS_PAY | ${neutral} NEUTRAL\n` +
        `Avg Rate: ${avgRate.toFixed(4)}%\n\n` +
        topResults
          .map((r) => {
            const emoji =
              r.direction === "LONGS_PAY" ? "🟢" : r.direction === "SHORTS_PAY" ? "🔴" : "⚪";
            return `${emoji} ${r.symbol}: ${r.funding_rate.toFixed(4)}% (${r.funding_rate_annualized.toFixed(1)}% APR) | Next: ${r.minutes_to_funding}m`;
          })
          .join("\n");

      return {
        success: true,
        data: {
          results: topResults,
          summary_stats: {
            longs_pay: longsPay,
            shorts_pay: shortsPay,
            neutral,
            avg_rate: avgRate,
          },
        },
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch funding heatmap" },
        summary: "Funding heatmap unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
