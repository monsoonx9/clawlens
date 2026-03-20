export interface StreamChunkEvent {
  type: "chunk";
  content: string;
}

export interface StreamCompleteEvent {
  type: "complete";
  content?: string;
}

export interface StreamErrorEvent {
  type: "error";
  error: string;
}

export type StreamEvent = StreamChunkEvent | StreamCompleteEvent | StreamErrorEvent;

export interface APIErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

export interface APISuccessResponse<T> {
  success: true;
  data: T;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

export interface LLMProxyRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface LLMProxyResponse {
  success: boolean;
  data?: string;
  error?: string;
}

export interface TelegramWebhookUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name?: string;
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
      first_name?: string;
      username?: string;
    };
    message?: {
      chat: { id: number };
      message_id: number;
    };
    data: string;
  };
}

export interface TelegramLinkRequest {
  chatId: string;
  userId: string;
  username?: string;
  firstName?: string;
}

export interface AssistantMessageRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  context?: {
    includePortfolio?: boolean;
    includeMarketData?: boolean;
    includeWhaleAlerts?: boolean;
  };
}

export interface AssistantMessageResponse {
  type: "chunk" | "complete" | "error";
  content?: string;
  error?: string;
}

export interface SessionCreateRequest {
  title?: string;
}

export interface SessionCreateResponse {
  session: {
    id: string;
    sessionId: string;
    title: string;
    createdAt: string;
  };
}

export interface MessagesResponse {
  messages: Array<{
    id: string;
    sessionId: string;
    role: "user" | "assistant" | "system";
    content: string;
    skillsUsed: string[];
    createdAt: string;
  }>;
}

export interface KeysSaveRequest {
  keys: {
    binanceApiKey?: string;
    binanceSecretKey?: string;
    llmProvider?: string;
    llmApiKey?: string;
    llmModel?: string;
    llmBaseUrl?: string;
    llmEndpoint?: string;
    llmDeploymentName?: string;
    squareApiKey?: string;
  };
}

export interface KeysResponse {
  hasKeys: boolean;
  keys?: Partial<KeysSaveRequest["keys"]>;
}

export interface BinanceProxyRequest {
  endpoint: string;
  method?: string;
  params?: Record<string, string | number | boolean>;
  needsAuth?: boolean;
  isUserData?: boolean;
}

export interface BinanceProxyResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface MarketProxyRequest {
  action: string;
  params?: Record<string, unknown>;
}

export interface MarketProxyResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface SkillExecutionContext {
  apiKeys?: {
    binanceApiKey: string;
    binanceSecretKey: string;
  };
  userPreferences?: {
    riskTolerance?: number;
    defaultInvestmentSize?: number;
    maxPerTrade?: number;
    maxPerToken?: number;
  };
}

export interface SkillExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  summary?: string;
}

export interface UserPreferences {
  riskTolerance: number;
  defaultInvestmentSize: number;
  maxPerTrade: number;
  maxPerToken: number;
  enabledAgents: string[];
  watchlist: Array<{
    symbol: string;
    contractAddress: string;
    chain: string;
    addedAt: string;
    alertPrice?: number;
    alertCondition?: "above" | "below";
  }>;
  whaleWallets: Array<{
    address: string;
    nickname: string;
    chain: string;
    addedAt: string;
  }>;
}

export interface UserPreferencesUpdate {
  preferences: Partial<UserPreferences>;
}

export interface CouncilDebateRequest {
  query: string;
  enabledAgents?: string[];
}

export interface CouncilDebateResponse {
  sessionId: string;
  agentResponses?: Array<{
    agentId: string;
    content: string;
    councilReport: string;
    isComplete: boolean;
  }>;
  verdict?: {
    consensus: string;
    dissentingVoices: Array<{
      agentId: string;
      position: string;
      reason: string;
    }>;
    riskLevel: string;
    finalVerdict: string;
    confidence: number;
    watchThis: string;
  };
}
