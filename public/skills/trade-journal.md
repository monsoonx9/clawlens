---
name: Trade Journal
description: FIFO trade pairing with 7 behavioral pattern detection and A-F grading
---

# Trade Journal

**Skill ID:** `claw-council/trade-journal`  
**Used by:** QUILL (Trade Historian)  
**Version:** 1.0.0

## What It Does

Analyzes the user's complete Binance trade history using FIFO (First-In-First-Out) pairing. Computes win rate, profit factor, expectancy, per-symbol performance, monthly breakdown, and detects 7 behavioral patterns. Grades overall trading performance A through F.

## Binance API Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /api/v3/myTrades` | Full trade history per symbol (up to 1000) | ✅ Signed |

## FIFO Pairing

Buys are queued chronologically per symbol. When a sell occurs, it is matched against the oldest open buy lot:
1. Partial lot matching supported
2. Computes P&L per paired trade
3. Tracks hold time per round-trip
4. Unpaired buys are treated as open positions (excluded from stats)

## Behavioral Pattern Detection

| Pattern | Severity | Detection Logic |
|---|---|---|
| `CUTTING_WINNERS_EARLY` | HIGH | Winners closed 2x+ faster than losers |
| `HOLDING_LOSERS_TOO_LONG` | HIGH | 2+ trades closed below -20% |
| `REVENGE_TRADING` | HIGH | Same-symbol re-entry within 5 min of a loss |
| `SYMBOL_FIXATION` | MEDIUM | 10+ trades on one symbol with >60% loss rate |
| `FOMO_BUYING` | MEDIUM | Buying after 20%+ daily gain |
| `IGNORING_BEST_PERFORMERS` | LOW | No activity on best-performing symbols |
| `SHORT_TERM_TRADER` | LOW | Average hold time < 1 hour |

## Grading System

| Grade | Criteria |
|---|---|
| **A** | Win rate ≥ 55%, profit factor ≥ 2.0, positive expectancy |
| **B** | Win rate ≥ 50%, profit factor ≥ 1.5, positive expectancy |
| **C** | Win rate ≥ 45%, positive or zero expectancy |
| **D** | Win rate ≥ 35%, negative expectancy |
| **F** | Win rate < 35%, consistently losing |

## Output

```typescript
{
  totalTrades: number,
  winRate: number,
  profitFactor: number,
  expectancyPerTradeUSD: number,
  totalRealizedPnLUSD: number,
  patterns: BehavioralPattern[],
  grade: 'A' | 'B' | 'C' | 'D' | 'F',
  bySymbol: SymbolStats[],
  projectedAnnualPnLUSD: number
}
```
