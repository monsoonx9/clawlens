import { AgentName, APIKeys, PortfolioSnapshot, UserPreferences, ArbitersVerdict } from "@/types";
import { getSystemPrompt, AGENT_CONFIGS } from "@/agents/agentPrompts";
import {
  streamAgentResponse,
  buildUserContext,
  getDefaultModel,
  optimizePromptForProvider,
  callAgentOnce,
} from "@/lib/llmClient";
import { LLMProvider } from "@/types";
import { getSkill, SkillContext, SKILL_INSTANCES } from "@/skills";
import { councilAnalyzer } from "@/skills/councilAnalyzer";
import { consensusDetector } from "@/skills/consensusDetector";
import { verdictSynthesizer } from "@/skills/verdictSynthesizer";
import { getTicker24hr } from "@/lib/binanceClient";
import { cryptoMarketRank } from "@/skills/cryptoMarketRank";
import { memeRush } from "@/skills/memeRush";
import { tokenAudit } from "@/skills/tokenAudit";
import { tokenInfo } from "@/skills/tokenInfo";
import { tradingSignal } from "@/skills/tradingSignal";
import { addressInfo } from "@/skills/addressInfo";
import { technicalIndicators } from "@/skills/technicalIndicators";
import { orderBookAnalysis } from "@/skills/orderBookAnalysis";
import { volumeAnalysis } from "@/skills/volumeAnalysis";
import { exchangeStats } from "@/skills/exchangeStats";
import { priceAlerts } from "@/skills/priceAlerts";
import { futuresData } from "@/skills/futuresData";
import { bscWalletTracker } from "@/skills/bsc/bscWalletTracker";
import { bscTransactionAnalyzer } from "@/skills/bsc/bscTransactionAnalyzer";
import { bscBlockExplorer } from "@/skills/bsc/bscBlockExplorer";
import { bscTokenOnChain } from "@/skills/bsc/bscTokenOnChain";
import { burnTracker } from "@/skills/bsc/bscBurnTracker";

// Skill timeout helper - prevents skills from hanging indefinitely
const SKILL_TIMEOUT_MS = 15000; // 15 seconds per skill

async function withSkillTimeout<T>(promise: Promise<T>, skillName: string): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`[${skillName}] Skill timed out after ${SKILL_TIMEOUT_MS}ms`)),
      SKILL_TIMEOUT_MS,
    ),
  );
  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    console.warn(`Skill ${skillName} failed or timed out:`, error);
    throw error;
  }
}
import { bscWhaleMovement } from "@/skills/bsc/bscWhaleMovement";
import { bscContractReader } from "@/skills/bsc/bscContractReader";
import { bscNftPortfolio } from "@/skills/bsc/bscNftPortfolio";
import { sniperDetector } from "@/skills/bsc/bscSniperDetector";
import { walletCluster } from "@/skills/bsc/bscWalletCluster";
import {
  fundingHeatmap,
  fundingExtremes,
  fundingHistory,
  takerPressure,
  oiSurge,
  volatilityRank,
  smartAccumulation,
  smartMoneyRadar,
  whaleFootprint,
  marketImpact,
  dcaBacktester,
  basisSpread,
  patterns,
  correlation,
  regime,
} from "@/skills/futures";
import { institutionalFlow } from "@/skills/institutionalFlow";

const CONSENSUS_THRESHOLD = 75;

interface ConsensusCheckResult {
  hasConsensus: boolean;
  agreement: number;
  direction?: "positive" | "negative";
  message: string;
}

async function checkForConsensus(
  collectedReports: string[],
  skillContext: SkillContext,
): Promise<ConsensusCheckResult> {
  const agentNames: string[] = [];
  const agentReports: string[] = [];

  collectedReports.forEach((report) => {
    const match = report.match(
      /\[Round \d+\] (SCOUT|THE_WARDEN|LENS|SHADOW|LEDGER|PULSE|SAGE|QUILL|FUTURES|BLAZE):/,
    );
    if (match) {
      const agentId = match[1];
      if (!agentNames.includes(agentId)) {
        agentNames.push(agentId);
        const reportContent = report.replace(/\[Round \d+\] \w+:/, "").trim();
        agentReports.push(reportContent);
      }
    }
  });

  if (agentNames.length < 2) {
    return { hasConsensus: false, agreement: 0, message: "Need at least 2 agents for consensus" };
  }

  try {
    const consensusResult = await consensusDetector.execute(
      { agentReports, agentNames },
      skillContext,
    );

    if (!consensusResult.success) {
      return { hasConsensus: false, agreement: 0, message: "Consensus detection failed" };
    }

    const data = consensusResult.data as {
      consensus: { agreement: number; consensusDirection?: "positive" | "negative"; type: string };
    };
    const agreement = data.consensus?.agreement || 0;
    const direction = data.consensus?.consensusDirection;

    if (agreement >= CONSENSUS_THRESHOLD) {
      return {
        hasConsensus: true,
        agreement,
        direction,
        message: `Consensus reached: ${agreement}% agreement (${data.consensus?.type})`,
      };
    }

    return {
      hasConsensus: false,
      agreement,
      direction,
      message: `No consensus yet: ${agreement}% agreement (${data.consensus?.type})`,
    };
  } catch {
    return { hasConsensus: false, agreement: 0, message: "Error checking consensus" };
  }
}

// ---------------------------------------------------------------------------
// 2. Query Complexity Detection
// ---------------------------------------------------------------------------

export function isSimpleQuery(query: string): boolean {
  const lower = query.toLowerCase();

  const simplePatterns = [
    /^(what is|what's) (the )?price of/i,
    /^(how much|what's) .* (worth|cost)/i,
    /^(what|how) .* (volume|change|rank)/i,
    /^(what|which) .* (top|best|winning|trending)/i,
    /^(show|get|give me|list) .* (price|info|data|stats)/i,
    /^(is|can|should) .*\?$/i,
  ];

  if (simplePatterns.some((p) => p.test(lower))) {
    return true;
  }

  const complexKeywords = [
    "analyze",
    "analysis",
    "compare",
    "versus",
    "vs ",
    "strategy",
    "strategies",
    "plan",
    "planning",
    "recommend",
    "recommendation",
    "advice",
    "predict",
    "prediction",
    "forecast",
    "portfolio",
    "allocation",
    "rebalance",
    "dca",
    "dollar cost",
    "accumulate",
    "risk",
    "risky",
    "security",
    "audit",
    "rug",
    "pattern",
    "patterns",
    "behavior",
    "behavioral",
    "history",
    "performance",
    "grade",
    "sentiment",
    "narrative",
    "fear",
    "greed",
    "whale",
    "whales",
    "smart money",
    "accumulation",
    "technical",
    "indicator",
    "rsi",
    "macd",
    "consensus",
    "verdict",
    "arbiter",
  ];

  const complexCount = complexKeywords.filter((kw) => lower.includes(kw)).length;
  return complexCount === 0;
}

export type QueryComplexity = "simple" | "moderate" | "complex";

export function calculateQueryComplexity(query: string): {
  rounds: number;
  complexity: QueryComplexity;
} {
  const lower = query.toLowerCase();

  const simplePatterns = [
    /^(what is|what's) (the )?price of/i,
    /^(how much|what's) .* (worth|cost)/i,
    /^(what|how) .* (volume|change|rank)/i,
    /^(what|which) .* (top|best|winning|trending)/i,
    /^(show|get|give me|list) .* (price|info|data|stats)/i,
    /^(is|can|should) .*\?$/i,
    /^(what|which|show) .* (rank|ranking)/i,
  ];

  const moderatePatterns = [
    /^(what|how) .* (portfolio|holding|balance|worth|pnl)/i,
    /^(should i|is it|can i) .*\?$/i,
  ];

  const veryComplexKeywords = [
    "portfolio allocation",
    "rebalance",
    "risk assessment",
    "security audit",
    "rug pull",
    "pattern recognition",
    "behavioral analysis",
    "performance analysis",
    "sentiment analysis",
  ];

  if (simplePatterns.some((p) => p.test(lower))) {
    return { rounds: 1, complexity: "simple" };
  }

  if (moderatePatterns.some((p) => p.test(lower))) {
    return { rounds: 1, complexity: "moderate" };
  }

  const veryComplexCount = veryComplexKeywords.filter((kw) => lower.includes(kw)).length;
  if (veryComplexCount >= 1) {
    return { rounds: 2, complexity: "complex" };
  }

  return { rounds: 1, complexity: "simple" };
}

// ---------------------------------------------------------------------------
// 4. Ultra-Simple Query Handler
// ---------------------------------------------------------------------------

const ULTRA_SIMPLE_REGEX = /^(what is|what's|price of|how much is) ([A-Z]{2,10})(?:usdt)?\??$/i;

export function isUltraSimpleQuery(query: string): { symbol: string } | null {
  const match = query.trim().match(ULTRA_SIMPLE_REGEX);
  if (match) {
    return { symbol: match[2].toUpperCase() };
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. Agent Routing
// ---------------------------------------------------------------------------
// 3. Data Formatting Helpers
// ---------------------------------------------------------------------------

interface TickerCompactData {
  symbol?: string;
  lastPrice?: string | number;
  priceChangePercent?: string | number;
  quoteVolume?: string | number;
  highPrice?: string | number;
  lowPrice?: string | number;
}

function formatTickerCompact(ticker: TickerCompactData): string {
  const price = ticker.lastPrice ? Number(ticker.lastPrice).toFixed(2) : "N/A";
  const change = ticker.priceChangePercent
    ? `${Number(ticker.priceChangePercent) >= 0 ? "+" : ""}${Number(ticker.priceChangePercent).toFixed(2)}%`
    : "0%";
  const vol = ticker.quoteVolume ? `$${(Number(ticker.quoteVolume) / 1e9).toFixed(1)}B` : "N/A";
  const high = ticker.highPrice ? `$${Number(ticker.highPrice).toFixed(2)}` : "N/A";
  const low = ticker.lowPrice ? `$${Number(ticker.lowPrice).toFixed(2)}` : "N/A";
  return `$${price} (${change}%), Vol: ${vol}, 24h: ${low}-${high}`;
}

function formatTokenSummary(data: unknown): string {
  if (!data || typeof data !== "object") return JSON.stringify(data);

  const obj = data as Record<string, unknown>;
  const parts: string[] = [];

  if (obj.symbol) parts.push(`Symbol: ${obj.symbol}`);
  if (obj.name) parts.push(`Name: ${obj.name}`);
  if (obj.price || obj.lastPrice) parts.push(`Price: $${obj.price || obj.lastPrice}`);
  if (obj.priceChange24h || obj.priceChangePercent) {
    parts.push(`24h: ${obj.priceChange24h || obj.priceChangePercent}%`);
  }
  if (obj.volume24h || obj.quoteVolume) {
    const vol = obj.volume24h || obj.quoteVolume;
    parts.push(`Vol: $${typeof vol === "number" ? (vol / 1e9).toFixed(1) + "B" : vol}`);
  }
  if (obj.marketCap) parts.push(`MCap: $${obj.marketCap}`);

  return parts.length > 0 ? parts.join(" | ") : JSON.stringify(data).slice(0, 200);
}

// ---------------------------------------------------------------------------
// 1. Agent Routing
// ---------------------------------------------------------------------------

/**
 * Routes a user query to the most relevant agents based on intent keywords.
 * Enforces a minimum of 3 and maximum of 6 agents.
 *
 * @param query The user's input query
 * @param enabledAgents The list of agents the user has enabled in preferences
 * @returns Array of AgentNames to participate in the council debate
 */
export function routeQuery(query: string, enabledAgents: AgentName[]): AgentName[] {
  const lower = query.toLowerCase();
  const selected = new Set<AgentName>();

  // Always include Sage for "explain" intents
  if (
    /(explain|what is|how does|teach me|guide|learn|tutorial|beginner|help me understand)/.test(
      lower,
    )
  ) {
    selected.add("SAGE");
  }

  // Token/Contract analysis
  if (/(0x[a-fA-F0-9]{40}|address|contract|token|coin|crypto|analyze)/.test(lower)) {
    ["SCOUT", "THE_WARDEN", "LENS", "SHADOW", "PULSE"].forEach((a) => selected.add(a as AgentName));
  }

  // Portfolio/Holdings
  if (
    /(portfolio|holdings|balance|bag|worth|pnl|my account|allocation|concentrated|diversif)/.test(
      lower,
    )
  ) {
    ["LEDGER", "QUILL"].forEach((a) => selected.add(a as AgentName));
  }

  // Buying/Investing
  if (/(buy|should i|invest|ape|purchase|entry|accumulate|long)/.test(lower)) {
    ["SCOUT", "THE_WARDEN", "LEDGER", "SHADOW"].forEach((a) => selected.add(a as AgentName));
  }

  // Risk/Security
  if (/(safe|risky|scam|rug|audit|honeypot|danger|red flag|warning|security)/.test(lower)) {
    ["THE_WARDEN", "LENS"].forEach((a) => selected.add(a as AgentName));
  }

  // Whale/Smart Money
  if (/(whale|smart money|signal|insider|accumulation|wallet|on-chain|onchain)/.test(lower)) {
    ["SHADOW", "SCOUT", "LENS"].forEach((a) => selected.add(a as AgentName));
  }

  // Institutional Flow - Smart Money & Fund Analysis
  if (
    /(institutional|smart money flow|fund flow|bank money|accumulation signal|smart money zones|hedge fund)/.test(
      lower,
    )
  ) {
    ["SHADOW", "FUTURES", "SCOUT"].forEach((a) => selected.add(a as AgentName));
  }

  // BSC/BNB Chain - Consolidated Web3 & On-Chain Analysis
  if (
    /(bsc|binance smart chain|bnb chain|web3|on-chain|onchain|bsc.*token|bsc.*wallet|bsc.*nft|bsc.*swap|contract.*bnb|token.*bnb|burn.*bnb|wallet.*bsc)/.test(
      lower,
    )
  ) {
    ["BLAZE", "SHADOW", "THE_WARDEN", "LENS", "LEDGER"].forEach((a) =>
      selected.add(a as AgentName),
    );
  }

  // Trading History / Behavioral analysis
  if (
    /(history|my trades|past|patterns|mistakes|win rate|journal|behavioral|grade|performance)/.test(
      lower,
    )
  ) {
    ["QUILL", "LEDGER"].forEach((a) => selected.add(a as AgentName));
  }

  // Trending/Momentum/Meme
  if (/(trending|hot|meme|momentum|pumping|viral|new launch|moonshot|100x)/.test(lower)) {
    ["SCOUT", "PULSE"].forEach((a) => selected.add(a as AgentName));
  }

  // Strategy/Planning/DCA
  if (/(dca|rebalance|plan|strategy|cost average|dollar cost|schedule|budget|deploy)/.test(lower)) {
    ["LEDGER", "SAGE"].forEach((a) => selected.add(a as AgentName));
  }

  // Price Alerts & Notifications
  if (
    /(alert|notify|remind|when price|price reaches|trigger.*price|set.*notification|watch.*price)/.test(
      lower,
    )
  ) {
    ["LEDGER", "PULSE"].forEach((a) => selected.add(a as AgentName));
  }

  // Chart/Technical analysis
  if (
    /(chart|rsi|macd|candle|technical|support|resistance|k-line|kline|volume profile|order book)/.test(
      lower,
    )
  ) {
    ["LENS", "LEDGER"].forEach((a) => selected.add(a as AgentName));
  }

  // Futures/Perpetual trading
  if (
    /(futures|perpetual|perp|open interest|oi |funding|contango|backwardation|basis|long short ratio|taker pressure|long squeeze|liquidation|leverage)/.test(
      lower,
    )
  ) {
    ["FUTURES", "LENS", "SHADOW", "THE_WARDEN"].forEach((a) => selected.add(a as AgentName));
  }

  // Trading Signals & Entry/Exit
  if (
    /(signal|entry point|exit.*price|stop loss|take profit|tp |sl |entry price|target price|trade.*idea|buy signal|sell signal)/.test(
      lower,
    )
  ) {
    ["SHADOW", "THE_WARDEN", "SCOUT"].forEach((a) => selected.add(a as AgentName));
  }

  // Sentiment/Narrative/News
  if (
    /(sentiment|hype|narrative|community|twitter|social|news|breaking|announcement)/.test(lower)
  ) {
    ["PULSE", "SCOUT"].forEach((a) => selected.add(a as AgentName));
  }

  // Social/Posting - Binance Square
  if (/(post|share|publish|binance square|tweet|broadcast|create post)/.test(lower)) {
    ["SCOUT", "LEDGER", "SAGE"].forEach((a) => selected.add(a as AgentName));
  }

  // NFT-specific routing (expanded)
  if (
    /(nft|non-fungible|collection|opensea|blur|payload|x2y2|nft.*trend|nft.*sale|nft.*volume)/.test(
      lower,
    )
  ) {
    ["LEDGER", "LENS", "SHADOW", "PULSE"].forEach((a) => selected.add(a as AgentName));
  }

  // DeFi/Yield/Staking
  if (
    /(defi|yield|farm|staking|lending|borrow|compound| liquidity |liquidity pool|lp |amm|dex.*trading|pancakeswap|uniswap)/.test(
      lower,
    )
  ) {
    ["BLAZE", "SHADOW", "THE_WARDEN", "LEDGER"].forEach((a) => selected.add(a as AgentName));
  }

  // Market Metrics/Capitalization
  if (
    /(market cap|marketcap|fdv|fully diluted|circulating supply|total supply|token.*supply|ranking.*token|top.*by.*volume)/.test(
      lower,
    )
  ) {
    ["SCOUT", "LENS", "PULSE"].forEach((a) => selected.add(a as AgentName));
  }

  // Wallet Clustering
  if (
    /(wallet cluster|related wallets|coordinated wallet|same.*wallet|group.*wallet|linked wallet|cluster.*analysis)/.test(
      lower,
    )
  ) {
    ["SHADOW", "BLAZE"].forEach((a) => selected.add(a as AgentName));
  }

  // Fear/Greed
  if (/(fear|greed|fomo|panic|euphoria|index|mood|market feel)/.test(lower)) {
    selected.add("PULSE");
  }

  // Default fallback
  if (selected.size === 0) {
    ["SCOUT", "THE_WARDEN", "LENS", "PULSE"].forEach((a) => selected.add(a as AgentName));
  }

  // Auto-add SAGE if a beginner-level question is detected alongside other agents
  if (
    /(what is|how to|explain|basic|beginner)/.test(lower) &&
    selected.size > 0 &&
    !selected.has("SAGE")
  ) {
    selected.add("SAGE");
  }

  // Filter by enabled agents
  let finalSelection = Array.from(selected)
    .filter((a) => enabledAgents.includes(a))
    .filter((a) => a !== "THE_ARBITER") as AgentName[];

  // Ensure minimum 3, maximum 6
  if (finalSelection.length < 3) {
    const coreFallbacks: AgentName[] = [
      "SCOUT",
      "THE_WARDEN",
      "LENS",
      "PULSE",
      "SAGE",
      "LEDGER",
      "FUTURES",
      "BLAZE",
    ] as AgentName[];
    for (const fallback of coreFallbacks) {
      if (finalSelection.length >= 3) break;
      if (enabledAgents.includes(fallback) && !finalSelection.includes(fallback)) {
        finalSelection.push(fallback);
      }
    }
  }

  if (finalSelection.length > 6) {
    finalSelection = finalSelection.slice(0, 6);
  }

  return finalSelection;
}

// ---------------------------------------------------------------------------
// 1b. LLM-Powered Agent Routing (Phase 2)
// ---------------------------------------------------------------------------

/**
 * LLM-powered agent routing. Reads agent descriptions and uses the LLM to
 * pick the most relevant agents. Falls back to keyword-based routeQuery().
 */
export async function routeQuerySmart(
  query: string,
  enabledAgents: AgentName[],
  apiKeys: {
    llmProvider?: string;
    llmApiKey?: string;
    llmModel?: string;
    llmBaseUrl?: string;
    llmEndpoint?: string;
    llmDeploymentName?: string;
  },
): Promise<AgentName[]> {
  if (!apiKeys.llmApiKey || !apiKeys.llmProvider) {
    return routeQuery(query, enabledAgents);
  }

  try {
    // Build compact agent descriptions from AGENT_CONFIGS
    const agentDescriptions = AGENT_CONFIGS.filter(
      (a) => a.id !== "THE_ARBITER" && enabledAgents.includes(a.id),
    )
      .map((a) => `- ${a.id}: ${a.role} (skills: ${(a.relevantSkills || []).join(", ")})`)
      .join("\n");

    const systemPrompt = `You are an agent-routing AI for ClawLens, a crypto analysis platform.
Given a user query, select which Council agents should analyze it.

AVAILABLE AGENTS:
${agentDescriptions}

RULES:
1. Pick 3-6 agents most relevant to the query.
2. Always include agents whose skills match the topic.
3. For broad/general questions, pick 4-5 diverse agents.
4. For specific technical questions, prefer specialists.

Respond with ONLY valid JSON, no markdown:
{"agents":["AGENT_ID_1","AGENT_ID_2"],"reasoning":"brief explanation"}`;

    const { callAgentOnce } = await import("@/lib/llmClient");
    const provider = (apiKeys.llmProvider || "openai") as import("@/types").LLMProvider;
    const model = apiKeys.llmModel || "gpt-4o-mini";

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Council routing timed out")), 4000),
    );

    const llmPromise = callAgentOnce(
      systemPrompt,
      `User query: "${query}"`,
      provider,
      {
        apiKey: apiKeys.llmApiKey || "",
        baseUrl: apiKeys.llmBaseUrl,
        endpoint: apiKeys.llmEndpoint,
        deploymentName: apiKeys.llmDeploymentName,
      },
      model,
      200,
      true,
    );

    const result = await Promise.race([llmPromise, timeoutPromise]);

    if (result.success && result.data) {
      const raw = result.data.trim();
      const jsonStr = raw.startsWith("```")
        ? raw
            .replace(/```json?\n?/g, "")
            .replace(/```/g, "")
            .trim()
        : raw;
      const parsed = JSON.parse(jsonStr);
      const agents = (parsed.agents || []) as AgentName[];

      // Validate agents exist and are enabled
      const valid = agents.filter(
        (a: AgentName) => enabledAgents.includes(a) && a !== "THE_ARBITER",
      );

      if (valid.length >= 3) {
        console.log(`[Council] LLM routed to: ${valid.join(", ")}`);
        return valid.slice(0, 6);
      }
    }
  } catch (error) {
    console.warn("[Council] LLM routing failed, falling back to keywords:", error);
  }

  return routeQuery(query, enabledAgents);
}

/**
 * Uses an LLM to extract semantic parameters from the user query.
 * This allows skills to be called with specific values (budgets, timeframes)
 * instead of just symbols.
 */
export async function preprocessQueryParameters(
  query: string,
  context: SkillContext,
): Promise<Record<string, any>> {
  const { llmApiKey, llmProvider, llmModel } = context.apiKeys;
  if (!llmApiKey || !llmProvider) return {};

  const systemPrompt = `You are a parameter extraction AI for ClawLens. 
Your job is to extract specific parameters from the user's crypto-related query to be used by various analytical skills.

EXTRACT THESE IF PRESENT:
- symbol: The main token symbol (e.g., "BTC", "ETH").
- address: Any blockchain address (0x...).
- amount: Numeric amount for trades or analysis.
- totalBudgetUSD: Total budget for DCA or planning.
- durationWeeks: Duration for a plan in weeks.
- interval_days: Frequency of actions in days.
- targetAsset: The asset being targeted for an action.
- riskTolerance: 1-10 scale based on user's tone.

Respond ONLY with valid JSON. If a parameter is not found, omit it.
Example: "Plan a DCA for BTC with $1000 over 3 months" -> {"symbol": "BTC", "totalBudgetUSD": 1000, "durationWeeks": 12, "targetAsset": "BTC"}`;

  try {
    const result = await callAgentOnce(
      systemPrompt,
      `User query: "${query}"`,
      llmProvider as LLMProvider,
      {
        apiKey: llmApiKey,
        baseUrl: context.apiKeys.llmBaseUrl,
        endpoint: context.apiKeys.llmEndpoint,
        deploymentName: context.apiKeys.llmDeploymentName,
      },
      llmModel || "gpt-5.4",
      300,
      true,
    );

    if (result.success && result.data) {
      const cleaned = result.data.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleaned);
    }
  } catch (error) {
    console.warn("[Arbiter] Parameter preprocessing failed:", error);
  }
  return {};
}

// ---------------------------------------------------------------------------
// 2. Skill Data Fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches relevant skill data for a specific agent to inject into their prompt.
 *
 * @param agentId The agent requesting data
 * @param query The user's query
 * @param context Skill execution context (keys, portfolio)
 * @returns Formatted skill data string, or empty string on error
 */
export async function fetchSkillData(
  agentId: AgentName,
  query: string,
  context: SkillContext,
  preprocessedParams: Record<string, any> = {},
): Promise<string> {
  const agentConfig = AGENT_CONFIGS.find((a) => a.id === agentId);
  if (!agentConfig || !agentConfig.relevantSkills || agentConfig.relevantSkills.length === 0) {
    return "";
  }

  // Common extractors
  const extractAddress = (q: string) => {
    const match = q.match(/0x[a-fA-F0-9]{40}/);
    return match ? match[0] : null;
  };
  const extractSymbol = (q: string): string | null => {
    const match = q.match(/([A-Z]{2,8})(?:USDT)?/);
    return match ? match[1] : null;
  };

  const symbol =
    preprocessedParams.symbol ||
    extractSymbol(query) ||
    (context.portfolio?.assets?.[0]?.symbol ?? "BTC");
  const address = preprocessedParams.address || extractAddress(query);

  const genericParams: Record<string, any> = {
    symbol,
    address,
    endpoint: "/api/v3/account",
    omitZeroBalances: true,
    action: "list",
    targetAsset: preprocessedParams.targetAsset || symbol,
    totalBudgetUSD: preprocessedParams.totalBudgetUSD || 500,
    durationWeeks: preprocessedParams.durationWeeks || 12,
    riskTolerance: preprocessedParams.riskTolerance || 5,
    amount_per_interval: preprocessedParams.amount || 100,
    interval_days: preprocessedParams.interval_days || 7,
    total_days: (preprocessedParams.durationWeeks || 52) * 7,
    ...preprocessedParams, // Spread remaining extracted params
  };

  const results: string[] = [];
  const execPromises = agentConfig.relevantSkills.map(async (camelName) => {
    const skill = SKILL_INSTANCES[camelName];
    if (!skill) return "";

    try {
      const result = await withSkillTimeout(skill.execute(genericParams, context), skill.name);
      if (result.success && result.data && Object.keys(result.data).length > 0) {
        return `[SKILL DATA: ${skill.name.toUpperCase()}]\n${JSON.stringify(result.data, null, 2)}`;
      } else if (!result.success && result.summary) {
        return `[SKILL ERROR: ${skill.name.toUpperCase()}]\n${result.summary}`;
      }
    } catch (error) {
      console.warn(`${agentId} failed to execute ${skill.name}:`, error);
    }
    return "";
  });

  const resolved = await Promise.allSettled(execPromises);
  for (const res of resolved) {
    if (res.status === "fulfilled" && res.value) {
      results.push(res.value);
    }
  }

  return results.length > 0 ? results.join("\n\n") : "";
}

export interface RunCouncilDebateParams {
  query: string;
  sessionId: string;
  apiKeys: APIKeys;
  portfolio: PortfolioSnapshot | null;
  preferences: UserPreferences;
  onAgentStart: (agentId: AgentName, current?: number, total?: number) => void;
  onAgentChunk: (agentId: AgentName, chunk: string) => void;
  onAgentComplete: (agentId: AgentName, fullResponse: string, councilReport: string) => void;
  onAgentError: (agentId: AgentName, error: string) => void;
  onArbitrateStart: () => void;
  onArbitrateChunk: (chunk: string) => void;
  onArbitrateComplete: (verdict: ArbitersVerdict) => void;
  onRoundStart?: (round: number, maxRounds: number) => void;
  onRoundComplete?: (round: number, maxRounds: number, reportsCount: number) => void;
  onConsensusCheck?: (
    hasConsensus: boolean,
    agreement: number,
    direction?: "positive" | "negative",
  ) => void;
  signal?: AbortSignal;
}

export async function runCouncilDebate(params: RunCouncilDebateParams): Promise<void> {
  const {
    query,
    sessionId,
    apiKeys,
    portfolio,
    preferences,
    onAgentStart,
    onAgentChunk,
    onAgentComplete,
    onAgentError,
    onArbitrateStart,
    onArbitrateChunk,
    onArbitrateComplete,
  } = params;

  // 1. Build context
  const userContextStr = buildUserContext(portfolio, preferences);
  const provider = apiKeys.llmProvider;
  const llmApiKey = apiKeys.llmApiKey;
  const model = getDefaultModel(provider);

  const skillContext: SkillContext = {
    sessionId,
    apiKeys: {
      binanceApiKey: apiKeys.binanceApiKey || "",
      binanceSecretKey: apiKeys.binanceSecretKey || "",
      llmProvider: provider,
      llmApiKey: llmApiKey,
      llmModel: model,
      llmBaseUrl: apiKeys.llmBaseUrl,
      llmEndpoint: apiKeys.llmEndpoint,
      llmDeploymentName: apiKeys.llmDeploymentName,
      squareApiKey: apiKeys.squareApiKey || "",
    },
    portfolio: portfolio || undefined,
    preferences,
  };

  if (!llmApiKey) {
    throw new Error("LLM API Key is required to run the council.");
  }

  // Handle ultra-simple price queries directly without agents
  const ultraSimple = isUltraSimpleQuery(query);
  if (ultraSimple) {
    try {
      const tickerResult = await withSkillTimeout(
        getTicker24hr(ultraSimple.symbol + "USDT"),
        "getTicker24hr",
      );
      if (tickerResult.success && tickerResult.data && !Array.isArray(tickerResult.data)) {
        const ticker = tickerResult.data;
        // Use the formatTickerCompact helper for consistent formatting
        const formattedTicker = formatTickerCompact({
          symbol: ultraSimple.symbol,
          lastPrice: ticker.lastPrice,
          priceChangePercent: ticker.priceChangePercent,
          quoteVolume: ticker.quoteVolume,
          highPrice: ticker.highPrice,
          lowPrice: ticker.lowPrice,
        });

        const directAnswer = `${ultraSimple.symbol}: ${formattedTicker}`;

        // Return as single agent response
        onAgentStart("SCOUT", 1, 1);
        onAgentChunk("SCOUT", directAnswer);
        onAgentComplete("SCOUT", directAnswer, directAnswer);

        onArbitrateStart();
        onArbitrateChunk("");
        onArbitrateComplete({
          consensus: "Direct data answer",
          dissentingVoices: [],
          riskLevel: "LOW",
          finalVerdict: directAnswer,
          confidence: 100,
          watchThis: "Price movements",
          isStreaming: false,
          isComplete: true,
        });
        return;
      }
    } catch {
      // Fall through to normal agent flow
    }
  }

  // 2. Route query
  const enabledAgents = preferences.enabledAgents;
  const relevantAgents = await routeQuerySmart(query, enabledAgents, apiKeys);

  if (relevantAgents.length === 0) {
    throw new Error("No agents available to handle this query. Please enable agents in settings.");
  }

  // Agent-specific token limits - increased for complete answers
  const getAgentTokenLimit = (agentId: AgentName): number => {
    const limits: Record<string, number> = {
      SCOUT: 3000,
      THE_WARDEN: 3000,
      LENS: 3200,
      SHADOW: 3000,
      LEDGER: 3200,
      PULSE: 2800,
      SAGE: 3000,
      QUILL: 3000,
      FUTURES: 3200,
      BLAZE: 3200,
    };
    return limits[agentId] || 2800;
  };

  // ---------------------------------------------------------------------------
  // Council Report Extraction Helper
  // ---------------------------------------------------------------------------
  function extractCouncilReport(fullResponse: string): string {
    // 1. Try to find "Council Report:" line
    const lines = fullResponse.split("\n");
    const reportLine = lines.find((l) => l.trim().startsWith("Council Report:"));
    if (reportLine) {
      const cleaned = reportLine.replace("Council Report:", "").trim();
      if (cleaned.length > 10 && !cleaned.startsWith("{")) {
        return cleaned;
      }
    }

    // 2. Try to detect and parse JSON — convert to human-readable text
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const json = JSON.parse(jsonMatch[0]);
        const readable = jsonToReadableReport(json);
        if (readable && readable.length > 10) {
          return readable.slice(0, 500);
        }
      } catch {
        // Not valid JSON, continue to fallback
      }
    }

    // 3. Fallback: use first non-empty paragraph that's not just a header
    const paragraphs = fullResponse.split(/\n\n+/).filter((p) => {
      const trimmed = p.trim();
      return (
        trimmed.length > 20 &&
        !trimmed.startsWith("#") &&
        !trimmed.startsWith("===") &&
        !trimmed.startsWith("---") &&
        !trimmed.includes("SYSTEM INSTRUCTIONS") &&
        !trimmed.includes("You are")
      );
    });

    if (paragraphs.length > 0) {
      // Return the longest paragraph that's not too long
      const bestParagraph = paragraphs.reduce(
        (a, b) => (a.length > b.length && a.length < 800 ? a : b),
        paragraphs[0],
      );
      return bestParagraph.trim().slice(0, 500);
    }

    // 4. Last resort: use last non-empty sentence
    const sentences = fullResponse.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    if (sentences.length > 0) {
      return sentences[sentences.length - 1].trim().slice(0, 300) + ".";
    }

    return "Analysis complete.";
  }

  /**
   * Converts a JSON object from an agent response into human-readable text.
   * Prioritizes known fields, then walks all string fields, then summarizes arrays.
   */
  function jsonToReadableReport(json: Record<string, unknown>): string {
    // Priority 1: councilReport field (seen in user's actual responses)
    if (
      json.councilReport &&
      typeof json.councilReport === "string" &&
      json.councilReport.length > 10
    ) {
      return json.councilReport;
    }

    // Priority 2: Standard verdict/summary fields
    const keyFields = [
      "recommendation",
      "verdict",
      "summary",
      "conclusion",
      "action",
      "advice",
      "finalVerdict",
      "councilVerdict",
      "analysis",
      "finding",
      "assessment",
      "insight",
    ];

    for (const field of keyFields) {
      if (json[field] && typeof json[field] === "string" && (json[field] as string).length > 10) {
        return json[field] as string;
      }
    }

    // Priority 3: Build a summary from available data
    const parts: string[] = [];

    // Extract key metrics
    if (json.riskScore || json.riskLevel) parts.push(`Risk: ${json.riskScore || json.riskLevel}`);
    if (json.portfolioHealth) parts.push(`Portfolio: ${json.portfolioHealth}`);
    if (json.sentiment) parts.push(`Sentiment: ${json.sentiment}`);
    if (json.confidence) parts.push(`Confidence: ${json.confidence}%`);

    // Extract token/asset arrays into readable summaries
    const arrayFields = ["trendingTokens", "tokens", "assets", "signals", "recommendations"];
    for (const field of arrayFields) {
      if (Array.isArray(json[field]) && (json[field] as unknown[]).length > 0) {
        const items = json[field] as Record<string, unknown>[];
        const symbols = items
          .slice(0, 5)
          .map((item) => {
            const sym = item.symbol || item.name || item.token || "";
            const change = item.priceChange24h || item.change24h || item.percentChange24h;
            if (sym && change !== undefined) {
              return `${sym} (${Number(change) > 0 ? "+" : ""}${Number(change).toFixed(1)}%)`;
            }
            return String(sym);
          })
          .filter(Boolean);
        if (symbols.length > 0) {
          parts.push(
            `Top ${field
              .replace(/([A-Z])/g, " $1")
              .toLowerCase()
              .trim()}: ${symbols.join(", ")}`,
          );
        }
      }
    }

    // Fallback: collect all short string values from the JSON
    if (parts.length === 0) {
      for (const [key, value] of Object.entries(json)) {
        if (typeof value === "string" && value.length > 5 && value.length < 200) {
          // Skip technical/meta fields
          if (!["type", "id", "model", "role", "agentId"].includes(key)) {
            parts.push(value);
            if (parts.join(" ").length > 300) break;
          }
        }
      }
    }

    return parts.join(". ").trim();
  }

  // Function to run a single agent with given context
  const runAgent = async (
    agentId: AgentName,
    round: number,
    totalRounds: number,
    allPreviousReports: string[],
    skillDataCache: Map<string, string>,
    preprocessedParams: Record<string, any> = {},
  ): Promise<{ fullResponse: string; councilReport: string } | null> => {
    if (params.signal?.aborted) return null;

    onAgentStart(agentId, round, totalRounds);

    try {
      // Use cached skill data or fetch fresh
      let skillData = skillDataCache.get(agentId);
      if (!skillData) {
        skillData = await fetchSkillData(agentId, query, skillContext, preprocessedParams);
        skillDataCache.set(agentId, skillData);
      }

      let systemPrompt = getSystemPrompt(agentId, userContextStr);
      systemPrompt = optimizePromptForProvider(systemPrompt, provider, false);

      // ROUND-SPECIFIC PROMPTS: Each round has a different focus
      if (round === 1) {
        // ROUND 1: Initial Analysis - Present data findings
        systemPrompt += `

=== ROUND 1: INITIAL ANALYSIS ===
This is the FIRST round of the council debate.
Your task is to provide INITIAL observations and DATA FINDINGS based on the real-time data provided.

Focus on:
- What does the DATA show? (prices, volumes, rankings, signals)
- What are the key metrics and values?
- Present your INITIAL assessment clearly

IMPORTANT: Do NOT try to agree or disagree with other agents yet. Just present your data-driven findings.`;
      } else if (round === 2) {
        // ROUND 2: Debate & Challenge - Challenge or support previous findings
        systemPrompt += `

=== ROUND 2: DEBATE & CHALLENGE ===
This is the SECOND round of the council debate.
Review the Round 1 findings and provide COUNTER-ARGUMENTS or SUPPORTING EVIDENCE.

Your task is to:
- CHALLENGE points you disagree with - provide specific counter-evidence
- SUPPORT points you agree with - add additional supporting evidence
- IDENTIFY blind spots or missing data

Focus on: WHY do you agree or disagree?`;
      } else {
        // ROUND 3+: Final Synthesis - Give actionable recommendations
        systemPrompt += `

=== ROUND ${round}: FINAL SYNTHESIS ===
This is the FINAL round of the council debate.
Review ALL previous rounds and provide your FINAL recommendation.

Your task is to:
- Provide your FINAL recommendation based on all debate
- Acknowledge counter-arguments and explain your final stance
- Give specific actionable advice
- Include risk assessment

Focus on: WHAT should the user DO?`;
      }

      if (skillData) {
        systemPrompt += `\n\n=== REAL-TIME DATA ===\n${skillData}`;
      }

      // Stream response
      let fullResponse = "";
      const agentMaxTokens = getAgentTokenLimit(agentId);
      const generator = streamAgentResponse(
        systemPrompt,
        query,
        provider,
        {
          apiKey: llmApiKey,
          baseUrl: apiKeys.llmBaseUrl,
          endpoint: apiKeys.llmEndpoint,
          deploymentName: apiKeys.llmDeploymentName,
        },
        model,
        agentMaxTokens,
        params.signal,
      );

      for await (const chunk of generator) {
        fullResponse += chunk;
        onAgentChunk(agentId, chunk);
      }

      // Extract the 'Council Report:' line
      const councilReport = extractCouncilReport(fullResponse);

      onAgentComplete(agentId, fullResponse, councilReport);
      return { fullResponse, councilReport };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onAgentError(agentId, msg);
      return null;
    }
  };

  // 3. Multi-round debate execution with dynamic rounds
  // PARALLEL: Agents now run in parallel for much faster execution
  const { rounds: dynamicMaxRounds } = calculateQueryComplexity(query);
  let MAX_ROUNDS = dynamicMaxRounds;
  const collectedReports: string[] = [];
  const skillDataCache = new Map<string, string>();

  // Use LLM to extract semantic parameters once per debate
  const preprocessedParams = await preprocessQueryParameters(query, skillContext);
  if (Object.keys(preprocessedParams).length > 0) {
    console.log("[Council] Preprocessed params:", preprocessedParams);
  }

  const countQueryTopics = (q: string): number => {
    const topicKeywords = [
      "portfolio",
      "holdings",
      "balance",
      "pnl",
      "dca",
      "allocation",
      "risk",
      "audit",
      "security",
      "scam",
      "rug",
      "honeypot",
      "whale",
      "smart money",
      "signal",
      "accumulation",
      "wallet",
      "on-chain",
      "token",
      "contract",
      "technical",
      "chart",
      "rsi",
      "macd",
      "trending",
      "meme",
      "momentum",
      "rank",
      "viral",
      "fear",
      "greed",
      "sentiment",
      "news",
      "narrative",
      "history",
      "trades",
      "win rate",
      "patterns",
      "performance",
      "futures",
      "leverage",
      "margin",
      "funding",
      "perpetual",
      "bsc",
      "bnb",
      "defi",
      "nft",
      "burn",
      "swap",
    ];
    return topicKeywords.filter((kw) => q.toLowerCase().includes(kw)).length;
  };

  const shouldEscalate = (reports: string[], round: number): boolean => {
    if (round !== 1) return false;

    const unavailablePatterns = [
      "unavailable",
      "not available",
      "no data",
      "failed to",
      "could not",
      "unable to",
      "error",
      "no api",
      "api key",
      "connect",
    ];

    const totalAgents = relevantAgents.length;
    const unavailableCount = reports.filter((r) => {
      const content = r.toLowerCase();
      return unavailablePatterns.some((p) => content.includes(p));
    }).length;

    const unavailablePercent = (unavailableCount / totalAgents) * 100;
    const topicCount = countQueryTopics(query);

    return unavailablePercent > 50 || topicCount >= 5;
  };

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (params.signal?.aborted) break;

    params.onRoundStart?.(round, MAX_ROUNDS);

    // PARALLEL: Run all agents in this round concurrently
    const roundPromises = relevantAgents.map((agentId) =>
      runAgent(agentId, round, MAX_ROUNDS, collectedReports, skillDataCache, preprocessedParams),
    );

    const results = await Promise.allSettled(roundPromises);

    // Collect successful results
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        const agentId = relevantAgents[index];
        collectedReports.push(`[Round ${round}] ${agentId}: ${result.value.councilReport}`);
      }
    });

    params.onRoundComplete?.(round, MAX_ROUNDS, collectedReports.length);

    if (round < MAX_ROUNDS && collectedReports.length > 0) {
      if (round === 1 && shouldEscalate(collectedReports, round)) {
        MAX_ROUNDS = 2;
      }

      const consensus = await checkForConsensus(collectedReports, skillContext);
      params.onConsensusCheck?.(consensus.hasConsensus, consensus.agreement, consensus.direction);

      if (consensus.hasConsensus) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Check if all agents failed
  const allFailed = collectedReports.every((r) => r.includes("AGENT FAILED"));

  if (collectedReports.length === 0 || allFailed) {
    onArbitrateStart();
    onArbitrateComplete({
      consensus: "The council failed to reach a conclusion due to multiple agent failures.",
      dissentingVoices: [],
      riskLevel: "HIGH",
      finalVerdict: "Unable to process query. Please check your API keys and connection.",
      confidence: 0,
      watchThis: "API connectivity",
      isStreaming: false,
      isComplete: true,
    });
    return;
  }

  // 6. Always run The Arbiter - provide meaningful synthesis for every query
  if (params.signal?.aborted) return;

  onArbitrateStart();
  onArbitrateChunk("Synthesizing council arguments...");

  // 6a. Run meta-skills for THE_ARBITER to better understand the reports
  let metaSkillContext = "";
  let consensusDataRaw: any = null;

  try {
    // Extract agent names from collected reports
    const agentNames: string[] = [];
    const agentReports: string[] = [];
    collectedReports.forEach((report) => {
      const match = report.match(
        /\[Round \d+\] (SCOUT|THE_WARDEN|LENS|SHADOW|LEDGER|PULSE|SAGE|QUILL|FUTURES|BLAZE):/,
      );
      if (match) {
        const agentId = match[1];
        if (!agentNames.includes(agentId)) {
          agentNames.push(agentId);
          const reportContent = report.replace(/\[Round \d+\] \w+:/, "").trim();
          agentReports.push(reportContent);
        }
      }
    });

    // Run councilAnalyzer
    const analyzerResult = await councilAnalyzer.execute(
      { agentReports, agentNames, query },
      skillContext,
    );
    if (analyzerResult.success) {
      metaSkillContext += `\n\nCOUNCIL ANALYSIS:\n${analyzerResult.summary}\n`;
      const analyzerData = analyzerResult.data as any;
      metaSkillContext += `Data Coverage: ${analyzerData.dataCoverage?.join(", ") || "N/A"}\n`;
    }

    // Run consensusDetector
    const consensusResult = await consensusDetector.execute(
      { agentReports, agentNames },
      skillContext,
    );
    if (consensusResult.success) {
      const consensusData = consensusResult.data as any;
      metaSkillContext += `\n\nCONSENSUS DETECTION:\n${consensusResult.summary}\n`;
      metaSkillContext += `Consensus Type: ${consensusData.consensus?.type}\n`;
      metaSkillContext += `Agreement: ${consensusData.consensus?.agreement}%\n`;
      if (consensusData.keyPointsOfContention && consensusData.keyPointsOfContention.length > 0) {
        metaSkillContext += `Points of Contention: ${consensusData.keyPointsOfContention.join(" | ")}\n`;
      }
    }

    // Run verdictSynthesizer
    // REUSE consensusResult from line 2097 to avoid duplicate call
    consensusDataRaw = consensusResult.success ? (consensusResult.data as any) : null;
    const synthesizerResult = await verdictSynthesizer.execute(
      {
        query,
        consensusType: consensusDataRaw?.consensus?.type || "unknown",
        consensusAgreement: consensusDataRaw?.consensus?.agreement || 0,
        consensusDirection: consensusDataRaw?.consensus?.consensusDirection,
        agentCount: agentNames.length,
        dissentingAgents: consensusDataRaw?.consensus?.dissentingAgents || [],
      },
      skillContext,
    );
    if (synthesizerResult.success) {
      const synthData = synthesizerResult.data as any;
      metaSkillContext += `\n\nVERDICT SYNTHESIS GUIDELINES:\n${synthesizerResult.summary}\n`;
      metaSkillContext += `Risk Level: ${synthData.riskAssessment?.level}\n`;
      const toneKey = (synthData.riskAssessment?.level || "moderate").toLowerCase();
      metaSkillContext += `Recommended Tone: ${synthData.synthesisGuidelines?.tone?.[toneKey]}\n`;
    }
  } catch (metaError) {
    console.warn("Meta-skills failed, proceeding without them:", metaError);
  }

  const arbiterPrompt = getSystemPrompt("THE_ARBITER", userContextStr);

  // Apply provider-specific optimizations for Arbiter (isArbiter = true for JSON output)
  const optimizedArbiterPrompt = optimizePromptForProvider(arbiterPrompt, provider, true);

  const reportsText = collectedReports.join("\n\n");
  const arbiterUserMessage = `Here are the reports from the active council members regarding the user's query: "${query}"\n\n${reportsText}${metaSkillContext}`;

  try {
    const generator = streamAgentResponse(
      optimizedArbiterPrompt,
      arbiterUserMessage,
      provider,
      {
        apiKey: llmApiKey,
        baseUrl: apiKeys.llmBaseUrl,
        endpoint: apiKeys.llmEndpoint,
        deploymentName: apiKeys.llmDeploymentName,
      },
      model,
      1800, // Increased for complete JSON synthesis
      params.signal,
    );

    let accumulatedResponse = "";
    for await (const chunk of generator) {
      accumulatedResponse += chunk;
      onArbitrateChunk(chunk);
    }

    // Clean up markdown wrapping if present
    const cleanedResponse = accumulatedResponse.replace(/```json\n?|\n?```/g, "").trim();

    let verdict: ArbitersVerdict;
    try {
      const parsed: Omit<ArbitersVerdict, "isStreaming" | "isComplete"> =
        JSON.parse(cleanedResponse);

      // Inject meta-consensus data if available from the detector
      const consensusAgreement = consensusDataRaw?.consensus?.agreement;
      const consensusType = consensusDataRaw?.consensus?.type;
      const hasConsensus =
        consensusType === "consensus" || (consensusAgreement && consensusAgreement >= 70);

      verdict = {
        ...parsed,
        agreement: consensusAgreement ? consensusAgreement / 100 : undefined,
        hasConsensus: hasConsensus,
        direction: consensusDataRaw?.consensus?.consensusDirection,
        isStreaming: false,
        isComplete: true,
      };
    } catch (parseError) {
      console.error("[Arbiter] Failed to parse verdict JSON:", parseError);
      verdict = {
        consensus:
          "The council deliberated, but The Arbiter failed to synthesize a coherent final verdict.",
        dissentingVoices: [],
        riskLevel: "MODERATE",
        finalVerdict:
          "Synthesis failed. Please try rephrasing your query. Verify your API keys are correct.",
        confidence: 0,
        watchThis: "Exercise caution and do your own research.",
        isStreaming: false,
        isComplete: true,
      };
    }
    onArbitrateComplete(verdict);
  } catch {
    onArbitrateComplete({
      consensus:
        "The council deliberated, but The Arbiter failed to synthesize a coherent final verdict.",
      dissentingVoices: [],
      riskLevel: "MODERATE",
      finalVerdict:
        "Synthesis failed. Please try rephrasing your query. Verify your API keys are correct.",
      confidence: 0,
      watchThis: "Response parsing errors",
      isStreaming: false,
      isComplete: true,
    });
  }
}
