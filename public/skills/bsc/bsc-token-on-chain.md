---
name: BSC Token On-Chain
description: Get on-chain information about any ERC20 token on BSC including name, symbol, decimals, and supply
---

# BSC Token On-Chain

**Skill ID:** `bsc/bsc-token-on-chain`  
**Version:** 1.0.0

## What It Does

Retrieves on-chain information about ERC20 tokens on BSC:

- Token name
- Token symbol
- Decimals
- Total supply

## Supported Networks

- BSC (BNB Smart Chain) — `bsc`
- BSC Testnet — `bscTestnet`
- opBNB — `opbnb`
- opBNB Testnet — `opbnbTestnet`

## Input Parameters

```typescript
{
  tokenAddress: string,  // ERC20 token contract address (0x...)
  network?: string      // Network: bsc, bscTestnet, opbnb, opbnbTestnet
}
```

## Example Usage

```typescript
const skill = getSkill("bsc/bsc-token-on-chain");
const result = await skill.execute({
  tokenAddress: "0x55d398326f99059fF775485246999027B3197955", // USDT
  network: "bsc",
});
```
