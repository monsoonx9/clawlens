---
name: Whale Radar
description: Whale wallet snapshot diffing with consensus accumulation detection
---

# Whale Radar

**Skill ID:** `claw-council/whale-radar`  
**Used by:** SHADOW (Smart Money Tracker)  
**Version:** 1.0.0

## What It Does

Scans tracked whale wallets by comparing current holdings against previous snapshots. Detects new positions, full exits, significant increases/decreases, and cross-wallet consensus accumulation. Returns severity-sorted alerts.

## Alert Types

| Type | Trigger | Severity Logic |
|---|---|---|
| `NEW_POSITION` | Token appears in wallet for first time | HIGH if >$50k, MEDIUM if >$10k |
| `SIGNIFICANT_INCREASE` | Holding increased > threshold % | HIGH if >100%, MEDIUM if >50% |
| `SIGNIFICANT_DECREASE` | Holding decreased > threshold % | HIGH if >80%, MEDIUM if >50% |
| `FULL_EXIT` | Token completely removed from wallet | HIGH if previous >$50k |

## Consensus Detection

When 2+ tracked whales independently accumulate the same token, a **consensus signal** is generated. This is the strongest signal type — it indicates independent conviction from multiple institutional-grade wallets.

## Output

```typescript
{
  scannedWallets: number,
  alertCount: number,
  alerts: WhaleAlert[],   // sorted by severity
  whaleConsensus?: {
    token: string,
    walletCount: number,
    walletNicknames: string[],
    totalValueAccumulatedUSD: number
  },
  lastScanned: Date,
  summary: string
}
```

## Default Sensitivity

- Minimum change threshold: **10%** (configurable)
- Minimum value for alerts: **$100**
