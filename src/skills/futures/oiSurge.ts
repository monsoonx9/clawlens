import { Skill, SkillResult } from "../types";
import { getOpenInterestHist, DEFAULT_SYMBOLS } from "@/lib/futuresClient";

interface OISurgeResult {
  symbol: string;
  oi_current: number;
  oi_1h_ago: number;
  change_percent: number;
  is_surge: boolean;
  surge_severity: "SPIKE" | "NORMAL" | "NONE";
  timestamp: number;
}

async function analyzeSymbol(
  symbol: string,
): Promise<OISurgeResult | { symbol: string; error: string }> {
  try {
    const data = await getOpenInterestHist(symbol, "1h", 24);

    if (data.length < 2) {
      return { symbol, error: "Insufficient data" };
    }

    const oiValues = data.map((d) => parseFloat(d.openInterest));
    const currentOI = oiValues[oiValues.length - 1];
    const oi1hAgo = oiValues[oiValues.length - 2];
    const changePercent = ((currentOI - oi1hAgo) / oi1hAgo) * 100;

    let isSurge = false;
    let surgeSeverity: "SPIKE" | "NORMAL" | "NONE" = "NONE";

    if (Math.abs(changePercent) > 10) {
      isSurge = true;
      surgeSeverity = "SPIKE";
    } else if (Math.abs(changePercent) > 5) {
      isSurge = true;
      surgeSeverity = "NORMAL";
    }

    return {
      symbol,
      oi_current: Math.round(currentOI),
      oi_1h_ago: Math.round(oi1hAgo),
      change_percent: Math.round(changePercent * 100) / 100,
      is_surge: isSurge,
      surge_severity: surgeSeverity,
      timestamp: data[data.length - 1].timestamp,
    };
  } catch (error) {
    return {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const oiSurge: Skill = {
  id: "binance/oi-surge",
  name: "OI Surge Detector",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Detects sudden spikes in open interest. Shows current OI, 1-hour ago OI, change percentage. Classifies severity: SPIKE (>10%), NORMAL (>5%), NONE. Useful for identifying momentum shifts.",
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

      const valid = results.filter((r): r is OISurgeResult => !("error" in r));
      valid.sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent));

      const surges = valid.filter((r) => r.is_surge);

      const summary =
        `📈 OI Surge Detector\n\n` +
        `Surge Count: ${surges.length}\n\n` +
        valid
          .slice(0, 10)
          .map((r) => {
            const emoji = r.is_surge ? (r.change_percent > 0 ? "🚀" : "💨") : "➡️";
            const severity =
              r.surge_severity === "SPIKE" ? "🔥" : r.surge_severity === "NORMAL" ? "⚡" : "";
            return `${emoji} ${r.symbol}: ${r.change_percent >= 0 ? "+" : ""}${r.change_percent}% ${severity}`;
          })
          .join("\n");

      return {
        success: true,
        data: { results: valid, surge_count: surges.length },
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to detect OI surges" },
        summary: "OI surge detection unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
