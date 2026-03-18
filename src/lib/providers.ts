import { LLMProvider } from "@/types";

export const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  openai: ["gpt-5.4", "gpt-5.4-pro", "gpt-5-mini", "gpt-5-nano"],
  anthropic: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama-4-scout-17b-16e-instruct",
    "qwen/qwen3-32b",
  ],
  gemini: ["gemini-3.1-pro-preview", "gemini-3.1-flash-lite-preview", "gemini-3-flash"],
  "azure-openai": ["gpt-5.4", "gpt-5.4-pro", "gpt-5-mini"],
  ollama: ["qwen3.5", "deepseek-r1", "qwen3:32b", "gemma3", "mistral-large-3", "nemotron-3-super"],
  openrouter: [
    "openai/gpt-5.4",
    "anthropic/claude-opus-4-6",
    "google/gemini-3.1-pro-preview",
    "x-ai/grok-4.20-beta",
    "meta-llama/llama-4-scout",
  ],
  minimax: ["MiniMax-M2.5", "MiniMax-M2.5-highspeed"],
  "ollama-cloud": [
    "qwen3-coder:480b-cloud",
    "qwen3-coder-next",
    "qwen3.5",
    "nemotron-3-super",
    "nemotron-3-nano",
    "deepseek-v3.2",
    "glm-5",
    "gpt-oss:120b-cloud",
    "kimi-k2.5",
    "devstral-small-2",
    "gemini-3-flash-preview",
    "mistral-large-3",
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
  openai: "GPT-5.4 recommended",
  anthropic: "Claude 4.6 Sonnet",
  groq: "Llama 3.3 (Fast)",
  gemini: "Gemini 3.1 Flash",
  "azure-openai": "Enterprise OpenAI",
  ollama: "Local models (no API key)",
  openrouter: "Aggregator API",
  minimax: "MiniMax M2.5 models",
  "ollama-cloud": "Cloud-hosted Ollama models",
};

export const PROVIDER_BASE_URLS: Record<LLMProvider, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  groq: "https://api.groq.com/openai/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
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
