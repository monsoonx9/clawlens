---
name: BSC Transaction Analyzer
description: Get detailed information about any BSC transaction including sender, recipient, value, gas, and status
---

# BSC Transaction Analyzer

**Skill ID:** `bsc/bsc-transaction-analyzer`  
**Version:** 1.0.0

## What It Does

Retrieves detailed information about any BSC transaction including:

- Sender and recipient addresses
- Transaction value (BNB)
- Gas used and gas price
- Transaction status (success/failed)
- Block number and timestamp

## Supported Networks

- BSC (BNB Smart Chain) — `bsc`
- BSC Testnet — `bscTestnet`
- opBNB — `opbnb`
- opBNB Testnet — `opbnbTestnet`

## Input Parameters

```typescript
{
  txHash: string,   // Transaction hash (0x...)
  network?: string  // Network: bsc, bscTestnet, opbnb, opbnbTestnet
}
```

## Example Usage

```typescript
const skill = getSkill("bsc/bsc-transaction-analyzer");
const result = await skill.execute({
  txHash: "0x1234...",
  network: "bsc",
});
```
