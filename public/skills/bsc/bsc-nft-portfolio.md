---
name: BSC NFT Portfolio
description: Get information about any NFT on BSC including token URI, metadata, and owner
---

# BSC NFT Portfolio

**Skill ID:** `bsc/bsc-nft-portfolio`  
**Version:** 1.0.0

## What It Does

Retrieves information about ERC721 NFTs on BSC:

- Token URI (metadata location)
- Current owner address

## Supported Networks

- BSC (BNB Smart Chain) — `bsc`
- BSC Testnet — `bscTestnet`
- opBNB — `opbnb`
- opBNB Testnet — `opbnbTestnet`

## Input Parameters

```typescript
{
  collectionAddress: string,  // NFT collection contract address (0x...)
  tokenId: string,           // NFT token ID
  network?: string          // Network: bsc, bscTestnet, opbnb, opbnbTestnet
}
```

## Example Usage

```typescript
const skill = getSkill("bsc/bsc-nft-portfolio");
const result = await skill.execute({
  collectionAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", // BAYC
  tokenId: "1",
  network: "bsc",
});
```
