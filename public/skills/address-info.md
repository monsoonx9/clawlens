---
name: Address Info
description: Query any on-chain wallet address to view token holdings, balances, and portfolio value
---

# Address Info

**Skill ID:** `binance/query-address-info`  
**Used by:** SHADOW  
**Version:** 1.0.0

## What It Does

Queries any blockchain wallet address to retrieve all token holdings with current prices, 24h price changes, and USD values.

## Binance Web3 API Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /bapi/defi/v3/.../address/pnl/active-position-list` | Token balances | ❌ Public |

## Supported Chains

- BSC (chainId: 56)
- Base (chainId: 8453)
- Solana (chainId: CT_501)

## Input Parameters

```typescript
{
  address: string,  // Wallet address to query
  chain: 'bsc' | 'base' | 'solana'
}
```

## Output

Returns list of all tokens held with symbol, balance, price, value USD, and 24h change.
