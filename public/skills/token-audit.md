---
name: Token Audit
description: Official Binance token security audit - detect honeypots, trading taxes, and contract risks
---

# Token Audit

**Skill ID:** `binance/query-token-audit`  
**Used by:** THE WARDEN  
**Version:** 1.4.0

## What It Does

Performs official Binance security audit on any token contract. Detects honeypots, scam patterns, malicious functions, and returns risk level with detailed security checks.

## Binance Web3 API Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `POST /bapi/defi/v1/.../security/token/audit` | Security audit | ❌ Public |

## Supported Chains

- BSC (chainId: 56)
- Base (chainId: 8453)
- Solana (chainId: CT_501)
- Ethereum (chainId: 1)

## Input Parameters

```typescript
{
  contractAddress: string,  // Token contract to audit
  chain: 'bsc' | 'base' | 'solana' | 'ethereum'
}
```

## Output

```typescript
{
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN',
  riskScore: number,        // 0-5
  buyTax: string | null,
  sellTax: string | null,
  isVerified: boolean,
  riskChecks: [
    {
      category: string,
      checks: [{ title, description, isRisky, severity }]
    }
  ]
}
```
