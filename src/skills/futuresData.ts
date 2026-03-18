import { Skill, SkillResult } from "./types";

interface FuturesDataInput {
  symbol?: string;
  mode?: "premium" | "funding" | "openInterest" | "top-holders";
}

interface FuturesContract {
  symbol: string;
  lastPrice: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: string;
  openInterest: number;
  volume24h: number;
  priceChange: number;
}

interface FuturesDataResult {
  symbol?: string;
  contracts: FuturesContract[];
  fundingSentiment: "bullish" | "bearish" | "neutral";
  marketSentiment: string;
  summary: string;
}

const FUTURES_BASE_URL = "https://fapi.binance.com";

async function fetchFromFutures<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T | null> {
  try {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : "";
    const response = await fetch(`${FUTURES_BASE_URL}${endpoint}${searchParams}`);

    if (!response.ok) {
      console.error(`Futures API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Futures API fetch error: ${error}`);
    return null;
  }
}

interface PremiumIndex {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  estimatedSettlePrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  interestRate: string;
  time: number;
}

interface FundingRate {
  symbol: string;
  fundingTime: number;
  fundingRate: string;
  lastFundingTime: number;
}

interface OpenInterest {
  symbol: string;
  openInterest: string;
  timestamp: number;
}

interface Ticker24h {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
}

export const futuresData: Skill = {
  id: "binance/futures-data",
  name: "Futures Data",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Provides real-time Binance Futures data including funding rates, premium index, open interest, and market sentiment. Use for understanding futures market positioning.",
  inputSchema: {
    symbol: {
      type: "string",
      required: false,
      description: "Futures symbol (e.g., BTCUSDT, leave empty for major pairs)",
    },
    mode: {
      type: "string",
      required: false,
      description: "Mode: premium, funding, openInterest",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbol = String(input.symbol || "").toUpperCase();
      const mode = String(input.mode || "funding");

      const contracts: FuturesContract[] = [];
      let fundingSentiment: "bullish" | "bearish" | "neutral" = "neutral";
      let marketSentiment = "";

      // Default major futures symbols
      const majorSymbols = symbol
        ? [symbol]
        : [
            "BTCUSDT",
            "ETHUSDT",
            "BNBUSDT",
            "SOLUSDT",
            "XRPUSDT",
            "DOGEUSDT",
            "ADAUSDT",
            "AVAXUSDT",
          ];

      // Fetch data in parallel for each symbol
      for (const sym of majorSymbols) {
        try {
          // Fetch multiple endpoints in parallel
          const [premiumData, fundingData, oiData, tickerData] = await Promise.all([
            mode === "openInterest"
              ? null
              : fetchFromFutures<PremiumIndex>("/fapi/v1/premiumIndex", {
                  symbol: sym,
                }),
            mode === "premium"
              ? null
              : fetchFromFutures<FundingRate>("/fapi/v1/fundingRate", {
                  symbol: sym,
                  limit: "1",
                }),
            mode === "funding"
              ? null
              : fetchFromFutures<OpenInterest>("/fapi/v1/openInterestHist", {
                  symbol: sym,
                  period: "1h",
                  limit: "1",
                }),
            fetchFromFutures<Ticker24h>("/fapi/v1/ticker/24hr", {
              symbol: sym,
            }),
          ]);

          const lastPrice = tickerData
            ? parseFloat(tickerData.lastPrice)
            : premiumData
              ? parseFloat(premiumData.markPrice)
              : 0;
          const markPrice = premiumData ? parseFloat(premiumData.markPrice) : lastPrice;
          const indexPrice = premiumData ? parseFloat(premiumData.indexPrice) : lastPrice;
          const fundingRate = fundingData ? parseFloat(fundingData.fundingRate) * 100 : 0;
          const nextFundingTime = premiumData
            ? new Date(premiumData.nextFundingTime).toISOString()
            : "";
          const openInterest = oiData ? parseFloat(oiData.openInterest) : 0;
          const volume24h = tickerData ? parseFloat(tickerData.quoteVolume) : 0;
          const priceChange = tickerData ? parseFloat(tickerData.priceChangePercent) : 0;

          contracts.push({
            symbol: sym,
            lastPrice,
            markPrice,
            indexPrice,
            fundingRate,
            nextFundingTime,
            openInterest,
            volume24h,
            priceChange,
          });
        } catch (error) {
          console.error(`Error fetching data for ${sym}:`, error);
          // Skip this symbol if fetch fails
        }
      }

      if (contracts.length === 0) {
        return {
          success: false,
          data: {},
          summary: "Failed to fetch futures data from Binance. Please check API connectivity.",
          error: "No futures data available",
        };
      }

      // Calculate funding sentiment
      const fundingRates = contracts.filter((c) => c.fundingRate !== 0).map((c) => c.fundingRate);
      if (fundingRates.length > 0) {
        const avgFunding = fundingRates.reduce((a, b) => a + b, 0) / fundingRates.length;
        if (avgFunding > 0.01) {
          fundingSentiment = "bullish";
          marketSentiment = "Positive funding rates indicate bullish market sentiment";
        } else if (avgFunding < -0.01) {
          fundingSentiment = "bearish";
          marketSentiment = "Negative funding rates indicate bearish market sentiment";
        } else {
          fundingSentiment = "neutral";
          marketSentiment = "Funding rates are neutral";
        }
      }

      const result: FuturesDataResult = {
        symbol: symbol || undefined,
        contracts,
        fundingSentiment,
        marketSentiment,
        summary: "",
      };

      // Build summary
      let summary = `📊 Binance Futures Data:\n\n`;

      if (contracts.length > 0) {
        summary += `**Market Sentiment:** ${fundingSentiment.toUpperCase()} - ${marketSentiment}\n\n`;
        summary += `**Top Contracts:**\n`;

        const sortedByVolume = [...contracts].sort((a, b) => b.volume24h - a.volume24h);
        const displayContracts = sortedByVolume.slice(0, 5);

        for (const c of displayContracts) {
          const fundingArrow = c.fundingRate > 0 ? "🟢" : c.fundingRate < 0 ? "🔴" : "⚪";
          summary += `• ${c.symbol}: $${c.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `;
          summary += `(${c.priceChange >= 0 ? "+" : ""}${c.priceChange.toFixed(2)}%) `;
          summary += `${fundingArrow} Funding: ${c.fundingRate.toFixed(4)}%\n`;
        }

        if (contracts[0].nextFundingTime) {
          summary += `\n**Next Funding:** ${new Date(contracts[0].nextFundingTime).toLocaleString()}`;
        }
      }

      result.summary = summary;

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary: result.summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch futures data" },
        summary: "Futures data unavailable. Check your Binance API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
