import { Skill, SkillContext, SkillResult } from "./types";
import { getTradeHistory, BinanceTrade } from "@/lib/binanceClient";
import {
  TradeJournalResult,
  BehavioralPattern,
  SymbolStats,
  MonthlyStats,
  TradeRecord,
} from "@/types";

// ---------------------------------------------------------------------------
// Trade Journal Skill — FIFO trade pairing + behavioral analysis
// ---------------------------------------------------------------------------

interface PairedTrade {
  symbol: string;
  buyTime: number;
  buyPrice: number;
  sellTime: number;
  sellPrice: number;
  qty: number;
  pnlUSD: number;
  pnlPercent: number;
  holdTimeMs: number;
  isWin: boolean;
}

function formatDuration(ms: number): string {
  const hours = ms / 3600000;
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  if (days < 30) return `${days.toFixed(1)}d`;
  return `${(days / 30).toFixed(1)}mo`;
}

export const tradeJournal: Skill = {
  id: "claw-council/trade-journal",
  name: "Trade Journal",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Analyzes the user's complete trade history via FIFO pairing. Computes win rate, " +
    "profit factor, expectancy, per-symbol stats, monthly breakdown, and detects 7 " +
    "behavioral patterns (cutting winners, holding losers, revenge trading, symbol " +
    "fixation, FOMO buying, ignoring performers, short-term trading). Grades A-F.",
  inputSchema: {
    symbols: {
      type: "array",
      required: true,
      description: "Trading pair symbols to analyze",
    },
  },

  async execute(input: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    try {
      const { binanceApiKey, binanceSecretKey } = context.apiKeys;
      let symbols = (input.symbols || []) as string[];

      // If no symbols provided, try to derive from portfolio
      if (symbols.length === 0 && context.portfolio) {
        symbols = context.portfolio.assets
          .filter((a) => !["USDT", "USDC", "BUSD", "DAI", "TUSD", "FDUSD"].includes(a.symbol))
          .slice(0, 15)
          .map((a) => a.symbol + "USDT");
      }

      if (symbols.length === 0) {
        return {
          success: true,
          data: {},
          summary: "No trading symbols provided and no portfolio data available.",
        };
      }

      // ── Step 1: Fetch all trade history ──
      const allTradeResults = await Promise.allSettled(
        symbols.map((sym) => getTradeHistory(sym, binanceApiKey, binanceSecretKey, 1000)),
      );

      const allTrades: Array<{ symbol: string; trade: BinanceTrade }> = [];
      symbols.forEach((sym, i) => {
        const res = allTradeResults[i];
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          for (const t of res.value) {
            allTrades.push({ symbol: sym, trade: t });
          }
        }
      });

      if (allTrades.length === 0) {
        return {
          success: true,
          data: {},
          summary: "No trade history found for the provided symbols.",
        };
      }

      // ── Step 2: FIFO pairing per symbol ──
      const symbolQueues: Record<
        string,
        { buys: Array<{ qty: number; price: number; time: number }> }
      > = {};
      const pairedTrades: PairedTrade[] = [];

      // Sort all by time (BinanceTrade uses .time as epoch ms)
      allTrades.sort((a, b) => a.trade.time - b.trade.time);

      for (const { symbol, trade } of allTrades) {
        if (!symbolQueues[symbol]) symbolQueues[symbol] = { buys: [] };
        const queue = symbolQueues[symbol];
        const qty = parseFloat(String(trade.qty));
        const price = parseFloat(String(trade.price));

        if (trade.isBuyer) {
          queue.buys.push({ qty, price, time: trade.time });
        } else {
          let remaining = qty;
          while (remaining > 0.000001 && queue.buys.length > 0) {
            const lot = queue.buys[0];
            const take = Math.min(lot.qty, remaining);
            const pnlUSD = (price - lot.price) * take;
            const pnlPercent = lot.price > 0 ? ((price - lot.price) / lot.price) * 100 : 0;

            pairedTrades.push({
              symbol,
              buyTime: lot.time,
              buyPrice: lot.price,
              sellTime: trade.time,
              sellPrice: price,
              qty: take,
              pnlUSD,
              pnlPercent,
              holdTimeMs: trade.time - lot.time,
              isWin: pnlUSD > 0,
            });

            lot.qty -= take;
            remaining -= take;
            if (lot.qty < 0.000001) queue.buys.shift();
          }
        }
      }

      if (pairedTrades.length === 0) {
        return {
          success: true,
          data: {},
          summary: "Found trades but no completed buy-sell pairs for analysis.",
        };
      }

      // ── Step 3: Core metrics ──
      const wins = pairedTrades.filter((t) => t.isWin);
      const losses = pairedTrades.filter((t) => !t.isWin);
      const winRate = (wins.length / pairedTrades.length) * 100;
      const totalWinUSD = wins.reduce((s, t) => s + t.pnlUSD, 0);
      const totalLossUSD = Math.abs(losses.reduce((s, t) => s + t.pnlUSD, 0));
      const profitFactor =
        totalLossUSD > 0 ? totalWinUSD / totalLossUSD : wins.length > 0 ? Infinity : 0;
      const totalRealizedPnLUSD = pairedTrades.reduce((s, t) => s + t.pnlUSD, 0);
      const expectancyPerTradeUSD = totalRealizedPnLUSD / pairedTrades.length;
      const avgWinPercent =
        wins.length > 0 ? wins.reduce((s, t) => s + t.pnlPercent, 0) / wins.length : 0;
      const avgLossPercent =
        losses.length > 0 ? losses.reduce((s, t) => s + t.pnlPercent, 0) / losses.length : 0;
      const avgHoldTimeWins =
        wins.length > 0
          ? formatDuration(wins.reduce((s, t) => s + t.holdTimeMs, 0) / wins.length)
          : "N/A";
      const avgHoldTimeLosses =
        losses.length > 0
          ? formatDuration(losses.reduce((s, t) => s + t.holdTimeMs, 0) / losses.length)
          : "N/A";

      // Largest win/loss
      const sortedByPnL = [...pairedTrades].sort((a, b) => b.pnlUSD - a.pnlUSD);
      const largestWin = sortedByPnL[0];
      const largestLoss = sortedByPnL[sortedByPnL.length - 1];

      // ── Step 4: Per-symbol stats ──
      const symbolMap = new Map<string, PairedTrade[]>();
      for (const t of pairedTrades) {
        const arr = symbolMap.get(t.symbol) || [];
        arr.push(t);
        symbolMap.set(t.symbol, arr);
      }

      const bySymbol: SymbolStats[] = Array.from(symbolMap.entries())
        .map(([sym, trades]) => {
          const symWins = trades.filter((t) => t.isWin);
          return {
            symbol: sym,
            tradeCount: trades.length,
            winRate: trades.length > 0 ? (symWins.length / trades.length) * 100 : 0,
            totalRealizedPnLUSD: trades.reduce((s, t) => s + t.pnlUSD, 0),
            avgHoldTime: formatDuration(
              trades.reduce((s, t) => s + t.holdTimeMs, 0) / trades.length,
            ),
            bestTrade: Math.max(...trades.map((t) => t.pnlUSD)),
            worstTrade: Math.min(...trades.map((t) => t.pnlUSD)),
          };
        })
        .sort((a, b) => b.totalRealizedPnLUSD - a.totalRealizedPnLUSD);

      // ── Step 5: Monthly stats ──
      const monthMap = new Map<string, PairedTrade[]>();
      for (const t of pairedTrades) {
        const d = new Date(t.sellTime);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const arr = monthMap.get(key) || [];
        arr.push(t);
        monthMap.set(key, arr);
      }

      const monthlyData: MonthlyStats[] = Array.from(monthMap.entries())
        .map(([month, trades]) => ({
          month,
          tradeCount: trades.length,
          winRate:
            trades.length > 0 ? (trades.filter((t) => t.isWin).length / trades.length) * 100 : 0,
          pnlUSD: trades.reduce((s, t) => s + t.pnlUSD, 0),
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const bestMonth =
        monthlyData.length > 0
          ? [...monthlyData].sort((a, b) => b.pnlUSD - a.pnlUSD)[0]
          : { month: "N/A", tradeCount: 0, winRate: 0, pnlUSD: 0 };
      const worstMonth =
        monthlyData.length > 0
          ? [...monthlyData].sort((a, b) => a.pnlUSD - b.pnlUSD)[0]
          : { month: "N/A", tradeCount: 0, winRate: 0, pnlUSD: 0 };

      // ── Step 6: Behavioral patterns ──
      const patterns: BehavioralPattern[] = [];

      // Pattern 1: Cutting winners early
      if (wins.length >= 3) {
        const avgWinHold = wins.reduce((s, t) => s + t.holdTimeMs, 0) / wins.length;
        const avgLossHold =
          losses.length > 0 ? losses.reduce((s, t) => s + t.holdTimeMs, 0) / losses.length : 0;
        if (avgWinHold < avgLossHold * 0.5 && losses.length >= 2) {
          patterns.push({
            type: "CUTTING_WINNERS_EARLY",
            severity: "HIGH",
            evidence: `Avg win hold: ${formatDuration(avgWinHold)} vs avg loss hold: ${formatDuration(avgLossHold)}. You exit winners ${(avgLossHold / avgWinHold).toFixed(1)}x faster than losers.`,
            coaching:
              "Try using trailing stop-losses instead of fixed targets to let winners ride.",
            occurrenceCount: wins.length,
          });
        }
      }

      // Pattern 2: Holding losers too long
      if (losses.length >= 3) {
        const deepLosses = losses.filter((t) => t.pnlPercent < -20);
        if (deepLosses.length >= 2) {
          patterns.push({
            type: "HOLDING_LOSERS_TOO_LONG",
            severity: "HIGH",
            evidence: `${deepLosses.length} trades closed below -20%. Avg loss: ${avgLossPercent.toFixed(1)}%.`,
            coaching: "Set a maximum loss threshold (e.g., -10%) and enforce it with stop-losses.",
            occurrenceCount: deepLosses.length,
          });
        }
      }

      // Pattern 3: Revenge trading
      const sortedBySellTime = [...pairedTrades].sort((a, b) => a.sellTime - b.sellTime);
      let revengeTrades = 0;
      for (let i = 1; i < sortedBySellTime.length; i++) {
        const prev = sortedBySellTime[i - 1];
        const curr = sortedBySellTime[i];
        if (!prev.isWin && curr.buyTime - prev.sellTime < 300000 && curr.symbol === prev.symbol) {
          revengeTrades++;
        }
      }
      if (revengeTrades >= 2) {
        patterns.push({
          type: "REVENGE_TRADING",
          severity: "HIGH",
          evidence: `${revengeTrades} instance(s) of buying back the same token within 5 minutes of a loss.`,
          coaching: "After a loss, enforce a 30-minute cooldown before re-entering the same asset.",
          occurrenceCount: revengeTrades,
        });
      }

      // Pattern 4: Symbol fixation
      for (const [sym, trades] of symbolMap) {
        if (trades.length >= 10 && trades.filter((t) => !t.isWin).length > trades.length * 0.6) {
          patterns.push({
            type: "SYMBOL_FIXATION",
            severity: "MEDIUM",
            evidence: `${trades.length} trades on ${sym} with ${((trades.filter((t) => !t.isWin).length / trades.length) * 100).toFixed(0)}% loss rate. You keep trading it despite poor performance.`,
            coaching: `Avoid ${sym} until market conditions change. Your edge on this pair is negative.`,
            occurrenceCount: trades.length,
          });
        }
      }

      // Pattern 5: Short-term trader
      const avgHoldAllMs = pairedTrades.reduce((s, t) => s + t.holdTimeMs, 0) / pairedTrades.length;
      if (avgHoldAllMs < 3600000) {
        patterns.push({
          type: "SHORT_TERM_TRADER",
          severity: "LOW",
          evidence: `Average hold time: ${formatDuration(avgHoldAllMs)}. Most trades are very short-term.`,
          coaching:
            "Short-term trading has higher fees and requires precise timing. Ensure your win rate justifies the frequency.",
          occurrenceCount: pairedTrades.length,
        });
      }

      // ── Step 7: Grade ──
      let grade: TradeJournalResult["grade"] = "C";
      if (winRate >= 55 && profitFactor >= 2.0 && expectancyPerTradeUSD > 0) grade = "A";
      else if (winRate >= 50 && profitFactor >= 1.5 && expectancyPerTradeUSD > 0) grade = "B";
      else if (winRate >= 45 && expectancyPerTradeUSD >= 0) grade = "C";
      else if (winRate >= 35) grade = "D";
      else grade = "F";

      const gradeExplanation =
        grade === "A"
          ? "Excellent trading performance. Consistent edge, strong risk management."
          : grade === "B"
            ? "Good performance. Above-average win rate and positive expectancy."
            : grade === "C"
              ? "Average. Marginal edge. Focus on reducing losses and improving selectivity."
              : grade === "D"
                ? "Below average. Negative expected value unless improved. Review your strategy."
                : "Poor performance. You are losing money consistently. Stop trading and reassess.";

      // ── Step 8: Build result ──
      const oldestTrade = Math.min(...pairedTrades.map((t) => t.buyTime));
      const newestTrade = Math.max(...pairedTrades.map((t) => t.sellTime));
      const analyzedPeriodDays = Math.max(1, Math.round((newestTrade - oldestTrade) / 86400000));
      const projectedAnnualPnLUSD =
        analyzedPeriodDays > 0 ? (totalRealizedPnLUSD / analyzedPeriodDays) * 365 : 0;

      const dummyLargestWinRecord: TradeRecord = {
        id: String(largestWin.buyTime),
        symbol: largestWin.symbol,
        side: "SELL" as const,
        amount: largestWin.qty,
        price: largestWin.sellPrice,
        valueUSD: largestWin.sellPrice * largestWin.qty,
        timestamp: new Date(largestWin.sellTime),
        pnlUSD: largestWin.pnlUSD,
        pnlPercent: largestWin.pnlPercent,
      };

      const dummyLargestLossRecord: TradeRecord = {
        id: String(largestLoss.buyTime),
        symbol: largestLoss.symbol,
        side: "SELL" as const,
        amount: largestLoss.qty,
        price: largestLoss.sellPrice,
        valueUSD: largestLoss.sellPrice * largestLoss.qty,
        timestamp: new Date(largestLoss.sellTime),
        pnlUSD: largestLoss.pnlUSD,
        pnlPercent: largestLoss.pnlPercent,
      };

      const journalSummary =
        `${pairedTrades.length} completed trades over ${analyzedPeriodDays} days. ` +
        `Win rate: ${winRate.toFixed(1)}%, Profit factor: ${profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}, ` +
        `Total P&L: $${totalRealizedPnLUSD.toFixed(2)}. Grade: ${grade}. ` +
        `${patterns.length > 0 ? `${patterns.length} behavioral pattern(s) detected.` : "No behavioral patterns detected."}`;

      const result: TradeJournalResult = {
        totalTrades: pairedTrades.length,
        analyzedPeriodDays,
        winRate: parseFloat(winRate.toFixed(1)),
        profitFactor: profitFactor === Infinity ? 999 : parseFloat(profitFactor.toFixed(2)),
        expectancyPerTradeUSD: parseFloat(expectancyPerTradeUSD.toFixed(2)),
        totalRealizedPnLUSD: parseFloat(totalRealizedPnLUSD.toFixed(2)),
        avgWinPercent: parseFloat(avgWinPercent.toFixed(2)),
        avgLossPercent: parseFloat(avgLossPercent.toFixed(2)),
        avgHoldTimeWins,
        avgHoldTimeLosses,
        largestWin: dummyLargestWinRecord,
        largestLoss: dummyLargestLossRecord,
        bestMonth,
        worstMonth,
        bySymbol,
        patterns,
        projectedAnnualPnLUSD: parseFloat(projectedAnnualPnLUSD.toFixed(2)),
        grade,
        gradeExplanation,
        journalSummary,
      };

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary: journalSummary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch trade history" },
        summary:
          "Your Binance API keys may be missing or incorrect. Add them in Settings to view your trade history.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
