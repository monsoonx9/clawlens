import { skillRegistry, getSkill, Skill, SkillResult, SkillContext } from "@/skills";
import { SKILL_INVOCATION_KEYWORDS } from "@/agents/personalAssistant";
import { getIntentClassificationPrompt } from "@/lib/personalAssistant/skillCatalog";
import { callAgentOnce } from "@/lib/llmClient";
import { LLMProvider } from "@/types";

export interface SkillInvocation {
  skillId: string;
  confidence: number;
  params: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Skills that are internal-only (used by Council orchestration, not user-facing)
// ---------------------------------------------------------------------------
const INTERNAL_SKILLS = new Set([
  "claw-council/council-analyzer",
  "claw-council/consensus-detector",
  "claw-council/verdict-synthesizer",
]);

// ---------------------------------------------------------------------------
// Legacy high-confidence keyword overrides (kept for core commands)
// ---------------------------------------------------------------------------
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  portfolio: "claw-council/portfolio-pulse",
  price: "binance/spot",
  analysis: "binance/technical-indicators",
  audit: "claw-council/rug-shield",
  whale: "claw-council/whale-radar",
  market: "binance/crypto-market-rank",
  futures: "binance/futures-data",
  news: "claw-council/news-radar",
  education: "claw-council/onboarding-guide",
  trading: "binance/trading-signal",
  meme: "binance/meme-rush",
  bsc: "bsc/bsc-wallet-tracker",
  bsc_wallet: "bsc/bsc-wallet-tracker",
  bsc_sniper: "bsc/sniper-detector",
  bsc_burn: "bsc/burn-tracker",
  bsc_cluster: "bsc/wallet-cluster",
  bsc_transaction: "bsc/bsc-transaction-analyzer",
  fear: "claw-council/fear-index",
  smart_accumulation: "binance/smart-accumulation",
  taker_pressure: "binance/taker-pressure",
  dca_backtest: "binance/dca-backtester",
  funding_heatmap: "binance/funding-heatmap",
  volume_analysis: "binance/volume-analysis",
  open_interest: "binance/open-interest",
  basis_spread: "binance/basis-spread",
  correlation: "binance/correlation-matrix",
  market_regime: "binance/market-regime",
  market_impact: "binance/market-impact",
  candlestick: "binance/candlestick-patterns",
  whale_footprint: "binance/whale-footprint",
  volatility_rank: "binance/volatility-rank",
  futures_whale: "binance/futures-whale",
};

// ---------------------------------------------------------------------------
// Tokenizer helpers
// ---------------------------------------------------------------------------

/** Split a string into normalized lowercase tokens (words). */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/** Build a keyword set from a Skill's id, name, and description. */
function buildSkillKeywords(skill: Skill): string[] {
  const parts = [
    skill.name,
    skill.id.replace(/[/-]/g, " "), // "bsc/bsc-whale-movement" → "bsc bsc whale movement"
    skill.description,
  ];
  return [...new Set(tokenize(parts.join(" ")))];
}

// ---------------------------------------------------------------------------
// Pre-computed keyword index (built once at module load)
// ---------------------------------------------------------------------------

interface SkillKeywordEntry {
  skill: Skill;
  keywords: string[];
}

const SKILL_INDEX: SkillKeywordEntry[] = [];

for (const [, skill] of skillRegistry) {
  if (INTERNAL_SKILLS.has(skill.id)) continue;
  SKILL_INDEX.push({
    skill,
    keywords: buildSkillKeywords(skill),
  });
}

// ---------------------------------------------------------------------------
// Dynamic Skill Router
// ---------------------------------------------------------------------------

export class SkillRouter {
  private context: {
    hasPortfolio: boolean;
    hasApiKeys: boolean;
  };

  constructor(context?: { hasPortfolio?: boolean; hasApiKeys?: boolean }) {
    this.context = {
      hasPortfolio: context?.hasPortfolio ?? false,
      hasApiKeys: context?.hasApiKeys ?? false,
    };
  }

  /**
   * Analyze user intent against ALL registered skills.
   * 1. First, check for follow-up patterns (repeat last skills)
   * 2. Then, check legacy high-confidence keyword overrides.
   * 3. Then, dynamically score every skill in the registry using token overlap.
   * 4. Deduplicate, sort by confidence, and return top matches.
   *
   * @param userMessage - The user's message
   * @param options - Optional context including prior messages and last invoked skills
   */
  analyzeIntent(
    userMessage: string,
    options?: {
      priorMessages?: Array<{ role: string; content: string }>;
      lastInvokedSkills?: string[];
    },
  ): SkillInvocation[] {
    const messageLower = userMessage.toLowerCase();
    const messageTokens = tokenize(userMessage);
    const invocations = new Map<string, SkillInvocation>();

    // ── Phase 0: Check for follow-up patterns ──
    const followUpPatterns = [
      "do it",
      "do that",
      "yes",
      "yeah",
      "sure",
      "okay",
      "ok",
      "please",
      "option 1",
      "option 2",
      "option 3",
      "option 4",
      "option 5",
      "first option",
      "second option",
      "third option",
      "fourth option",
      "fifth option",
      "the first",
      "the second",
      "the third",
      "the fourth",
      "the fifth",
      "analyze that",
      "tell me more",
      "more details",
      "more info",
      "rebalance",
      "rebalance my portfolio",
      "suggest changes",
      "make changes",
      "what about",
      "how about",
      "what if",
      "also",
      "continue",
      "keep going",
      "go ahead",
      "proceed",
      "apply it",
      "apply that",
      "use that",
      "use it",
      "set it up",
      "do that for me",
      "help me with that",
      "thanks",
      "thank you",
      "thx",
      "cool",
      "got it",
      "great",
      "perfect",
      "awesome",
      "about it",
      "regarding it",
      "same for",
      "and for this one",
      "for this address",
      "what about this",
      "check this one",
      "analyze this",
      "look at this",
      "how's it looking",
      "what do you think",
      "thoughts on",
    ];

    // Semantic follow-up patterns for context preservation
    const semanticFollowUpPatterns = [
      /\b(about|regarding|for)\s+(it|that|this|them)\b/i,
      /\bwhat about\b/i,
      /\bhow about\b/i,
      /\bany?\s+(news|updates|changes)\b/i,
      /\b(also|too|as well)\b/i,
      /\bthe\s+(same|that|this)\b/i,
      /\bhow(?:'s| is) it\b/i,
      /\bcheck\s+(this|that|it)\b/i,
      /\blook\s+(at|into)\b/i,
    ];

    const isSemanticFollowUp = semanticFollowUpPatterns.some((pattern) =>
      pattern.test(messageLower),
    );

    const isFollowUp =
      followUpPatterns.some((pattern) => messageLower.includes(pattern)) || isSemanticFollowUp;

    // If this is a follow-up and we have last invoked skills, repeat them with high confidence
    if (isFollowUp && options?.lastInvokedSkills && options.lastInvokedSkills.length > 0) {
      for (const skillId of options.lastInvokedSkills) {
        const skill = getSkill(skillId);
        if (skill && !INTERNAL_SKILLS.has(skillId)) {
          const params = this.extractParamsFromMessage(userMessage, options);
          // If no symbol found in follow-up, try to get from prior context
          if (!params.symbol && !params.address) {
            const contextEntity = this.extractEntityFromContext(options.priorMessages);
            if (contextEntity.symbol) params.symbol = contextEntity.symbol;
            if (contextEntity.address) params.address = contextEntity.address;
          }
          invocations.set(skillId, {
            skillId,
            confidence: 0.95,
            params,
          });
        }
      }
      // Still continue to check for explicit keywords - they might override
    }

    // ── Phase 1: Legacy keyword overrides (high confidence) ──
    for (const [category, keywords] of Object.entries(SKILL_INVOCATION_KEYWORDS)) {
      const matchedKeywords = keywords.filter((kw) => messageLower.includes(kw));
      if (matchedKeywords.length > 0) {
        // Fix: Give a baseline high confidence (0.85) for ANY direct legacy keyword match,
        // rather than diluting it by dividing by the array length.
        const confidence = Math.min(0.85 + matchedKeywords.length * 0.05, 1.0);
        const skillId = LEGACY_CATEGORY_MAP[category];
        if (skillId && !INTERNAL_SKILLS.has(skillId)) {
          const existing = invocations.get(skillId);
          if (!existing || existing.confidence < confidence) {
            invocations.set(skillId, {
              skillId,
              confidence,
              params: this.extractParams(userMessage, category, options),
            });
          }
        }
      }
    }

    // ── Phase 2: Dynamic TF-IDF scoring against ALL skills ──
    // Only proceed to Phase 2 if we don't already have a very high confidence match
    const highestExistingConfidence = Array.from(invocations.values()).reduce(
      (max, inv) => Math.max(max, inv.confidence),
      0,
    );

    if (highestExistingConfidence < 0.8) {
      for (const entry of SKILL_INDEX) {
        const { skill, keywords } = entry;
        if (invocations.has(skill.id)) continue;

        let matchCount = 0;
        const matchedWords: string[] = [];

        for (const kw of keywords) {
          if (messageTokens.includes(kw) || messageLower.includes(kw)) {
            matchCount++;
            matchedWords.push(kw);
          }
        }

        if (matchCount === 0) continue;

        const baseScore = matchCount / Math.max(keywords.length, 1);
        const multiWordBonus = matchCount >= 3 ? 0.3 : matchCount >= 2 ? 0.15 : 0;
        const confidence = Math.min(baseScore + multiWordBonus, 0.95);

        // STRIKE NOISE: Require at least 25% confidence to invoke a skill blindly
        if (confidence < 0.25) continue;

        invocations.set(skill.id, {
          skillId: skill.id,
          confidence,
          params: this.extractParamsFromMessage(userMessage, options),
        });
      }
    }

    // ── Phase 3: Token-specific skill injection ──
    const tokenMatch = userMessage.match(/([A-Z]{2,10})\s*(?:price|value|info|about|chart)/i);
    if (tokenMatch && !invocations.has("binance/query-token-info")) {
      invocations.set("binance/query-token-info", {
        skillId: "binance/query-token-info",
        confidence: 0.9,
        params: { symbol: tokenMatch[1].toUpperCase() },
      });
    }

    // Sort by confidence descending and filter out anything too far below the top match
    const sorted = Array.from(invocations.values()).sort((a, b) => b.confidence - a.confidence);
    if (sorted.length === 0) return [];

    const topConfidence = sorted[0].confidence;
    // Only keep skills that are within 0.3 confidence of the top pick, to avoid noise
    return sorted.filter((inv) => inv.confidence >= Math.max(0.4, topConfidence - 0.3));
  }

  // =========================================================================
  //  LLM-POWERED INTENT CLASSIFICATION (Phase 1)
  // =========================================================================

  /**
   * Smart intent analysis: tries LLM classification first, falls back to
   * keyword matching if the LLM call fails or times out.
   */
  async analyzeIntentSmart(
    userMessage: string,
    apiKeys: {
      llmProvider?: string;
      llmApiKey?: string;
      llmModel?: string;
      llmBaseUrl?: string;
      llmEndpoint?: string;
      llmDeploymentName?: string;
    },
    options?: {
      priorMessages?: Array<{ role: string; content: string }>;
      lastInvokedSkills?: string[];
    },
  ): Promise<SkillInvocation[]> {
    // Try LLM classification first (with 4-second timeout)
    if (apiKeys.llmApiKey && apiKeys.llmProvider) {
      try {
        const llmResult = await this.classifyIntentWithLLM(
          userMessage,
          apiKeys,
          options?.priorMessages,
        );
        if (llmResult.length > 0) {
          console.log(
            `[SkillRouter] LLM classified intent → ${llmResult.map((r) => r.skillId).join(", ")}`,
          );
          return llmResult;
        }
      } catch (error) {
        console.warn("[SkillRouter] LLM classification failed, falling back to keywords:", error);
      }
    }

    // Fallback to keyword matching
    console.log("[SkillRouter] Using keyword fallback");
    return this.analyzeIntent(userMessage, options);
  }

  /**
   * Makes a fast, structured LLM call to classify the user's intent and
   * select the appropriate skills + parameters.
   */
  private async classifyIntentWithLLM(
    userMessage: string,
    apiKeys: {
      llmProvider?: string;
      llmApiKey?: string;
      llmModel?: string;
      llmBaseUrl?: string;
      llmEndpoint?: string;
      llmDeploymentName?: string;
    },
    priorMessages?: Array<{ role: string; content: string }>,
  ): Promise<SkillInvocation[]> {
    const systemPrompt = getIntentClassificationPrompt();

    // Build user prompt with conversation context
    let userPrompt = `User message: "${userMessage}"`;
    if (priorMessages && priorMessages.length > 0) {
      const recentContext = priorMessages
        .slice(-4)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      userPrompt = `Recent conversation:\n${recentContext}\n\nCurrent user message: "${userMessage}"`;
    }

    const provider = (apiKeys.llmProvider || "openai") as LLMProvider;
    const model = apiKeys.llmModel || "gpt-4o-mini";

    // Race the LLM call against a 4-second timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("LLM classification timed out")), 4000),
    );

    const llmPromise = callAgentOnce(
      systemPrompt,
      userPrompt,
      provider,
      {
        apiKey: apiKeys.llmApiKey || "",
        baseUrl: apiKeys.llmBaseUrl,
        endpoint: apiKeys.llmEndpoint,
        deploymentName: apiKeys.llmDeploymentName,
      },
      model,
      500, // Token budget — increased to accommodate examples + full skill catalog
      true, // Expect JSON response
    );

    const result = await Promise.race([llmPromise, timeoutPromise]);

    if (!result.success || !result.data) {
      return [];
    }

    // Parse the JSON response
    try {
      const raw = result.data.trim();
      // Handle markdown-wrapped JSON
      const jsonStr = raw.startsWith("```")
        ? raw
            .replace(/```json?\n?/g, "")
            .replace(/```/g, "")
            .trim()
        : raw;
      const parsed = JSON.parse(jsonStr);
      const tools = parsed.tools || [];

      if (!Array.isArray(tools) || tools.length === 0) {
        return [];
      }

      // Convert LLM output to SkillInvocation format, validating each skill exists
      const invocations: SkillInvocation[] = [];
      for (const tool of tools.slice(0, 3)) {
        const skill = getSkill(tool.id);
        if (skill) {
          invocations.push({
            skillId: tool.id,
            confidence: 1.0, // LLM classification = max confidence
            params: tool.params || {},
          });
        }
      }

      if (parsed.reasoning) {
        console.log(`[SkillRouter] LLM reasoning: ${parsed.reasoning}`);
      }

      return invocations;
    } catch (parseError) {
      console.warn("[SkillRouter] Failed to parse LLM classification JSON:", parseError);
      return [];
    }
  }

  async executeSkills(
    invocations: SkillInvocation[],
    context: SkillContext,
  ): Promise<{ results: SkillResult[]; skillsUsed: string[]; failedSkills: string[] }> {
    const results: SkillResult[] = [];
    const skillsUsed: string[] = [];
    const failedSkills: string[] = [];

    // Execute top 5 skills max to allow for comprehensive multi-tool answers
    const skillsToExecute = invocations.slice(0, 5);
    const SKILL_TIMEOUT_MS = 15000; // 15 seconds per skill limit

    const executePromises = skillsToExecute.map(async (invocation) => {
      const skill = getSkill(invocation.skillId);
      if (!skill) {
        throw new Error(`Skill not found: ${invocation.skillId}`);
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error(`Skill ${invocation.skillId} timed out after ${SKILL_TIMEOUT_MS}ms`)),
          SKILL_TIMEOUT_MS,
        ),
      );

      const result = await Promise.race([
        skill.execute(invocation.params, context),
        timeoutPromise,
      ]);

      return { skill, result };
    });

    const settledResults = await Promise.allSettled(executePromises);

    settledResults.forEach((settled, index) => {
      const invocation = skillsToExecute[index];
      const skill = getSkill(invocation.skillId);
      const skillName = skill ? skill.name : invocation.skillId;

      if (settled.status === "fulfilled") {
        results.push(settled.value.result);
        skillsUsed.push(settled.value.skill.name);
      } else {
        console.error(`[SkillRouter] Error executing skill ${invocation.skillId}:`, settled.reason);
        failedSkills.push(skillName);
      }
    });

    return { results, skillsUsed, failedSkills };
  }

  getAvailableSkills(): Skill[] {
    return Array.from(skillRegistry.values()).filter((s) => !INTERNAL_SKILLS.has(s.id));
  }

  getSkillCategories(): string[] {
    return Object.keys(SKILL_INVOCATION_KEYWORDS);
  }

  // Extract entity (symbol/address) from conversation context
  private extractEntityFromContext(priorMessages?: Array<{ role: string; content: string }>): {
    symbol?: string;
    address?: string;
  } {
    if (!priorMessages || priorMessages.length === 0) {
      return {};
    }

    const skipWords = new Set([
      "THE",
      "AND",
      "FOR",
      "ARE",
      "BUT",
      "NOT",
      "YOU",
      "ALL",
      "CAN",
      "HER",
      "WAS",
      "ONE",
      "OUR",
      "OUT",
      "DAY",
      "GET",
      "HAS",
      "HIM",
      "HIS",
      "HOW",
      "ITS",
      "MAY",
      "NEW",
      "NOW",
      "OLD",
      "SEE",
      "WAY",
      "WHO",
      "DID",
      "LET",
      "SAY",
      "SHE",
      "TOO",
      "USE",
      "MY",
      "WHAT",
      "SHOW",
      "ME",
      "ABOUT",
      "WHY",
      "IS",
      "IT",
    ]);

    // Search backwards through messages for the last mentioned entity
    for (let i = priorMessages.length - 1; i >= 0; i--) {
      const msg = priorMessages[i];
      if (msg.role !== "user") continue;

      // Try to find address first
      const addressMatch = msg.content.match(/0x[a-fA-F0-9]{40}/);
      if (addressMatch) {
        return { address: addressMatch[0] };
      }

      // Then try symbol
      const pastSymbols = msg.content.match(/\b[A-Z]{2,10}\b/g);
      if (pastSymbols) {
        const filtered = pastSymbols.filter((s) => !skipWords.has(s));
        if (filtered.length > 0) {
          return { symbol: filtered[filtered.length - 1] };
        }
      }
    }

    return {};
  }

  // Legacy category-based param extractor
  private extractParams(
    message: string,
    category: string,
    options?: { priorMessages?: { role: string; content: string }[] },
  ): Record<string, any> {
    const params: Record<string, any> = {};
    const upperSymbols = message.match(/\b[A-Z]{2,10}\b/g);

    if (upperSymbols && ["price", "analysis", "audit", "whale", "trading"].includes(category)) {
      params.symbol = upperSymbols[0];
    } else if (
      options?.priorMessages &&
      ["price", "analysis", "audit", "whale", "trading"].includes(category)
    ) {
      const needsContext = /\b(it|this|that|token|coin)\b/i.test(message);
      if (needsContext) {
        for (let i = options.priorMessages.length - 1; i >= 0; i--) {
          if (options.priorMessages[i].role === "user") {
            const pastSymbols = options.priorMessages[i].content.match(/\b[A-Z]{2,10}\b/g);
            if (pastSymbols) {
              const skipWords = new Set([
                "THE",
                "AND",
                "FOR",
                "ARE",
                "BUT",
                "NOT",
                "YOU",
                "ALL",
                "CAN",
                "WHAT",
                "HOW",
                "WHY",
              ]);
              const filtered = pastSymbols.filter((s) => !skipWords.has(s));
              if (filtered.length > 0) {
                params.symbol = filtered[filtered.length - 1]; // Take the last mentioned symbol
                break;
              }
            }
          }
        }
      }
    }

    const numbers = message.match(/\$?(\d+(?:\.\d+)?)/g);
    if (numbers) {
      params.amount = parseFloat(numbers[0].replace("$", ""));
    }

    return params;
  }

  // Universal param extractor for dynamic skills
  private extractParamsFromMessage(
    message: string,
    options?: { priorMessages?: { role: string; content: string }[] },
  ): Record<string, any> {
    const params: Record<string, any> = {};

    const skipWords = new Set([
      "THE",
      "AND",
      "FOR",
      "ARE",
      "BUT",
      "NOT",
      "YOU",
      "ALL",
      "CAN",
      "HER",
      "WAS",
      "ONE",
      "OUR",
      "OUT",
      "DAY",
      "GET",
      "HAS",
      "HIM",
      "HIS",
      "HOW",
      "ITS",
      "MAY",
      "NEW",
      "NOW",
      "OLD",
      "SEE",
      "WAY",
      "WHO",
      "DID",
      "LET",
      "SAY",
      "SHE",
      "TOO",
      "USE",
      "MY",
      "WHAT",
      "SHOW",
      "ME",
      "ABOUT",
      "WHY",
      "IS",
      "IT",
    ]);

    // Extract token symbols (uppercase 2-10 letter words)
    const upperSymbols = message.match(/\b[A-Z]{2,10}\b/g);
    let foundSymbol = false;

    if (upperSymbols) {
      const symbols = upperSymbols.filter((s) => !skipWords.has(s));
      if (symbols.length > 0) {
        params.symbol = symbols[0];
        if (symbols.length > 1) params.symbols = symbols;
        foundSymbol = true;
      }
    }

    // Try to extract from previous context if we refer to it with pronouns
    if (!foundSymbol && options?.priorMessages && options.priorMessages.length > 0) {
      const needsContext = /\b(it|this|that|he|she|they|token|coin)\b/i.test(message);
      if (needsContext) {
        for (let i = options.priorMessages.length - 1; i >= 0; i--) {
          if (options.priorMessages[i].role === "user") {
            const pastSymbols = options.priorMessages[i].content.match(/\b[A-Z]{2,10}\b/g);
            if (pastSymbols) {
              const filtered = pastSymbols.filter((s) => !skipWords.has(s));
              if (filtered.length > 0) {
                params.symbol = filtered[filtered.length - 1]; // Take the last mentioned symbol
                foundSymbol = true;
                break;
              }
            }
          }
        }
      }
    }

    // Extract wallet/contract addresses (0x...)
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch) {
      params.address = addressMatch[0];
    }

    // Extract numeric amounts
    const numbers = message.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)/g);
    if (numbers) {
      params.amount = parseFloat(numbers[0].replace(/[$,]/g, ""));
    }

    return params;
  }
}

export const skillRouter = new SkillRouter();

export function createSkillRouter(context?: {
  hasPortfolio?: boolean;
  hasApiKeys?: boolean;
}): SkillRouter {
  return new SkillRouter(context);
}
