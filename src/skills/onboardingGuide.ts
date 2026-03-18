import { Skill, SkillContext, SkillResult } from "./types";
import { getTicker24hr, BinanceTicker24hr } from "@/lib/binanceClient";
import { OnboardingGuideResult } from "@/types";

// ---------------------------------------------------------------------------
// Onboarding Guide Skill — Topic classification + portfolio personalization
// ---------------------------------------------------------------------------

const TOPIC_MAP: Record<
  string,
  { category: string; level: "beginner" | "intermediate" | "advanced" }
> = {
  dca: { category: "DCA (Dollar-Cost Averaging)", level: "beginner" },
  "dollar cost": { category: "DCA (Dollar-Cost Averaging)", level: "beginner" },
  "stop loss": { category: "Stop Loss Orders", level: "intermediate" },
  "stop-loss": { category: "Stop Loss Orders", level: "intermediate" },
  oco: {
    category: "OCO (One-Cancels-the-Other) Orders",
    level: "intermediate",
  },
  "limit order": { category: "Limit Orders", level: "beginner" },
  "market order": { category: "Market Orders", level: "beginner" },
  leverage: { category: "Leverage Trading", level: "advanced" },
  margin: { category: "Margin Trading", level: "advanced" },
  futures: { category: "Futures Trading", level: "advanced" },
  staking: { category: "Staking", level: "beginner" },
  yield: { category: "Yield Farming", level: "intermediate" },
  liquidity: { category: "Liquidity Pools", level: "intermediate" },
  impermanent: { category: "Impermanent Loss", level: "advanced" },
  gas: { category: "Gas Fees", level: "beginner" },
  wallet: { category: "Wallet Security", level: "beginner" },
  "seed phrase": { category: "Seed Phrase Security", level: "beginner" },
  "private key": { category: "Private Key Security", level: "beginner" },
  token: { category: "Token Analysis", level: "intermediate" },
  audit: { category: "Smart Contract Audits", level: "intermediate" },
  rugpull: { category: "Rug Pull Prevention", level: "intermediate" },
  "rug pull": { category: "Rug Pull Prevention", level: "intermediate" },
  portfolio: { category: "Portfolio Management", level: "beginner" },
  diversif: { category: "Diversification", level: "beginner" },
  risk: { category: "Risk Management", level: "intermediate" },
  whale: { category: "Whale Watching", level: "intermediate" },
  "smart money": { category: "Smart Money Analysis", level: "intermediate" },
  rsi: { category: "RSI (Relative Strength Index)", level: "intermediate" },
  macd: { category: "MACD Indicator", level: "advanced" },
  bollinger: { category: "Bollinger Bands", level: "advanced" },
  chart: { category: "Chart Reading", level: "intermediate" },
  candlestick: { category: "Candlestick Patterns", level: "intermediate" },
  support: { category: "Support & Resistance", level: "intermediate" },
  resistance: { category: "Support & Resistance", level: "intermediate" },
  api: { category: "Binance API Usage", level: "advanced" },
  binance: { category: "Binance Platform", level: "beginner" },
};

const TOPIC_EXPLANATIONS: Record<
  string,
  Omit<OnboardingGuideResult["explanation"], "personalExample">
> = {
  "DCA (Dollar-Cost Averaging)": {
    coreConcept:
      "DCA means investing a fixed dollar amount at regular intervals, regardless of price. Instead of trying to time the market, you spread your purchases over time.",
    howItWorks:
      "You set a budget (e.g., $100/week) and buy at the same time each week. When prices are low, you buy more tokens. When prices are high, you buy fewer. Over time, this averages out your entry price.",
    whyItMatters:
      "Studies show that DCA consistently outperforms lump-sum investing for volatile assets like crypto. It removes emotions from buying decisions and protects against buying at the top.",
    commonMistake:
      "Stopping DCA during crashes. The whole point is that crashes let you accumulate more at lower prices. Pausing defeats the strategy.",
    binanceFeature: "Binance Auto-Invest lets you automate DCA with recurring purchases.",
    binanceFeatureLink: "https://www.binance.com/en/earn/auto-invest",
  },
  "Stop Loss Orders": {
    coreConcept:
      "A stop-loss is an order that automatically sells your position when the price drops to a specified level. It limits your downside.",
    howItWorks:
      "You set a trigger price below the current price. If the market reaches that price, your stop-loss converts to a market sell order. For example, if BTC is $60,000, you might set a stop at $54,000 (-10%).",
    whyItMatters:
      'Without stop-losses, a single bad trade can wipe out weeks of gains. They enforce discipline even when your emotions say "it will bounce back."',
    commonMistake:
      "Setting stops too tight. Normal volatility can trigger your stop before the real move happens. Give your position room to breathe — usually 5-15% depending on the asset.",
    binanceFeature:
      "Binance Spot supports Stop-Limit orders. For bracket protection, use OCO orders.",
  },
  "Portfolio Management": {
    coreConcept:
      "Portfolio management is the art of allocating your capital across different assets to maximize returns while controlling risk.",
    howItWorks:
      "You decide what percentage of your portfolio goes to each asset class: blue chips (BTC, ETH), large caps, mid caps, meme coins, and stablecoins. Then you periodically rebalance to maintain those ratios.",
    whyItMatters:
      "Proper allocation is responsible for more than 90% of long-term returns. A well-diversified portfolio survives crashes that destroy concentrated portfolios.",
    commonMistake:
      "Going all-in on one token because it's \"the next big thing.\" Even if you're right, concentration risk means one bad event can wipe you out.",
    binanceFeature:
      "ClawLens Portfolio Pulse analyzes your current allocation, concentration, and risk score in real-time using your Binance data.",
  },
};

const ANALOGIES: Record<string, string> = {
  "DCA (Dollar-Cost Averaging)":
    "Think of DCA like filling your car with gas — you don't wait for gas prices to hit a perfect low. You buy regularly because you need fuel. Similarly, you accumulate crypto regularly because timing the bottom is impossible.",
  "Stop Loss Orders":
    "A stop-loss is like a fire alarm. You hope it never goes off, but when the building is on fire, it saves you. Without one, you might sleep through the blaze.",
  "Portfolio Management":
    "Your portfolio is like a team roster. You need star players (BTC, ETH), solid role players (large caps), and some moonshot rookies (small caps). But if your entire squad is unproven rookies, one bad game ends the season.",
};

export const onboardingGuide: Skill = {
  id: "claw-council/onboarding-guide",
  name: "Onboarding Guide",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Educational content generator that classifies topics, adjusts complexity to the " +
    "user's level, and personalizes explanations using their live portfolio data from " +
    "Binance. Includes core concepts, analogies, key terms, and Binance feature links.",
  inputSchema: {
    question: {
      type: "string",
      required: true,
      description: "The user's question or topic",
    },
    userLevel: {
      type: "string",
      required: false,
      description: "beginner, intermediate, advanced",
    },
    portfolioContext: {
      type: "string",
      required: false,
      description: "Brief portfolio context string",
    },
  },

  async execute(input: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    try {
      const question = String(input.question || "");
      const userLevel = String(input.userLevel || "beginner") as
        | "beginner"
        | "intermediate"
        | "advanced";
      const lower = question.toLowerCase();

      // ── Step 1: Topic classification ──
      let detectedTopic = "General Crypto";
      let detectedLevel: "beginner" | "intermediate" | "advanced" = userLevel;

      for (const [keyword, { category, level }] of Object.entries(TOPIC_MAP)) {
        if (lower.includes(keyword)) {
          detectedTopic = category;
          detectedLevel = level;
          break;
        }
      }

      // ── Step 2: Get explanation ──
      const explanation = TOPIC_EXPLANATIONS[detectedTopic] || {
        coreConcept: `This topic relates to ${detectedTopic}. Let me explain it in context of your trading journey.`,
        howItWorks:
          "This involves understanding market mechanics and applying them to your specific situation with your Binance account.",
        whyItMatters:
          "Understanding this concept will help you make better trading decisions and avoid common pitfalls.",
        commonMistake:
          "The most common mistake is jumping in without understanding the fundamentals first.",
        binanceFeature: "Binance offers several tools that relate to this topic.",
      };

      // ── Step 3: Personal example from live data ──
      let personalExample: string | undefined;
      if (context.portfolio && context.portfolio.assets.length > 0) {
        const topAsset = context.portfolio.assets[0];
        if (detectedTopic === "DCA (Dollar-Cost Averaging)") {
          personalExample =
            `Looking at your portfolio, your largest holding is ${topAsset.symbol} at $${topAsset.valueUSD.toFixed(2)}. ` +
            `If you had DCA'd into ${topAsset.symbol} over the past 12 weeks instead of buying all at once, ` +
            `your average buy price would likely be different from your current avg of $${topAsset.avgBuyPrice.toFixed(2)}.`;
        } else if (detectedTopic === "Stop Loss Orders") {
          const stopPrice = topAsset.currentPrice * 0.9;
          personalExample =
            `For your ${topAsset.symbol} position (currently $${topAsset.currentPrice.toFixed(2)}), ` +
            `a 10% stop-loss would trigger at $${stopPrice.toFixed(2)}, limiting your loss to ` +
            `$${(topAsset.valueUSD * 0.1).toFixed(2)} on this position.`;
        } else if (detectedTopic === "Portfolio Management") {
          personalExample =
            `Your portfolio currently has ${context.portfolio.assets.length} assets. ` +
            `Your largest position (${topAsset.symbol}) represents ${topAsset.allocation.toFixed(1)}% of your portfolio.`;
        }
      }

      // ── Step 4: Live data enrichment ──
      try {
        const btcTickerRes = await getTicker24hr("BTCUSDT");
        if (btcTickerRes.success && btcTickerRes.data) {
          const btcTicker = btcTickerRes.data as BinanceTicker24hr;
          if (!personalExample) {
            personalExample =
              `For reference, BTC is currently at $${btcTicker.lastPrice.toFixed(2)} ` +
              `(${btcTicker.priceChangePercent > 0 ? "+" : ""}${btcTicker.priceChangePercent.toFixed(2)}% today). ` +
              `This real-time data helps contextualize the concept.`;
          }
        }
      } catch {
        // Live data fetch failed — still ok
      }

      // ── Step 5: Key terms ──
      const keyTermsByTopic: Record<string, Array<{ term: string; definition: string }>> = {
        "DCA (Dollar-Cost Averaging)": [
          {
            term: "DCA",
            definition: "Dollar-Cost Averaging — buying fixed amounts at regular intervals",
          },
          {
            term: "Cost Basis",
            definition: "Your average purchase price across all buys",
          },
          {
            term: "Accumulation",
            definition: "The process of gradually building a position over time",
          },
        ],
        "Stop Loss Orders": [
          {
            term: "Stop-Loss",
            definition: "An order that sells when price drops to a set level",
          },
          {
            term: "Stop-Limit",
            definition: "A stop-loss that converts to a limit order instead of market",
          },
          {
            term: "Slippage",
            definition: "The difference between expected and actual execution price",
          },
        ],
        "Portfolio Management": [
          {
            term: "Allocation",
            definition: "The percentage of portfolio assigned to each asset",
          },
          {
            term: "Rebalancing",
            definition: "Adjusting positions to maintain target allocations",
          },
          {
            term: "Concentration Risk",
            definition: "The danger of having too much in a single asset",
          },
        ],
      };

      const keyTerms = keyTermsByTopic[detectedTopic] || [
        {
          term: detectedTopic,
          definition: `A concept in cryptocurrency trading and investing`,
        },
      ];

      // ── Step 6: Follow-up questions ──
      const followUpQuestions = [
        `How does ${detectedTopic} apply to my specific portfolio?`,
        `What are the risks of ${detectedTopic}?`,
        `Can you show me a practical example on Binance?`,
      ];

      const relatedTopics = Object.values(TOPIC_MAP)
        .filter((t) => t.category !== detectedTopic && t.level === detectedLevel)
        .map((t) => t.category)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 4);

      const result: OnboardingGuideResult = {
        topic: detectedTopic,
        detectedLevel,
        explanation: { ...explanation, personalExample },
        analogyUsed:
          ANALOGIES[detectedTopic] ||
          `Understanding ${detectedTopic} is like learning a new skill — start with the basics and build from there.`,
        keyTerms,
        followUpQuestions,
        relatedTopics,
      };

      const summary = `📚 Topic: ${detectedTopic} (${detectedLevel} level). ${explanation.coreConcept.slice(0, 100)}...`;
      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to generate educational content" },
        summary: "Educational content unavailable. Try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
