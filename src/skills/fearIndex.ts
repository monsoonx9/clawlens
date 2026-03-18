import { Skill, SkillContext, SkillResult } from "./types";
import { getKlines } from "@/lib/binanceClient";
import { FearIndexResult, FearIndexComponent } from "@/types";

// ---------------------------------------------------------------------------
// Fear Index Skill — 4-component 0-100 composite score
// ---------------------------------------------------------------------------

export const fearIndex: Skill = {
  id: "claw-council/fear-index",
  name: "Fear Index",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Calculates a 0-100 Fear & Greed index for a specific token or the market. " +
    "Combines four weighted components: Social Sentiment (30%), Price Momentum (25%), " +
    "Smart Money Direction (30%), and Technical RSI (15%). Includes contrarian interpretation.",
  inputSchema: {
    token: {
      type: "string",
      required: true,
      description: 'Token symbol or "MARKET"',
    },
    socialHypeScore: {
      type: "number",
      required: true,
      description: "0-100 social hype rating",
    },
    memeRushMomentum: {
      type: "number",
      required: true,
      description: "0-100 meme rush momentum",
    },
    smartMoneyDirection: {
      type: "number",
      required: true,
      description: "0-100 smart money direction",
    },
    priceChange24h: {
      type: "number",
      required: true,
      description: "24h price change percent",
    },
  },

  async execute(input: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    try {
      const token = String(input.token || "MARKET").toUpperCase();
      const socialHypeScore = Number(input.socialHypeScore);
      const memeRushMomentum = Number(input.memeRushMomentum);
      const smartMoneyDirection = Number(input.smartMoneyDirection);
      const priceChange24h = Number(input.priceChange24h);

      // Check if inputs are valid numbers (not NaN)
      const hasValidSocial = !isNaN(socialHypeScore) && socialHypeScore !== 0;
      const hasValidMeme = !isNaN(memeRushMomentum) && memeRushMomentum !== 0;
      const hasValidPrice = !isNaN(priceChange24h);
      const hasValidSmart = !isNaN(smartMoneyDirection) && smartMoneyDirection !== 0;

      // Use defaults only if no valid data
      const effectiveSocialHype = hasValidSocial ? socialHypeScore : 50;
      const effectiveMemeRush = hasValidMeme ? memeRushMomentum : 50;
      const effectiveSmartMoney = hasValidSmart ? smartMoneyDirection : 50;
      const effectivePriceChange = hasValidPrice ? priceChange24h : 0;

      let componentsWithRealData = 0;

      // Check if inputs are real (not default values that indicate fetch failure)
      const socialDataReal = hasValidSocial || hasValidMeme;
      const priceDataReal = hasValidPrice;
      const smartMoneyDataReal = hasValidSmart;
      let rsiDataReal = false;

      // ── Component 1: Social Sentiment (30%) ──
      if (socialDataReal) componentsWithRealData++;
      const socialScore = Math.min(
        100,
        Math.max(0, effectiveSocialHype * 0.6 + effectiveMemeRush * 0.4),
      );
      const socialComponent: FearIndexComponent = {
        score: socialScore,
        weight: 0.3,
        rawData: `socialHype=${effectiveSocialHype}, memeRush=${effectiveMemeRush}`,
        explanation:
          socialScore > 75
            ? "Very high social activity — a sign of potential FOMO or mania"
            : socialScore > 50
              ? "Moderate social interest — narrative gaining traction"
              : socialScore > 25
                ? "Low social activity — market is quiet or losing interest"
                : "Extremely low social presence — apathy zone",
      };

      // ── Component 2: Price Momentum (25%) ──
      if (priceDataReal) componentsWithRealData++;
      let momentumScore = 50;
      if (effectivePriceChange > 20) momentumScore = 90;
      else if (effectivePriceChange > 10) momentumScore = 75;
      else if (effectivePriceChange > 3) momentumScore = 62;
      else if (effectivePriceChange > -3) momentumScore = 50;
      else if (effectivePriceChange > -10) momentumScore = 35;
      else if (effectivePriceChange > -20) momentumScore = 20;
      else momentumScore = 10;

      const momentumComponent: FearIndexComponent = {
        score: momentumScore,
        weight: 0.25,
        rawData: `priceChange24h=${effectivePriceChange.toFixed(2)}%`,
        explanation:
          momentumScore > 70
            ? "Strong upward price momentum — potential overheating"
            : momentumScore > 45
              ? "Price is stable with mild movement"
              : "Negative price momentum — fear may be entering",
      };

      // ── Component 3: Smart Money (30%) ──
      if (smartMoneyDataReal) componentsWithRealData++;
      const smartMoneyComponent: FearIndexComponent = {
        score: effectiveSmartMoney,
        weight: 0.3,
        rawData: `smartMoneyDirection=${effectiveSmartMoney}`,
        explanation:
          effectiveSmartMoney > 70
            ? "Smart money is actively accumulating — strong institutional interest"
            : effectiveSmartMoney > 40
              ? "Mixed smart money signals — no clear directional bias"
              : "Smart money is distributing or absent — caution advised",
      };

      // ── Component 4: Technical RSI (15%) — calculated from K-Lines ──
      let rsiScore = 50;
      const pair = token === "MARKET" ? "BTCUSDT" : token + "USDT";
      try {
        const klinesRes = await getKlines(pair, "1d", 16);
        if (klinesRes.success && klinesRes.data && klinesRes.data.length >= 15) {
          const klines = klinesRes.data;
          rsiDataReal = true;
          componentsWithRealData++;
          const gains: number[] = [];
          const losses: number[] = [];
          for (let i = 1; i < klines.length; i++) {
            const change = klines[i].close - klines[i - 1].close;
            if (change > 0) {
              gains.push(change);
              losses.push(0);
            } else {
              gains.push(0);
              losses.push(Math.abs(change));
            }
          }
          const avgGain = gains.reduce((a, b) => a + b, 0) / 14;
          const avgLoss = losses.reduce((a, b) => a + b, 0) / 14;
          const rs = avgLoss > 0 ? avgGain / avgLoss : 100;
          const rsi = 100 - 100 / (1 + rs);
          rsiScore = rsi;
        }
      } catch {
        // K-Line fetch failed, default to neutral
      }

      const rsiComponent: FearIndexComponent = {
        score: rsiScore,
        weight: 0.15,
        rawData: `RSI14=${rsiScore.toFixed(1)}`,
        explanation:
          rsiScore > 70
            ? "RSI indicates overbought conditions — potential reversal zone"
            : rsiScore > 30
              ? "RSI in neutral range — no extreme reading"
              : "RSI indicates oversold conditions — potential bounce zone",
      };

      // Determine data quality
      let dataQuality: "full" | "partial" | "unavailable";
      let dataQualityNote: string;
      if (componentsWithRealData === 0) {
        dataQuality = "unavailable";
        dataQualityNote = "No market data could be retrieved for this token";
      } else if (componentsWithRealData <= 2) {
        dataQuality = "partial";
        dataQualityNote = "Score based on partial data — treat with caution";
      } else {
        dataQuality = "full";
        dataQualityNote = "Score based on comprehensive market data";
      }

      // ── Composite ──
      const compositeScore = Math.round(
        socialComponent.score * socialComponent.weight +
          momentumComponent.score * momentumComponent.weight +
          smartMoneyComponent.score * smartMoneyComponent.weight +
          rsiComponent.score * rsiComponent.weight,
      );

      const label =
        compositeScore <= 15
          ? "Extreme Fear"
          : compositeScore <= 30
            ? "Fear"
            : compositeScore <= 45
              ? "Caution"
              : compositeScore <= 55
                ? "Neutral"
                : compositeScore <= 75
                  ? "Greed"
                  : "Extreme Greed";

      const color =
        compositeScore <= 25
          ? "var(--color-risk-extreme)"
          : compositeScore <= 45
            ? "var(--color-risk-moderate)"
            : compositeScore <= 55
              ? "var(--color-text-muted)"
              : compositeScore <= 75
                ? "var(--color-risk-low)"
                : "var(--color-accent)";

      const interpretation =
        compositeScore <= 25
          ? `${token} is in a zone of extreme fear (${compositeScore}/100). ` +
            "Markets are pessimistic. Historically, extreme fear can signal buying opportunities for long-term investors, " +
            "but falling knives are real — wait for momentum reversal before acting."
          : compositeScore <= 45
            ? `${token} is showing fear/caution signals (${compositeScore}/100). ` +
              "Sentiment is negative but not panic-level. Watch for stabilization before committing capital."
            : compositeScore <= 55
              ? `${token} is in neutral territory (${compositeScore}/100). ` +
                "No strong directional bias. This is often a consolidation phase."
              : compositeScore <= 75
                ? `${token} is showing greed signals (${compositeScore}/100). ` +
                  "Market is optimistic. Be cautious about FOMO entries — this is where many retail traders buy tops."
                : `${token} is in extreme greed territory (${compositeScore}/100). ` +
                  "Euphoria is high. Historically, extreme greed often precedes corrections. Consider taking profits.";

      const contrarianNote =
        compositeScore <= 20
          ? "Contrarian signal: Extreme fear is historically a better entry zone than extreme greed. " +
            'Warren Buffett: "Be greedy when others are fearful."'
          : compositeScore >= 80
            ? "Contrarian signal: Extreme greed often precedes sharp reversals. " +
              "Consider reducing exposure or setting trailing stop-losses."
            : undefined;

      const result: FearIndexResult = {
        token,
        score: compositeScore,
        label,
        color,
        components: {
          socialSentiment: socialComponent,
          priceMomentum: momentumComponent,
          smartMoney: smartMoneyComponent,
          technicalRSI: rsiComponent,
        },
        interpretation,
        contrarianNote,
        dataQuality,
        dataQualityNote,
      };

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary: `Fear Index for ${token}: ${compositeScore}/100 (${label}). ${interpretation}`,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to calculate Fear Index" },
        summary: "Market data temporarily unavailable. Try again later or check your API keys.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
