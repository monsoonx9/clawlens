import { Skill, SkillResult } from "../types";
import { getFuturesKlines } from "@/lib/futuresClient";

const CORRELATION_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "DOTUSDT",
  "MATICUSDT",
];

function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

interface CorrelationResult {
  matrix: Record<string, Record<string, number>>;
  strong_correlations: Array<{ pair: string; correlation: number }>;
}

async function calculateCorrelationMatrix(
  symbols: string[],
  interval: string,
  limit: number,
): Promise<CorrelationResult> {
  const pricesBySymbol: Record<string, number[]> = {};

  for (const symbol of symbols) {
    try {
      const klines = await getFuturesKlines(symbol, interval as any, limit);
      pricesBySymbol[symbol] = klines.map((k) => k.close);
    } catch {
      pricesBySymbol[symbol] = [];
    }
  }

  const matrix: Record<string, Record<string, number>> = {};
  const strongCorrelations: Array<{ pair: string; correlation: number }> = [];

  for (const sym1 of symbols) {
    matrix[sym1] = {};
    for (const sym2 of symbols) {
      if (sym1 === sym2) {
        matrix[sym1][sym2] = 1;
        continue;
      }

      const prices1 = pricesBySymbol[sym1];
      const prices2 = pricesBySymbol[sym2];

      if (prices1.length === 0 || prices2.length === 0) {
        matrix[sym1][sym2] = 0;
        continue;
      }

      const minLen = Math.min(prices1.length, prices2.length);
      const corr = pearsonCorrelation(prices1.slice(-minLen), prices2.slice(-minLen));

      matrix[sym1][sym2] = Math.round(corr * 1000) / 1000;

      if (sym1 < sym2 && Math.abs(corr) >= 0.7) {
        strongCorrelations.push({
          pair: `${sym1}/${sym2}`,
          correlation: Math.round(corr * 1000) / 1000,
        });
      }
    }
  }

  strongCorrelations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  return { matrix, strong_correlations: strongCorrelations };
}

export const correlation: Skill = {
  id: "binance/correlation-matrix",
  name: "Correlation Matrix",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Calculates Pearson correlation coefficients between multiple futures pairs. Identifies strong correlations (|r| >= 0.7) for portfolio diversification and risk management.",
  inputSchema: {
    symbols: {
      type: "array",
      required: false,
      description: "List of symbols (default: top 8 pairs)",
    },
    interval: {
      type: "string",
      required: false,
      description: "K-line interval: 4h (default: 4h)",
    },
    limit: {
      type: "number",
      required: false,
      description: "Number of periods (default: 90)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const symbols = (input.symbols as string[] | undefined) || CORRELATION_SYMBOLS.slice(0, 8);
      const interval = String(input.interval || "4h");
      const limit = Number(input.limit) || 90;

      const result = await calculateCorrelationMatrix(symbols, interval, limit);

      const summary =
        `🔗 Correlation Matrix (${interval}, ${limit} periods)\n\n` +
        `Strong Correlations (|r| >= 0.7):\n\n` +
        result.strong_correlations
          .slice(0, 10)
          .map((c) => {
            const emoji = c.correlation > 0 ? "🟢" : "🔴";
            return `${emoji} ${c.pair}: ${c.correlation.toFixed(2)}`;
          })
          .join("\n") +
        `\n\nFull matrix available in data.`;

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to calculate correlation matrix" },
        summary: "Correlation data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
