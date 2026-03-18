import { Skill, SkillResult } from "./types";
import { getKlines, BinanceKline } from "@/lib/binanceClient";

interface TechnicalIndicatorsInput {
  symbol: string;
  interval?: string;
  limit?: number;
  indicators?: string[];
}

interface SMAData {
  period: number;
  value: number;
}

interface EMAData {
  period: number;
  value: number;
}

interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
}

interface RSIData {
  period: number;
  value: number;
  overbought: boolean;
  oversold: boolean;
}

interface BollingerBandsData {
  period: number;
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  b: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicatorsResult {
  symbol: string;
  interval: string;
  price: number;
  sma: SMAData[];
  ema: EMAData[];
  macd: MACDData;
  rsi: RSIData;
  bollingerBands: BollingerBandsData;
  candles: CandleData[];
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateMACD(prices: number[]): MACDData {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;

  const macdLine: number[] = [];
  for (let i = 26; i < prices.length; i++) {
    const e12 = calculateEMA(prices.slice(0, i + 1), 12);
    const e26 = calculateEMA(prices.slice(0, i + 1), 26);
    macdLine.push(e12 - e26);
  }

  const signal = macdLine.length >= 9 ? calculateEMA(macdLine.slice(-9), 9) : macd;

  return {
    macd: parseFloat(macd.toFixed(8)),
    signal: parseFloat(signal.toFixed(8)),
    histogram: parseFloat((macd - signal).toFixed(8)),
  };
}

function calculateRSI(prices: number[], period: number = 14): RSIData {
  if (prices.length < period + 1) {
    return { period, value: 50, overbought: false, oversold: false };
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const recentChanges = changes.slice(-period);
  let avgGain = 0;
  let avgLoss = 0;

  for (const change of recentChanges) {
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return {
    period,
    value: parseFloat(rsi.toFixed(2)),
    overbought: rsi > 70,
    oversold: rsi < 30,
  };
}

function calculateBollingerBands(prices: number[], period: number = 20): BollingerBandsData {
  const sma = calculateSMA(prices, period);

  const slice = prices.slice(-period);
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = sma + 2 * stdDev;
  const lower = sma - 2 * stdDev;
  const bandwidth = ((upper - lower) / sma) * 100;
  const b = (prices[prices.length - 1] - lower) / (upper - lower);

  return {
    period,
    upper: parseFloat(upper.toFixed(8)),
    middle: parseFloat(sma.toFixed(8)),
    lower: parseFloat(lower.toFixed(8)),
    bandwidth: parseFloat(bandwidth.toFixed(2)),
    b: parseFloat(b.toFixed(2)),
  };
}

export const technicalIndicators: Skill = {
  id: "binance/technical-indicators",
  name: "Technical Indicators",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Calculates comprehensive technical indicators from K-line data including SMA, EMA, MACD, RSI-14, and Bollinger Bands. Use for technical analysis and trading decisions.",
  inputSchema: {
    symbol: {
      type: "string",
      required: true,
      description: "Trading pair symbol (e.g., BTCUSDT)",
    },
    interval: {
      type: "string",
      required: false,
      description: "K-line interval: 1m, 5m, 15m, 30m, 1h, 4h, 1d (default: 1h)",
    },
    limit: {
      type: "number",
      required: false,
      description: "Number of candles (default: 100, max: 1500)",
    },
    indicators: {
      type: "array",
      required: false,
      description: "Specific indicators to calculate: sma, ema, macd, rsi, bollinger",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbol = String(input.symbol || "").toUpperCase();
      const interval = String(input.interval || "1h");
      const limit = Math.min(Number(input.limit) || 100, 1500);

      if (!symbol) {
        return {
          success: false,
          data: {},
          summary: "Symbol is required",
          error: "symbol is required",
        };
      }

      // Try primary interval first
      let klinesRes = await getKlines(symbol, interval as any, limit);
      let usedInterval = interval;

      // Fallback to daily if primary fails
      if (!klinesRes.success || !klinesRes.data || klinesRes.data.length === 0) {
        klinesRes = await getKlines(symbol, "1d", 30);
        usedInterval = "1d";
      }

      // Fallback to 4h if daily fails
      if (!klinesRes.success || !klinesRes.data || klinesRes.data.length === 0) {
        klinesRes = await getKlines(symbol, "4h", 50);
        usedInterval = "4h";
      }

      // Final fallback check
      if (!klinesRes.success || !klinesRes.data || klinesRes.data.length === 0) {
        return {
          success: false,
          data: {},
          summary: `Failed to fetch K-line data for ${symbol} after multiple attempts`,
          error: "No K-line data available",
        };
      }

      const klines = klinesRes.data;
      const closes = klines.map((k) => k.close);
      const currentPrice = closes[closes.length - 1];

      // Transform klines to candle data for charting
      const candles: CandleData[] = klines.map((k) => ({
        time: k.openTime,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
      }));

      const result: TechnicalIndicatorsResult = {
        symbol,
        interval: usedInterval,
        price: currentPrice,
        sma: [
          { period: 7, value: parseFloat(calculateSMA(closes, 7).toFixed(8)) },
          {
            period: 20,
            value: parseFloat(calculateSMA(closes, 20).toFixed(8)),
          },
          {
            period: 50,
            value: parseFloat(calculateSMA(closes, 50).toFixed(8)),
          },
          {
            period: 200,
            value: parseFloat(calculateSMA(closes, 200).toFixed(8)),
          },
        ].filter((s) => s.value > 0),
        ema: [
          { period: 9, value: parseFloat(calculateEMA(closes, 9).toFixed(8)) },
          {
            period: 21,
            value: parseFloat(calculateEMA(closes, 21).toFixed(8)),
          },
          {
            period: 55,
            value: parseFloat(calculateEMA(closes, 55).toFixed(8)),
          },
        ].filter((e) => e.value > 0),
        macd: calculateMACD(closes),
        rsi: calculateRSI(closes, 14),
        bollingerBands: calculateBollingerBands(closes, 20),
        candles,
      };

      let summary = `📊 Technical Analysis for ${symbol} (${usedInterval}):\n`;
      summary += `Price: $${currentPrice.toFixed(2)}\n`;

      if (result.sma.length > 0) {
        summary += `SMA: ${result.sma.map((s) => `MA${s.period}=$${s.value.toFixed(2)}`).join(", ")}\n`;
      }

      if (result.ema.length > 0) {
        summary += `EMA: ${result.ema.map((e) => `EMA${e.period}=$${e.value.toFixed(2)}`).join(", ")}\n`;
      }

      summary += `MACD: ${result.macd.macd.toFixed(4)} (signal: ${result.macd.signal.toFixed(4)}, hist: ${result.macd.histogram.toFixed(4)})\n`;
      summary += `RSI(14): ${result.rsi.value} ${result.rsi.overbought ? "[OVERBOUGHT]" : result.rsi.oversold ? "[OVERSOLD]" : "[NEUTRAL]"}\n`;
      summary += `Bollinger: Upper=$${result.bollingerBands.upper.toFixed(2)}, Middle=$${result.bollingerBands.middle.toFixed(2)}, Lower=$${result.bollingerBands.lower.toFixed(2)}`;

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to calculate technical indicators" },
        summary:
          "Technical indicators unavailable. Check your Binance API keys or try a different symbol.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
