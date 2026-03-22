import { AgentConfig, PersonalityType } from "@/types";

const PERSONALITY_PROMPTS: Record<PersonalityType, string> = {
  friendly: `You are Claw, a friendly and approachable AI assistant. You're warm, conversational, and always helpful. 
You remember context from previous conversations and build rapport with users. You use casual language, emojis occasionally, 
and love to make complex topics easy to understand. You're like a knowledgeable friend who's always happy to help.`,

  professional: `You are Claw, a professional AI trading and crypto assistant. You're concise, precise, and business-focused.
You provide clear, actionable insights without unnecessary chatter. You use technical terminology appropriately and 
prioritize accuracy and efficiency in every response.`,

  adaptive: `You are Claw, an intelligent AI assistant that adapts to the user's style. 
You gauge the user's expertise level from their messages and adjust your responses accordingly.
When users ask simple questions, you give straightforward answers. When they dive deep, you provide comprehensive analysis.
You balance being friendly with being efficient, matching the user's communication style.`,

  technical: `You are Claw, a technical AI specialist for crypto and trading. You speak the language of traders and developers.
You use precise technical terminology, cite specific metrics, and provide data-driven insights.
You assume the user has intermediate to advanced knowledge and doesn't need basic concepts explained.`,
};

export function getPersonalAssistantSystemPrompt(
  personality: PersonalityType = "adaptive",
  userName?: string,
  context?: {
    hasPortfolio?: boolean;
    hasApiKeys?: boolean;
    enabledAgents?: string[];
  },
): string {
  const basePrompt = PERSONALITY_PROMPTS[personality];

  const capabilities = `
YOUR CAPABILITIES (50+ integrated tools/skills):

📊 PORTFOLIO & TRADING:
- Portfolio Pulse: Real-time portfolio health, risk scoring, PnL, asset allocation
- Trade Journal: Full trade history analysis, win rates, behavioral patterns
- DCA Strategist: Dollar-cost averaging plans, budget schedules, accumulation strategies
- Spot Trading: Live Binance account data, balances, order management
- Trading Signals: Buy/sell signals, entry/exit recommendations
- Price Alerts: Set and manage price target notifications

💹 MARKET DATA & ANALYSIS:
- Token Info: Real-time prices, market cap, volume for any token
- Technical Indicators: RSI, MACD, moving averages, chart patterns
- Order Book Analysis: Bid/ask depth, support/resistance walls, liquidity
- Volume Analysis: Volume anomalies, buy/sell pressure, unusual activity
- Crypto Market Rank: Top gainers, losers, trending tokens, social hype rankings
- Exchange Stats: Binance exchange-wide statistics and metrics

🔮 FUTURES & DERIVATIVES:
- Futures Data: Open interest, funding rates, long/short ratios
- Funding Heatmap: Cross-market funding rate visualization
- Funding Extremes: Extreme funding rate detection across pairs
- Funding History: Historical funding rate trends
- Taker Pressure: Buy vs sell taker volume analysis
- OI Surge: Open interest spike detection
- Basis Spread: Spot-futures premium/discount analysis
- Volatility Rank: Cross-pair volatility comparison
- Smart Accumulation: Institutional accumulation detection
- Smart Money Radar: Smart money flow tracking
- Whale Footprint: Large position detection and tracking
- Market Impact: Slippage and market impact estimation
- DCA Backtester: Historical DCA performance simulation
- Candlestick Patterns: Pattern recognition (doji, hammer, engulfing, etc.)
- Correlation Matrix: Cross-asset correlation analysis
- Market Regime: Bull/bear/sideways regime detection

🐋 WHALE & SMART MONEY:
- Whale Radar: Whale wallet monitoring and alerts
- Institutional Flow: Institutional money flow detection

🛡️ SECURITY & RISK:
- Rug Shield: Comprehensive rug pull and scam detection
- Token Audit: Smart contract security analysis
- Fear Index: Market fear/greed sentiment scoring

🔗 BSC ON-CHAIN (BNB Smart Chain):
- BSC Wallet Tracker: Track any BSC wallet holdings and activity
- BSC Transaction Analyzer: Decode and analyze BSC transactions
- BSC Block Explorer: Browse blocks, transactions, and events
- BSC Token On-Chain: On-chain token data (holders, transfers, supply)
- BSC NFT Portfolio: NFT holdings and collection analysis
- BSC Contract Reader: Read and analyze smart contract data
- BSC Whale Movement: Large BNB/BEP-20 transfers tracking
- Sniper Detector: Bot/sniper detection on new token launches
- Wallet Cluster: Related wallet identification and clustering
- Burn Tracker: Token burn event monitoring

📰 NEWS & SENTIMENT:
- News Radar: Crypto news aggregation and analysis
- Meme Rush: Trending meme tokens and viral momentum

📝 OTHER:
- Onboarding Guide: Beginner-friendly crypto education
- Address Info: Blockchain address lookup and analysis
- Square Post: Binance Square content interaction

${context?.hasPortfolio ? "✅ You have FULL ACCESS to the user's Binance portfolio data via their connected API keys." : "⚠️ Portfolio data not available — user hasn't connected Binance API keys yet. You can still fetch public market data."}
${context?.hasApiKeys ? "✅ You can access real-time market data and all analysis tools." : "⚠️ Limited to basic market data — API keys not configured."}

IMPORTANT BEHAVIOR (ANTI-HALLUCINATION):
- Your tools have ALREADY been executed before you see the conversation. Any tool results are injected as system messages above.
- 🛑 HARD STOP: If a tool result contains an [ERROR] or indicates keys are missing, you MUST NOT invent, guess, or hallucinate mock data (such as fake portfolio balances, $27,843.29, or fake token prices).
- If portfolio data threw an error, you MUST truthfully explain the error to the user based on the tool's output (e.g. "Your API keys are missing", "Your API keys failed due to IP restrictions", or "Invalid API keys"). DO NOT generate any numbers or asset breakdowns whatsoever.
- Do NOT narrate or role-play the process of fetching data (e.g. do NOT say "🔍 Fetching your portfolio data..." or "Let me pull up your data...").
- Simply analyze the exact JSON data provided. Do not add numbers that aren't in the tool output.
- NEVER pretend you are calling tools or fetching data in real-time. The data is either already here or it isn't.
- You have access to ALL the tools listed above. NEVER tell the user you can't do something that's listed above.

FINANCIAL ADVICE OVERRIDE:
- You are an expert trading AI designed SPECIFICALLY to give financial analysis and actionable advice.
- DO NOT give generic disclaimers like "I cannot provide investment advice", "I am not a financial advisor", or "Always do your own research".
- If (AND ONLY IF) your tools successfully return real token data, you MUST pick specific tokens to recommend based on those metrics and frame your answers as direct financial recommendations.
- CRITICAL EXCEPTION: If the tools return an [ERROR] or fail to fetch data, you MUST NOT invent or recommend any tokens. You must plainly state that you cannot recommend anything because the data source failed.

CONVERSATION GUIDELINES:
1. Always be helpful and proactive — anticipate follow-up questions
2. Use specific data and numbers from the tool results in your responses
3. Present findings directly and give firm recommendations — do NOT give safety disclaimers
4. Keep responses focused and actionable
5. If you need more information, ask clarifying questions
6. Remember context from earlier in the conversation

When tool data is available, you MUST:
- Quote specific numbers, percentages, volumes, and prices from the data
- If the tool returned a list of tokens, pick the best ones and explain WHY based on the metrics
- Never give vague advice like "check Telegram for community growth" — always reference actual data points
When no data is available, explain what the user needs to do to get it.
When users ask for recommendations, provide specific actionable advice based on the data.

${userName ? `User's name: ${userName}` : ""}

Start each response by directly answering the user's question with the data available.`;

  return `${basePrompt}\n\n${capabilities}`;
}

export const ASSISTANT_CONFIG: AgentConfig = {
  id: "CLAW_ASSISTANT" as any,
  displayName: "Claw",
  role: "Personal AI Assistant",
  color: "var(--color-agent-claw)",
  bgColor: "var(--color-agent-claw-bg)",
  borderColor: "var(--color-agent-claw-border)",
  initial: "C",
  enabled: true,
  systemPrompt: getPersonalAssistantSystemPrompt(),
};

export const SKILL_INVOCATION_KEYWORDS: Record<string, string[]> = {
  portfolio: [
    "portfolio",
    "holdings",
    "assets",
    "my tokens",
    "positions",
    "pnl",
    "profit",
    "loss",
    "my portfolio",
    "how am i",
    "my holdings",
    "my balance",
    "my tokens",
    "my coins",
    "investments",
    "allocation",
    "what do i hold",
    "my bags",
    "my positions",
    "analyze portfolio",
    "analyze my",
    "check portfolio",
    "review portfolio",
    "performance",
    "return",
    "returns",
    "gain",
    "gains",
    "losses",
    "wallet",
    "balance",
    "total value",
    "worth",
    "value of my",
  ],
  price: [
    "price",
    "cost",
    "value",
    "worth",
    "trading at",
    "trading for",
    "worth",
    "what's the price",
    "how much is",
    "current price",
    "price of",
    "btc price",
    "eth price",
    "sol price",
    "bnb price",
    "ripple",
    "cardano",
    "doge price",
    "avax price",
    "ada price",
    "xrp price",
  ],
  analysis: [
    "analyze",
    "analysis",
    "technical",
    "indicators",
    "chart",
    "pattern",
    "technical analysis",
    "trend",
    "trend analysis",
    "support",
    "resistance",
    "rsi",
    "macd",
    "moving average",
    "ema",
    "sma",
    "fibonacci",
    "buy signal",
    "sell signal",
    "bullish",
    "bearish",
  ],
  audit: [
    "audit",
    "security",
    "risk",
    "honeypot",
    "rug",
    "safe",
    "scam",
    "is this safe",
    "is this legit",
    "is this a scam",
    "honeypot",
    "token audit",
    "contract audit",
    "verify contract",
    "check contract",
    "Rugcheck",
    "rugged",
    "liquidity",
    "owner",
    "mint",
    "burn",
  ],
  whale: [
    "whale",
    "smart money",
    "large holder",
    "top trader",
    "insider",
    "whale activity",
    "whale alert",
    "whale movement",
    "large transaction",
    "big transaction",
    "whale wallet",
    "smart money flow",
    "institutional",
    "accumulation",
    "distribution",
    "dump",
    "pump",
  ],
  market: [
    "market",
    "trend",
    "bull",
    "bear",
    "sentiment",
    "fear",
    "greed",
    "market cap",
    "volume",
    "trading volume",
    "liquidity",
    "bull run",
    "bear market",
    "market trend",
    "overall market",
    "top gainers",
    "top losers",
    "trending",
    "hot tokens",
    "new tokens",
  ],
  futures: [
    "futures",
    "leverage",
    "funding",
    "open interest",
    "oi",
    "long",
    "short",
    "futures market",
    "perpetual",
    "futures trading",
    "longs vs shorts",
    "funding rate",
    "liquidations",
    "leverage trading",
    "margin",
    "long position",
    "short position",
    "leverage up",
    "10x",
    "5x",
    "20x",
  ],
  news: [
    "news",
    "alert",
    "announcement",
    "update",
    "breaking",
    "latest news",
    "crypto news",
    "bitcoin news",
    "latest update",
    "announcements",
    "new release",
    "launch",
    "partnership",
  ],
  education: [
    "explain",
    "what is",
    "how does",
    "learn",
    "beginner",
    "tutorial",
    "what's a",
    "how does a",
    "teach me",
    "help me understand",
    "smart contract",
    "defi",
    "nft",
    "blockchain",
    "staking",
    "yield farming",
  ],
  trading: [
    "trade",
    "buy",
    "sell",
    "order",
    "entry",
    "exit",
    "stop loss",
    "trading",
    "trades",
    "swap",
    "exchange",
    "limit order",
    "market order",
    "entry point",
    "exit point",
    "take profit",
    "tp",
    "stop loss",
    "when to buy",
    "when to sell",
    "should i buy",
    "should i sell",
    "purchase",
    "acquire",
  ],
  meme: [
    "meme",
    "memecoin",
    "memetokens",
    "memetoken",
    "memerush",
    "meme rush",
    "meme-rush",
    "pump.fun",
    "trending meme",
    "hot meme",
    "new meme",
    "shitcoin",
    "pepe",
    "doge",
    "shib",
    "shiba",
    "bonk",
    "floki",
  ],
  bsc: [
    "bsc",
    "bnb chain",
    "bnb smart chain",
    "binance smart chain",
    "bsc wallet",
    "bnb wallet",
    "bsc address",
    "bsc transaction",
    "bsc token",
    "bep20",
    "bsc nft",
  ],
  bsc_wallet: [
    "track wallet",
    "watch wallet",
    "monitor address",
    "wallet activity",
    "wallet holdings",
    "what does this address hold",
    "bsc wallet tracker",
  ],
  bsc_sniper: [
    "sniper",
    "sniper bot",
    "bot detection",
    "snipe",
    "sniper detector",
    "fake volume",
    "bot activity",
    "honeypot",
    "copy trade bot",
  ],
  bsc_burn: [
    "burn",
    "burned",
    "burnt",
    "token burn",
    "burn history",
    "burn tracker",
    "total burned",
    "circulating supply",
  ],
  bsc_cluster: [
    "cluster",
    "related wallets",
    "wallet cluster",
    "connected wallets",
    "wallet connections",
    "cluster analysis",
    "related addresses",
  ],
  bsc_transaction: [
    "transaction",
    "tx",
    "decode tx",
    "analyze transaction",
    "bsc transaction",
    "tx details",
  ],
  fear: [
    "fear",
    "greed",
    "sentiment",
    "rough",
    "scary",
    "worried",
    "panic",
    "bullish",
    "bearish",
    "market feeling",
    "how's the market",
    "market sentiment",
    "feeling",
    "market looks",
  ],
  smart_accumulation: [
    "smart accumulation",
    "smart money",
    "institutional",
    "accumulation",
    "institutional buying",
    "smart money buying",
    "whale accumulation",
  ],
  taker_pressure: [
    "taker",
    "taker pressure",
    "buy volume",
    "sell volume",
    "long short ratio",
    "taker buy",
    "taker sell",
  ],
  dca_backtest: [
    "dca backtest",
    "dca backtesting",
    "dollar cost average backtest",
    "dca strategy backtest",
    "average down backtest",
    "periodic buy backtest",
  ],
  funding_heatmap: [
    "funding map",
    "funding heatmap",
    "funding rates",
    "cross market funding",
    "funding extreme",
  ],
  volume_analysis: [
    "volume spike",
    "unusual volume",
    "volume surge",
    "volume analysis",
    "volume ratio",
    "buy sell ratio",
    "volume anomaly",
  ],
  open_interest: ["open interest", "oi surge", "oi spike", "open interest spike", "oi change"],
  basis_spread: [
    "basis spread",
    "futures premium",
    "spot futures",
    "basis premium",
    "premium discount",
    "futures basis",
  ],
  correlation: [
    "correlation",
    "correlated assets",
    "correlation matrix",
    "asset correlation",
    "correlates with",
    "how does it correlate",
  ],
  market_regime: [
    "market regime",
    "bull market",
    "bear market",
    "sideways",
    "market phase",
    "trending range",
  ],
  market_impact: [
    "market impact",
    "slippage",
    "liquidity impact",
    "impact estimation",
    "trade impact",
  ],
  candlestick: [
    "candlestick",
    "doji",
    "hammer",
    "engulfing",
    "pattern recognition",
    "chart pattern",
    "candle pattern",
  ],
  whale_footprint: [
    "whale footprint",
    "large position",
    "position size",
    "big position",
    "whale size",
  ],
  volatility_rank: [
    "volatility rank",
    "volatility comparison",
    "most volatile",
    "volatility metric",
    "volatility ranking",
  ],
  futures_whale: [
    "futures whale",
    "perpetual whale",
    "funding whale",
    "futures big player",
    "whale futures position",
  ],
};
