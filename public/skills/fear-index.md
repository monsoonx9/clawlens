---
name: Fear Index
description: 4-component 0-100 composite fear/greed score with RSI from live K-Lines
---

# Fear Index

**Skill ID:** `claw-council/fear-index`  
**Used by:** PULSE (Sentiment Analyst)  
**Version:** 1.0.0

## What It Does

Calculates a composite 0–100 Fear & Greed index for a specific token or the overall market, combining four weighted components: social sentiment, price momentum, smart money direction, and technical RSI. Includes contrarian interpretation at extremes.

## Binance API Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /api/v3/klines` | RSI-14 calculation from daily candles | ❌ Public |

## Components & Weights

| Component | Weight | Data Source | Range |
|---|---|---|---|
| Social Sentiment | 30% | Social hype + meme momentum scores | 0–100 |
| Price Momentum | 25% | 24hr price change mapped to sentiment | 0–100 |
| Smart Money Direction | 30% | Institutional wallet activity signal | 0–100 |
| Technical RSI | 15% | RSI-14 from 16-day K-Line data | 0–100 |

## Labels

| Score | Label | Color |
|---|---|---|
| 0–15 | Extreme Fear | 🔴 `#ef4444` |
| 16–30 | Fear | 🟡 `#f59e0b` |
| 31–45 | Caution | 🟡 `#f59e0b` |
| 46–55 | Neutral | ⚪ `#a3a3a3` |
| 56–75 | Greed | 🟢 `#22c55e` |
| 76–100 | Extreme Greed | 🟢 `#10b981` |

## Contrarian Notes

- **Score ≤ 20:** "Be greedy when others are fearful." — historically better entry zone
- **Score ≥ 80:** "Extreme greed precedes corrections." — consider reducing exposure

## Output

```typescript
{
  token: string,
  score: number,        // 0-100
  label: string,
  color: string,
  components: { socialSentiment, priceMomentum, smartMoney, technicalRSI },
  interpretation: string,
  contrarianNote?: string
}
```
