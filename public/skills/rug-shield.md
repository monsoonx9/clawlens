---
name: Rug Shield
description: 6-source token security audit with creator wallet profiling and risk scoring
---

# Rug Shield

**Skill ID:** `claw-council/rug-shield`  
**Used by:** THE WARDEN (Risk Officer)  
**Version:** 1.0.0

## What It Does

Conducts a comprehensive token security audit across 8 risk factors and 3 safety factors. Evaluates honeypot risk, holder concentration, liquidity depth, contract permissions, mintability, pausability, freshness (meme-rush status), and creator wallet history. Produces a CLEAR / YELLOW_FLAG / RED_FLAG verdict with actionable recommendations.

## Risk Factors (Max Points)

| Factor | Max Points | Severity | Trigger |
|---|---|---|---|
| Honeypot detection | 35 | CRITICAL | Token can't be sold |
| Holder concentration | 20 | CRITICAL | Top 10 holders > 60% |
| Liquidity depth | 15 | HIGH | < $10,000 liquidity |
| Holder count | 10 | HIGH | < 100 holders |
| Contract permissions | 25 | CRITICAL | ≥3 dangerous permissions |
| Mintability | 15 | CRITICAL | Unrenounced mint authority |
| Pausable | 10 | HIGH | Owner can freeze transfers |
| Meme-rush freshness | 10 | MEDIUM | Newly launched token |
| Creator history | 20 | CRITICAL | Known rugger pattern |

## Safety Factors (Negative Points)

| Factor | Points | Trigger |
|---|---|---|
| Smart money buying | -10 | Institutional wallets accumulating |
| Binance listed | -15 | Passed Binance due diligence |
| Wide distribution | -5 | >10,000 holders |

## Verdicts

| Score | Verdict | Recommendation |
|---|---|---|
| 0–20 | ✅ **CLEAR** | Proceed with normal position sizing |
| 21–55 | ⚠️ **YELLOW_FLAG** | Extreme caution, <2% position, tight stops |
| 56–100 | 🚩 **RED_FLAG** | STRONGLY AVOID |

## Creator Wallet Profiling

Analyzes the deployer wallet's history:
- **Clean:** No suspicious patterns
- **Suspicious:** 5+ deployments with avg liquidity < $50k
- **Known Rugger:** 10+ low-liquidity deployments
