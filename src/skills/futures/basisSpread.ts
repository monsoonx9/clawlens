import { Skill, SkillResult } from "../types";
import { getFundingInfo, getPremiumIndexAll } from "@/lib/futuresClient";

interface BasisResult {
  symbol: string;
  basis_percent: number;
  mark_price: number;
  index_price: number;
  state: "CONTANGO" | "BACKWARDATION" | "FLAT";
}

async function getBasisData(): Promise<BasisResult[]> {
  const [fundingInfo, premiumIndices] = await Promise.all([getFundingInfo(), getPremiumIndexAll()]);

  const results: BasisResult[] = [];

  for (const info of fundingInfo) {
    const premium = premiumIndices.find((p) => p.symbol === info.symbol);
    if (!premium) continue;

    const markPrice = parseFloat(premium.markPrice);
    const indexPrice = parseFloat(premium.indexPrice);
    const basisPercent = ((markPrice - indexPrice) / indexPrice) * 100;

    let state: "CONTANGO" | "BACKWARDATION" | "FLAT";
    if (basisPercent > 0.01) state = "CONTANGO";
    else if (basisPercent < -0.01) state = "BACKWARDATION";
    else state = "FLAT";

    results.push({
      symbol: info.symbol,
      basis_percent: Math.round(basisPercent * 1000) / 1000,
      mark_price: Math.round(markPrice * 100) / 100,
      index_price: Math.round(indexPrice * 100) / 100,
      state,
    });
  }

  return results.sort((a, b) => Math.abs(b.basis_percent) - Math.abs(a.basis_percent));
}

export const basisSpread: Skill = {
  id: "binance/basis-spread",
  name: "Basis Spread Scanner",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Identifies contango and backwardation across futures markets. Shows basis %, mark/index prices. States: CONTANGO (future > spot), BACKWARDATION (future < spot), FLAT.",
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
      const results = await getBasisData();

      const topResults = results.slice(0, topN);

      const contango = results.filter((r) => r.state === "CONTANGO").length;
      const backwardation = results.filter((r) => r.state === "BACKWARDATION").length;
      const flat = results.filter((r) => r.state === "FLAT").length;

      const maxContango = results.filter((r) => r.state === "CONTANGO")[0];
      const maxBackwardation = results.filter((r) => r.state === "BACKWARDATION").pop();

      const summary =
        `📊 Basis Spread Scanner\n\n` +
        `Summary: ${contango} CONTANGO | ${backwardation} BACKWARDATION | ${flat} FLAT\n\n` +
        `Max Contango: ${maxContango?.symbol || "N/A"} (${maxContango?.basis_percent || 0}%)\n` +
        `Max Backwardation: ${maxBackwardation?.symbol || "N/A"} (${maxBackwardation?.basis_percent || 0}%)\n\n` +
        topResults
          .map((r) => {
            const emoji = r.state === "CONTANGO" ? "📈" : r.state === "BACKWARDATION" ? "📉" : "➡️";
            return `${emoji} ${r.symbol}: ${r.basis_percent >= 0 ? "+" : ""}${r.basis_percent}% (${r.state})`;
          })
          .join("\n");

      return {
        success: true,
        data: {
          results: topResults,
          summary_stats: { contango, backwardation, flat },
        },
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to scan basis spread" },
        summary: "Basis spread data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
