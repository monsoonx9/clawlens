import { Skill, SkillResult } from "../types";
import { getFuturesKlines, DEFAULT_SYMBOLS } from "@/lib/futuresClient";

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

interface PatternResult {
  symbol: string;
  pattern: string;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
}

function detectHammer(
  candles: Candle[],
): { pattern: string; direction: "BULLISH"; confidence: number } | null {
  const c = candles[candles.length - 1];
  const body = Math.abs(c.close - c.open);
  const upperWick = c.high - Math.max(c.open, c.close);
  const lowerWick = Math.min(c.open, c.close) - c.low;
  const totalRange = c.high - c.low;

  if (totalRange === 0) return null;

  if (lowerWick > body * 2 && upperWick < body * 0.5 && body / totalRange < 0.3) {
    const confidence = Math.min(100, (lowerWick / body) * 50 + 50);
    return { pattern: "Hammer", direction: "BULLISH", confidence };
  }

  if (upperWick > body * 2 && lowerWick < body * 0.5 && body / totalRange < 0.3) {
    const confidence = Math.min(100, (upperWick / body) * 50 + 50);
    return { pattern: "Inverted Hammer", direction: "BULLISH", confidence };
  }

  return null;
}

function detectEngulfing(candles: Candle[]): {
  pattern: string;
  direction: "BULLISH" | "BEARISH";
  confidence: number;
} | null {
  if (candles.length < 2) return null;

  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];

  const prevBody = {
    top: Math.max(prev.open, prev.close),
    bottom: Math.min(prev.open, prev.close),
  };
  const currBody = {
    top: Math.max(curr.open, curr.close),
    bottom: Math.min(curr.open, curr.close),
  };

  const prevBearish = prev.close < prev.open;
  const currBullish = curr.close > curr.open;

  if (
    prevBearish &&
    currBullish &&
    currBody.top > prevBody.top &&
    currBody.bottom < prevBody.bottom
  ) {
    return {
      pattern: "Bullish Engulfing",
      direction: "BULLISH",
      confidence: 75,
    };
  }

  const prevBullish = prev.close > prev.open;
  const currBearish = curr.close < curr.open;

  if (
    prevBullish &&
    currBearish &&
    currBody.top > prevBody.top &&
    currBody.bottom < prevBody.bottom
  ) {
    return {
      pattern: "Bearish Engulfing",
      direction: "BEARISH",
      confidence: 75,
    };
  }

  return null;
}

function detectDoji(
  candles: Candle[],
): { pattern: string; direction: "NEUTRAL"; confidence: number } | null {
  const c = candles[candles.length - 1];
  const body = Math.abs(c.close - c.open);
  const totalRange = c.high - c.low;

  if (totalRange === 0) return null;

  if (body / totalRange < 0.1) {
    return { pattern: "Doji", direction: "NEUTRAL", confidence: 60 };
  }

  return null;
}

function detectThreeWhiteSoldiers(
  candles: Candle[],
): { pattern: string; direction: "BULLISH"; confidence: number } | null {
  if (candles.length < 3) return null;

  const c1 = candles[candles.length - 3];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 1];

  if (
    c1.close > c1.open &&
    c2.close > c2.open &&
    c3.close > c3.open &&
    c2.close > c1.close &&
    c3.close > c2.close &&
    c2.low > c1.low &&
    c3.low > c2.low
  ) {
    return {
      pattern: "Three White Soldiers",
      direction: "BULLISH",
      confidence: 80,
    };
  }

  return null;
}

function detectThreeBlackCrows(
  candles: Candle[],
): { pattern: string; direction: "BEARISH"; confidence: number } | null {
  if (candles.length < 3) return null;

  const c1 = candles[candles.length - 3];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 1];

  if (
    c1.close < c1.open &&
    c2.close < c2.open &&
    c3.close < c3.open &&
    c2.close < c1.close &&
    c3.close < c2.close &&
    c2.high < c1.high &&
    c3.high < c2.high
  ) {
    return {
      pattern: "Three Black Crows",
      direction: "BEARISH",
      confidence: 80,
    };
  }

  return null;
}

async function analyzeSymbol(symbol: string, interval: string): Promise<PatternResult | null> {
  const klines = await getFuturesKlines(symbol, interval as any, 50);
  const candles = klines.map((k) => ({
    open: k.open,
    high: k.high,
    low: k.low,
    close: k.close,
  }));

  const detectors = [
    detectHammer,
    detectEngulfing,
    detectDoji,
    detectThreeWhiteSoldiers,
    detectThreeBlackCrows,
  ];

  for (const detector of detectors) {
    const result = detector(candles);
    if (result) {
      return { symbol, ...result };
    }
  }

  return null;
}

export const patterns: Skill = {
  id: "binance/candlestick-patterns",
  name: "Candlestick Pattern Scanner",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Detects classic candlestick patterns: Hammer, Inverted Hammer, Bullish/Bearish Engulfing, Doji, Three White Soldiers, Three Black Crows. Returns pattern name, direction, and confidence score.",
  inputSchema: {
    symbols: {
      type: "array",
      required: false,
      description: "List of futures symbols to scan (default: top 12 pairs)",
    },
    interval: {
      type: "string",
      required: false,
      description: "K-line interval: 1h or 4h (default: 4h)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbols = (input.symbols as string[] | undefined) || DEFAULT_SYMBOLS;
      const interval = String(input.interval || "4h");

      const results = await Promise.all(symbols.map((s) => analyzeSymbol(s, interval)));
      const patterns = results.filter((r): r is PatternResult => r !== null);

      const bullish = patterns.filter((p) => p.direction === "BULLISH");
      const bearish = patterns.filter((p) => p.direction === "BEARISH");
      const neutral = patterns.filter((p) => p.direction === "NEUTRAL");

      const summary =
        `📈 Candlestick Pattern Scanner (${interval})\n\n` +
        `Summary: ${bullish.length} BULLISH | ${bearish.length} BEARISH | ${neutral.length} NEUTRAL\n\n` +
        patterns
          .slice(0, 10)
          .map((p) => {
            const emoji =
              p.direction === "BULLISH" ? "🟢" : p.direction === "BEARISH" ? "🔴" : "⚪";
            return `${emoji} ${p.symbol}: ${p.pattern} (${p.confidence}% confident)`;
          })
          .join("\n");

      return {
        success: true,
        data: {
          patterns,
          bullish_count: bullish.length,
          bearish_count: bearish.length,
          neutral_count: neutral.length,
        },
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to scan patterns" },
        summary: "Pattern data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
