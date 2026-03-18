import { Skill, SkillContext, SkillResult } from "./types";
import {
  getFundingRateHistory,
  getOpenInterestHist,
  getTakerBuySellRatio,
} from "@/lib/futuresClient";

export const institutionalFlow: Skill = {
  id: "claw-council/institutional-flow",
  name: "Institutional Flow",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Analyzes institutional and smart money flows using funding rates, open interest, and taker long/short ratios. " +
    "Determines if institutions are accumulating, distributing, or neutral.",

  inputSchema: {
    symbol: {
      type: "string",
      required: false,
      description: "Token symbol (default: BTCUSDT)",
    },
  },

  async execute(input: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    try {
      const symbol = String(input.symbol || "BTCUSDT")
        .toUpperCase()
        .replace(/\s+/g, "");

      let fundingData = null;
      let oiData = null;
      let takerData = null;

      try {
        fundingData = await getFundingRateHistory(symbol, 3);
      } catch (e) {
        console.warn("[InstitutionalFlow] Funding rate fetch failed:", e);
      }

      try {
        oiData = await getOpenInterestHist(symbol, "1h", 6);
      } catch (e) {
        console.warn("[InstitutionalFlow] Open interest fetch failed:", e);
      }

      try {
        takerData = await getTakerBuySellRatio(symbol, "1h", 6);
      } catch (e) {
        console.warn("[InstitutionalFlow] Taker ratio fetch failed:", e);
      }

      let direction: "ACCUMULATING" | "DISTRIBUTING" | "NEUTRAL" = "NEUTRAL";
      let confidence = 0;
      const signals: string[] = [];
      const details: Record<string, unknown> = {};

      // Funding rate analysis
      if (fundingData && fundingData.length > 0) {
        const avgFunding =
          fundingData.reduce((a, b) => a + parseFloat(b.fundingRate), 0) / fundingData.length;

        details.fundingRate = avgFunding;

        if (avgFunding > 0.0001) {
          direction = "ACCUMULATING";
          signals.push(
            `Positive funding (${(avgFunding * 100).toFixed(4)}%) - longs paying shorts`,
          );
          confidence += 30;
        } else if (avgFunding < -0.0001) {
          direction = "DISTRIBUTING";
          signals.push(
            `Negative funding (${(avgFunding * 100).toFixed(4)}%) - shorts paying longs`,
          );
          confidence += 30;
        } else {
          signals.push(`Funding neutral (${(avgFunding * 100).toFixed(4)}%)`);
        }
      } else {
        details.fundingRate = "unavailable";
        signals.push("Funding rate data unavailable");
      }

      // Open interest analysis
      if (oiData && oiData.length >= 2) {
        const recentOI = parseFloat(oiData[oiData.length - 1].openInterest);
        const earlierOI = parseFloat(oiData[0].openInterest);
        const oiChange = ((recentOI - earlierOI) / earlierOI) * 100;

        details.openInterestChange = oiChange;

        if (oiChange > 10) {
          signals.push(`OI surging +${oiChange.toFixed(1)}% - new money entering market`);
          confidence += 25;
        } else if (oiChange < -10) {
          signals.push(`OI declining ${oiChange.toFixed(1)}% - positions being closed`);
          confidence += 15;
        } else if (oiChange > 5) {
          signals.push(`OI gradually increasing +${oiChange.toFixed(1)}%`);
          confidence += 10;
        }
      } else {
        details.openInterestChange = "unavailable";
      }

      // Taker long/short ratio analysis
      if (takerData && takerData.length > 0) {
        const avgLongRatio =
          takerData.reduce((a, b) => a + parseFloat(b.buySellRatio), 0) / takerData.length;

        details.takerLongShortRatio = avgLongRatio;

        if (avgLongRatio > 1.3) {
          signals.push(`Takers heavily long (${avgLongRatio.toFixed(2)}) - strong buying pressure`);
          confidence += 30;
          if (direction === "NEUTRAL") direction = "ACCUMULATING";
        } else if (avgLongRatio > 1.1) {
          signals.push(`Takers slightly long (${avgLongRatio.toFixed(2)}) - mild buying pressure`);
          confidence += 15;
        } else if (avgLongRatio < 0.7) {
          signals.push(
            `Takers heavily short (${avgLongRatio.toFixed(2)}) - strong selling pressure`,
          );
          confidence += 30;
          if (direction === "NEUTRAL") direction = "DISTRIBUTING";
        } else if (avgLongRatio < 0.9) {
          signals.push(
            `Takers slightly short (${avgLongRatio.toFixed(2)}) - mild selling pressure`,
          );
          confidence += 15;
        }
      } else {
        details.takerLongShortRatio = "unavailable";
      }

      // Cap confidence
      confidence = Math.min(confidence, 95);

      // Determine summary
      let summary = "";
      if (direction === "ACCUMULATING") {
        summary = `INSTITUTIONAL FLOW: ACCUMULATING (${confidence}% confidence). ${signals.join(". ")}`;
      } else if (direction === "DISTRIBUTING") {
        summary = `INSTITUTIONAL FLOW: DISTRIBUTING (${confidence}% confidence). ${signals.join(". ")}`;
      } else {
        summary = `INSTITUTIONAL FLOW: NEUTRAL (${confidence}% confidence). ${signals.join(". ")}`;
      }

      return {
        success: true,
        data: {
          symbol,
          direction,
          confidence,
          signals,
          details,
          timestamp: new Date().toISOString(),
        },
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: {
          status: "unavailable",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        summary:
          "Institutional flow data unavailable - API connectivity issue. Check your API keys or try again later.",
      };
    }
  },
};
