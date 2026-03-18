---
name: News Radar
description: Portfolio-relevant news scoring with sentiment, urgency, and type classification
---

# News Radar

**Skill ID:** `claw-council/news-radar`  
**Used by:** PULSE (Sentiment Analyst), SCOUT (Market Discovery)  
**Version:** 1.0.0

## What It Does

Processes news headlines through NLP-based classification for sentiment, urgency, and type. Scores each headline's relevance to the user's portfolio (0–100), prioritizes items affecting held assets, and flags critical alerts that require immediate attention.

## Classification Pipeline

### Sentiment Detection
- **Bullish:** surge, rally, breakout, ATH, adoption, partnership, launch, listing
- **Bearish:** crash, dump, hack, exploit, rug, scam, ban, regulation, lawsuit
- **Neutral:** all other headlines

### Urgency Levels
| Level | Triggers |
|---|---|
| **Critical** | hack, exploit, rug, emergency, breaking, freeze, suspend |
| **High** | ban, regulation, lawsuit, delist, warning, crash |
| **Medium** | Non-neutral sentiment |
| **Low** | All other headlines |

### Type Classification
Partnership, Listing, Exploit, Regulation, Technical, Community, Market

## Relevance Scoring (0–100)

| Factor | Points |
|---|---|
| Base score | +20 |
| Mentions portfolio holdings | +40 |
| Mentions watchlist tokens | +25 |
| Critical urgency | +25 |
| High urgency | +15 |
| Published < 1 hour ago | +10 |
| Published < 6 hours ago | +5 |

## Output

```typescript
{
  scannedTopics: number,
  filteredToRelevant: number,
  items: NewsItem[],    // sorted by relevance, max 20
  criticalAlerts: number,
  mostUrgentItem?: NewsItem,
  summary: string
}
```

## Portfolio Impact

Each headline includes a `portfolioImpact` string:
- ⚠️ Negative news affecting holdings → "Consider reviewing positions"
- ✅ Positive development for holdings
- Neutral mention → "Monitor for developments"
