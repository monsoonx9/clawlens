import { Skill, SkillResult } from "./types";
import { getTicker24hr, getAllTickers } from "@/lib/binanceClient";

interface ExchangeStatsInput {
  mode?: "overview" | "top-movers" | "market-depth" | "volatility";
  limit?: number;
}

interface TopMover {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
}

interface ExchangeStatsResult {
  mode: string;
  totalSymbols: number;
  totalVolume24h: number;
  topGainers: TopMover[];
  topLosers: TopMover[];
  mostVolatile: TopMover[];
  marketSummary: string;
  summary: string;
}

export const exchangeStats: Skill = {
  id: "binance/exchange-stats",
  name: "Exchange Stats",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Provides Binance exchange-wide statistics including market overview, top gainers/losers, most volatile tokens, and market depth. Use for understanding overall market conditions.",
  inputSchema: {
    mode: {
      type: "string",
      required: false,
      description: "Mode: overview, top-movers, volatility (default: overview)",
    },
    limit: {
      type: "number",
      required: false,
      description: "Number of results to return (default: 10)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const mode = String(input.mode || "overview") as ExchangeStatsInput["mode"];
      const limit = Math.min(Number(input.limit) || 10, 50);

      // Fetch all tickers
      const tickersRes = await getAllTickers();

      if (!tickersRes.success || !tickersRes.data) {
        return {
          success: false,
          data: {},
          summary: "Failed to fetch exchange data",
          error: "No ticker data available",
        };
      }

      const tickers = tickersRes.data;

      // Filter to USDT pairs only for meaningful stats
      const usdtPairs = tickers.filter(
        (t) => t.symbol.endsWith("USDT") && !t.symbol.includes("UP") && !t.symbol.includes("DOWN"),
      );

      const totalSymbols = usdtPairs.length;

      // Calculate total volume
      const totalVolume24h = usdtPairs.reduce(
        (sum, t) => sum + parseFloat(t.quoteVolume || "0"),
        0,
      );

      // Parse and sort by various metrics
      const parsedTickers = usdtPairs.map((t) => ({
        symbol: t.symbol.replace("USDT", ""),
        price: parseFloat(t.lastPrice),
        changePercent: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.quoteVolume),
        high24h: parseFloat(t.highPrice),
        low24h: parseFloat(t.lowPrice),
      }));

      // Top gainers
      const topGainers = parsedTickers
        .filter((t) => t.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, limit)
        .map((t) => ({
          symbol: t.symbol,
          price: t.price,
          changePercent: t.changePercent,
          volume: t.volume,
        }));

      // Top losers
      const topLosers = parsedTickers
        .filter((t) => t.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, limit)
        .map((t) => ({
          symbol: t.symbol,
          price: t.price,
          changePercent: t.changePercent,
          volume: t.volume,
        }));

      // Most volatile (highest absolute price change)
      const mostVolatile = parsedTickers
        .map((t) => ({
          symbol: t.symbol,
          price: t.price,
          changePercent: t.changePercent,
          volume: t.volume,
          volatility: Math.abs(t.changePercent),
        }))
        .sort((a, b) => b.volatility - a.volatility)
        .slice(0, limit)
        .map(({ volatility, ...rest }) => rest);

      const result: ExchangeStatsResult = {
        mode: mode || "overview",
        totalSymbols,
        totalVolume24h,
        topGainers,
        topLosers,
        mostVolatile,
        marketSummary: "",
        summary: "",
      };

      // Build summary based on mode
      if (mode === "overview") {
        result.marketSummary = `Binance USDT pairs: ${totalSymbols.toLocaleString()} symbols, $${(totalVolume24h / 1e9).toFixed(2)}B 24h volume`;
        result.summary = `📊 Binance Market Overview:\n${result.marketSummary}\n\n🔥 Top Gainers: ${
          topGainers
            .slice(0, 3)
            .map((t) => `${t.symbol} +${t.changePercent.toFixed(1)}%`)
            .join(", ") || "N/A"
        }\n\n📉 Top Losers: ${
          topLosers
            .slice(0, 3)
            .map((t) => `${t.symbol} ${t.changePercent.toFixed(1)}%`)
            .join(", ") || "N/A"
        }`;
      } else if (mode === "top-movers") {
        result.summary = `🚀 Top ${limit} Gainers:\n${topGainers.map((t) => `• ${t.symbol}: $${t.price.toFixed(4)} (${t.changePercent >= 0 ? "+" : ""}${t.changePercent.toFixed(1)}%)`).join("\n")}\n\n📉 Top ${limit} Losers:\n${topLosers.map((t) => `• ${t.symbol}: $${t.price.toFixed(4)} (${t.changePercent.toFixed(1)}%)`).join("\n")}`;
      } else if (mode === "volatility") {
        result.summary = `⚡ Most Volatile (24h):\n${mostVolatile.map((t) => `• ${t.symbol}: $${t.price.toFixed(4)} (${t.changePercent >= 0 ? "+" : ""}${t.changePercent.toFixed(1)}% change)`).join("\n")}`;
      } else {
        result.summary = result.marketSummary;
      }

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary: result.summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch exchange stats" },
        summary: "Exchange stats unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
