---
name: Token Info
description: Query token details - search, metadata, real-time market data, and K-line candlestick charts
---

# Token Info

**Skill ID:** `binance/query-token-info`  
**Used by:** LENS  
**Version:** 1.0.0

## What It Does

Provides comprehensive token data: search by name/symbol, metadata (decimals, creator, social links), dynamic market data (price, volume, holders), and K-line candlestick charts for technical analysis.

## Binance Web3 API Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /bapi/defi/v5/.../token/search` | Token search | ❌ Public |
| `GET /bapi/defi/v1/.../token/meta/info` | Token metadata | ❌ Public |
| `GET /bapi/defi/v4/.../token/dynamic/info` | Real-time market data | ❌ Public |
| `GET /dquery.sintral.io/.../k-line/candles` | K-line charts | ❌ Public |

## Supported Chains

- BSC (chainId: 56)
- Base (chainId: 8453)
- Solana (chainId: CT_501)
- Ethereum (chainId: 1)

## Input Parameters

```typescript
{
  mode: 'search' | 'metadata' | 'dynamic' | 'klines' | 'all',
  query?: string,
  contractAddress?: string,
  chain: 'bsc' | 'base' | 'solana',
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d',
  limit?: number
}
```
