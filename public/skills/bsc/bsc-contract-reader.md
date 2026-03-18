---
name: BSC Contract Reader
description: Read data from any BSC smart contract by calling view functions, or check if address is a contract
---

# BSC Contract Reader

**Skill ID:** `bsc/bsc-contract-reader`  
**Version:** 1.0.0

## What It Does

- **Read contract**: Call view/pure functions on any BSC smart contract
- **Check contract**: Determine if an address is a smart contract or EOA

## Supported Networks

- BSC (BNB Smart Chain) — `bsc`
- BSC Testnet — `bscTestnet`
- opBNB — `opbnb`
- opBNB Testnet — `opbnbTestnet`

## Input Parameters

```typescript
{
  contractAddress: string,  // Smart contract address (0x...)
  functionName?: string,   // Function to call (required if not checking contract)
  abi?: any[],           // Contract ABI (required if calling function)
  args?: any[]           // Function arguments
  checkContract?: boolean // Just check if address is contract (no function call)
  network?: string       // Network: bsc, bscTestnet, opbnb, opbnbTestnet
}
```

## Example Usage

```typescript
// Check if address is contract
const skill = getSkill("bsc/bsc-contract-reader");
const result = await skill.execute({
  contractAddress: "0x1234...",
  checkContract: true,
  network: "bsc",
});
```
