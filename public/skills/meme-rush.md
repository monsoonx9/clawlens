---
name: Meme Rush
description: Real-time meme token discovery from launchpads - new tokens, finalizing, and migrated tokens with security metrics
---

# Meme Rush

**Skill ID:** `binance/meme-rush`  
**Used by:** SCOUT  
**Version:** 1.0.0

## What It Does

Discovers new meme tokens from launchpads like Pump.fun, Four.meme, and more. Tracks tokens at different lifecycle stages: new (on bonding curve), finalizing (about to migrate), and migrated (on DEX).

## Binance Web3 API Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `POST /bapi/defi/v1/.../pulse/rank/list` | Meme tokens by stage | ❌ Public |
| `GET /bapi/defi/v1/.../social-rush/rank/list` | Hot topics with tokens | ❌ Public |

## Supported Chains

- BSC (chainId: 56)
- Solana (chainId: CT_501)

## Input Parameters

```typescript
{
  mode: 'meme-rush' | 'topic-rush',
  stage: 'new' | 'finalizing' | 'migrated',
  topicType: 'latest' | 'rising' | 'viral',
  chain: 'bsc' | 'solana',
  limit: number
}
```

## Output

Returns meme tokens with bonding curve progress, holder counts, security metrics (top10%, dev%, sniper%), and platform info.
