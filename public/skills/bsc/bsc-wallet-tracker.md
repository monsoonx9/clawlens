---
name: BSC Wallet Tracker
description: Query any BSC wallet address to view native BNB balance and ERC20 token holdings
---

# BSC Wallet Tracker

**Skill ID:** `bsc/bsc-wallet-tracker`  
**Version:** 1.0.0

## What It Does

Queries any BSC (BNB Smart Chain) wallet address to retrieve:

- Native BNB balance
- Optional ERC20 token balances for specified token addresses

## Supported Networks

- BSC (BNB Smart Chain) — `bsc`
- BSC Testnet — `bscTestnet`
- opBNB — `opbnb`
- opBNB Testnet — `opbnbTestnet`

## Input Parameters

```typescript
{
  address: string,      // BSC wallet address (0x...)
  network?: string,     // Network: bsc, bscTestnet, opbnb, opbnbTestnet
  tokenAddresses?: string[]  // Optional: list of ERC20 token addresses to check
}
```

## Example Usage

```typescript
const skill = getSkill("bsc/bsc-wallet-tracker");
const result = await skill.execute({
  address: "0x1234...",
  network: "bsc",
  tokenAddresses: ["0xABCD..."], // optional
});
```
