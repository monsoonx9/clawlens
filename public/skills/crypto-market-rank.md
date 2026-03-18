---
name: Crypto Market Rank
description: Comprehensive crypto market intelligence - trending tokens, Binance Alpha picks, smart money inflow rankings, and top trader leaderboards
---

# Crypto Market Rank

**Skill ID:** `binance/crypto-market-rank`  
**Used by:** SCOUT, LENS  
**Version:** 2.0.0

## What It Does

Fetches real-time market data from Binance's official Web3 API including social hype rankings, trending tokens, Binance Alpha picks, smart money inflow rankings, and top trader PnL leaderboards.

## Binance Web3 API Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /bapi/defi/v1/.../social/hype/rank/leaderboard` | Social hype rankings | ❌ Public |
| `POST /bapi/defi/v1/.../unified/rank/list` | Trending, Alpha, Stock tokens | ❌ Public |
| `POST /bapi/defi/v1/.../token/inflow/rank/query` | Smart money inflow | ❌ Public |
| `GET /bapi/defi/v1/.../exclusive/rank/list` | Meme token rankings | ❌ Public |
| `GET /bapi/defi/v1/.../leaderboard/query` | Top trader PnL | ❌ Public |

## Supported Chains

- BSC (chainId: 56)
- Base (chainId: 8453)
- Solana (chainId: CT_501)

## Input Parameters

```typescript
{
  rankType: 'trending' | 'alpha' | 'smart-money-inflow' | 'top-traders' | 'all',
  chain: 'bsc' | 'base' | 'solana',
  limit: number
}
```

## Output

Returns ranked token lists with price, market cap, volume, holders, and percent change data.
