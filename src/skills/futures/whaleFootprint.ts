import { Skill, SkillResult } from "../types";
import { getAggTrades, DEFAULT_SYMBOLS } from "@/lib/futuresClient";

const TIER_DOLPHIN = 50000;
const TIER_WHALE = 250000;
const TIER_MEGA = 1000000;

interface WhaleTrade {
  price: number;
  quantity: number;
  usd_value: number;
  side: "BUY" | "SELL";
  tier: "DOLPHIN" | "WHALE" | "MEGA";
  timestamp: number;
}

interface WhaleResult {
  symbol: string;
  trade_count: number;
  total_buy_usd: number;
  total_sell_usd: number;
  net_pressure_usd: number;
  net_direction: "BUY" | "SELL" | "NEUTRAL";
  biggest_trade: WhaleTrade | null;
  tiers: { dolphin: number; whale: number; mega: number };
}

async function scanSymbol(
  symbol: string,
  minUsd: number,
): Promise<WhaleResult | { symbol: string; error: string }> {
  try {
    const trades = await getAggTrades(symbol, 500);

    const largeTrades: WhaleTrade[] = [];
    let totalBuyUsd = 0;
    let totalSellUsd = 0;
    let biggestTrade: WhaleTrade | null = null;
    let biggestUsd = 0;

    for (const t of trades) {
      const usdValue = t.price * t.quantity;

      if (usdValue < minUsd) continue;

      let tier: "DOLPHIN" | "WHALE" | "MEGA";
      if (usdValue >= TIER_MEGA) tier = "MEGA";
      else if (usdValue >= TIER_WHALE) tier = "WHALE";
      else tier = "DOLPHIN";

      const side: "BUY" | "SELL" = t.isBuyerMaker ? "SELL" : "BUY";

      if (side === "BUY") totalBuyUsd += usdValue;
      else totalSellUsd += usdValue;

      if (usdValue > biggestUsd) {
        biggestUsd = usdValue;
        biggestTrade = {
          price: t.price,
          quantity: t.quantity,
          usd_value: Math.round(usdValue * 100) / 100,
          side,
          tier,
          timestamp: t.timestamp,
        };
      }

      largeTrades.push({
        price: t.price,
        quantity: t.quantity,
        usd_value: Math.round(usdValue * 100) / 100,
        side,
        tier,
        timestamp: t.timestamp,
      });
    }

    const netPressure = totalBuyUsd - totalSellUsd;

    return {
      symbol,
      trade_count: largeTrades.length,
      total_buy_usd: Math.round(totalBuyUsd * 100) / 100,
      total_sell_usd: Math.round(totalSellUsd * 100) / 100,
      net_pressure_usd: Math.round(netPressure * 100) / 100,
      net_direction: netPressure > 0 ? "BUY" : netPressure < 0 ? "SELL" : "NEUTRAL",
      biggest_trade: biggestTrade,
      tiers: {
        dolphin: largeTrades.filter((t) => t.tier === "DOLPHIN").length,
        whale: largeTrades.filter((t) => t.tier === "WHALE").length,
        mega: largeTrades.filter((t) => t.tier === "MEGA").length,
      },
    };
  } catch (error) {
    return {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const whaleFootprint: Skill = {
  id: "binance/whale-footprint",
  name: "Whale Footprint Scanner",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Scans recent aggregate trades to identify large institutional trades. Classifies by tier: Dolphin ($50K-$250K), Whale ($250K-$1M), Mega (>$1M). Shows net buy/sell pressure and biggest trade.",
  inputSchema: {
    symbols: {
      type: "array",
      required: false,
      description: "List of futures symbols to scan (default: top 6 pairs)",
    },
    min_usd: {
      type: "number",
      required: false,
      description: "Minimum USD value to filter trades (default: 50000)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbols = (input.symbols as string[] | undefined) || DEFAULT_SYMBOLS.slice(0, 6);
      const minUsd = Number(input.min_usd) || 50000;

      const results = await Promise.all(symbols.map((s) => scanSymbol(s, minUsd)));

      const valid = results.filter((r) => !("error" in r)) as WhaleResult[];
      const errors = results.filter((r) => "error" in r);

      valid.sort((a, b) => Math.abs(b.net_pressure_usd) - Math.abs(a.net_pressure_usd));

      const summary =
        `🐋 Whale Footprint Scanner\n\n` +
        `Min: $${minUsd.toLocaleString()}\n\n` +
        valid
          .slice(0, 5)
          .map((r) => {
            const emoji =
              r.net_direction === "BUY" ? "🟢" : r.net_direction === "SELL" ? "🔴" : "⚪";
            return (
              `${r.symbol}: ${emoji} ${r.net_direction} $${Math.abs(r.net_pressure_usd).toLocaleString()}\n` +
              `  Trades: ${r.trade_count} (D:${r.tiers.dolphin} W:${r.tiers.whale} M:${r.tiers.mega})\n` +
              (r.biggest_trade
                ? `  Biggest: $${r.biggest_trade.usd_value.toLocaleString()} (${r.biggest_trade.tier})`
                : "")
            );
          })
          .join("\n\n");

      return {
        success: true,
        data: {
          results: valid,
          errors: errors.map((e) => e.symbol + ": " + e.error),
        },
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to scan whale trades" },
        summary: "Whale footprint data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
