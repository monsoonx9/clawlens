import { Skill, SkillResult } from "./types";
import { getKlines, getTicker24hr, BinanceKline, BinanceTicker24hr } from "@/lib/binanceClient";

interface VolumeAnalysisInput {
  symbol: string;
  interval?: string;
  lookback?: number;
}

interface VolumeProfile {
  price: number;
  volume: number;
  trades: number;
  percent: number;
}

interface VolumeAnalysisResult {
  symbol: string;
  currentVolume24h: number;
  averageVolume24h: number;
  volumeRatio: number;
  volumeChange: number;
  buyVolume: number;
  sellVolume: number;
  buySellRatio: number;
  volumeProfile: VolumeProfile[];
  unusualVolumeDetected: boolean;
  volumeSpikePercent: number;
  highVolumeZones: Array<{
    price: number;
    volume: number;
    isResistance: boolean;
  }>;
  summary: string;
}

export const volumeAnalysis: Skill = {
  id: "binance/volume-analysis",
  name: "Volume Analysis",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Analyzes trading volume patterns including 24h volume, volume ratios, buy/sell volume breakdown, volume profile, and unusual volume detection. Use for confirming trends and identifying accumulation/distribution.",
  inputSchema: {
    symbol: {
      type: "string",
      required: true,
      description: "Trading pair symbol (e.g., BTCUSDT)",
    },
    interval: {
      type: "string",
      required: false,
      description: "K-line interval for analysis (default: 1h)",
    },
    lookback: {
      type: "number",
      required: false,
      description: "Number of periods to analyze (default: 24)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbol = String(input.symbol || "").toUpperCase();
      const interval = String(input.interval || "1h");
      const lookback = Number(input.lookback) || 24;

      if (!symbol) {
        return {
          success: false,
          data: {},
          summary: "Symbol is required",
          error: "symbol is required",
        };
      }

      const [klinesRes, tickerRes] = await Promise.all([
        getKlines(symbol, interval as any, lookback),
        getTicker24hr(symbol),
      ]);

      if (!klinesRes.success || !klinesRes.data || klinesRes.data.length === 0) {
        return {
          success: false,
          data: {},
          summary: `Failed to fetch K-line data for ${symbol}`,
          error: "No K-line data available",
        };
      }

      const klines = klinesRes.data;
      const ticker = tickerRes.data as BinanceTicker24hr;

      const volumes = klines.map((k) => k.volume);
      const currentVolume = volumes[volumes.length - 1];
      const averageVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const volumeRatio = averageVolume > 0 ? currentVolume / averageVolume : 0;

      const prevVolume = volumes.length > 1 ? volumes[volumes.length - 2] : currentVolume;
      const volumeChange = prevVolume > 0 ? ((currentVolume - prevVolume) / prevVolume) * 100 : 0;

      let buyVolume = 0;
      let sellVolume = 0;

      for (const k of klines) {
        const takerBuyVolume = k.takerBuyBaseVolume;
        const takerSellVolume = k.volume - takerBuyVolume;
        buyVolume += takerBuyVolume;
        sellVolume += takerSellVolume;
      }

      const buySellRatio = sellVolume > 0 ? buyVolume / sellVolume : 0;

      const totalVolume = volumes.reduce((a, b) => a + b, 0);
      const priceMin = Math.min(...klines.map((k) => k.low));
      const priceMax = Math.max(...klines.map((k) => k.high));
      const priceRange = priceMax - priceMin;

      const profileBuckets = 10;
      const bucketSize = priceRange / profileBuckets;
      const volumeProfile: VolumeProfile[] = [];

      for (let i = 0; i < profileBuckets; i++) {
        const bucketLow = priceMin + i * bucketSize;
        const bucketHigh = bucketLow + bucketSize;

        let bucketVolume = 0;
        let bucketTrades = 0;

        for (const k of klines) {
          if (k.close >= bucketLow && k.close < bucketHigh) {
            bucketVolume += k.volume;
            bucketTrades += k.numTrades;
          }
        }

        if (bucketVolume > 0) {
          volumeProfile.push({
            price: (bucketLow + bucketHigh) / 2,
            volume: parseFloat(bucketVolume.toFixed(2)),
            trades: bucketTrades,
            percent: totalVolume > 0 ? (bucketVolume / totalVolume) * 100 : 0,
          });
        }
      }

      volumeProfile.sort((a, b) => b.volume - a.volume);

      const unusualVolumeDetected = volumeRatio > 1.5;
      const volumeSpikePercent = (volumeRatio - 1) * 100;

      const highVolumeZones = volumeProfile.slice(0, 3).map((p, i) => ({
        price: p.price,
        volume: p.volume,
        isResistance: i === 0 && buySellRatio > 1,
      }));

      const result: VolumeAnalysisResult = {
        symbol,
        currentVolume24h: parseFloat(String(ticker?.quoteVolume || "0")),
        averageVolume24h: parseFloat((averageVolume * (ticker?.lastPrice || 1)).toFixed(2)),
        volumeRatio: parseFloat(volumeRatio.toFixed(2)),
        volumeChange: parseFloat(volumeChange.toFixed(2)),
        buyVolume: parseFloat(buyVolume.toFixed(2)),
        sellVolume: parseFloat(sellVolume.toFixed(2)),
        buySellRatio: parseFloat(buySellRatio.toFixed(2)),
        volumeProfile: volumeProfile.slice(0, 10),
        unusualVolumeDetected,
        volumeSpikePercent: parseFloat(volumeSpikePercent.toFixed(2)),
        highVolumeZones,
        summary: "",
      };

      const currentQuoteVolume = parseFloat(String(ticker?.quoteVolume || "0"));
      const avgQuoteVolume = averageVolume * (ticker?.lastPrice || 1);

      let summary = `📊 Volume Analysis for ${symbol}:\n`;
      summary += `24h Volume: $${currentQuoteVolume.toLocaleString()} | Avg: $${avgQuoteVolume.toLocaleString()}\n`;
      summary += `Volume Ratio: ${volumeRatio.toFixed(2)}x | Change: ${volumeChange >= 0 ? "+" : ""}${volumeChange.toFixed(1)}%\n`;
      summary += `Buy Volume: ${buyVolume.toLocaleString()} | Sell Volume: ${sellVolume.toLocaleString()}\n`;
      summary += `Buy/Sell Ratio: ${buySellRatio.toFixed(2)} ${buySellRatio > 1 ? "[BUY PRESSURE]" : buySellRatio < 1 ? "[SELL PRESSURE]" : "[BALANCED]"}\n`;

      if (unusualVolumeDetected) {
        summary += `⚠️ Unusual Volume: ${volumeSpikePercent.toFixed(0)}% above average\n`;
      } else {
        summary += `✅ Normal volume levels\n`;
      }

      if (volumeProfile.length > 0) {
        summary += `High Volume Zone: $${volumeProfile[0].price.toFixed(2)} (${volumeProfile[0].percent.toFixed(1)}% of total volume)`;
      }

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to analyze volume" },
        summary: "Volume analysis unavailable. Check your API keys or try a different symbol.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
