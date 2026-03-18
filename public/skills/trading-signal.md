---
name: Trading Signal
description: On-chain smart money trading signals - track when professional traders accumulate or distribute
---

# Trading Signal

**Skill ID:** `binance/trading-signal`  
**Used by:** SHADOW  
**Version:** 1.0.0

## What It Does

Retrieves real-time smart money trading signals from Binance Web3. Monitors when professional/institutional traders accumulate or distribute tokens, with trigger prices, current prices, max gains, and exit rates.

## Binance Web3 API Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `POST /bapi/defi/v1/.../signal/smart-money` | Smart money signals | ❌ Public |

## Supported Chains

- BSC (chainId: 56)
- Solana (chainId: CT_501)

## Input Parameters

```typescript
{
  chain: 'bsc' | 'solana',
  direction: 'buy' | 'sell' | 'all',
  status: 'active' | 'timeout' | 'completed' | 'all',
  limit: number
}
```

## Output

```typescript
{
  signals: [
    {
      ticker: string,
      direction: 'buy' | 'sell',
      status: 'active' | 'timeout' | 'completed',
      smartMoneyCount: number,
      totalValueUSD: string,
      alertPrice: string,
      currentPrice: string,
      maxGain: string,
      exitRate: number,
      platform: string
    }
  ],
  summary: {
    activeSignals: number,
    buySignals: number,
    sellSignals: number
  }
}
```
