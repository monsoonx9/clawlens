import { LLMProvider } from "@/types";

/**
 * LLM Provider Configuration
 *
 * Updated: March 20, 2026
 *
 * Model Selection Guide:
 * - OpenAI: gpt-5.4 (latest flagship), gpt-5.4-pro (premium), gpt-5-mini (fast)
 * - Anthropic: claude-sonnet-4-6 (balanced), claude-opus-4-6 (reasoning)
 * - Groq: Fastest inference (500+ TPS) via LPU hardware
 * - Gemini: Gemini 3.1 series with 1M token context
 */

export const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  openai: ["gpt-5.4", "gpt-5.4-pro", "gpt-5.3-chat-latest", "gpt-5-mini", "gpt-5-nano"],

  anthropic: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5"],

  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.3-8b-instant",
    "llama-4-scout-17b-16e",
    "qwen3-32b",
    "deepseek-r1-distill-llama-70b",
  ],

  gemini: ["gemini-3.1-pro", "gemini-3.1-flash-lite", "gemini-3-flash", "gemini-2.5-flash"],

  "azure-openai": ["gpt-5.4", "gpt-5.4-pro", "gpt-5-mini"],

  ollama: ["deepseek-r1", "qwen3:32b", "llama3.3:70b", "gemma3:12b", "mistral-large-3"],

  openrouter: [
    "anthropic/claude-sonnet-4-6",
    "openai/gpt-5.4",
    "google/gemini-3.1-pro",
    "meta-llama/llama-4-scout",
    "deepseek/deepseek-v3-0324",
  ],

  minimax: ["MiniMax-M2.5", "MiniMax-M3"],

  "ollama-cloud": [
    "qwen3-coder:480b-cloud",
    "qwen3:32b",
    "deepseek-v3:32b",
    "kimi-k2",
    "glm-z1-32b",
  ],
};

export const PROVIDER_DISPLAY_NAMES: Record<LLMProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  groq: "Groq",
  gemini: "Gemini",
  "azure-openai": "Azure OpenAI",
  ollama: "Ollama (Local)",
  openrouter: "OpenRouter",
  minimax: "Minimax",
  "ollama-cloud": "Ollama Cloud",
};

export const PROVIDER_DESCRIPTIONS: Record<LLMProvider, string> = {
  openai: "GPT-5.4 - Latest flagship (March 2026)",
  anthropic: "Claude Sonnet 4.6 - Best balance of speed & intelligence",
  groq: "Groq LPU - Fastest inference (500+ tokens/sec)",
  gemini: "Gemini 3.1 - Long context (1M tokens)",
  "azure-openai": "Enterprise OpenAI with compliance & security",
  ollama: "Local models - No API key needed, runs on your machine",
  openrouter: "Smart routing - Automatically picks best model for your task",
  minimax: "Budget-friendly with competitive quality",
  "ollama-cloud": "Cloud-hosted Ollama models - Fast open-source models",
};

export const PROVIDER_BASE_URLS: Record<LLMProvider, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  groq: "https://api.groq.com/openai/v1",
  gemini: "https://generativelanguage.googleapis.com/v1",
  "azure-openai": "https://<resource>.openai.azure.com",
  ollama: "http://localhost:11434",
  openrouter: "https://openrouter.ai/api/v1",
  minimax: "https://api.minimax.io/v1",
  "ollama-cloud": "https://ollama.com",
};

export const PROVIDER_ENDPOINT_PATHS: Record<LLMProvider, string> = {
  openai: "/chat/completions",
  anthropic: "/v1/messages",
  groq: "/chat/completions",
  gemini: "/models",
  "azure-openai": "/chat/completions",
  ollama: "/api/chat",
  openrouter: "/chat/completions",
  minimax: "/text/chatcompletion_v2",
  "ollama-cloud": "/api/chat",
};

export const PROVIDER_API_KEY_REQUIRED: Record<LLMProvider, boolean> = {
  openai: true,
  anthropic: true,
  groq: true,
  gemini: true,
  "azure-openai": true,
  ollama: false,
  openrouter: true,
  minimax: true,
  "ollama-cloud": true,
};

export const PROVIDER_BASE_URL_CONFIGURABLE: Record<LLMProvider, boolean> = {
  openai: true,
  anthropic: false,
  groq: false,
  gemini: false,
  "azure-openai": true,
  ollama: true,
  openrouter: true,
  minimax: true,
  "ollama-cloud": true,
};

/**
 * Model fallback lists - used when primary model fails
 * Ordered from most capable to least capable
 */
export const MODEL_FALLBACKS: Record<LLMProvider, string[]> = {
  openai: ["gpt-5.4", "gpt-5.3-chat-latest", "gpt-5-mini"],
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5"],
  groq: ["llama-3.3-70b-versatile", "qwen3-32b", "llama-3.3-8b-instant"],
  gemini: ["gemini-3.1-pro", "gemini-3-flash", "gemini-2.5-flash"],
  "azure-openai": ["gpt-5.4", "gpt-5-mini"],
  ollama: ["deepseek-r1", "qwen3:32b", "llama3.3:70b"],
  openrouter: ["anthropic/claude-sonnet-4-6", "openai/gpt-5.4", "google/gemini-3.1-pro"],
  minimax: ["MiniMax-M2.5", "MiniMax-M3"],
  "ollama-cloud": ["qwen3-coder:480b-cloud", "qwen3:32b", "deepseek-v3:32b"],
};

/**
 * Get the next fallback model for a provider
 */
export function getFallbackModel(provider: LLMProvider, currentModel: string): string | null {
  const fallbacks = MODEL_FALLBACKS[provider];
  if (!fallbacks) return null;

  const currentIndex = fallbacks.indexOf(currentModel);
  if (currentIndex >= 0 && currentIndex < fallbacks.length - 1) {
    return fallbacks[currentIndex + 1];
  }
  return null;
}

/**
 * Get all available models for a provider
 */
export function getAvailableModels(provider: LLMProvider): string[] {
  return PROVIDER_MODELS[provider] || [];
}

/**
 * Check if a model is valid for a provider
 */
export function isValidModel(provider: LLMProvider, model: string): boolean {
  const models = PROVIDER_MODELS[provider];
  return models ? models.includes(model) : false;
}
