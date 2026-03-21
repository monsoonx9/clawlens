import { Skill, SkillContext, SkillResult } from "./types";
import {
  getAccountInfo,
  getAllTickers,
  getTradeHistory,
  getKlines,
  getOrderBook,
  getTicker24hr,
  BinanceTicker24hr,
  BinanceKline,
} from "@/lib/binanceClient";
import { PortfolioPulseResult, EnrichedPortfolioAsset } from "@/types";

// ---------------------------------------------------------------------------
// Coin risk classification
// ---------------------------------------------------------------------------

const STABLECOINS = ["USDT", "USDC", "BUSD", "DAI", "TUSD", "FDUSD"];

const TYPE_RISK_MAP: Record<string, number> = {
  USDT: 0,
  USDC: 0,
  BUSD: 0,
  DAI: 0,
  TUSD: 0,
  FDUSD: 0,
  BTC: 2,
  ETH: 2.5,
  BNB: 3,
};

// ---------------------------------------------------------------------------
// Portfolio Pulse Skill
// ---------------------------------------------------------------------------

export const portfolioPulse: Skill = {
  id: "claw-council/portfolio-pulse",
  name: "Portfolio Pulse",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Complete real-time portfolio health analysis. Fetches live Binance balances, " +
    "enriches with K-Line volatility data and order book depth, calculates FIFO cost " +
    "basis from trade history, computes a weighted risk score, detects concentration " +
    "warnings, and generates a plain-English health report.",
  inputSchema: {
    includeKlines: {
      type: "boolean",
      required: false,
      default: true,
      description: "Fetch 30-day K-Line data for volatility",
    },
    includeOrderBook: {
      type: "boolean",
      required: false,
      default: true,
      description: "Fetch order book depth for support levels",
    },
  },

  async execute(input: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    try {
      const { binanceApiKey, binanceSecretKey } = context.apiKeys;
      const { sessionId } = context;
      const includeKlines = input.includeKlines !== false;
      const includeOrderBook = input.includeOrderBook !== false;

      // ── Step 1: Fetch raw account balances ──
      const accountRes = await getAccountInfo(binanceApiKey, binanceSecretKey, sessionId);
      if (!accountRes.success || !accountRes.data)
        throw new Error(accountRes.error || "Failed to fetch account info");
      const account = accountRes.data;
      const balances = account.balances.filter(
        (b) => parseFloat(b.free) + parseFloat(b.locked) > 0.00001,
      );

      if (balances.length === 0) {
        return {
          success: true,
          data: {
            assets: [],
            totalValueUSD: 0,
            riskScore: 0,
            warnings: [],
            summary: "No assets found.",
          } as unknown as Record<string, unknown>,
          summary: "Your Binance account has no non-zero balances.",
        };
      }

      // ── Step 2: Fetch all ticker prices + 24hr stats ──
      const allTickersRes = await getAllTickers();
      if (!allTickersRes.success || !allTickersRes.data)
        throw new Error(allTickersRes.error || "Failed to fetch tickers");
      const allTickers = allTickersRes.data;
      const tickerMap = new Map<string, (typeof allTickers)[0]>();
      for (const t of allTickers) tickerMap.set(t.symbol, t);

      // Build a BTCUSDT price for cross-pair resolution
      const btcUsdtTicker = tickerMap.get("BTCUSDT");
      const btcPrice = btcUsdtTicker ? parseFloat(btcUsdtTicker.lastPrice) : 0;

      // ── Step 3: FIFO cost basis via trade history ──
      const costBasisMap: Record<
        string,
        {
          avgBuyPrice: number;
          unrealizedPnLUSD: number;
          unrealizedPnLPercent: number;
        }
      > = {};
      const nonStableSymbols = balances.map((b) => b.asset).filter((a) => !STABLECOINS.includes(a));

      const tradeResults = await Promise.allSettled(
        nonStableSymbols.map((sym) => {
          const pair = tickerMap.has(sym + "USDT") ? sym + "USDT" : null;
          if (!pair) return Promise.resolve({ success: true, data: [] as any[] });
          return getTradeHistory(pair, binanceApiKey, binanceSecretKey, 500, sessionId);
        }),
      );

      nonStableSymbols.forEach((sym, i) => {
        const res = tradeResults[i];
        if (
          res.status !== "fulfilled" ||
          !res.value.success ||
          !Array.isArray(res.value.data) ||
          res.value.data.length === 0
        )
          return;
        const trades = res.value.data.sort((a, b) => a.time - b.time);
        const openQueue: { qty: number; price: number }[] = [];

        for (const trade of trades) {
          const qty = parseFloat(trade.qty);
          const price = parseFloat(trade.price);
          if (trade.isBuyer) {
            openQueue.push({ qty, price });
          } else {
            let remaining = qty;
            while (remaining > 0.000001 && openQueue.length > 0) {
              const lot = openQueue[0];
              const take = Math.min(lot.qty, remaining);
              lot.qty -= take;
              remaining -= take;
              if (lot.qty < 0.000001) openQueue.shift();
            }
          }
        }

        if (openQueue.length > 0) {
          const totalCost = openQueue.reduce((s, l) => s + l.qty * l.price, 0);
          const totalQty = openQueue.reduce((s, l) => s + l.qty, 0);
          const avgBuyPrice = totalCost / totalQty;
          const ticker = tickerMap.get(sym + "USDT");
          const currentPrice = ticker ? parseFloat(ticker.lastPrice) : 0;
          const unrealizedPnLUSD = (currentPrice - avgBuyPrice) * totalQty;
          const unrealizedPnLPercent =
            avgBuyPrice > 0 ? ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;
          costBasisMap[sym] = {
            avgBuyPrice,
            unrealizedPnLUSD,
            unrealizedPnLPercent,
          };
        }
      });

      // ── Step 4: Build enriched assets ──
      let totalValueUSD = 0;
      const rawAssets = balances.map((b) => {
        const amount = parseFloat(b.free) + parseFloat(b.locked);
        const isStable = STABLECOINS.includes(b.asset);
        let currentPrice = 0;
        if (isStable) {
          currentPrice = 1;
        } else {
          const usdtTicker = tickerMap.get(b.asset + "USDT");
          if (usdtTicker) {
            currentPrice = parseFloat(usdtTicker.lastPrice);
          } else {
            const btcTicker = tickerMap.get(b.asset + "BTC");
            if (btcTicker) currentPrice = parseFloat(btcTicker.lastPrice) * btcPrice;
          }
        }
        const valueUSD = amount * currentPrice;
        totalValueUSD += valueUSD;

        const ticker = tickerMap.get(b.asset + "USDT");
        const change24hPercent = ticker ? parseFloat(ticker.priceChangePercent) : 0;
        const quoteVolume = ticker ? parseFloat(ticker.quoteVolume) : 0;

        const cost = costBasisMap[b.asset];
        const typeRisk = TYPE_RISK_MAP[b.asset] ?? 5;

        return {
          symbol: b.asset,
          name: b.asset,
          amount,
          valueUSD,
          avgBuyPrice: cost?.avgBuyPrice || currentPrice,
          currentPrice,
          pnlPercent: cost?.unrealizedPnLPercent || 0,
          pnlUSD: cost?.unrealizedPnLUSD || 0,
          allocation: 0,
          chain: "BSC" as const,
          volatility30d: 0,
          liquidityRating: (quoteVolume > 10_000_000
            ? "High"
            : quoteVolume > 1_000_000
              ? "Medium"
              : "Low") as "High" | "Medium" | "Low",
          typeRisk,
          change24hPercent,
          quoteVolume,
        };
      });

      // Set allocation
      const assets: EnrichedPortfolioAsset[] = rawAssets
        .map((a) => ({
          ...a,
          allocation: totalValueUSD > 0 ? (a.valueUSD / totalValueUSD) * 100 : 0,
        }))
        .sort((a, b) => b.valueUSD - a.valueUSD);

      // ── Step 5: K-Line volatility ──
      if (includeKlines) {
        const topAssetSymbols = assets
          .filter((a) => !STABLECOINS.includes(a.symbol) && a.allocation > 1)
          .slice(0, 8)
          .map((a) => a.symbol);

        const klineResults = await Promise.allSettled(
          topAssetSymbols.map((sym) =>
            tickerMap.has(sym + "USDT")
              ? getKlines(sym + "USDT", "1d", 30)
              : Promise.resolve({ success: true, data: [] as BinanceKline[] }),
          ),
        );

        topAssetSymbols.forEach((sym, i) => {
          const res = klineResults[i];
          if (
            res.status !== "fulfilled" ||
            !res.value.success ||
            !res.value.data ||
            res.value.data.length < 2
          )
            return;
          const klines = res.value.data;
          const returns: number[] = [];
          for (let j = 1; j < klines.length; j++) {
            returns.push((klines[j].close - klines[j - 1].close) / klines[j - 1].close);
          }
          const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
          const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
          const vol = Math.sqrt(variance) * 100;

          const asset = assets.find((a) => a.symbol === sym);
          if (asset) asset.volatility30d = parseFloat(vol.toFixed(2));
        });
      }

      // ── Step 6: Order book support for top assets ──
      if (includeOrderBook) {
        const topForOB = assets
          .filter((a) => a.allocation > 5 && !STABLECOINS.includes(a.symbol))
          .slice(0, 5);
        const obResults = await Promise.allSettled(
          topForOB.map((a) =>
            tickerMap.has(a.symbol + "USDT")
              ? getOrderBook(a.symbol + "USDT", 20)
              : Promise.resolve(null),
          ),
        );
        topForOB.forEach((asset, i) => {
          const res = obResults[i];
          if (res.status === "fulfilled" && res.value && res.value.success && res.value.data) {
            asset.orderBookSupport = res.value.data.topBidWall.price;
          }
        });
      }

      // ── Step 7: Risk score (0-10) ──
      let riskScore = 0;

      // Concentration (max 3)
      const largestAlloc = assets.length > 0 ? assets[0].allocation : 0;
      if (largestAlloc > 70) riskScore += 3;
      else if (largestAlloc > 50) riskScore += 2;
      else if (largestAlloc > 35) riskScore += 1;

      // Asset type (max ~4)
      const assetTypeScore = assets.reduce((sum, a) => sum + a.typeRisk * (a.allocation / 100), 0);
      riskScore += assetTypeScore * 0.55;

      // Volatility (max 2)
      const volAssets = assets.filter((a) => a.volatility30d > 0);
      if (volAssets.length > 0) {
        const portfolioVol = volAssets.reduce(
          (s, a) => s + a.volatility30d * (a.allocation / 100),
          0,
        );
        if (portfolioVol > 8) riskScore += 2;
        else if (portfolioVol > 5) riskScore += 1;
      }

      // Liquidity risk (max 1)
      const illiquidCount = assets.filter(
        (a) => a.liquidityRating === "Low" && !STABLECOINS.includes(a.symbol),
      ).length;
      riskScore += Math.min(1, illiquidCount * 0.5);

      riskScore = Math.min(10, Math.round(riskScore * 10) / 10);
      const riskLabel =
        riskScore <= 3
          ? "Low"
          : riskScore <= 5
            ? "Moderate"
            : riskScore <= 7.5
              ? "High"
              : "Critical";

      // Diversification (HHI)
      const hhi = assets.reduce((sum, a) => sum + (a.allocation / 100) ** 2, 0);
      const diversificationScore = Math.round((1 - hhi) * 10);

      // ── Step 8: Warnings ──
      const warnings: string[] = [];
      if (largestAlloc > 50) {
        warnings.push(
          `⚠️ ${assets[0].symbol} represents ${largestAlloc.toFixed(1)}% of your portfolio — extreme concentration risk`,
        );
      }
      if (assets.length >= 2) {
        const top2 = assets[0].allocation + assets[1].allocation;
        if (top2 > 80)
          warnings.push(
            `⚠️ Top 2 assets (${assets[0].symbol}+${assets[1].symbol}) = ${top2.toFixed(1)}% — low diversification`,
          );
      }

      // Max per token check
      const maxPerToken = context.preferences?.maxPerToken;
      if (maxPerToken) {
        for (const asset of assets) {
          if (asset.valueUSD > maxPerToken) {
            warnings.push({
              type: "MAX_TOKEN_EXCEEDED",
              message: `${asset.symbol} position ($${asset.valueUSD.toFixed(0)}) exceeds your max per token limit ($${maxPerToken}). Consider trimming.`,
              affectedAsset: asset.symbol,
            } as unknown as string);
          }
        }
      }

      const cashAssets = assets.filter((a) => STABLECOINS.includes(a.symbol));
      const cashBufferPercent =
        totalValueUSD > 0
          ? (cashAssets.reduce((s, a) => s + a.valueUSD, 0) / totalValueUSD) * 100
          : 0;
      if (cashBufferPercent === 0) {
        warnings.push("⚠️ No stablecoin buffer — you have no dry powder for dip buying");
      }

      const deepUnderwater = assets.filter((a) => a.pnlPercent < -40);
      deepUnderwater.forEach((a) =>
        warnings.push(`⚠️ ${a.symbol} is ${a.pnlPercent.toFixed(1)}% underwater`),
      );

      // ── Step 9: DCA to breakeven ──
      for (const asset of assets) {
        if (
          asset.pnlPercent < 0 &&
          asset.avgBuyPrice > asset.currentPrice &&
          asset.currentPrice > 0
        ) {
          asset.dcaToBreakeven = asset.amount * (asset.avgBuyPrice - asset.currentPrice);
        }
      }

      // ── Step 10: Totals ──
      const totalUnrealizedPnLUSD = assets.reduce((s, a) => s + a.pnlUSD, 0);
      const totalCostBasis = assets.reduce((s, a) => s + a.avgBuyPrice * a.amount, 0);
      const totalUnrealizedPnLPercent =
        totalCostBasis > 0 ? (totalUnrealizedPnLUSD / totalCostBasis) * 100 : 0;
      const change24hUSD = assets.reduce((s, a) => {
        const ticker = tickerMap.get(a.symbol + "USDT");
        const pctChange = ticker ? parseFloat(ticker.priceChangePercent) : 0;
        return s + a.valueUSD * (pctChange / 100);
      }, 0);
      const change24hPercent = totalValueUSD > 0 ? (change24hUSD / totalValueUSD) * 100 : 0;

      const topHeavyPair =
        assets.length >= 2 && assets[0].allocation + assets[1].allocation > 70
          ? `${assets[0].symbol}+${assets[1].symbol} = ${(assets[0].allocation + assets[1].allocation).toFixed(1)}%`
          : undefined;

      const summary =
        `Portfolio value: $${totalValueUSD.toFixed(2)} | Risk: ${riskLabel} (${riskScore}/10) | ` +
        `Diversification: ${diversificationScore}/10 | ` +
        `${warnings.length > 0 ? warnings.length + " warning(s) flagged" : "No critical warnings"}. ` +
        `${totalUnrealizedPnLUSD >= 0 ? "Unrealized gains" : "Unrealized loss"}: ` +
        `$${Math.abs(totalUnrealizedPnLUSD).toFixed(2)} (${totalUnrealizedPnLPercent.toFixed(2)}%).`;

      const result: PortfolioPulseResult = {
        totalValueUSD,
        totalUnrealizedPnLUSD,
        totalUnrealizedPnLPercent,
        change24hUSD,
        change24hPercent,
        riskScore,
        riskLabel,
        assets,
        warnings,
        cashBufferPercent: parseFloat(cashBufferPercent.toFixed(1)),
        topHeavyPair,
        diversificationScore,
        summary,
      };

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        data: { status: "unavailable", message: "Unable to fetch portfolio data" },
        summary: `Unable to fetch portfolio data. Error: ${errMsg}. Please check that your Binance API keys have read permissions and no IP restrictions.`,
        error: errMsg,
      };
    }
  },
};
