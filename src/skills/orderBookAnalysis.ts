import { Skill, SkillResult } from "./types";
import { getOrderBook, BinanceOrderBook as BinanceOrderBookType } from "@/lib/binanceClient";

interface OrderBookAnalysisInput {
  symbol: string;
  depth?: number;
}

interface LiquidityZone {
  price: number;
  cumulativeVolume: number;
  cumulativeValueUSD: number;
  zoneType: "strong_bid" | "strong_ask" | "weak_bid" | "weak_ask";
}

interface OrderBookAnalysisResult {
  symbol: string;
  lastUpdateId: number;
  spread: number;
  spreadPercent: number;
  midPrice: number;
  totalBidVolume: number;
  totalAskVolume: number;
  bidAskRatio: number;
  imbalance: number;
  topBidWall: {
    price: number;
    quantity: number;
    valueUSD: number;
  };
  topAskWall: {
    price: number;
    quantity: number;
    valueUSD: number;
  };
  liquidityZones: LiquidityZone[];
  spoofingRisk: {
    detected: boolean;
    suspiciousOrders: Array<{
      side: "bid" | "ask";
      price: number;
      quantity: number;
      distanceFromMid: number;
    }>;
  };
  buyPressure: number;
  sellPressure: number;
  summary: string;
}

function detectSpoofing(
  bids: Array<[number, number]>,
  asks: Array<[number, number]>,
  midPrice: number,
): OrderBookAnalysisResult["spoofingRisk"] {
  const suspiciousOrders: Array<{
    side: "bid" | "ask";
    price: number;
    quantity: number;
    distanceFromMid: number;
  }> = [];

  const thresholdPercent = 2;

  for (const [price, qty] of bids.slice(0, 10)) {
    const distanceFromMid = ((midPrice - price) / midPrice) * 100;
    if (distanceFromMid > thresholdPercent && qty > 10000) {
      suspiciousOrders.push({
        side: "bid",
        price,
        quantity: qty,
        distanceFromMid,
      });
    }
  }

  for (const [price, qty] of asks.slice(0, 10)) {
    const distanceFromMid = ((price - midPrice) / midPrice) * 100;
    if (distanceFromMid > thresholdPercent && qty > 10000) {
      suspiciousOrders.push({
        side: "ask",
        price,
        quantity: qty,
        distanceFromMid,
      });
    }
  }

  return {
    detected: suspiciousOrders.length > 0,
    suspiciousOrders: suspiciousOrders.slice(0, 5),
  };
}

function identifyLiquidityZones(
  bids: Array<[number, number]>,
  asks: Array<[number, number]>,
  totalBidUSD: number,
  totalAskUSD: number,
): LiquidityZone[] {
  const zones: LiquidityZone[] = [];

  let cumulativeBidUSD = 0;
  for (const [price, qty] of bids.slice(0, 20)) {
    cumulativeBidUSD += price * qty;
    const percentOfTotal = (cumulativeBidUSD / totalBidUSD) * 100;

    zones.push({
      price,
      cumulativeVolume: qty,
      cumulativeValueUSD: price * qty,
      zoneType: percentOfTotal > 70 ? "strong_bid" : "weak_bid",
    });
  }

  let cumulativeAskUSD = 0;
  for (const [price, qty] of asks.slice(0, 20)) {
    cumulativeAskUSD += price * qty;
    const percentOfTotal = (cumulativeAskUSD / totalAskUSD) * 100;

    zones.push({
      price,
      cumulativeVolume: qty,
      cumulativeValueUSD: price * qty,
      zoneType: percentOfTotal > 70 ? "strong_ask" : "weak_ask",
    });
  }

  return zones.slice(0, 10);
}

export const orderBookAnalysis: Skill = {
  id: "binance/order-book-analysis",
  name: "Order Book Analysis",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Deep order book analysis including bid/ask spread, liquidity zones, spoofing detection, and buy/sell pressure calculations. Use for understanding market microstructure.",
  inputSchema: {
    symbol: {
      type: "string",
      required: true,
      description: "Trading pair symbol (e.g., BTCUSDT)",
    },
    depth: {
      type: "number",
      required: false,
      description: "Order book depth (default: 20, max: 100)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbol = String(input.symbol || "").toUpperCase();
      const depth = Math.min(Number(input.depth) || 20, 100);

      if (!symbol) {
        return {
          success: false,
          data: {},
          summary: "Symbol is required",
          error: "symbol is required",
        };
      }

      // Try primary depth first
      let obRes = await getOrderBook(symbol, depth as any);

      // Fallback: try with default depth if primary fails
      if (!obRes.success || !obRes.data) {
        obRes = await getOrderBook(symbol, 20);
      }

      // Final fallback check
      if (!obRes.success || !obRes.data) {
        return {
          success: false,
          data: {},
          summary: `Failed to fetch order book for ${symbol}`,
          error: "No order book data available",
        };
      }

      const ob = obRes.data;
      const midPrice = (ob.bids[0]?.[0] + ob.asks[0]?.[0]) / 2 || 0;
      const spread = ob.asks[0]?.[0] - ob.bids[0]?.[0] || 0;
      const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

      const totalBidVolume = ob.bids.reduce((sum, [_, qty]) => sum + qty, 0);
      const totalAskVolume = ob.asks.reduce((sum, [_, qty]) => sum + qty, 0);
      const bidAskRatio = totalAskVolume > 0 ? totalBidVolume / totalAskVolume : 0;
      const imbalance =
        ((totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume)) * 100;

      const buyPressure = Math.max(0, 50 + imbalance / 2);
      const sellPressure = Math.max(0, 50 - imbalance / 2);

      const spoofingRisk = detectSpoofing(ob.bids, ob.asks, midPrice);
      const liquidityZones = identifyLiquidityZones(
        ob.bids,
        ob.asks,
        ob.totalBidVolumeUSD,
        ob.totalAskVolumeUSD,
      );

      const result: OrderBookAnalysisResult = {
        symbol,
        lastUpdateId: ob.lastUpdateId,
        spread: parseFloat(spread.toFixed(8)),
        spreadPercent: parseFloat(spreadPercent.toFixed(4)),
        midPrice: parseFloat(midPrice.toFixed(8)),
        totalBidVolume: parseFloat(totalBidVolume.toFixed(4)),
        totalAskVolume: parseFloat(totalAskVolume.toFixed(4)),
        bidAskRatio: parseFloat(bidAskRatio.toFixed(4)),
        imbalance: parseFloat(imbalance.toFixed(2)),
        topBidWall: {
          price: ob.topBidWall.price,
          quantity: ob.bids[0]?.[1] || 0,
          valueUSD: ob.topBidWall.sizeUSD,
        },
        topAskWall: {
          price: ob.topAskWall.price,
          quantity: ob.asks[0]?.[1] || 0,
          valueUSD: ob.topAskWall.sizeUSD,
        },
        liquidityZones,
        spoofingRisk,
        buyPressure: parseFloat(buyPressure.toFixed(2)),
        sellPressure: parseFloat(sellPressure.toFixed(2)),
        summary: "",
      };

      let summary = `📊 Order Book Analysis for ${symbol}:\n`;
      summary += `Mid Price: $${midPrice.toFixed(2)} | Spread: $${spread.toFixed(2)} (${spreadPercent.toFixed(4)}%)\n`;
      summary += `Bid Volume: ${totalBidVolume.toFixed(2)} | Ask Volume: ${totalAskVolume.toFixed(2)}\n`;
      summary += `Imbalance: ${imbalance.toFixed(1)}% ${imbalance > 0 ? "[BUY PRESSURE]" : imbalance < 0 ? "[SELL PRESSURE]" : "[BALANCED]"}\n`;
      summary += `Top Bid Wall: $${ob.topBidWall.price.toFixed(2)} ($${ob.topBidWall.sizeUSD.toFixed(0)}) | Top Ask Wall: $${ob.topAskWall.price.toFixed(2)} ($${ob.topAskWall.sizeUSD.toFixed(0)})\n`;

      if (spoofingRisk.detected) {
        summary += `⚠️ Spoofing Risk: Detected ${spoofingRisk.suspiciousOrders.length} suspicious large orders far from mid\n`;
      } else {
        summary += `✅ No spoofing detected\n`;
      }

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to analyze order book" },
        summary: "Order book analysis unavailable. Check your API keys or try a different symbol.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
