---
name: Onboarding Guide
description: Adaptive educational content with topic classification and live portfolio personalization
---

# Onboarding Guide

**Skill ID:** `claw-council/onboarding-guide`  
**Used by:** SAGE (Education Specialist)  
**Version:** 1.0.0

## What It Does

Generates educational content tailored to the user's skill level and personalized with their live Binance portfolio data. Classifies user questions into specific crypto topics, detects complexity level, provides curated explanations with analogies, and links to relevant Binance features.

## Binance API Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /api/v3/ticker/24hr` | Live price data for personal examples | ❌ Public |

## Topic Classification

Recognizes 35+ crypto topics across 3 levels:

| Level | Example Topics |
|---|---|
| **Beginner** | DCA, Market Orders, Limit Orders, Staking, Gas Fees, Wallet Security, Portfolio Management |
| **Intermediate** | Stop-Loss Orders, OCO Orders, RSI, Chart Reading, Rug Pull Prevention, Whale Watching, Risk Management |
| **Advanced** | Leverage, Margin, Futures, Impermanent Loss, MACD, Bollinger Bands, Binance API |

## Educational Content Structure

Each response includes:
1. **Core Concept** — what it is in plain language
2. **How It Works** — step-by-step mechanics
3. **Why It Matters** — relevance to the user's trading
4. **Common Mistake** — #1 pitfall to avoid
5. **Personal Example** — generated from user's live portfolio data (if available)
6. **Analogy** — real-world comparison for intuitive understanding
7. **Key Terms** — glossary of related terminology
8. **Binance Feature** — specific Binance tool with link
9. **Follow-up Questions** — suggested next topics

## Portfolio Personalization

When portfolio data is available, examples are generated using the user's actual holdings:
- DCA → references their largest holding's current vs. avg buy price
- Stop-Loss → calculates exact trigger price for their biggest position
- Portfolio Management → shows their concentration and asset count

## Output

```typescript
{
  topic: string,
  detectedLevel: 'beginner' | 'intermediate' | 'advanced',
  explanation: {
    coreConcept: string,
    howItWorks: string,
    whyItMatters: string,
    commonMistake: string,
    personalExample?: string,
    binanceFeature?: string,
    binanceFeatureLink?: string
  },
  analogyUsed: string,
  keyTerms: Array<{ term: string, definition: string }>,
  followUpQuestions: string[],
  relatedTopics: string[]
}
```
