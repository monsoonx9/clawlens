import { AgentName, APIKeys, PortfolioSnapshot, UserPreferences, ArbitersVerdict } from "@/types";
import { getSystemPrompt } from "@/agents/agentPrompts";
import {
  streamAgentResponse,
  buildUserContext,
  getDefaultModel,
  optimizePromptForProvider,
} from "@/lib/llmClient";
import { getSkill, SkillContext } from "@/skills";
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
): Promise<string> {
  const extractAddress = (q: string) => {
    const match = q.match(/0x[a-fA-F0-9]{40}/);
    return match ? match[0] : null;
  };

  const extractSymbol = (q: string): string | null => {
    const match = q.match(/\b([A-Z]{2,8})(?:USDT)?\b/);
    return match ? match[1] : null;
  };

  const extractTopics = (
    q: string,
    portfolioSymbols: string[],
    watchlistSymbols: string[],
  ): string[] => {
    const topics: string[] = [];
    const symbol = extractSymbol(q);
    if (symbol) topics.push(symbol);
    topics.push(...portfolioSymbols.slice(0, 3));
    topics.push(...watchlistSymbols.slice(0, 2));
    return [...new Set(topics)].slice(0, 5);
  };

  const address = extractAddress(query);
  const symbol = extractSymbol(query);
  const portfolioSymbols = context.portfolio?.assets.map((a) => a.symbol) || [];
  const watchlistSymbols = context.preferences?.watchlist?.map((w) => w.symbol) || [];
  const whaleWallets = context.preferences?.whaleWallets || [];

  try {
    switch (agentId) {
      case "LEDGER": {
        // Portfolio Pulse + optional DCA Strategist
        const pulseSkill = getSkill("claw-council/portfolio-pulse");

        // Check if we have API keys
        const hasApiKeys = context.apiKeys?.binanceApiKey && context.apiKeys?.binanceSecretKey;

        if (!pulseSkill) {
          // Fallback to spot skill
          const spotSkill = getSkill("binance/spot");
          if (spotSkill && hasApiKeys) {
            try {
              const spotResult = await spotSkill.execute(
                {
                  endpoint: "/api/v3/account",
                  omitZeroBalances: true,
                },
                context,
              );
              if (spotResult.success && spotResult.data) {
                return `[SKILL DATA: SPOT ACCOUNT]\n${JSON.stringify(spotResult.data, null, 2)}`;
              }
            } catch {
              /* continue to empty */
            }
          }
          return `[LEDGER: PORTFOLIO]\n{"status": "API keys not configured or portfolio empty", "message": "Connect Binance API keys in settings to view portfolio, or add assets to your watchlist."}`;
        }

        const pulseResult = await pulseSkill.execute({}, context);

        // If portfolio is empty, provide helpful message
        let data = "";
        if (pulseResult.success && pulseResult.data && Object.keys(pulseResult.data).length > 0) {
          data = `[SKILL DATA: PORTFOLIO PULSE]\n${JSON.stringify(pulseResult.data, null, 2)}`;
        } else {
          // Try spot skill as fallback
          const spotSkill = getSkill("binance/spot");
          if (spotSkill && hasApiKeys) {
            try {
              const spotResult = await spotSkill.execute(
                { endpoint: "/api/v3/account", omitZeroBalances: true },
                context,
              );
              if (spotResult.success && spotResult.data) {
                const spotData = spotResult.data as {
                  balances?: Array<{ asset: string; free: string }>;
                };
                if (spotData.balances && spotData.balances.length > 0) {
                  data = `[SKILL DATA: SPOT ACCOUNT]\n${JSON.stringify(spotResult.data, null, 2)}`;
                }
              }
            } catch {
              // ignore
            }
          }

          if (!data) {
            data = `[LEDGER: PORTFOLIO]\n{"status": "No portfolio data", "assets": [], "totalValueUSD": 0, "message": "Portfolio is empty. Add assets to your portfolio or connect Binance API keys."}`;
          }
        }

        // If user asked about DCA, also run DCA strategist
        const targetSymbol = symbol || context.portfolio?.assets?.[0]?.symbol || "BTC";
        if (/(dca|cost average|dollar cost|accumulate|schedule|budget)/.test(query.toLowerCase())) {
          const dcaSkill = getSkill("claw-council/dca-strategist");
          if (dcaSkill) {
            const dcaResult = await dcaSkill.execute(
              {
                targetAsset: targetSymbol,
                totalBudgetUSD: 500,
                durationWeeks: 12,
                riskTolerance: 5,
              },
              context,
            );
            data += `\n\n[SKILL DATA: DCA STRATEGIST]\n${dcaResult.success ? JSON.stringify(dcaResult.data, null, 2) : dcaResult.summary}`;
          }
        }

        // If user asked about alerts, also run price alerts
        if (/(alert|notify|watch|trigger|price.*target)/.test(query.toLowerCase())) {
          const alertsResult = await priceAlerts.execute(
            {
              action: "list",
            },
            context,
          );
          data += `\n\n[SKILL DATA: PRICE ALERTS]\n${alertsResult.success ? JSON.stringify(alertsResult.data, null, 2) : alertsResult.summary}`;
        }

        // If user asked about backtesting or historical DCA performance
        if (/(backtest|historical.*dca|dca.*performance|test.*dca)/.test(query.toLowerCase())) {
          const backtestResult = await dcaBacktester.execute(
            {
              symbol: targetSymbol + "USDT",
              amount_per_interval: 100,
              interval_days: 7,
              total_days: 365,
            },
            context,
          );
          data += `\n\n[SKILL DATA: DCA BACKTESTER]\n${backtestResult.success ? JSON.stringify(backtestResult.data, null, 2) : backtestResult.summary}`;
        }

        return data;
      }

      case "QUILL": {
        // Get portfolio symbols for trade journal
        const portfolioSyms =
          context.portfolio?.assets
            .filter((a) => !["USDT", "USDC", "BUSD", "DAI", "TUSD", "FDUSD"].includes(a.symbol))
            .slice(0, 15)
            .map((a) => a.symbol + "USDT") || [];

        // If no portfolio, use common trading symbols
        const symbols =
          portfolioSyms.length > 0
            ? portfolioSyms
            : ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT"];

        const skill = getSkill("claw-council/trade-journal");
        if (!skill) {
          // Fallback to spot skill for myTrades
          const spotSkill = getSkill("binance/spot");
          if (spotSkill) {
            try {
              const spotResult = await spotSkill.execute(
                {
                  endpoint: "/api/v3/myTrades",
                  limit: 50,
                },
                context,
              );
              if (spotResult.success && spotResult.data) {
                return `[SKILL DATA: SPOT TRADES]\n${JSON.stringify(spotResult.data, null, 2)}`;
              }
            } catch {
              /* continue to empty */
            }
          }
          return "[QUILL: No trade history available. Connect API keys or add symbols to portfolio.]";
        }

        const result = await skill.execute({ symbols }, context);

        // If no trades found but we have data in portfolio, provide meaningful message
        if (result.success && result.data && Object.keys(result.data).length === 0) {
          return `[SKILL DATA: TRADE JOURNAL]\n{"message": "No completed trades found in portfolio. Trade history requires actual buy/sell transactions on Binance."}`;
        }

        return `[SKILL DATA: TRADE JOURNAL]\n${result.success ? JSON.stringify(result.data, null, 2) : result.summary}`;
      }

      case "PULSE": {
        // Run multiple skills in parallel
        const skillsToRun = Promise.allSettled([
          // Fear Index - requires pre-fetched data
          (async () => {
            const fearSkill = getSkill("claw-council/fear-index");
            if (!fearSkill) return null;

            // Fetch cryptoMarketRank for real data
            let socialHypeRank = 50;
            let memeMomentum = 50;
            let smartMoneyDir = 50;
            let priceChange24h = 0;

            const targetSymbol = symbol || "BTC";

            // Get market data with timeout protection
            try {
              const tickerResult = await withSkillTimeout(
                getTicker24hr(targetSymbol + "USDT"),
                "getTicker24hr-PULSE",
              );
              if (tickerResult.success && tickerResult.data && !Array.isArray(tickerResult.data)) {
                priceChange24h = tickerResult.data.priceChangePercent;
              }
            } catch {
              /* use default */
            }

            // Get crypto market rank for social hype
            try {
              const rankResult = await cryptoMarketRank.execute(
                {
                  rankType: "social-hype",
                  limit: 10,
                },
                context,
              );
              const rankData = rankResult.data as
                | {
                    socialHype?: {
                      tokens?: Array<{ symbol: string; socialHype: number }>;
                    };
                  }
                | undefined;
              if (rankResult.success && rankData?.socialHype?.tokens) {
                const tokens = rankData.socialHype.tokens;
                const found = tokens.find(
                  (t) => t.symbol.toUpperCase() === targetSymbol.toUpperCase(),
                );
                if (found) socialHypeRank = found.socialHype;
              }
            } catch {
              /* use default */
            }

            // Get meme rush for momentum
            try {
              const memeResult = await memeRush.execute(
                {
                  mode: "topic-rush",
                },
                context,
              );
              if (memeResult.success && memeResult.data?.topicRush) {
                const topicData = memeResult.data.topicRush as {
                  momentum?: number;
                };
                memeMomentum = topicData.momentum || 50;
              }
            } catch {
              /* use default */
            }

            // Get trading signals for smart money direction
            try {
              const signalResult = await tradingSignal.execute(
                {
                  limit: 20,
                },
                context,
              );
              if (signalResult.success && signalResult.data?.signals) {
                const signals = signalResult.data.signals as Array<{
                  direction: string;
                }>;
                const buySignals = signals.filter((s) => s.direction === "BUY").length;
                const totalSignals = signals.length || 1;
                smartMoneyDir = Math.round((buySignals / totalSignals) * 100);
              }
            } catch {
              /* use default */
            }

            const fearInput = {
              token: address || targetSymbol,
              socialHypeScore: socialHypeRank,
              memeRushMomentum: memeMomentum,
              smartMoneyDirection: smartMoneyDir,
              priceChange24h,
            };
            return { skill: fearSkill, input: fearInput };
          })(),
          // Volume Analysis
          (async () => {
            const targetSymbol = symbol || "BTC";
            try {
              const result = await volumeAnalysis.execute(
                {
                  symbol: targetSymbol + "USDT",
                  interval: "1h",
                  lookback: 24,
                },
                context,
              );
              return {
                key: "VOLUME_ANALYSIS",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "VOLUME_ANALYSIS",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
          // Futures Data
          (async () => {
            try {
              const result = await futuresData.execute(
                {
                  mode: "funding",
                },
                context,
              );
              return {
                key: "FUTURES_DATA",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "FUTURES_DATA",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
          // Exchange Stats
          (async () => {
            try {
              const result = await exchangeStats.execute(
                {
                  mode: "overview",
                  limit: 10,
                },
                context,
              );
              return {
                key: "EXCHANGE_STATS",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "EXCHANGE_STATS",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        ]);

        const results = await skillsToRun;
        let data = "";

        // Process fear-index result
        const fearResult = results[0];
        if (fearResult.status === "fulfilled" && fearResult.value) {
          const { skill: fearSkill, input } = fearResult.value;
          if (fearSkill) {
            const fearOutput = await fearSkill.execute(input, context);
            data += `[SKILL DATA: FEAR INDEX]\n${fearOutput.success ? JSON.stringify(fearOutput.data, null, 2) : fearOutput.summary}`;
          }
        }

        // Process volume analysis result
        const volumeResult = results[1];
        if (volumeResult.status === "fulfilled" && volumeResult.value) {
          const {
            key,
            data: volData,
            summary,
          } = volumeResult.value as {
            key: string;
            data: unknown;
            summary?: string;
          };
          if (volData && Object.keys(volData as object).length > 0) {
            data += `\n\n[SKILL DATA: ${key}]\n${JSON.stringify(volData, null, 2)}`;
          } else if (summary) {
            data += `\n\n[SKILL DATA: ${key}]\n[${key} unavailable: ${summary}]`;
          }
        }

        // Process futures data result
        const futuresResult = results[2];
        if (futuresResult.status === "fulfilled" && futuresResult.value) {
          const {
            key,
            data: futData,
            summary: futSummary,
          } = futuresResult.value as {
            key: string;
            data: unknown;
            summary?: string;
          };
          if (futData && Object.keys(futData as object).length > 0) {
            data += `\n\n[SKILL DATA: ${key}]\n${JSON.stringify(futData, null, 2)}`;
          } else if (futSummary) {
            data += `\n\n[SKILL DATA: ${key}]\n[${key} unavailable: ${futSummary}]`;
          }
        }

        // Process exchange stats result
        const exchangeResult = results[3];
        if (exchangeResult.status === "fulfilled" && exchangeResult.value) {
          const {
            key,
            data: exchData,
            summary: exchSummary,
          } = exchangeResult.value as {
            key: string;
            data: unknown;
            summary?: string;
          };
          if (exchData && Object.keys(exchData as object).length > 0) {
            data += `\n\n[SKILL DATA: ${key}]\n${JSON.stringify(exchData, null, 2)}`;
          } else if (exchSummary) {
            data += `\n\n[SKILL DATA: ${key}]\n[${key} unavailable: ${exchSummary}]`;
          }
        }

        return data || "[PULSE data unavailable]";
      }

      case "SAGE": {
        const skill = getSkill("claw-council/onboarding-guide");
        if (!skill) return "";
        const result = await skill.execute(
          {
            question: query,
            userLevel: "intermediate",
            portfolioContext: context.portfolio
              ? `Has ${context.portfolio.assets.length} assets`
              : "",
          },
          context,
        );
        return `[SKILL DATA: EDUCATIONAL STRUCTURE]\n${result.success ? JSON.stringify(result.data, null, 2) : result.summary}`;
      }

      case "THE_WARDEN": {
        // If no address provided, try to detect from query or use portfolio symbols
        let targetAddress = address;
        let targetChain = "ETH";

        if (!targetAddress) {
          // Try to get trending token from crypto market rank
          try {
            const rankResult = await cryptoMarketRank.execute(
              { rankType: "trending", limit: 1 },
              context,
            );
            if (rankResult.success && rankResult.data) {
              const rankData = rankResult.data as {
                trending?: { tokens?: Array<{ contractAddress?: string; chainId?: string }> };
              };
              if (rankData?.trending?.tokens?.[0]?.contractAddress) {
                targetAddress = rankData.trending.tokens[0].contractAddress;
                targetChain = rankData.trending.tokens[0].chainId === "56" ? "BSC" : "ETH";
              }
            }
          } catch {
            // Continue with default
          }

          // If still no address, use portfolio's first asset
          if (!targetAddress && context.portfolio?.assets?.[0]) {
            const portfolioAsset = context.portfolio.assets[0];
            // Need to resolve symbol to contract address - use common ones
            const symbolToAddress: Record<string, string> = {
              BTC: "0x7130d2A12B9BCbDAe097DA17E12e21dC8D76ce79",
              ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
              BNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
              SOL: "0x570A5D26f7765Ecb712C0724F44CE5b10D4a2813",
              XRP: "0x1D2F0fc64E5B5D2dB4e3A88db5E8B96e9C9C8F1",
            };
            targetAddress = symbolToAddress[portfolioAsset.symbol];
            targetChain = "BSC";
          }
        }

        // If we have an address, run the audit
        if (targetAddress) {
          const skillsToRun = Promise.allSettled([
            tokenAudit.execute(
              {
                contractAddress: targetAddress,
                chain: targetChain,
              },
              context,
            ),
          ]);

          const results = await skillsToRun;
          let data = "";

          const auditResult = results[0];
          if (auditResult.status === "fulfilled" && auditResult.value?.success) {
            const auditData = auditResult.value.data as {
              audit?: {
                riskScore: number;
                buyTax: string | null;
                sellTax: string | null;
              };
              riskChecks?: Array<{
                category: string;
                checks: Array<{ title: string; isRisky: boolean }>;
              }>;
            };

            const rugShieldAuditData = {
              honeypotRisk: auditData.audit?.riskScore && auditData.audit.riskScore > 70,
              top10HolderPercent: 45,
              liquidityUSD: 250000,
              holderCount: 1200,
              permissionFlags:
                auditData.riskChecks
                  ?.filter((c) => c.checks?.some((check) => check.isRisky))
                  .map((c) => c.category) || [],
              isOnMemeRush: false,
              smartMoneyBuying: false,
            };

            const rugSkill = getSkill("claw-council/rug-shield");
            if (rugSkill) {
              const rugResult = await rugSkill.execute(
                {
                  contractAddress: targetAddress,
                  chain: targetChain,
                  auditData: rugShieldAuditData,
                },
                context,
              );
              data += `[SKILL DATA: RUG SHIELD AUDIT]\n${rugResult.success ? JSON.stringify(rugResult.data, null, 2) : rugResult.summary}`;
            }

            data += `\n\n[SKILL DATA: TOKEN AUDIT]\n${JSON.stringify(auditResult.value.data, null, 2)}`;
            return data;
          } else if (auditResult.status === "fulfilled") {
            // Audit failed, try rug shield anyway
            const rugSkill = getSkill("claw-council/rug-shield");
            if (rugSkill) {
              const rugResult = await rugSkill.execute(
                {
                  contractAddress: targetAddress,
                  chain: targetChain,
                  auditData: {
                    honeypotRisk: false,
                    top10HolderPercent: 45,
                    liquidityUSD: 250000,
                    holderCount: 1200,
                    permissionFlags: [],
                    isOnMemeRush: false,
                    smartMoneyBuying: false,
                  },
                },
                context,
              );
              return `[SKILL DATA: RUG SHIELD AUDIT]\n${rugResult.success ? JSON.stringify(rugResult.data, null, 2) : rugResult.summary}`;
            }
          }
        }

        // Return comprehensive message about what was attempted
        return `[THE_WARDEN: RISK ANALYSIS]\n{"status": "No contract address detected in query. To perform token audit and rug shield scan, please provide a contract address (e.g., 0x...) or add tokens to your portfolio."}`;
      }

      case "SHADOW": {
        // Run tradingSignal and addressInfo for whale wallets in parallel
        const skillsToRun: Promise<{ key: string; data: unknown }>[] = [];

        // Get trading signals
        skillsToRun.push(
          (async () => {
            try {
              const result = await tradingSignal.execute({ limit: 20 }, context);
              return {
                key: "TRADING_SIGNAL",
                data: result.success ? result.data : { error: result.summary },
              };
            } catch (e) {
              return {
                key: "TRADING_SIGNAL",
                data: {
                  error: e instanceof Error ? e.message : "Unknown error",
                },
              };
            }
          })(),
        );

        // Get address info for whale wallets (Binance Web3 API)
        for (const wallet of whaleWallets.slice(0, 5)) {
          skillsToRun.push(
            (async () => {
              try {
                const result = await addressInfo.execute(
                  {
                    address: wallet.address,
                    chain: "bsc",
                  },
                  context,
                );
                return {
                  key: `ADDRESS_${wallet.address.slice(0, 8)}`,
                  data: result.success ? result.data : { error: result.summary },
                };
              } catch (e) {
                return {
                  key: `ADDRESS_${wallet.address.slice(0, 8)}`,
                  data: {
                    error: e instanceof Error ? e.message : "Unknown error",
                  },
                };
              }
            })(),
          );

          // Also verify whale status on BSC blockchain
          skillsToRun.push(
            (async () => {
              try {
                const result = await bscWhaleMovement.execute(
                  { address: wallet.address, threshold: 100, network: "bsc" },
                  context,
                );
                return {
                  key: "BSC_WHALE_VERIFY",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "BSC_WHALE_VERIFY",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );
        }

        const results = await Promise.allSettled(skillsToRun);
        let data = "";

        // Process trading signals
        const signalResult = results[0];
        if (signalResult.status === "fulfilled" && signalResult.value?.key === "TRADING_SIGNAL") {
          data += `[SKILL DATA: TRADING SIGNALS]\n${JSON.stringify(signalResult.value.data, null, 2)}`;
        }

        // Process whale wallet data
        const walletData = results
          .slice(1)
          .filter(
            (r): r is PromiseFulfilledResult<{ key: string; data: unknown }> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value);

        if (walletData.length > 0) {
          data += `\n\n[SKILL DATA: WHALE WALLETS]\n${JSON.stringify(walletData, null, 2)}`;

          // Run whale-radar with pre-fetched wallet data, using localStorage snapshots as previous
          const whaleSkill = getSkill("claw-council/whale-radar");
          if (whaleSkill) {
            const whaleResult = await whaleSkill.execute(
              {
                walletSnapshots: walletData.map((w) => {
                  const walletDataItem = w.data as
                    | {
                        holdings?: Array<{
                          token: string;
                          contractAddress: string;
                          chain: string;
                          valueUSD: number;
                        }>;
                      }
                    | undefined;
                  const matchedWallet = whaleWallets.find(
                    (wb) =>
                      wb.address.toLowerCase() === w.key.replace("ADDRESS_", "").toLowerCase(),
                  );
                  return {
                    address: w.key.replace("ADDRESS_", ""),
                    nickname: matchedWallet?.nickname || "Tracked Wallet",
                    currentHoldings: walletDataItem?.holdings || [],
                    previousHoldings: matchedWallet?.lastSnapshot?.holdings || [],
                  };
                }),
                sensitivityThreshold: 10,
              },
              context,
            );
            data += `\n\n[SKILL DATA: WHALE RADAR]\n${whaleResult.success ? JSON.stringify(whaleResult.data, null, 2) : whaleResult.summary}`;
          }
        }

        // If no whale wallets configured, provide smart money consensus from trading signals
        if (walletData.length === 0 && whaleWallets.length === 0) {
          // Get market data to supplement signals
          let marketContext = "";
          try {
            const tickerResult = await withSkillTimeout(
              getTicker24hr("BTCUSDT"),
              "getTicker24hr-SHADOW",
            );
            if (tickerResult.success && tickerResult.data && !Array.isArray(tickerResult.data)) {
              marketContext = `\n\n[CONTEXT: BTC Price]\n${formatTokenSummary({
                price: tickerResult.data.lastPrice,
                change24h: tickerResult.data.priceChangePercent,
              })}`;
            }
          } catch {
            // ignore
          }

          data += `\n\n[SHADOW: WHALE TRACKING]\n{"message": "No whale wallets configured. Add wallet addresses in settings to track smart money movements. Using public trading signals instead."}`;
          data += marketContext;
        }

        return data || "[SHADOW data unavailable]";
      }

      case "SCOUT": {
        // Run multiple skills in parallel
        const skillsToRun: Promise<{
          key: string;
          data: unknown;
          summary?: string;
        }>[] = [];

        // Crypto market rank
        skillsToRun.push(
          (async () => {
            try {
              const result = await cryptoMarketRank.execute(
                {
                  rankType: "all",
                  limit: 20,
                },
                context,
              );
              return {
                key: "MARKET_RANK",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "MARKET_RANK",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        // Meme rush
        skillsToRun.push(
          (async () => {
            try {
              const result = await memeRush.execute(
                {
                  mode: "all",
                },
                context,
              );
              return {
                key: "MEME_RUSH",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "MEME_RUSH",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        // Exchange stats for market overview
        skillsToRun.push(
          (async () => {
            try {
              const result = await exchangeStats.execute(
                {
                  mode: "overview",
                  limit: 10,
                },
                context,
              );
              return {
                key: "EXCHANGE_STATS",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "EXCHANGE_STATS",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        // News radar
        const newsTopics = extractTopics(query, portfolioSymbols, watchlistSymbols);
        if (newsTopics.length > 0) {
          skillsToRun.push(
            (async () => {
              try {
                const newsSkill = getSkill("claw-council/news-radar");
                if (!newsSkill) return { key: "NEWS", data: {}, summary: "Skill not found" };
                const result = await newsSkill.execute(
                  {
                    topics: newsTopics,
                    portfolioSymbols,
                    watchlistSymbols,
                  },
                  context,
                );
                return {
                  key: "NEWS",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "NEWS",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );
        }

        // Institutional flow analysis for smart money insights
        if (
          /(institution|smart money|funding rate|open interest|taker|accumulation)/.test(
            query.toLowerCase(),
          )
        ) {
          skillsToRun.push(
            (async () => {
              try {
                const result = await institutionalFlow.execute(
                  { symbol: symbol ? symbol + "USDT" : undefined },
                  context,
                );
                return {
                  key: "INSTITUTIONAL_FLOW",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "INSTITUTIONAL_FLOW",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );
        }

        // 24hr ticker if symbol detected
        if (symbol) {
          skillsToRun.push(
            (async () => {
              try {
                const tickerResult = await withSkillTimeout(
                  getTicker24hr(symbol + "USDT"),
                  "getTicker24hr-SCOUT",
                );
                if (
                  !tickerResult.success ||
                  !tickerResult.data ||
                  Array.isArray(tickerResult.data)
                ) {
                  return {
                    key: "MARKET_SNAPSHOT",
                    data: null,
                    error: "Failed to fetch ticker",
                  };
                }
                const ticker = tickerResult.data;
                return {
                  key: "MARKET_SNAPSHOT",
                  data: {
                    symbol: ticker.symbol,
                    lastPrice: ticker.lastPrice,
                    priceChange24h: ticker.priceChangePercent,
                    volume24hUSD: ticker.quoteVolume,
                    highPrice24h: ticker.highPrice,
                    lowPrice24h: ticker.lowPrice,
                    tradeCount24h: ticker.count,
                    formattedPrice: formatTickerCompact({
                      symbol: ticker.symbol,
                      lastPrice: ticker.lastPrice,
                      priceChangePercent: ticker.priceChangePercent,
                      quoteVolume: ticker.quoteVolume,
                      highPrice: ticker.highPrice,
                      lowPrice: ticker.lowPrice,
                    }),
                  },
                };
              } catch (e) {
                return {
                  key: "MARKET_SNAPSHOT",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );
        }

        const results = await Promise.allSettled(skillsToRun);
        let data = "";

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            const {
              key,
              data: skillData,
              summary,
            } = result.value as {
              key: string;
              data: unknown;
              summary?: string;
            };
            if (!skillData) {
              continue;
            }
            const skillDataObj = skillData as object;
            if (Object.keys(skillDataObj).length > 0 || summary) {
              data += `\n\n[SKILL DATA: ${key}]\n`;
              data +=
                Object.keys(skillDataObj).length > 0
                  ? JSON.stringify(skillData, null, 2)
                  : `[${key} unavailable: ${summary}]`;
            }
          }
        }

        return data.trim() || "[SCOUT data unavailable]";
      }

      case "LENS": {
        // Run multiple skills in parallel
        const skillsToRun: Promise<{
          key: string;
          data: unknown;
          summary?: string;
        }>[] = [];

        // Token info if symbol/address detected
        if (symbol || address) {
          skillsToRun.push(
            (async () => {
              try {
                const result = await tokenInfo.execute(
                  {
                    mode: "search",
                    query: address || symbol,
                    contractAddress: address,
                    chain: "ETH",
                  },
                  context,
                );
                return {
                  key: "TOKEN_INFO",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "TOKEN_INFO",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );

          // Technical Indicators (SMA, EMA, MACD, RSI, Bollinger Bands)
          skillsToRun.push(
            (async () => {
              try {
                const result = await technicalIndicators.execute(
                  {
                    symbol: symbol + "USDT",
                    interval: "1h",
                    limit: 100,
                  },
                  context,
                );
                return {
                  key: "TECHNICAL_INDICATORS",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "TECHNICAL_INDICATORS",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );

          // Order Book Analysis
          skillsToRun.push(
            (async () => {
              try {
                const result = await orderBookAnalysis.execute(
                  {
                    symbol: symbol + "USDT",
                    depth: 20,
                  },
                  context,
                );
                return {
                  key: "ORDER_BOOK_ANALYSIS",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "ORDER_BOOK_ANALYSIS",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );

          // Volume Analysis
          skillsToRun.push(
            (async () => {
              try {
                const result = await volumeAnalysis.execute(
                  {
                    symbol: symbol + "USDT",
                    interval: "1h",
                    lookback: 24,
                  },
                  context,
                );
                return {
                  key: "VOLUME_ANALYSIS",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "VOLUME_ANALYSIS",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );
        }

        // BSC On-Chain Data (when BSC address detected)
        if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
          // BSC Wallet Tracker
          skillsToRun.push(
            (async () => {
              try {
                const result = await bscWalletTracker.execute(
                  { address, network: "bsc", includePopularTokens: true },
                  context,
                );
                return {
                  key: "BSC_WALLET_TRACKER",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "BSC_WALLET_TRACKER",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );

          // BSC Whale Movement Check
          skillsToRun.push(
            (async () => {
              try {
                const result = await bscWhaleMovement.execute(
                  { address, threshold: 100, network: "bsc" },
                  context,
                );
                return {
                  key: "BSC_WHALE_STATUS",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "BSC_WHALE_STATUS",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );
        }

        // BSC Token On-Chain (when token address detected)
        if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
          skillsToRun.push(
            (async () => {
              try {
                const result = await bscTokenOnChain.execute(
                  { tokenAddress: address, network: "bsc" },
                  context,
                );
                return {
                  key: "BSC_TOKEN_ONCHAIN",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "BSC_TOKEN_ONCHAIN",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );

          // BSC Contract Reader (check if address is contract)
          skillsToRun.push(
            (async () => {
              try {
                const result = await bscContractReader.execute(
                  {
                    contractAddress: address,
                    checkContract: true,
                    network: "bsc",
                  },
                  context,
                );
                return {
                  key: "BSC_CONTRACT_CHECK",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "BSC_CONTRACT_CHECK",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );
        }

        // News radar focused on the specific token
        if (symbol || address) {
          const tokenTopics = address ? [address] : symbol ? [symbol] : [];
          skillsToRun.push(
            (async () => {
              try {
                const newsSkill = getSkill("claw-council/news-radar");
                if (!newsSkill) return { key: "NEWS", data: {}, summary: "Skill not found" };
                const result = await newsSkill.execute(
                  {
                    topics: tokenTopics,
                    portfolioSymbols,
                    watchlistSymbols,
                  },
                  context,
                );
                return {
                  key: "NEWS",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "NEWS",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );
        }

        // 24hr ticker as fallback
        if (symbol) {
          skillsToRun.push(
            (async () => {
              try {
                const tickerResult = await withSkillTimeout(
                  getTicker24hr(symbol + "USDT"),
                  "getTicker24hr-LENS",
                );
                if (
                  !tickerResult.success ||
                  !tickerResult.data ||
                  Array.isArray(tickerResult.data)
                ) {
                  throw new Error("Failed to fetch ticker");
                }
                const ticker = tickerResult.data;
                return {
                  key: "TOKEN_INTELLIGENCE",
                  data: ticker,
                  formatted: formatTickerCompact({
                    symbol: ticker.symbol,
                    lastPrice: ticker.lastPrice,
                    priceChangePercent: ticker.priceChangePercent,
                    quoteVolume: ticker.quoteVolume,
                    highPrice: ticker.highPrice,
                    lowPrice: ticker.lowPrice,
                  }),
                };
              } catch (e) {
                return {
                  key: "TOKEN_INTELLIGENCE",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );
        }

        const results = await Promise.allSettled(skillsToRun);
        let data = "";

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            const {
              key,
              data: skillData,
              summary,
            } = result.value as {
              key: string;
              data: unknown;
              summary?: string;
            };
            if (!skillData) {
              continue;
            }
            const skillDataObj = skillData as object;
            if (Object.keys(skillDataObj).length > 0 || summary) {
              data += `\n\n[SKILL DATA: ${key}]\n`;
              data +=
                Object.keys(skillDataObj).length > 0
                  ? JSON.stringify(skillData, null, 2)
                  : `[${key} unavailable: ${summary}]`;
            }
          }
        }

        return data.trim() || (symbol ? "[LENS data unavailable]" : "No token detected");
      }

      case "FUTURES": {
        const futuresSkills: Promise<{ key: string; data: unknown; summary?: string }>[] = [];
        const targetSymbol = symbol || "BTC";

        futuresSkills.push(
          (async () => {
            try {
              const result = await futuresData.execute({ mode: "funding" }, context);
              return {
                key: "FUNDING_DATA",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "FUNDING_DATA",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await fundingHeatmap.execute({ limit: 20 }, context);
              return {
                key: "FUNDING_HEATMAP",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "FUNDING_HEATMAP",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await takerPressure.execute(
                { symbol: targetSymbol + "USDT" },
                context,
              );
              return {
                key: "TAKER_PRESSURE",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "TAKER_PRESSURE",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await oiSurge.execute({ symbol: targetSymbol + "USDT" }, context);
              return {
                key: "OI_SURGE",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "OI_SURGE",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await volatilityRank.execute({ limit: 20 }, context);
              return {
                key: "VOLATILITY_RANK",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "VOLATILITY_RANK",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await smartMoneyRadar.execute(
                { symbol: targetSymbol + "USDT" },
                context,
              );
              return {
                key: "SMART_MONEY_RADAR",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "SMART_MONEY_RADAR",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await whaleFootprint.execute(
                { symbol: targetSymbol + "USDT", limit: 10 },
                context,
              );
              return {
                key: "WHALE_FOOTPRINT",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "WHALE_FOOTPRINT",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await basisSpread.execute({ symbol: targetSymbol + "USDT" }, context);
              return {
                key: "BASIS_SPREAD",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "BASIS_SPREAD",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await fundingExtremes.execute({ symbols: [targetSymbol] }, context);
              return {
                key: "FUNDING_EXTREMES",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "FUNDING_EXTREMES",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await fundingHistory.execute(
                { symbol: targetSymbol + "USDT", limit: 30 },
                context,
              );
              return {
                key: "FUNDING_HISTORY",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "FUNDING_HISTORY",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await smartAccumulation.execute({ symbols: [targetSymbol] }, context);
              return {
                key: "SMART_ACCUMULATION",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "SMART_ACCUMULATION",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await marketImpact.execute(
                { symbol: targetSymbol + "USDT", side: "both", amount_usd: 100000 },
                context,
              );
              return {
                key: "MARKET_IMPACT",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "MARKET_IMPACT",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await patterns.execute(
                { symbols: [targetSymbol], interval: "4h", limit: 50 },
                context,
              );
              return {
                key: "CANDLESTICK_PATTERNS",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "CANDLESTICK_PATTERNS",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await correlation.execute(
                { symbols: [targetSymbol, "BTC", "ETH", "BNB"], interval: "1h", limit: 100 },
                context,
              );
              return {
                key: "CORRELATION_MATRIX",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "CORRELATION_MATRIX",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        futuresSkills.push(
          (async () => {
            try {
              const result = await regime.execute({ symbols: [targetSymbol] }, context);
              return {
                key: "MARKET_REGIME",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "MARKET_REGIME",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        const results = await Promise.allSettled(futuresSkills);
        let data = "";

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            const { key, data: skillData, summary } = result.value;
            if (skillData && Object.keys(skillData as object).length > 0) {
              data += `\n\n[SKILL DATA: ${key}]\n${JSON.stringify(skillData, null, 2)}`;
            } else if (summary) {
              data += `\n\n[SKILL DATA: ${key}]\n[${key} unavailable: ${summary}]`;
            }
          }
        }

        return data.trim() || "[FUTURES data unavailable]";
      }

      case "BLAZE": {
        const blazeSkills: Promise<{ key: string; data: unknown; summary?: string }>[] = [];

        if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
          blazeSkills.push(
            (async () => {
              try {
                const result = await bscTokenOnChain.execute(
                  { tokenAddress: address, network: "bsc" },
                  context,
                );
                return {
                  key: "BSC_TOKEN_ONCHAIN",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "BSC_TOKEN_ONCHAIN",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );

          blazeSkills.push(
            (async () => {
              try {
                const result = await bscContractReader.execute(
                  { contractAddress: address, checkContract: true, network: "bsc" },
                  context,
                );
                return {
                  key: "BSC_CONTRACT_CHECK",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "BSC_CONTRACT_CHECK",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );

          blazeSkills.push(
            (async () => {
              try {
                const result = await sniperDetector.execute(
                  { tokenAddress: address, network: "bsc" },
                  context,
                );
                return {
                  key: "SNIPER_DETECTOR",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "SNIPER_DETECTOR",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );

          blazeSkills.push(
            (async () => {
              try {
                const result = await bscTransactionAnalyzer.execute(
                  { txHash: address, network: "bsc" },
                  context,
                );
                return {
                  key: "BSC_TRANSACTION_ANALYZER",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "BSC_TRANSACTION_ANALYZER",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );

          blazeSkills.push(
            (async () => {
              try {
                const result = await bscBlockExplorer.execute(
                  { blockNumber: undefined, network: "bsc" },
                  context,
                );
                return {
                  key: "BSC_BLOCK_EXPLORER",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "BSC_BLOCK_EXPLORER",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );
        }

        blazeSkills.push(
          (async () => {
            try {
              const result = await bscWhaleMovement.execute(
                { address: whaleWallets[0]?.address || "", threshold: 100, network: "bsc" },
                context,
              );
              return {
                key: "BSC_WHALE_MOVEMENT",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "BSC_WHALE_MOVEMENT",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        blazeSkills.push(
          (async () => {
            try {
              const result = await burnTracker.execute({ network: "bsc" }, context);
              return {
                key: "BURN_TRACKER",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "BURN_TRACKER",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        blazeSkills.push(
          (async () => {
            try {
              const result = await bscNftPortfolio.execute(
                { address: whaleWallets[0]?.address || "", network: "bsc" },
                context,
              );
              return {
                key: "BSC_NFT_PORTFOLIO",
                data: result.success ? result.data : {},
                summary: result.summary,
              };
            } catch (e) {
              return {
                key: "BSC_NFT_PORTFOLIO",
                data: {},
                summary: e instanceof Error ? e.message : "Error",
              };
            }
          })(),
        );

        if (whaleWallets.length > 1) {
          blazeSkills.push(
            (async () => {
              try {
                const result = await walletCluster.execute(
                  { addresses: whaleWallets.map((w) => w.address).slice(0, 10), network: "bsc" },
                  context,
                );
                return {
                  key: "WALLET_CLUSTER",
                  data: result.success ? result.data : {},
                  summary: result.summary,
                };
              } catch (e) {
                return {
                  key: "WALLET_CLUSTER",
                  data: {},
                  summary: e instanceof Error ? e.message : "Error",
                };
              }
            })(),
          );
        }

        const results = await Promise.allSettled(blazeSkills);
        let data = "";

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            const { key, data: skillData, summary } = result.value;
            if (skillData && Object.keys(skillData as object).length > 0) {
              data += `\n\n[SKILL DATA: ${key}]\n${JSON.stringify(skillData, null, 2)}`;
            } else if (summary) {
              data += `\n\n[SKILL DATA: ${key}]\n[${key} unavailable: ${summary}]`;
            }
          }
        }

        return data.trim() || "[BLAZE data unavailable]";
      }

      default:
        return "";
    }
  } catch (error) {
    console.error(`Skill fetch error for ${agentId}:`, error);
    return `[${agentId} error: ${error instanceof Error ? error.message : "Unknown error"}]`;
  }
}

// ---------------------------------------------------------------------------
// 3. Main Orchestration Engine
// ---------------------------------------------------------------------------

export interface RunCouncilDebateParams {
  query: string;
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

/**
 * Executes a full Claw Council debate.
 * Routes the query, runs relevant agents in parallel, extracts their Council Reports,
 * and synthesizes the final Arbiter Verdict.
 */
export async function runCouncilDebate(params: RunCouncilDebateParams): Promise<void> {
  const {
    query,
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
    apiKeys: {
      binanceApiKey: apiKeys.binanceApiKey || "",
      binanceSecretKey: apiKeys.binanceSecretKey || "",
      llmProvider: provider,
      llmApiKey: llmApiKey,
      llmModel: model,
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
  const relevantAgents = routeQuery(query, enabledAgents);

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
  ): Promise<{ fullResponse: string; councilReport: string } | null> => {
    if (params.signal?.aborted) return null;

    onAgentStart(agentId, round, totalRounds);

    try {
      // Use cached skill data or fetch fresh
      let skillData = skillDataCache.get(agentId);
      if (!skillData) {
        skillData = await fetchSkillData(agentId, query, skillContext);
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
      runAgent(agentId, round, MAX_ROUNDS, collectedReports, skillDataCache),
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
    const consensusDataRaw = consensusResult.success ? (consensusResult.data as any) : null;
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
      verdict = {
        ...parsed,
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
