import { skillRegistry, getSkill, Skill, SkillResult, SkillContext } from "@/skills";
import { SKILL_INVOCATION_KEYWORDS } from "@/agents/personalAssistant";

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
   * 1. First, check legacy high-confidence keyword overrides.
   * 2. Then, dynamically score every skill in the registry using token overlap.
   * 3. Deduplicate, sort by confidence, and return top matches.
   */
  analyzeIntent(userMessage: string): SkillInvocation[] {
    const messageLower = userMessage.toLowerCase();
    const messageTokens = tokenize(userMessage);
    const invocations = new Map<string, SkillInvocation>();

    // ── Phase 1: Legacy keyword overrides (high confidence) ──
    for (const [category, keywords] of Object.entries(SKILL_INVOCATION_KEYWORDS)) {
      const matchedKeywords = keywords.filter((kw) => messageLower.includes(kw));
      if (matchedKeywords.length > 0) {
        const confidence = Math.min(matchedKeywords.length / keywords.length + 0.3, 1.0);
        const skillId = LEGACY_CATEGORY_MAP[category];
        if (skillId && !INTERNAL_SKILLS.has(skillId)) {
          const existing = invocations.get(skillId);
          if (!existing || existing.confidence < confidence) {
            invocations.set(skillId, {
              skillId,
              confidence,
              params: this.extractParams(userMessage, category),
            });
          }
        }
      }
    }

    // ── Phase 2: Dynamic TF-IDF scoring against ALL skills ──
    for (const entry of SKILL_INDEX) {
      const { skill, keywords } = entry;
      if (invocations.has(skill.id)) continue; // already matched with higher confidence

      // Count how many of the skill's keywords appear in the user's message
      let matchCount = 0;
      const matchedWords: string[] = [];

      for (const kw of keywords) {
        // Check both full-word token match AND substring match for compound terms
        if (messageTokens.includes(kw) || messageLower.includes(kw)) {
          matchCount++;
          matchedWords.push(kw);
        }
      }

      if (matchCount === 0) continue;

      // Confidence = ratio of matched keywords, with a bonus for multi-word matches
      const baseScore = matchCount / Math.max(keywords.length, 1);
      const multiWordBonus = matchCount >= 3 ? 0.15 : matchCount >= 2 ? 0.1 : 0;
      const confidence = Math.min(baseScore + multiWordBonus, 0.95);

      // Require at least ~10% keyword overlap to avoid false positives
      if (confidence < 0.05) continue;

      invocations.set(skill.id, {
        skillId: skill.id,
        confidence,
        params: this.extractParamsFromMessage(userMessage),
      });
    }

    // ── Phase 3: Token-specific skill injection ──
    const tokenMatch = userMessage.match(/([A-Z]{2,10})\s*(?:price|value|info|about)/i);
    if (tokenMatch && !invocations.has("binance/query-token-info")) {
      invocations.set("binance/query-token-info", {
        skillId: "binance/query-token-info",
        confidence: 0.9,
        params: { symbol: tokenMatch[1].toUpperCase() },
      });
    }

    // Sort by confidence descending and return
    return Array.from(invocations.values()).sort((a, b) => b.confidence - a.confidence);
  }

  async executeSkills(
    invocations: SkillInvocation[],
    context: SkillContext,
  ): Promise<{ results: SkillResult[]; skillsUsed: string[] }> {
    const results: SkillResult[] = [];
    const skillsUsed: string[] = [];

    // Execute top 5 skills max (up from 3) to cover more ground
    const skillsToExecute = invocations.slice(0, 5);

    const SKILL_TIMEOUT_MS = 12000; // 12 seconds per skill

    for (const invocation of skillsToExecute) {
      try {
        const skill = getSkill(invocation.skillId);
        if (skill) {
          const timeoutPromise = new Promise<SkillResult>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Skill ${invocation.skillId} timed out`)),
              SKILL_TIMEOUT_MS,
            ),
          );
          const result = await Promise.race([
            skill.execute(invocation.params, context),
            timeoutPromise,
          ]);
          results.push(result);
          skillsUsed.push(skill.name);
        }
      } catch (error) {
        console.error(`[SkillRouter] Error executing skill ${invocation.skillId}:`, error);
      }
    }

    return { results, skillsUsed };
  }

  getAvailableSkills(): Skill[] {
    return Array.from(skillRegistry.values()).filter((s) => !INTERNAL_SKILLS.has(s.id));
  }

  getSkillCategories(): string[] {
    return Object.keys(SKILL_INVOCATION_KEYWORDS);
  }

  // Legacy category-based param extractor
  private extractParams(message: string, category: string): Record<string, any> {
    const params: Record<string, any> = {};
    const upperSymbols = message.match(/\b[A-Z]{2,10}\b/g);
    if (upperSymbols && ["price", "analysis", "audit", "whale", "trading"].includes(category)) {
      params.symbol = upperSymbols[0];
    }

    const numbers = message.match(/\$?(\d+(?:\.\d+)?)/g);
    if (numbers) {
      params.amount = parseFloat(numbers[0].replace("$", ""));
    }

    return params;
  }

  // Universal param extractor for dynamic skills
  private extractParamsFromMessage(message: string): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract token symbols (uppercase 2-10 letter words)
    const upperSymbols = message.match(/\b[A-Z]{2,10}\b/g);
    if (upperSymbols) {
      // Filter out common English words that happen to be uppercase
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
      ]);
      const symbols = upperSymbols.filter((s) => !skipWords.has(s));
      if (symbols.length > 0) {
        params.symbol = symbols[0];
        if (symbols.length > 1) params.symbols = symbols;
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
