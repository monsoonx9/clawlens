export type AgentName =
  | "SCOUT"
  | "THE_WARDEN"
  | "LENS"
  | "SHADOW"
  | "LEDGER"
  | "PULSE"
  | "SAGE"
  | "QUILL"
  | "FUTURES"
  | "BLAZE"
  | "THE_ARBITER";

export type AgentStatus = "idle" | "thinking" | "speaking" | "done" | "error" | "disabled";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "EXTREME";

export type Chain = "BSC" | "ETH" | "SOL" | "BASE" | "POLYGON" | "ARB";

export type LLMProvider =
  | "openai"
  | "anthropic"
  | "groq"
  | "gemini"
  | "azure-openai"
  | "ollama"
  | "openrouter"
  | "minimax"
  | "ollama-cloud";

export interface AgentConfig {
  id: AgentName;
  displayName: string;
  role: string;
  color: string;
  bgColor: string;
  borderColor: string;
  initial: string;
  enabled: boolean;
  systemPrompt?: string;
  relevantSkills?: string[];
}

export interface AgentResponse {
  agentId: AgentName;
  content: string;
  councilReport: string;
  isStreaming: boolean;
  isComplete: boolean;
  timestamp: Date;
  error?: string;
  currentIndex?: number;
  totalAgents?: number;
}

export interface ArbitersVerdict {
  consensus: string;
  dissentingVoices: Array<{
    agentId: AgentName;
    position: string;
    reason: string;
  }>;
  riskLevel: RiskLevel;
  finalVerdict: string;
  confidence: number;
  watchThis: string;
  isStreaming: boolean;
  isComplete: boolean;
}

export interface CouncilSession {
  id: string;
  query: string;
  timestamp: Date;
  agentResponses: AgentResponse[];
  verdict: ArbitersVerdict | null;
  arbiterStreamText?: string;
  relevantAgents: AgentName[];
  roundProgress?: {
    currentRound: number;
    maxRounds: number;
    reportsCount: number;
  };
  consensus?: {
    hasConsensus: boolean;
    agreement: number;
    direction?: "positive" | "negative";
  };
}

export interface APIKeys {
  binanceApiKey: string;
  binanceSecretKey: string;
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmModel: string;
  llmBaseUrl?: string;
  llmEndpoint?: string;
  llmDeploymentName?: string;
  squareApiKey: string;
}

export interface PortfolioAsset {
  symbol: string;
  name: string;
  amount: number;
  valueUSD: number;
  avgBuyPrice: number;
  currentPrice: number;
  pnlPercent: number;
  pnlUSD: number;
  allocation: number;
  chain: Chain;
}

export interface PortfolioSnapshot {
  totalValueUSD: number;
  totalPnlUSD: number;
  totalPnlPercent: number;
  change24hUSD: number;
  change24hPercent: number;
  riskScore: number;
  assets: PortfolioAsset[];
  lastUpdated: Date;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  amount: number;
  price: number;
  valueUSD: number;
  timestamp: Date;
  pnlUSD?: number;
  pnlPercent?: number;
}

export interface WatchlistToken {
  symbol: string;
  contractAddress: string;
  chain: Chain;
  addedAt: Date;
  alertPrice?: number;
  alertCondition?: "above" | "below";
}

export interface WhaleWalletSnapshot {
  holdings: Array<{
    token: string;
    contractAddress: string;
    chain: string;
    valueUSD: number;
  }>;
  timestamp: string;
}

export interface WhaleWallet {
  address: string;
  nickname: string;
  chain: Chain;
  addedAt: Date;
  lastSnapshot?: WhaleWalletSnapshot;
}

export interface UserPreferences {
  riskTolerance: number;
  defaultInvestmentSize: number;
  maxPerTrade: number;
  maxPerToken: number;
  enabledAgents: AgentName[];
  watchlist: WatchlistToken[];
  whaleWallets: WhaleWallet[];
}

export interface AppState {
  apiKeys: APIKeys | null;
  isOnboarded: boolean;
  portfolio: PortfolioSnapshot | null;
  preferences: UserPreferences;
  sessions: CouncilSession[];
  activeSession: CouncilSession | null;
}

export interface TokenAuditResult {
  contractAddress: string;
  chain: Chain;
  verdict: "CLEAR" | "YELLOW_FLAG" | "RED_FLAG";
  riskScore: number;
  flags: string[];
  honeypotRisk: boolean;
  liquidityUSD: number;
  holderCount: number;
  topHolderConcentration: number;
  explanation: string;
}

export interface SmartMoneySignal {
  tokenSymbol: string;
  contractAddress: string;
  chain: Chain;
  direction: "BUY" | "SELL";
  triggerPrice: number;
  currentPrice: number;
  maxGain: number;
  isActive: boolean;
  quality: "STRONG" | "MODERATE" | "WEAK";
  timestamp: Date;
}

// ─── Binance Web3 Skill Response Types ───────────────────────────────────────

export interface BinanceMarketRankItem {
  tokenSymbol: string;
  contractAddress: string;
  chain: Chain;
  rank: number;
  score: number;
  socialHypeScore?: number;
  smartMoneyInflow?: number;
  searchVolume?: number;
  priceChange24h?: number;
  volumeUSD24h?: number;
  liquidityUSD?: number;
  holderCount?: number;
}

export interface BinanceMemeToken {
  tokenSymbol: string;
  contractAddress: string;
  chain: Chain;
  stage: "New" | "Finalizing" | "Migrated";
  momentum: "Latest" | "Rising" | "Viral";
  netInflow?: number;
  holderCount?: number;
  liquidityUSD?: number;
  launchedAt?: number;
}

export interface BinanceNarrativeTopic {
  topic: string;
  momentum: "Latest" | "Rising" | "Viral";
  netInflowUSD: number;
  tokenCount: number;
  topTokens: string[];
}

export interface BinanceTokenInfo {
  contractAddress: string;
  chain: Chain;
  symbol: string;
  name: string;
  logoUrl?: string;
  creatorAddress?: string;
  socialLinks?: { twitter?: string; website?: string; telegram?: string };
  price: number;
  priceChange24h: number;
  volumeUSD24h: number;
  liquidityUSD: number;
  marketCapUSD: number;
  holderCount: number;
  top10HolderPercent?: number;
}

export interface BinanceTokenAudit {
  contractAddress: string;
  chain: Chain;
  honeypotRisk: boolean;
  mintable: boolean;
  mintAuthorityRenounced: boolean;
  pausable: boolean;
  pauseAuthorityRenounced: boolean;
  permissionFlags: string[];
  overallRiskClassification: "Low" | "Medium" | "High" | "Critical";
  creatorAddress?: string;
}

export interface BinanceTradingSignal {
  tokenSymbol: string;
  contractAddress: string;
  chain: Chain;
  direction: "BUY" | "SELL";
  triggerPrice: number;
  currentPrice: number;
  maxGain: number;
  isActive: boolean;
  quality: "STRONG" | "MODERATE" | "WEAK";
  historicalAccuracy?: number;
  timestamp: number;
}

export interface BinanceWalletHolding {
  tokenSymbol: string;
  contractAddress: string;
  chain: Chain;
  quantity: number;
  valueUSD: number;
  allocation: number;
  priceChange24h?: number;
}

export interface BinanceAddressInfo {
  address: string;
  chain: Chain;
  totalValueUSD: number;
  holdings: BinanceWalletHolding[];
  top1AllocationPercent: number;
  top3AllocationPercent: number;
  top10AllocationPercent: number;
  riskLevel: "Low" | "Medium" | "High";
}

export interface BinanceTopTrader {
  address: string;
  chain: Chain;
  winRate30d: number;
  pnl30d: number;
  pnl7d: number;
  totalTrades30d: number;
  rank: number;
}

// ─── Custom Skill Output Types ────────────────────────────────────────────────

export interface EnrichedPortfolioAsset extends PortfolioAsset {
  volatility30d: number;
  liquidityRating: "High" | "Medium" | "Low";
  typeRisk: number;
  dcaToBreakeven?: number;
  orderBookSupport?: number;
}

export interface PortfolioPulseResult {
  totalValueUSD: number;
  totalUnrealizedPnLUSD: number;
  totalUnrealizedPnLPercent: number;
  change24hUSD: number;
  change24hPercent: number;
  riskScore: number;
  riskLabel: "Low" | "Moderate" | "High" | "Critical";
  assets: EnrichedPortfolioAsset[];
  warnings: string[];
  cashBufferPercent: number;
  topHeavyPair?: string;
  diversificationScore: number;
  summary: string;
}

export interface DCAScheduleItem {
  weekNumber: number;
  scheduledDate: string;
  baseAmountUSD: number;
  adjustedAmountUSD: number;
  triggerNote?: string;
  cumulativeSpent: number;
  estimatedTokensAccumulated: number;
}

export interface DCAStrategistResult {
  targetAsset: string;
  totalBudgetUSD: number;
  durationWeeks: number;
  currentPrice: number;
  volatilityProfile: "High" | "Medium" | "Low";
  atr90dPercent: number;
  recommendedFrequency: "bi-weekly" | "weekly" | "bi-monthly";
  schedule: DCAScheduleItem[];
  supportLevels: number[];
  scenarios: {
    bull: {
      avgCostBasis: number;
      projectedValue: number;
      totalTokens: number;
      returnPercent: number;
    };
    bear: {
      avgCostBasis: number;
      projectedValue: number;
      totalTokens: number;
      returnPercent: number;
    };
    crab: {
      avgCostBasis: number;
      projectedValue: number;
      totalTokens: number;
      returnPercent: number;
    };
  };
  smartMoneyAlignment: "Bullish" | "Bearish" | "Neutral";
  signalNote: string;
  orderBookInsight: string;
  recommendation: string;
}

export interface FearIndexComponent {
  score: number;
  weight: number;
  rawData: string;
  explanation: string;
}

export interface FearIndexResult {
  token: string;
  score: number;
  label: "Extreme Fear" | "Fear" | "Caution" | "Neutral" | "Greed" | "Extreme Greed";
  color: string;
  components: {
    socialSentiment: FearIndexComponent;
    priceMomentum: FearIndexComponent;
    smartMoney: FearIndexComponent;
    technicalRSI: FearIndexComponent;
  };
  interpretation: string;
  contrarianNote?: string;
  dataQuality: "full" | "partial" | "unavailable";
  dataQualityNote?: string;
}

export interface WhaleAlert {
  walletAddress: string;
  walletNickname: string;
  alertType: "NEW_POSITION" | "SIGNIFICANT_INCREASE" | "SIGNIFICANT_DECREASE" | "FULL_EXIT";
  token: string;
  contractAddress: string;
  chain: Chain;
  previousValueUSD?: number;
  currentValueUSD: number;
  changePercent?: number;
  timestamp: Date;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface WhaleConsensus {
  token: string;
  contractAddress: string;
  walletCount: number;
  walletNicknames: string[];
  totalValueAccumulatedUSD: number;
  note: string;
}

export interface WhaleRadarResult {
  scannedWallets: number;
  alertCount: number;
  alerts: WhaleAlert[];
  whaleConsensus?: WhaleConsensus;
  suggestedNewWallets?: BinanceTopTrader[];
  lastScanned: Date;
  nextScheduledScan: Date;
  summary: string;
}

export interface RugShieldRiskFactor {
  category: string;
  description: string;
  points: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface RugShieldSafetyFactor {
  category: string;
  description: string;
  points: number;
}

export interface CreatorProfile {
  address: string;
  previousDeploymentCount: number;
  avgLiquidityUSDOfPrevious: number;
  verdict: "Clean" | "Suspicious" | "Known Rugger";
  reason: string;
}

export interface RugShieldResult {
  contractAddress: string;
  chain: Chain;
  verdict: "CLEAR" | "YELLOW_FLAG" | "RED_FLAG" | "UNKNOWN";
  riskPoints: number;
  confidence: number;
  criticalFlags: string[];
  riskFactors: RugShieldRiskFactor[];
  safetyFactors: RugShieldSafetyFactor[];
  creatorProfile: CreatorProfile;
  tokenMetrics: {
    liquidityUSD: number;
    holderCount: number;
    top10HolderPercent: number;
    ageHours: number;
    listedOnBinance: boolean;
    inBinanceAlpha: boolean;
  };
  verdictExplanation: string;
  actionRecommendation: string;
}

export interface NewsItem {
  headline: string;
  source: string;
  url: string;
  publishedAt: Date;
  relatedSymbols: string[];
  sentiment: "Bullish" | "Bearish" | "Neutral";
  urgency: "Low" | "Medium" | "High" | "Critical";
  type: "Partnership" | "Listing" | "Exploit" | "Regulation" | "Technical" | "Community" | "Market";
  relevanceScore: number;
  portfolioImpact: string;
  actionRequired: boolean;
}

export interface NewsRadarResult {
  scannedTopics: number;
  totalNewsFound: number;
  filteredToRelevant: number;
  items: NewsItem[];
  criticalAlerts: number;
  summary: string;
  mostUrgentItem?: NewsItem;
}

export interface BehavioralPattern {
  type:
    | "CUTTING_WINNERS_EARLY"
    | "HOLDING_LOSERS_TOO_LONG"
    | "REVENGE_TRADING"
    | "SYMBOL_FIXATION"
    | "FOMO_BUYING"
    | "IGNORING_BEST_PERFORMERS"
    | "SHORT_TERM_TRADER";
  severity: "LOW" | "MEDIUM" | "HIGH";
  evidence: string;
  coaching: string;
  occurrenceCount: number;
}

export interface SymbolStats {
  symbol: string;
  tradeCount: number;
  winRate: number;
  totalRealizedPnLUSD: number;
  avgHoldTime: string;
  bestTrade: number;
  worstTrade: number;
}

export interface MonthlyStats {
  month: string;
  tradeCount: number;
  winRate: number;
  pnlUSD: number;
}

export interface TradeJournalResult {
  totalTrades: number;
  analyzedPeriodDays: number;
  winRate: number;
  profitFactor: number;
  expectancyPerTradeUSD: number;
  totalRealizedPnLUSD: number;
  avgWinPercent: number;
  avgLossPercent: number;
  avgHoldTimeWins: string;
  avgHoldTimeLosses: string;
  largestWin: TradeRecord;
  largestLoss: TradeRecord;
  bestMonth: MonthlyStats;
  worstMonth: MonthlyStats;
  bySymbol: SymbolStats[];
  patterns: BehavioralPattern[];
  projectedAnnualPnLUSD: number;
  grade: "A" | "B" | "C" | "D" | "F";
  gradeExplanation: string;
  journalSummary: string;
}

export interface OnboardingGuideResult {
  topic: string;
  detectedLevel: "beginner" | "intermediate" | "advanced";
  explanation: {
    coreConcept: string;
    howItWorks: string;
    whyItMatters: string;
    personalExample?: string;
    commonMistake: string;
    binanceFeature: string;
    binanceFeatureLink?: string;
  };
  analogyUsed: string;
  keyTerms: Array<{ term: string; definition: string }>;
  followUpQuestions: string[];
  relatedTopics: string[];
}

// ─── Personal Assistant Types ──────────────────────────────────────────────────

export type PersonalityType = "friendly" | "professional" | "adaptive" | "technical";

export interface AssistantMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  skillsUsed: string[];
  metadata?: {
    tokenCount?: number;
    modelUsed?: string;
    processingTime?: number;
  };
  createdAt: Date;
}

export interface AssistantSession {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  preferences: {
    personality: PersonalityType;
    language: string;
    notificationEnabled: boolean;
    portfolioAccess: boolean;
    tradeAccess: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
  lastMessageAt?: Date;
}

export interface TelegramConnection {
  id: string;
  userId: string;
  telegramChatId: string;
  telegramUserId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  lastMessageAt?: Date;
  createdAt: Date;
}

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  targetPrice?: number;
  condition: "above" | "below" | "change";
  changePercent?: number;
  isActive: boolean;
  triggeredAt?: Date;
  createdAt: Date;
}

export interface UserAssistantPreferences {
  userId: string;
  personality: PersonalityType;
  language: string;
  notificationEnabled: boolean;
  portfolioAccess: boolean;
  tradeAccess: boolean;
}

export interface AssistantChatRequest {
  message: string;
  sessionId?: string;
  userId: string;
  context?: {
    includePortfolio?: boolean;
    includeMarketData?: boolean;
    includeWhaleAlerts?: boolean;
  };
}

export interface AssistantChatResponse {
  sessionId: string;
  message: AssistantMessage;
  skillsInvoked: string[];
  streaming: boolean;
  isComplete: boolean;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: "private" | "group" | "supergroup" | "channel";
      title?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message?: {
      chat: { id: number };
      message_id: number;
    };
    data: string;
  };
}
