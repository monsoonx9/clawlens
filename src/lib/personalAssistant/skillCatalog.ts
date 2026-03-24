/**
 * Skill Catalog — Auto-generates a compact numbered list of all user-facing
 * skills for the LLM intent classification prompt.
 *
 * This replaces the need for manual keyword maintenance.  Whenever a new skill
 * is registered in `skills/index.ts`, it automatically appears here.
 */

import { skillRegistry, Skill } from "@/skills";

// Internal skills that should never be offered to users
const INTERNAL_SKILLS = new Set([
  "claw-council/council-analyzer",
  "claw-council/consensus-detector",
  "claw-council/verdict-synthesizer",
]);

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  params: string[]; // list of parameter names the skill accepts
}

/**
 * Returns all user-facing skills as a compact catalog array.
 */
export function getSkillCatalog(): CatalogEntry[] {
  const catalog: CatalogEntry[] = [];

  for (const [id, skill] of skillRegistry) {
    if (INTERNAL_SKILLS.has(id)) continue;
    catalog.push({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      params: Object.keys(skill.inputSchema || {}),
    });
  }

  return catalog;
}

/**
 * Generates the compact text prompt that lists all available tools for the LLM
 * classifier.  Each line is:  `N. [skill-id] — Description (params: x, y)`
 */
export function getSkillCatalogPrompt(): string {
  const catalog = getSkillCatalog();
  const lines = catalog.map((entry, i) => {
    const paramStr = entry.params.length > 0 ? ` (params: ${entry.params.join(", ")})` : "";
    return `${i + 1}. [${entry.id}] — ${entry.description}${paramStr}`;
  });
  return lines.join("\n");
}

/**
 * Returns the full system prompt used for the intent-classification LLM call.
 */
export function getIntentClassificationPrompt(): string {
  const catalog = getSkillCatalogPrompt();

  return `You are a tool-selection AI for ClawLens, a crypto analysis platform.
Given the user's message, decide which tools (skills) to invoke and with what parameters.

AVAILABLE TOOLS:
${catalog}

EXAMPLES (these show how natural language maps to tools):
{"query": "how are my holdings doing?", "tools": [{"id": "claw-council/portfolio-pulse", "params": {}}]}
{"query": "check my portfolio value", "tools": [{"id": "claw-council/portfolio-pulse", "params": {}}]}
{"query": "what's my PnL?", "tools": [{"id": "claw-council/portfolio-pulse", "params": {}}]}
{"query": "BTC price", "tools": [{"id": "binance/spot", "params": {"symbol": "BTC"}}]}
{"query": "how much is ETH worth?", "tools": [{"id": "binance/spot", "params": {"symbol": "ETH"}}]}
{"query": "what's trading at?", "tools": [{"id": "binance/spot", "params": {"symbol": "SOL"}}]}
{"query": "is this token safe?", "tools": [{"id": "claw-council/rug-shield", "params": {"address": "..."}}]}
{"query": "any scams here?", "tools": [{"id": "claw-council/rug-shield", "params": {"address": "..."}}]}
{"query": "check for honeypot", "tools": [{"id": "claw-council/rug-shield", "params": {"address": "..."}}]}
{"query": "is this a rug?", "tools": [{"id": "claw-council/rug-shield", "params": {"address": "..."}}]}
{"query": "any whale activity?", "tools": [{"id": "claw-council/whale-radar", "params": {}}]}
{"query": "big money moving?", "tools": [{"id": "claw-council/whale-radar", "params": {}}]}
{"query": "smart money buying?", "tools": [{"id": "binance/smart-accumulation", "params": {}}]}
{"query": "institutional accumulation?", "tools": [{"id": "binance/smart-accumulation", "params": {}}]}
{"query": "how's the market looking?", "tools": [{"id": "claw-council/fear-index", "params": {}}, {"id": "binance/crypto-market-rank", "params": {}}]}
{"query": "sentiment rough today", "tools": [{"id": "claw-council/fear-index", "params": {}}]}
{"query": "funding rate for BTC", "tools": [{"id": "binance/futures-data", "params": {"symbol": "BTC"}}]}
{"query": "long vs short ratio", "tools": [{"id": "binance/taker-pressure", "params": {"symbol": "BTC"}}]}
{"query": "taker buy volume", "tools": [{"id": "binance/taker-pressure", "params": {"symbol": "BTC"}}]}
{"query": "detect sniper bots on this token", "tools": [{"id": "bsc/sniper-detector", "params": {"address": "..."}}]}
{"query": "any bot activity?", "tools": [{"id": "bsc/sniper-detector", "params": {"address": "..."}}]}
{"query": "were tokens burned?", "tools": [{"id": "bsc/burn-tracker", "params": {"address": "..."}}]}
{"query": "burn history", "tools": [{"id": "bsc/burn-tracker", "params": {"address": "..."}}]}
{"query": "related wallets to this address", "tools": [{"id": "bsc/wallet-cluster", "params": {"address": "..."}}]}
{"query": "cluster analysis", "tools": [{"id": "bsc/wallet-cluster", "params": {"address": "..."}}]}
{"query": "track this wallet", "tools": [{"id": "bsc/bsc-wallet-tracker", "params": {"address": "..."}}]}
{"query": "what does this address hold?", "tools": [{"id": "bsc/bsc-wallet-tracker", "params": {"address": "..."}}]}
{"query": "DCA backtest for BTC", "tools": [{"id": "binance/dca-backtester", "params": {"symbol": "BTC"}}]}
{"query": "dollar cost averaging results", "tools": [{"id": "binance/dca-backtester", "params": {"symbol": "BTC"}}]}
{"query": "RSI for ETH", "tools": [{"id": "binance/technical-indicators", "params": {"symbol": "ETH"}}]}
{"query": "technical analysis", "tools": [{"id": "binance/technical-indicators", "params": {"symbol": "BTC"}}]}
{"query": "trending tokens", "tools": [{"id": "binance/crypto-market-rank", "params": {}}]}
{"query": "top gainers", "tools": [{"id": "binance/crypto-market-rank", "params": {}}]}
{"query": "hot meme coins?", "tools": [{"id": "binance/meme-rush", "params": {}}]}
{"query": "trending memecoins", "tools": [{"id": "binance/meme-rush", "params": {}}]}
{"query": "latest crypto news", "tools": [{"id": "claw-council/news-radar", "params": {}}]}
{"query": "any news on BTC?", "tools": [{"id": "claw-council/news-radar", "params": {"symbol": "BTC"}}]}
{"query": "what's this address?", "tools": [{"id": "claw-council/address-info", "params": {"address": "..."}}]}
{"query": "market heatmap", "tools": [{"id": "claw-council/market-heatmap", "params": {}}]}
{"query": "visualize top tokens", "tools": [{"id": "claw-council/market-heatmap", "params": {}}]}

RULES:
1. Pick 1-5 tools that BEST answer the user's query. If the user asks a broad question, you MUST select multiple complementary tools to provide a complete picture.
2. Extract ALL relevant parameters from the message (symbol, address, amount, totalBudgetUSD, durationWeeks, interval_days, targetAsset, riskTolerance).
3. If the user mentions a specific tool by name (e.g. "meme rush", "rug shield", "sniper detector"), ALWAYS include that tool.
4. For general market questions ("what's hot", "trending"), use crypto-market-rank or meme-rush.
5. For token-specific questions, include the relevant analysis tool AND query-token-info for price data.
6. For questions about the user's own portfolio, holdings, or balances, use claw-council/portfolio-pulse.
7. For implicit market sentiment ("looks rough", "feeling bearish", "market scared"), use fear-index.
8. For BSC/BNB Chain questions about wallets, tokens, or contracts, use bsc/* tools.
9. For visual market overviews or heatmaps of the top assets, use claw-council/market-heatmap.
10. If you cannot determine what tool to use, return an empty tools array.

Respond with ONLY valid JSON, no markdown:
{"tools":[{"id":"skill-id-here","params":{"key":"value"}}],"reasoning":"brief explanation"}`;
}
