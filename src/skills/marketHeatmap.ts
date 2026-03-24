import { Skill, SkillContext, SkillResult } from "./types";
import { getAllTickers, BinanceTicker24hr } from "@/lib/binanceClient";

export interface HeatmapToken {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCapRank?: number; // Estimated or fetched if available
  color: string; // Hex code based on performance
  size: number; // Normalized weight based on volume
}

export const marketHeatmap: Skill = {
  id: "claw-council/market-heatmap",
  name: "Market Heatmap",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Generates a structured market heatmap of the top N tokens by volume. " +
    "Includes price change, volume, and visual metadata (colors/sizes) for UI components.",
  inputSchema: {
    limit: {
      type: "number",
      required: false,
      default: 40,
      description: "Number of top tokens by volume to include (max 100)",
    },
    quoteAsset: {
      type: "string",
      required: false,
      default: "USDT",
      description: "The quote asset to filter by (e.g., USDT, BTC, BNB)",
    },
  },

  async execute(input: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    try {
      const limit = Math.min(100, (input.limit as number) || 40);
      const quoteAsset = (input.quoteAsset as string) || "USDT";

      // ── Step 1: Fetch all 24hr tickers ──
      const tickersRes = await getAllTickers();
      if (!tickersRes.success || !tickersRes.data) {
        throw new Error(tickersRes.error || "Failed to fetch market data");
      }

      const allTickers = tickersRes.data;

      // ── Step 2: Filter and Sort by Volume ──
      // We look for symbols ending with the quoteAsset
      const filtered = allTickers
        .filter((t) => t.symbol.endsWith(quoteAsset))
        .map((t) => ({
          ...t,
          quoteVolumeNum: parseFloat(t.quoteVolume),
          priceChangePctNum: parseFloat(t.priceChangePercent),
          lastPriceNum: parseFloat(t.lastPrice),
        }))
        .sort((a, b) => b.quoteVolumeNum - a.quoteVolumeNum)
        .slice(0, limit);

      if (filtered.length === 0) {
        return {
          success: true,
          data: { tokens: [] },
          summary: `No tokens found for quote asset ${quoteAsset}.`,
        };
      }

      // ── Step 3: Normalize and Colorize ──
      const maxVolume = filtered[0].quoteVolumeNum;
      
      const tokens: HeatmapToken[] = filtered.map((t) => {
        const baseAsset = t.symbol.replace(quoteAsset, "");
        
        // Color mapping: 
        // Strong Red (-5%+) -> Light Red -> Neutral -> Light Green -> Strong Green (+5%+)
        let color = "#121212"; // Neutral/Dark
        const change = t.priceChangePctNum;
        
        if (change >= 5) color = "#00ff88"; // Neon Green
        else if (change >= 2) color = "#00cc6a"; 
        else if (change > 0) color = "#008844";
        else if (change <= -5) color = "#ff3366"; // Neon Red
        else if (change <= -2) color = "#cc2255";
        else if (change < 0) color = "#881133";

        return {
          symbol: t.symbol,
          baseAsset,
          quoteAsset,
          price: t.lastPriceNum,
          change24h: change,
          volume24h: t.quoteVolumeNum,
          color,
          size: Math.sqrt(t.quoteVolumeNum / maxVolume) * 100, // Normalized for visual scaling
        };
      });

      const avgChange = tokens.reduce((sum, t) => sum + t.change24h, 0) / tokens.length;
      const topGainer = [...tokens].sort((a, b) => b.change24h - a.change24h)[0];
      const topLoser = [...tokens].sort((a, b) => a.change24h - b.change24h)[0];

      const summary = 
        `Market Heatmap (${quoteAsset}) generated for top ${tokens.length} assets. ` +
        `Avg Market Change: ${avgChange.toFixed(2)}%. ` +
        `Top Performer: ${topGainer.baseAsset} (+${topGainer.change24h.toFixed(2)}%). ` +
        `Worst Performer: ${topLoser.baseAsset} (${topLoser.change24h.toFixed(2)}%).`;

      return {
        success: true,
        data: {
          tokens,
          quoteAsset,
          avgChange,
          stats: {
            totalVolume: tokens.reduce((s, t) => s + t.volume24h, 0),
            gainers: tokens.filter(t => t.change24h > 0).length,
            losers: tokens.filter(t => t.change24h < 0).length,
          }
        },
        summary,
      };
    } catch (error) {
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : String(error) },
        summary: `Heatmap generation failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
