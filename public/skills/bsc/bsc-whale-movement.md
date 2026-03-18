---
name: BSC Whale Movement
description: Monitor BSC wallet addresses for large BNB holdings (whale tracking)
---

# BSC Whale Movement

**Skill ID:** `bsc/bsc-whale-movement`  
**Version:** 1.0.0

## What It Does

Checks if a BSC wallet address holds a significant amount of BNB (whale detection):

- Default threshold: 100 BNB
- Configurable threshold
- Classification as Whale or Non-Whale

## Supported Networks

- BSC (BNB Smart Chain) — `bsc`
- BSC Testnet — `bscTestnet`
- opBNB — `opbnb`
- opBNB Testnet — `opbnbTestnet`

## Input Parameters

```typescript
{
  address: string,    // BSC wallet address (0x...)
  threshold?: number, // Whale threshold in BNB (default: 100)
  network?: string   // Network: bsc, bscTestnet, opbnb, opbnbTestnet
}
```

## Example Usage

```typescript
const skill = getSkill("bsc/bsc-whale-movement");
const result = await skill.execute({
  address: "0x1234...",
  threshold: 100, // 100 BNB threshold
  network: "bsc",
});
```
