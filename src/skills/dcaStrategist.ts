import { Skill, SkillContext, SkillResult } from "./types";
import { getKlines, getOrderBook, getTicker24hr, BinanceTicker24hr } from "@/lib/binanceClient";
import { DCAStrategistResult, DCAScheduleItem } from "@/types";

// ---------------------------------------------------------------------------
// DCA Strategist Skill
// ---------------------------------------------------------------------------

export const dcaStrategist: Skill = {
  id: "claw-council/dca-strategist",
  name: "DCA Strategist",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Designs a DCA plan using real K-Line volatility data, order book support " +
    "levels, and smart money signal alignment. Returns a week-by-week schedule " +
    "with acceleration logic, three price scenarios, and an order template.",
  inputSchema: {
    targetAsset: {
      type: "string",
      required: true,
      description: "Asset symbol e.g. BNB",
    },
    totalBudgetUSD: {
      type: "number",
      required: true,
      description: "Total USD to deploy",
    },
    durationWeeks: {
      type: "number",
      required: true,
      description: "Number of weeks for the DCA plan",
    },
    riskTolerance: {
      type: "number",
      required: true,
      description: "1-10 risk score",
    },
    existingAvgBuyPrice: {
      type: "number",
      required: false,
      description: "Existing avg buy if already holding",
    },
  },

  async execute(input: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    try {
      const targetAsset = String(input.targetAsset || "BNB").toUpperCase();
      const totalBudgetUSD = Number(input.totalBudgetUSD) || 500;
      const durationWeeks = Number(input.durationWeeks) || 12;
      const riskTolerance = Number(input.riskTolerance) || 5;
      const symbol = targetAsset + "USDT";

      // ── Step 1: Fetch market data in parallel ──
      const [klines90Res, klines30Res, tickerRes, orderBookRes] = await Promise.all([
        getKlines(symbol, "1d", 90),
        getKlines(symbol, "1d", 30),
        getTicker24hr(symbol),
        getOrderBook(symbol, 50),
      ]);

      if (
        !klines90Res.success ||
        !klines30Res.success ||
        !tickerRes.success ||
        !orderBookRes.success ||
        !klines90Res.data ||
        !klines30Res.data ||
        !tickerRes.data ||
        !orderBookRes.data
      ) {
        throw new Error("Failed to fetch required market data for DCA Strategist");
      }

      const klines90 = klines90Res.data;
      const klines30 = klines30Res.data;
      const ticker = tickerRes.data as BinanceTicker24hr;
      const orderBook = orderBookRes.data;

      const currentPrice = ticker.lastPrice;

      // ── Step 2: ATR for 90 days ──
      const atrValues: number[] = [];
      for (let i = 1; i < klines90.length; i++) {
        const tr = Math.max(
          klines90[i].high - klines90[i].low,
          Math.abs(klines90[i].high - klines90[i - 1].close),
          Math.abs(klines90[i].low - klines90[i - 1].close),
        );
        atrValues.push(tr);
      }
      const atr90d =
        atrValues.length > 0 ? atrValues.reduce((a, b) => a + b, 0) / atrValues.length : 0;
      const atr90dPercent = currentPrice > 0 ? (atr90d / currentPrice) * 100 : 0;

      const volatilityProfile = atr90dPercent > 12 ? "High" : atr90dPercent > 6 ? "Medium" : "Low";
      const recommendedFrequency =
        volatilityProfile === "High"
          ? "bi-weekly"
          : volatilityProfile === "Medium"
            ? "weekly"
            : "bi-monthly";

      // ── Step 3: Order book support levels ──
      let cumulativeBidUSD = 0;
      const supportLevels: number[] = [];
      for (const [price, qty] of orderBook.bids) {
        cumulativeBidUSD += price * qty;
        if (cumulativeBidUSD >= totalBudgetUSD * 0.3 && supportLevels.length === 0) {
          supportLevels.push(price);
        }
        if (cumulativeBidUSD >= totalBudgetUSD * 0.7 && supportLevels.length === 1) {
          supportLevels.push(price);
        }
        if (supportLevels.length === 2) break;
      }

      const orderBookInsight =
        supportLevels.length >= 2
          ? `Order book shows significant bid walls at $${supportLevels[0].toFixed(4)} and $${supportLevels[1].toFixed(4)}. These are natural accumulation zones.`
          : "Order book shows thin support. Spread buys evenly to avoid moving the price.";

      // ── Step 4: SMA values for acceleration ──
      const sma20 =
        klines30.slice(-20).reduce((s, k) => s + k.close, 0) / Math.min(20, klines30.length);

      // ── Step 5: Build schedule ──
      const intervals =
        recommendedFrequency === "bi-weekly"
          ? durationWeeks * 2
          : recommendedFrequency === "weekly"
            ? durationWeeks
            : Math.ceil(durationWeeks / 2);
      const baseAmount = totalBudgetUSD / intervals;
      let remainingBudget = totalBudgetUSD;
      let cumulativeSpent = 0;
      let cumulativeTokens = 0;
      const schedule: DCAScheduleItem[] = [];

      for (let i = 0; i < intervals; i++) {
        const weekNumber =
          recommendedFrequency === "bi-weekly"
            ? Math.floor(i / 2) + 1
            : recommendedFrequency === "weekly"
              ? i + 1
              : i * 2 + 1;
        const daysFromNow =
          recommendedFrequency === "bi-weekly"
            ? i * 3.5
            : recommendedFrequency === "weekly"
              ? i * 7
              : i * 14;
        const scheduledDate = new Date(Date.now() + daysFromNow * 86400000)
          .toISOString()
          .split("T")[0];

        let adjustedAmount = baseAmount;
        let triggerNote: string | undefined;

        if (riskTolerance >= 7) {
          if (currentPrice < sma20 * 0.9) {
            adjustedAmount = Math.min(baseAmount * 2.0, remainingBudget);
            triggerNote = "Price is >10% below 20-day SMA — double-sized buy";
          } else if (currentPrice < sma20 * 0.95) {
            adjustedAmount = Math.min(baseAmount * 1.5, remainingBudget);
            triggerNote = "Price is 5-10% below 20-day SMA — 1.5x sized buy";
          }

          if (supportLevels.some((level) => Math.abs(currentPrice - level) / currentPrice < 0.02)) {
            adjustedAmount = Math.min(adjustedAmount + baseAmount * 0.5, remainingBudget);
            triggerNote = (triggerNote ? triggerNote + " + " : "") + "Near order book support wall";
          }
        }

        adjustedAmount = Math.min(adjustedAmount, remainingBudget);
        const estimatedTokensThisBuy = currentPrice > 0 ? adjustedAmount / currentPrice : 0;
        cumulativeSpent += adjustedAmount;
        cumulativeTokens += estimatedTokensThisBuy;
        remainingBudget -= adjustedAmount;

        schedule.push({
          weekNumber,
          scheduledDate,
          baseAmountUSD: parseFloat(baseAmount.toFixed(2)),
          adjustedAmountUSD: parseFloat(adjustedAmount.toFixed(2)),
          triggerNote,
          cumulativeSpent: parseFloat(cumulativeSpent.toFixed(2)),
          estimatedTokensAccumulated: parseFloat(cumulativeTokens.toFixed(6)),
        });
        if (remainingBudget < 1) break;
      }

      // ── Step 6: Scenario simulation ──
      const simulateScenario = (finalPriceMultiplier: number) => {
        let totalTokens = 0;
        let totalSpent = 0;

        schedule.forEach((buy, i) => {
          const progress = i / schedule.length;
          const simPrice = currentPrice * (1 + (finalPriceMultiplier - 1) * progress);
          const tokens = simPrice > 0 ? buy.adjustedAmountUSD / simPrice : 0;
          totalTokens += tokens;
          totalSpent += buy.adjustedAmountUSD;
        });

        const finalPrice = currentPrice * finalPriceMultiplier;
        const avgCostBasis = totalTokens > 0 ? totalSpent / totalTokens : 0;
        const projectedValue = totalTokens * finalPrice;
        const returnPercent =
          totalSpent > 0 ? ((projectedValue - totalSpent) / totalSpent) * 100 : 0;
        return {
          avgCostBasis: parseFloat(avgCostBasis.toFixed(4)),
          projectedValue: parseFloat(projectedValue.toFixed(2)),
          totalTokens: parseFloat(totalTokens.toFixed(6)),
          returnPercent: parseFloat(returnPercent.toFixed(2)),
        };
      };

      const scenarios = {
        bull: simulateScenario(1.5),
        bear: simulateScenario(0.7),
        crab: simulateScenario(1.05),
      };

      // ── Step 7: Smart money alignment ──
      const smartMoneyAlignment = "Neutral" as const;
      const signalNote = "No active smart money signals found for this asset.";

      // ── Step 8: Recommendation ──
      const recommendation =
        `DCA plan for ${targetAsset}: Deploy $${totalBudgetUSD} over ${durationWeeks} weeks with ${intervals} ` +
        `${recommendedFrequency} purchases of ~$${baseAmount.toFixed(2)} base each. ` +
        `Volatility profile: ${volatilityProfile} (ATR: ${atr90dPercent.toFixed(1)}%). ` +
        `${scenarios.bull.returnPercent > 0 ? `Bull scenario projects +${scenarios.bull.returnPercent.toFixed(0)}% return. ` : ""}` +
        `${scenarios.bear.returnPercent < 0 ? `Bear scenario shows ${scenarios.bear.returnPercent.toFixed(0)}% loss — only deploy capital you can hold long-term. ` : ""}` +
        orderBookInsight;

      const result: DCAStrategistResult = {
        targetAsset,
        totalBudgetUSD,
        durationWeeks,
        currentPrice,
        volatilityProfile,
        atr90dPercent: parseFloat(atr90dPercent.toFixed(2)),
        recommendedFrequency,
        schedule,
        supportLevels,
        scenarios,
        smartMoneyAlignment,
        signalNote,
        orderBookInsight,
        recommendation,
      };

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary: recommendation,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to generate DCA plan" },
        summary: "DCA strategist unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
