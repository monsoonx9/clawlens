import { Skill, SkillContext, SkillResult } from "./types";
import { NewsRadarResult, NewsItem } from "@/types";
import { callAgentOnce, getDefaultModel } from "@/lib/llmClient";
import { LLMProvider } from "@/types";

// ---------------------------------------------------------------------------
// News Radar Skill — Real news from CryptoPanic + classification
// ---------------------------------------------------------------------------

interface NewsRadarInput {
  topics: string[];
  portfolioSymbols?: string[];
  watchlistSymbols?: string[];
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  llmModel?: string;
}

interface RawHeadline {
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  relatedSymbols?: string[];
}

function classifySentiment(headline: string): "Bullish" | "Bearish" | "Neutral" {
  const lower = headline.toLowerCase();
  const bullish =
    /(surge|rally|bull|breakout|ath|adoption|partnership|launch|listing|soar|pumping|green|gain|growth|upgrade)/;
  const bearish =
    /(crash|dump|hack|exploit|rug|scam|ban|regulation|lawsuit|plunge|loss|red|bear|selloff|warning)/;
  if (bullish.test(lower)) return "Bullish";
  if (bearish.test(lower)) return "Bearish";
  return "Neutral";
}

function classifyUrgency(
  headline: string,
  sentiment: string,
): "Low" | "Medium" | "High" | "Critical" {
  const lower = headline.toLowerCase();
  if (/(hack|exploit|rug|emergency|critical|breaking|freeze|suspend)/.test(lower))
    return "Critical";
  if (/(ban|regulation|lawsuit|delist|warning|crash)/.test(lower)) return "High";
  if (sentiment !== "Neutral") return "Medium";
  return "Low";
}

function classifyType(headline: string): NewsItem["type"] {
  const lower = headline.toLowerCase();
  if (/(partner|integrat|collab)/.test(lower)) return "Partnership";
  if (/(list|delist|exchange)/.test(lower)) return "Listing";
  if (/(hack|exploit|vulnerability|breach)/.test(lower)) return "Exploit";
  if (/(regulat|sec|ban|law|complian)/.test(lower)) return "Regulation";
  if (/(upgrade|fork|update|deploy|chain)/.test(lower)) return "Technical";
  if (/(community|vote|governance|dao)/.test(lower)) return "Community";
  return "Market";
}

async function fetchRealCryptoNews(
  topics: string[],
): Promise<{ headlines: RawHeadline[]; isFallback: boolean }> {
  const results: RawHeadline[] = [];

  // Build currency filter from topics (CryptoPanic uses currency codes)
  const currencies = topics
    .map((t) => t.toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((t) => t.length >= 2 && t.length <= 10)
    .slice(0, 3)
    .join(",");

  // Try CryptoPanic API first
  let url = "https://cryptopanic.com/api/free/v1/posts/?kind=news";
  if (currencies) {
    url = `https://cryptopanic.com/api/free/v1/posts/?currencies=${currencies}&kind=news`;
  }

  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.results && Array.isArray(data.results)) {
        const mapped = data.results.slice(0, 20).map((item: Record<string, unknown>) => {
          // Determine sentiment from votes
          const votes = item.votes as Record<string, number> | undefined;
          const positive = votes?.positive || 0;
          const negative = votes?.negative || 0;
          let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
          if (positive > negative) sentiment = "bullish";
          else if (negative > positive) sentiment = "bearish";

          return {
            headline: String(item.title || ""),
            source: String((item.source as Record<string, unknown>)?.title || "CryptoPanic"),
            publishedAt: String(item.published_at || new Date().toISOString()),
            url: String(item.url || ""),
            sentiment,
          };
        });
        return { headlines: mapped, isFallback: false };
      }
    }
  } catch (error) {
    console.error("CryptoPanic fetch failed:", error);
  }

  // Return empty if failed - will trigger LLM fallback
  return { headlines: [], isFallback: true };
}

async function fetchHeadlinesFromLLM(
  topics: string[],
  provider: LLMProvider,
  apiKey: string,
  model: string,
): Promise<RawHeadline[]> {
  const topicsStr = topics.join(", ");
  const systemPrompt = `You are a crypto news research assistant. Your job is to search for recent news headlines related to the given topics. 
Return a JSON array of objects with these exact fields:
- headline: string (the news headline, max 200 chars)
- source: string (news source name like "CoinDesk", "Bloomberg", "Cointelegraph", etc.)
- url: string (the article URL)
- publishedAt: ISO date string (like "2024-01-15T10:30:00Z")
- relatedSymbols: array of strings (crypto ticker symbols mentioned, e.g. ["BTC", "ETH"])

Return ONLY valid JSON array. No explanation, no markdown. Maximum 15 headlines.`;

  const userMessage = `Search for the latest crypto news about: ${topicsStr}. Focus on news from the last 24-48 hours. Include any mentioned token symbols.`;

  try {
    const res = await callAgentOnce(
      systemPrompt,
      userMessage,
      provider,
      { apiKey },
      model,
      2000,
      true,
    );

    if (!res.success || !res.data) {
      console.error("Failed to fetch headlines from LLM:", res.error);
      return [];
    }
    const parsed = JSON.parse(res.data);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 15);
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch headlines from LLM:", error);
    return [];
  }
}

export const newsRadar: Skill = {
  id: "claw-council/news-radar",
  name: "News Radar",
  namespace: "claw-council",
  version: "1.2.0",
  description:
    "Scores and classifies news headlines for relevance to the user's portfolio. " +
    "Each headline is automatically tagged with sentiment, urgency, type, and relevance " +
    "score. Headlines matching portfolio holdings are prioritized. Returns sorted list " +
    "with critical alerts flagged separately.",
  inputSchema: {
    topics: {
      type: "array",
      required: true,
      description: "Topics/tokens to search news for",
    },
    portfolioSymbols: {
      type: "array",
      required: false,
      description: "Symbols the user holds",
    },
    watchlistSymbols: {
      type: "array",
      required: false,
      description: "Symbols on watchlist",
    },
  },

  async execute(input: Record<string, unknown>, context: SkillContext): Promise<SkillResult> {
    try {
      const rawInput = input as unknown as NewsRadarInput;
      const topics = rawInput.topics || [];
      const portfolioSymbols = new Set(
        (rawInput.portfolioSymbols || context.portfolio?.assets.map((a) => a.symbol) || []).map(
          (s: string) => s.toUpperCase(),
        ),
      );
      const watchlistSymbols = new Set(
        (rawInput.watchlistSymbols || []).map((s: string) => s.toUpperCase()),
      );

      // Get LLM credentials from context
      const llmProvider = (rawInput.llmProvider ||
        context.apiKeys.llmProvider ||
        "openai") as LLMProvider;
      const llmApiKey = rawInput.llmApiKey || context.apiKeys.llmApiKey || "";
      const llmModel =
        rawInput.llmModel || context.apiKeys.llmModel || getDefaultModel(llmProvider);

      // Fetch real news from CryptoPanic
      let headlines: RawHeadline[] = [];
      let isFallback = false;
      let fallbackNote = "";

      if (topics.length > 0) {
        const cryptoPanicResult = await fetchRealCryptoNews(topics);
        headlines = cryptoPanicResult.headlines;
        isFallback = cryptoPanicResult.isFallback;

        // If CryptoPanic returned no results, try LLM as fallback
        if (headlines.length === 0 && llmApiKey) {
          headlines = await fetchHeadlinesFromLLM(topics, llmProvider, llmApiKey, llmModel);
          isFallback = true;
          fallbackNote =
            "[Note: Live news unavailable. LLM knowledge used as fallback — may not reflect current events]";
        }
      }

      if (headlines.length === 0) {
        return {
          success: true,
          data: {
            items: [],
            summary: "No headlines found for the given topics.",
          } as unknown as Record<string, unknown>,
          summary: "No news headlines found. Try different topics.",
        };
      }

      const items: NewsItem[] = headlines.map((h) => {
        // Use CryptoPanic sentiment or classify if LLM fallback
        let sentiment: "Bullish" | "Bearish" | "Neutral";
        if ("sentiment" in h && h.sentiment) {
          const s = h.sentiment as string;
          sentiment = s === "bullish" ? "Bullish" : s === "bearish" ? "Bearish" : "Neutral";
        } else {
          sentiment = classifySentiment(h.headline);
        }

        const urgency = classifyUrgency(h.headline, sentiment);
        const type = classifyType(h.headline);
        const relatedSymbols = h.relatedSymbols || [];

        // Relevance scoring (0-100)
        let relevanceScore = 20; // base

        // Does it mention portfolio holdings?
        const matchesPortfolio = relatedSymbols.some((s) => portfolioSymbols.has(s.toUpperCase()));
        const matchesWatchlist = relatedSymbols.some((s) => watchlistSymbols.has(s.toUpperCase()));
        if (matchesPortfolio) relevanceScore += 40;
        if (matchesWatchlist) relevanceScore += 25;

        // Urgency boost
        if (urgency === "Critical") relevanceScore += 25;
        else if (urgency === "High") relevanceScore += 15;
        else if (urgency === "Medium") relevanceScore += 5;

        // Recency boost
        const ageMs = Date.now() - new Date(h.publishedAt).getTime();
        const ageHours = ageMs / 3600000;
        if (ageHours < 1) relevanceScore += 10;
        else if (ageHours < 6) relevanceScore += 5;

        relevanceScore = Math.min(100, relevanceScore);

        // Portfolio impact
        let portfolioImpact = "No direct portfolio impact.";
        if (matchesPortfolio) {
          if (sentiment === "Bearish" && urgency !== "Low") {
            portfolioImpact = `⚠️ Negative news affecting your holdings (${relatedSymbols.join(", ")}). Consider reviewing positions.`;
          } else if (sentiment === "Bullish") {
            portfolioImpact = `✅ Positive development for your holdings (${relatedSymbols.join(", ")}).`;
          } else {
            portfolioImpact = `Your holdings (${relatedSymbols.join(", ")}) are mentioned — monitor for developments.`;
          }
        }

        const actionRequired =
          (urgency === "Critical" && matchesPortfolio) ||
          (urgency === "Critical" && sentiment === "Bearish");

        return {
          headline: h.headline,
          source: h.source,
          url: h.url,
          publishedAt: new Date(h.publishedAt),
          relatedSymbols,
          sentiment,
          urgency,
          type,
          relevanceScore,
          portfolioImpact,
          actionRequired,
        };
      });

      // Sort by relevance
      items.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Keep only top 20
      const filteredItems = items.slice(0, 20);
      const criticalAlerts = filteredItems.filter((i) => i.urgency === "Critical").length;
      const mostUrgentItem =
        filteredItems.find((i) => i.urgency === "Critical") || filteredItems[0];

      const summary =
        criticalAlerts > 0
          ? `🚨 ${criticalAlerts} critical alert(s)! Most urgent: "${mostUrgentItem?.headline}". ` +
            `${filteredItems.length} relevant items from ${headlines.length} total scanned.${fallbackNote ? " " + fallbackNote : ""}`
          : `${filteredItems.length} relevant news items found. ` +
            `${filteredItems.filter((i) => i.sentiment === "Bullish").length} bullish, ` +
            `${filteredItems.filter((i) => i.sentiment === "Bearish").length} bearish. ` +
            "No critical alerts." +
            (fallbackNote ? ` ${fallbackNote}` : "");

      const result: NewsRadarResult = {
        scannedTopics: headlines.length,
        totalNewsFound: headlines.length,
        filteredToRelevant: filteredItems.length,
        items: filteredItems,
        criticalAlerts,
        summary,
        mostUrgentItem,
      };

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to process news feed" },
        summary: "News data unavailable. Check your API keys or try again later.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
