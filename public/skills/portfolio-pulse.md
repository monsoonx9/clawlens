---
name: Portfolio Pulse
description: Real-time portfolio health analysis with FIFO cost basis, volatility scoring, and concentration detection
---

# Portfolio Pulse

**Skill ID:** `claw-council/portfolio-pulse`  
**Used by:** LEDGER (Portfolio Manager)  
**Version:** 1.0.0

## What It Does

Generates a complete portfolio health snapshot by fetching live Binance account balances, enriching each asset with K-Line volatility data and order book depth, computing FIFO cost basis from trade history, and producing a weighted risk score (0–10) with plain-English warnings.

## Binance API Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /api/v3/account` | Fetch all non-zero balances | ✅ Signed |
| `GET /api/v3/ticker/price` | Current prices for all pairs | ❌ Public |
| `GET /api/v3/myTrades` | FIFO cost basis calculation | ✅ Signed |
| `GET /api/v3/klines` | 30-day daily volatility | ❌ Public |
| `GET /api/v3/depth` | Order book support levels | ❌ Public |

## Algorithm

1. **Fetch balances** — filters assets with amount > 0.00001
2. **Resolve USD prices** — tries USDT pair first, falls back to BTC cross-rate
3. **FIFO cost basis** — pairs buy/sell trades chronologically to compute unrealized P&L per asset
4. **K-Line volatility** — calculates 30-day daily return standard deviation for top 8 assets
5. **Order book support** — identifies top bid wall price for assets > 5% allocation
6. **Risk scoring** — weighted combination of:
   - Concentration risk (max 3 points)
   - Asset type risk (max ~4 points)
   - Volatility risk (max 2 points)
   - Liquidity risk (max 1 point)
7. **HHI diversification** — Herfindahl–Hirschman Index mapped to 0–10 diversification score
8. **DCA-to-breakeven** — for underwater positions, calculates USD needed to average down to current price

## Output

```typescript
{
  totalValueUSD: number,
  riskScore: number,       // 0-10
  riskLabel: 'Low' | 'Moderate' | 'High' | 'Critical',
  diversificationScore: number,  // 0-10
  cashBufferPercent: number,
  warnings: string[],
  assets: EnrichedPortfolioAsset[]
}
```

## Security

- Read-only API access required
- No trades are ever placed
- Keys passed per-call, never stored
