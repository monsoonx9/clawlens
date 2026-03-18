export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getTickerPrice, getTicker24hr, getOrderBook } from "@/lib/binanceClient";
import { getLatestBlock } from "@/lib/bscClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, params } = body;

    switch (action) {
      case "tickerPrice": {
        const { symbol } = params || {};
        if (!symbol) {
          return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
        }
        const data = await getTickerPrice(symbol);
        return NextResponse.json(data);
      }

      case "ticker24hr": {
        const { symbol } = params || {};
        if (!symbol) {
          return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
        }
        const data = await getTicker24hr(symbol);
        return NextResponse.json(data);
      }

      case "orderBook": {
        const { symbol, limit } = params || {};
        if (!symbol) {
          return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
        }
        const data = await getOrderBook(symbol, limit || 20);
        return NextResponse.json(data);
      }

      case "tradeHistory": {
        // Trade history requires authentication - use binance proxy instead
        return NextResponse.json(
          { error: "Use /api/binance/proxy for authenticated requests" },
          { status: 400 },
        );
      }

      case "latestBlock": {
        const data = await getLatestBlock();
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API/Market] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
