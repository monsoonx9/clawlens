import { LLMProvider, PortfolioSnapshot, UserPreferences } from "@/types";

interface ProxyFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

/**
 * Helper to proxy LLM requests through our server to bypass CORS in the browser.
 * Note: Local Ollama (localhost:11434) is NOT proxied because the server cannot
 * reach the user's local machine.
 */
async function proxyFetch(url: string, options: ProxyFetchOptions) {
  const isLocalOllama = url.includes("localhost:11434") || url.includes("127.0.0.1:11434");

  if (typeof window !== "undefined" && !isLocalOllama) {
    return fetch("/api/llm/proxy", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        method: options.method || "POST",
        headers: options.headers,
        body: options.body, // Already a string
      }),
    });
  }

  return fetch(url, options);
}

// ---------------------------------------------------------------------------
// Provider defaults
// ---------------------------------------------------------------------------

export function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case "openai":
      return "gpt-5.4";
    case "anthropic":
      return "claude-sonnet-4-6";
    case "groq":
      return "llama-3.3-70b-versatile";
    case "gemini":
      return "gemini-3.1-flash-lite-preview";
    case "azure-openai":
      return "gpt-5.4";
    case "ollama":
      return "deepseek-r1";
    case "openrouter":
      return "openai/gpt-5.4";
    case "minimax":
      return "MiniMax-M2.5";
    case "ollama-cloud":
      return "qwen3-coder:480b-cloud";
    default:
      return "gpt-5.4";
  }
}

// ---------------------------------------------------------------------------
// LLM Provider Optimizations
// ---------------------------------------------------------------------------

export function optimizePromptForProvider(
  prompt: string,
  provider: LLMProvider,
  isArbiter: boolean = false,
): string {
  const baseInstructions = isArbiter
    ? "\n\nIMPORTANT: You must respond with valid JSON only. No markdown, no explanations outside the JSON structure. The JSON must include: consensus, dissentingVoices (array), riskLevel, finalVerdict, confidence (number), watchThis."
    : "\n\nCRITICAL: Answer the user's question DIRECTLY. Be concise. Give specific recommendations. Do not add unnecessary warnings or caveats.";

  switch (provider) {
    case "anthropic":
      return (
        prompt +
        baseInstructions +
        "\n\nWhen responding with JSON, wrap it in ```json``` code blocks."
      );

    case "groq":
      return (
        prompt +
        baseInstructions +
        "\n\nBe direct. Answer in 2-4 sentences max. Give specific answers."
      );

    case "gemini":
      return (
        prompt + baseInstructions + "\n\nUse clear headings and bullet points for readability."
      );

    case "ollama":
      return (
        prompt +
        baseInstructions +
        "\nUse simple JSON structures. Avoid nested objects when possible."
      );

    case "azure-openai":
      return (
        prompt +
        baseInstructions +
        "\n\nEnsure JSON is properly formatted for Azure OpenAI compatibility."
      );

    case "openrouter":
      return (
        prompt +
        baseInstructions +
        "\n\nWhen using OpenRouter, prefer standard JSON format for maximum compatibility across routing."
      );

    case "minimax":
      return prompt + baseInstructions + "\n\nMinimax supports function calling and JSON mode.";

    case "ollama-cloud":
      return (
        prompt +
        baseInstructions +
        "\nUse simple JSON structures. Avoid nested objects when possible."
      );

    case "openai":
    default:
      return prompt + baseInstructions;
  }
}

// ---------------------------------------------------------------------------
// Provider-specific streaming options
// ---------------------------------------------------------------------------

export function getProviderStreamOptions(provider: LLMProvider): {
  stream: boolean;
  temperature?: number;
  maxTokens?: number;
} {
  switch (provider) {
    case "anthropic":
      return { stream: true };
    case "groq":
      return { stream: true, temperature: 0.7 };
    case "gemini":
      return { stream: true };
    case "ollama":
    case "ollama-cloud":
      return { stream: true, temperature: 0.7 };
    case "minimax":
      return { stream: true, temperature: 0.7 };
    default:
      return { stream: true };
  }
}

// ---------------------------------------------------------------------------
// Context Builder
// ---------------------------------------------------------------------------

export function buildUserContext(
  portfolio: PortfolioSnapshot | null,
  preferences: UserPreferences,
): string {
  const parts: string[] = [];

  if (portfolio && portfolio.assets.length > 0) {
    const topHoldings = portfolio.assets
      .sort((a, b) => (b.allocation || 0) - (a.allocation || 0))
      .slice(0, 3)
      .map((a) => `${a.symbol} ${(a.allocation || 0).toFixed(1)}%`)
      .join(", ");

    parts.push(
      `User holds ${portfolio.assets.length} assets worth $${portfolio.totalValueUSD.toLocaleString()} total. ` +
        `Largest positions: ${topHoldings}.`,
    );
  } else {
    parts.push("User portfolio is currently empty or not connected.");
  }

  parts.push(
    `Risk tolerance: ${preferences.riskTolerance}/10. ` +
      `Default investment: $${preferences.defaultInvestmentSize}. ` +
      `Max per trade: $${preferences.maxPerTrade}. ` +
      `Max per token: $${preferences.maxPerToken}.`,
  );

  // Add positions exceeding max per token
  if (portfolio && portfolio.assets.length > 0 && preferences.maxPerToken) {
    const exceedingPositions = portfolio.assets
      .filter((a) => a.valueUSD > preferences.maxPerToken)
      .map((a) => `${a.symbol}=$${a.valueUSD.toFixed(0)}`);
    if (exceedingPositions.length > 0) {
      parts.push(`Positions exceeding max per token: ${exceedingPositions.join(", ")}.`);
    }
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Stream Parser Helper
// ---------------------------------------------------------------------------

/**
 * Parses Server-Sent Events (SSE) stream lines and yields JSON payloads.
 */
interface SSEContent {
  type?: string;
  content?: string;
  delta?: { text?: string };
}

interface SSEPayload {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    message?: {
      role?: string;
      content?: string;
    };
    delta?: {
      role?: string;
      content?: string;
      text?: string;
    };
    finish_reason?: string;
  }>;
  content?: string;
  delta?: {
    role?: string;
    content?: string;
    text?: string;
  };
  type?: string;
  text?: string;
}

async function* parseSSE(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEPayload, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("data: ")) {
          const data = trimmed.substring(6);
          if (data === "[DONE]") break;
          try {
            yield JSON.parse(data);
          } catch (e) {
            // Ignore malformed JSON chunks
          }
        } else if (trimmed.startsWith("event: content_block_delta")) {
          // Anthropic specific handling implicitly handled by parsing the next data line
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Safely parses LLM HTTP errors and returns clean, human-readable strings.
 */
async function parseHttpError(response: Response, providerName: string): Promise<string> {
  const status = response.status;
  let body = "";
  try {
    body = await response.text();
  } catch {
    // Ignore body read errors
  }

  if (status === 429) {
    return `${providerName} Rate Limit Exceeded: You are making too many requests or hit your quota. Please wait a moment before trying again.`;
  }
  if (status === 401 || status === 403) {
    return `${providerName} Authentication Failed: Your API key is invalid or lacks permissions. Please check your settings.`;
  }
  if (status === 404) {
    return `${providerName} Model Not Found: The specified AI model was not found or you lack access to it.`;
  }
  if (status === 400 && body.toLowerCase().includes("context length")) {
    return `${providerName} Context Length Exceeded: The input prompt is too long for this model.`;
  }

  // Default generic error parsing
  let cleanMessage = `${providerName} Error ${status}`;
  try {
    const json = JSON.parse(body);
    if (json.error?.message) {
      cleanMessage += `: ${json.error.message}`;
    } else if (json.message) {
      cleanMessage += `: ${json.message}`;
    } else {
      cleanMessage += `: ${body.substring(0, 100)}...`; // Prevent massive HTML dumps
    }
  } catch {
    // Not JSON, just append truncated text
    cleanMessage += body ? `: ${body.substring(0, 100)}...` : "";
  }

  return cleanMessage;
}

// ---------------------------------------------------------------------------
// Streaming Provider Implementations
// ---------------------------------------------------------------------------

async function* streamOpenAI(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string,
  maxTokens: number,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const response = await proxyFetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) throw new Error(await parseHttpError(response, "OpenAI"));
  if (!response.body) throw new Error("No response body from OpenAI");

  for await (const data of parseSSE(response.body)) {
    if (data?.choices?.[0]?.delta?.content) {
      yield data.choices[0].delta.content;
    }
  }
}

async function* streamGroq(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string,
  maxTokens: number,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const response = await proxyFetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) throw new Error(await parseHttpError(response, "Groq"));
  if (!response.body) throw new Error("No response body from Groq");

  for await (const data of parseSSE(response.body)) {
    if (data?.choices?.[0]?.delta?.content) {
      yield data.choices[0].delta.content;
    }
  }
}

async function* streamAnthropic(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string,
  maxTokens: number,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const response = await proxyFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      stream: true,
    }),
  });

  if (!response.ok) throw new Error(await parseHttpError(response, "Anthropic"));
  if (!response.body) throw new Error("No response body from Anthropic");

  for await (const data of parseSSE(response.body)) {
    if (data?.type === "content_block_delta" && data?.delta?.text) {
      yield data.delta.text;
    }
  }
}

async function* streamGemini(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string,
  maxTokens: number,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
  const geminiResp = await proxyFetch(geminiUrl, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      systemInstruction: systemPrompt
        ? { role: "user", parts: [{ text: systemPrompt }] }
        : undefined,
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!geminiResp.ok) {
    const errText = await geminiResp.text();
    throw new Error(`Gemini API error ${geminiResp.status}: ${errText}`);
  }

  const geminiReader = geminiResp.body?.getReader();
  if (!geminiReader) throw new Error("No response body from Gemini");
  const geminiDecoder = new TextDecoder();

  while (true) {
    const { done, value } = await geminiReader.read();
    if (done) break;
    const rawChunk = geminiDecoder.decode(value, { stream: true });
    const lines = rawChunk.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch {
        // partial chunk, skip
      }
    }
  }
}

async function* streamAzureOpenAI(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  endpoint: string,
  deploymentName: string,
  maxTokens: number,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  // Expected endpoint: https://<resource>.openai.azure.com/
  const baseUrl = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
  const url = `${baseUrl}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;

  const response = await proxyFetch(url, {
    method: "POST",
    signal,
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) throw new Error(await parseHttpError(response, "Azure OpenAI"));
  if (!response.body) throw new Error("No response body from Azure");

  for await (const data of parseSSE(response.body)) {
    if (data?.choices?.[0]?.delta?.content) {
      yield data.choices[0].delta.content;
    }
  }
}

async function* streamOllama(
  systemPrompt: string,
  userMessage: string,
  baseUrl: string,
  model: string,
  maxTokens: number,
  apiKey?: string,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  // Normalize baseUrl for Cloud vs Local
  let absoluteUrl = "";
  if (baseUrl.includes("ollama.com")) {
    // Cloud expects https://ollama.com/api/chat
    const cleanBase = baseUrl.replace(/\/api$/, "").replace(/\/$/, "");
    absoluteUrl = `${cleanBase}/api/chat`;
  } else {
    // Local expects http://localhost:11434/api/chat
    absoluteUrl = `${baseUrl.replace(/\/$/, "")}/api/chat`;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await proxyFetch(absoluteUrl, {
    method: "POST",
    signal,
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
      options: { num_predict: maxTokens },
    }),
  });

  if (!response.ok) throw new Error(await parseHttpError(response, "Ollama"));
  if (!response.body) throw new Error("No response body from Ollama");

  // Ollama streams NDJSON
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data?.message?.content) {
            yield data.message.content;
          }
        } catch (e) {
          // Ignore malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* streamOpenRouter(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string,
  maxTokens: number,
  baseUrl: string,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const url = baseUrl || "https://openrouter.ai/api/v1/chat/completions";

  const response = await proxyFetch(url, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer":
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
      "X-Title": "ClawLens",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) throw new Error(await parseHttpError(response, "OpenRouter"));
  if (!response.body) throw new Error("No response body from OpenRouter");

  for await (const data of parseSSE(response.body)) {
    if (data?.choices?.[0]?.delta?.content) {
      yield data.choices[0].delta.content;
    }
  }
}

// ---------------------------------------------------------------------------
// Main Exposed Functions
// ---------------------------------------------------------------------------

export async function* streamAgentResponse(
  systemPrompt: string,
  userMessage: string,
  provider: LLMProvider,
  apiKeyOpts: {
    apiKey: string;
    baseUrl?: string;
    endpoint?: string;
    deploymentName?: string;
  },
  model: string,
  maxTokens: number = 800,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  if (!apiKeyOpts.apiKey && provider !== "ollama")
    throw new Error(`API key missing for provider: ${provider}`);

  const MAX_RETRIES = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      switch (provider) {
        case "openai":
          yield* streamOpenAI(
            systemPrompt,
            userMessage,
            apiKeyOpts.apiKey,
            model,
            maxTokens,
            signal,
          );
          return;
        case "groq":
          yield* streamGroq(systemPrompt, userMessage, apiKeyOpts.apiKey, model, maxTokens, signal);
          return;
        case "anthropic":
          yield* streamAnthropic(
            systemPrompt,
            userMessage,
            apiKeyOpts.apiKey,
            model,
            maxTokens,
            signal,
          );
          return;
        case "gemini":
          yield* streamGemini(
            systemPrompt,
            userMessage,
            apiKeyOpts.apiKey,
            model,
            maxTokens,
            signal,
          );
          return;
        case "azure-openai":
          if (!apiKeyOpts.endpoint || !apiKeyOpts.deploymentName)
            throw new Error("Azure OpenAI requires endpoint and deploymentName");
          yield* streamAzureOpenAI(
            systemPrompt,
            userMessage,
            apiKeyOpts.apiKey,
            apiKeyOpts.endpoint,
            apiKeyOpts.deploymentName,
            maxTokens,
            signal,
          );
          return;
        case "ollama":
          yield* streamOllama(
            systemPrompt,
            userMessage,
            apiKeyOpts.baseUrl || "http://localhost:11434",
            model,
            maxTokens,
            undefined, // No API key for local Ollama
            signal,
          );
          return;
        case "openrouter":
          yield* streamOpenRouter(
            systemPrompt,
            userMessage,
            apiKeyOpts.apiKey,
            model,
            maxTokens,
            apiKeyOpts.baseUrl || "",
            signal,
          );
          return;
        case "minimax":
          yield* streamOpenAI(
            systemPrompt,
            userMessage,
            apiKeyOpts.apiKey,
            model,
            maxTokens,
            signal,
          );
          return;
        case "ollama-cloud":
          yield* streamOllama(
            systemPrompt,
            userMessage,
            apiKeyOpts.baseUrl || "https://ollama.com",
            model,
            maxTokens,
            apiKeyOpts.apiKey,
            signal,
          );
          return;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const isRateLimit =
        lastError.message.toLowerCase().includes("rate limit") ||
        lastError.message.includes("429") ||
        lastError.message.toLowerCase().includes("quota");

      const isNetworkError =
        lastError.message.toLowerCase().includes("network") ||
        lastError.message.toLowerCase().includes("fetch") ||
        lastError.message.toLowerCase().includes("econnreset") ||
        lastError.message.toLowerCase().includes("timeout") ||
        lastError.message.toLowerCase().includes("enotfound") ||
        lastError.message.toLowerCase().includes(" socket ") ||
        lastError.message.includes("Failed to fetch");

      if ((isRateLimit || isNetworkError) && attempt < MAX_RETRIES) {
        const delayMs = isRateLimit
          ? 3000 * Math.pow(2, attempt) // 3s, 6s for rate limits
          : 1000 * Math.pow(2, attempt); // 1s, 2s for network errors
        const retryType = isRateLimit ? "Rate limited" : "Network error";
        yield `\n\n⏳ ${retryType} — retrying in ${delayMs / 1000}s (attempt ${attempt + 2}/${MAX_RETRIES + 1})...\n\n`;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      throw lastError;
    }
  }

  if (lastError) throw lastError;
}

export async function callAgentOnce(
  systemPrompt: string,
  userMessage: string,
  provider: LLMProvider,
  apiKeyOpts: {
    apiKey: string;
    baseUrl?: string;
    endpoint?: string;
    deploymentName?: string;
  },
  model: string,
  maxTokens: number = 800,
  expectJSON: boolean = false,
): Promise<{ success: boolean; data?: string; error?: string }> {
  if (!apiKeyOpts.apiKey && provider !== "ollama")
    throw new Error(`API key missing for provider: ${provider}`);

  const doCall = async () => {
    if (provider === "openai" || provider === "groq" || provider === "openrouter") {
      let url = "https://api.openai.com/v1/chat/completions";
      if (provider === "groq") url = "https://api.groq.com/openai/v1/chat/completions";
      if (provider === "openrouter")
        url = apiKeyOpts.baseUrl || "https://openrouter.ai/api/v1/chat/completions";

      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKeyOpts.apiKey}`,
        "Content-Type": "application/json",
      };
      if (provider === "openrouter") {
        headers["HTTP-Referer"] =
          typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
        headers["X-Title"] = "ClawLens";
      }

      const response = await proxyFetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: maxTokens,
          response_format:
            expectJSON && (provider === "openai" || provider === "groq")
              ? { type: "json_object" }
              : undefined,
        }),
      });

      if (!response.ok) throw new Error(await parseHttpError(response, provider));
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } else if (provider === "anthropic") {
      const response = await proxyFetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKeyOpts.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) throw new Error(await parseHttpError(response, "Anthropic"));
      const data = await response.json();
      return data.content?.[0]?.text || "";
    } else if (provider === "gemini") {
      const response = await proxyFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKeyOpts.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: userMessage }] }],
            systemInstruction: {
              role: "user",
              parts: [{ text: systemPrompt }],
            },
            generationConfig: {
              maxOutputTokens: maxTokens,
              responseMimeType: expectJSON ? "application/json" : "text/plain",
            },
          }),
        },
      );

      if (!response.ok) throw new Error(await parseHttpError(response, "Gemini"));
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (provider === "azure-openai") {
      if (!apiKeyOpts.endpoint || !apiKeyOpts.deploymentName)
        throw new Error("Azure OpenAI requires endpoint and deploymentName");
      const baseUrl = apiKeyOpts.endpoint.endsWith("/")
        ? apiKeyOpts.endpoint.slice(0, -1)
        : apiKeyOpts.endpoint;
      const url = `${baseUrl}/openai/deployments/${apiKeyOpts.deploymentName}/chat/completions?api-version=2024-02-15-preview`;

      const response = await proxyFetch(url, {
        method: "POST",
        headers: {
          "api-key": apiKeyOpts.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: maxTokens,
          response_format: expectJSON ? { type: "json_object" } : undefined,
        }),
      });
      if (!response.ok) throw new Error(await parseHttpError(response, "Azure OpenAI"));
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } else if (provider === "ollama") {
      const url = `${apiKeyOpts.baseUrl || "http://localhost:11434"}/api/chat`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          stream: false,
          options: { num_predict: maxTokens },
          format: expectJSON ? "json" : undefined,
        }),
      });

      if (!response.ok) throw new Error(await parseHttpError(response, "Ollama"));
      const data = await response.json();
      return data.message?.content || "";
    } else if (provider === "minimax") {
      const url = apiKeyOpts.baseUrl
        ? `${apiKeyOpts.baseUrl}/text/chatcompletion_v2`
        : "https://api.minimax.io/v1/text/chatcompletion_v2";

      const response = await proxyFetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKeyOpts.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(await parseHttpError(response, "Minimax"));
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } else if (provider === "ollama-cloud") {
      const cleanBase = (apiKeyOpts.baseUrl || "https://ollama.com")
        .replace(/\/api$/, "")
        .replace(/\/$/, "");
      const absoluteUrl = `${cleanBase}/api/chat`;

      const response = await proxyFetch(absoluteUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKeyOpts.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          stream: false,
          options: { num_predict: maxTokens },
          format: expectJSON ? "json" : undefined,
        }),
      });

      if (!response.ok) throw new Error(await parseHttpError(response, "Ollama Cloud"));
      const data = await response.json();
      return data.message?.content || "";
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  };

  try {
    let result = await doCall();

    if (expectJSON) {
      try {
        // Test parse
        JSON.parse(result);
      } catch {
        // First attempt failed to parse as JSON. Retry once by explicitly asking the LLM to output valid JSON.
        // Some models (like Groq versions or older Anthropic models) might wrap it in markdown.
        const cleanedTry = result.replace(/```json\n?|\n?```/g, "").trim();
        try {
          JSON.parse(cleanedTry);
          result = cleanedTry;
        } catch {
          // After all retries exhausted and JSON still invalid:
          // Return a structured fallback instead of throwing
          result = JSON.stringify({
            _parseError: true,
            _rawResponse: result.slice(0, 500),
          });
        }
      }
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    // Returned within try-catch block
  }
}
