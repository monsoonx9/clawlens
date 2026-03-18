---
name: DCA Strategist
description: ATR-based dollar-cost-averaging plan with order book support detection and 3-scenario simulation
---

# DCA Strategist

**Skill ID:** `claw-council/dca-strategist`  
**Used by:** LEDGER (Portfolio Manager)  
**Version:** 1.0.0

## What It Does

Designs a personalized DCA schedule using 90-day Average True Range (ATR) volatility data, order book bid walls for support detection, and smart money alignment signals. Produces a week-by-week purchase schedule with conditional acceleration logic and projects outcomes across bull, bear, and crab scenarios.

## Binance API Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /api/v3/klines` | 90-day daily ATR + 30-day SMA | ❌ Public |
| `GET /api/v3/ticker/24hr` | Current price + 24hr stats | ❌ Public |
| `GET /api/v3/depth` | Order book bid wall support levels | ❌ Public |

## Algorithm

1. **ATR calculation** — 90-day Average True Range determines volatility profile (High/Medium/Low)
2. **Frequency selection** — High vol → bi-weekly, Medium → weekly, Low → bi-monthly
3. **Order book support** — Identifies cumulative bid walls at 30% and 70% of budget depth
4. **Schedule generation** — Base amount per interval with conditional acceleration:
   - Price >10% below 20-day SMA → double buy
   - Price 5-10% below SMA → 1.5x buy
   - Near order book support wall → +0.5x supplement
5. **Scenario simulation** — Projects outcomes assuming:
   - Bull: price reaches 1.5x
   - Bear: price drops to 0.7x
   - Crab: price at 1.05x
6. **Smart money check** — Flags alignment with institutional wallet direction

## Output

```typescript
{
  targetAsset: string,
  volatilityProfile: 'High' | 'Medium' | 'Low',
  atr90dPercent: number,
  recommendedFrequency: 'bi-weekly' | 'weekly' | 'bi-monthly',
  schedule: DCAScheduleItem[],
  supportLevels: number[],
  scenarios: { bull, bear, crab },
  recommendation: string
}
```

## Security

- No trades placed — template only
- Public endpoints only (no auth required)
