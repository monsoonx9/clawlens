---
name: BSC Block Explorer
description: Get latest block or block by number on BSC with timestamp, transactions, and gas info
---

# BSC Block Explorer

**Skill ID:** `bsc/bsc-block-explorer`  
**Version:** 1.0.0

## What It Does

Returns block information from BSC including:

- Block number and hash
- Timestamp
- Number of transactions
- Gas used and gas limit
- Miner address

## Supported Networks

- BSC (BNB Smart Chain) — `bsc`
- BSC Testnet — `bscTestnet`
- opBNB — `opbnb`
- opBNB Testnet — `opbnbTestnet`

## Input Parameters

```typescript
{
  blockNumber?: number,  // Block number to query (optional, defaults to latest)
  network?: string       // Network: bsc, bscTestnet, opbnb, opbnbTestnet
}
```

## Example Usage

```typescript
const skill = getSkill("bsc/bsc-block-explorer");
const result = await skill.execute({
  network: "bsc",
});
```
