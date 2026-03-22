import { getKeys } from "@/lib/keyVault";
import { skillRouter } from "@/lib/personalAssistant/skillRouter";
import { getPersonalAssistantSystemPrompt } from "@/agents/personalAssistant";
import { callAgentOnce } from "@/lib/llmClient";
import { LLMProvider } from "@/types";
import { getRedis } from "@/lib/cache";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

const MAX_HISTORY = 10;
const HISTORY_TTL = 60 * 60 * 24;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

function getChatHistoryKey(chatId: number): string {
  return `telegram:history:${chatId}`;
}

async function getChatHistory(chatId: number): Promise<ChatMessage[]> {
  try {
    const redis = getRedis();
    if (!redis) return [];
    const data = await redis.get<string>(getChatHistoryKey(chatId));
    if (!data) return [];
    return typeof data === "string" ? JSON.parse(data) : (data as unknown as ChatMessage[]);
  } catch {
    return [];
  }
}

async function saveChatHistory(chatId: number, history: ChatMessage[]): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    const trimmed = history.slice(-MAX_HISTORY);
    await redis.set(getChatHistoryKey(chatId), JSON.stringify(trimmed), { ex: HISTORY_TTL });
  } catch (e) {
    console.error("[Telegram] Failed to save chat history:", e);
  }
}

async function getLastInvokedSkills(chatId: number): Promise<string[]> {
  try {
    const redis = getRedis();
    if (!redis) return [];
    const key = `telegram:lastSkills:${chatId}`;
    const data = await redis.get<string>(key);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveLastInvokedSkills(chatId: number, skills: string[]): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    const key = `telegram:lastSkills:${chatId}`;
    await redis.set(key, JSON.stringify(skills.slice(0, 5)), { ex: 60 * 60 }); // 1 hour TTL
  } catch (e) {
    console.error("[Telegram] Failed to save last invoked skills:", e);
  }
}

export async function handleAIMessage(
  chatId: number,
  sessionId: string,
  userMessage: string,
  firstName?: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data: connection } = await supabase
    .from("telegram_connections")
    .select("user_id")
    .eq("telegram_chat_id", String(chatId))
    .eq("is_active", true)
    .single();

  const userId = connection?.user_id || sessionId;

  console.log(
    `[Telegram AI] chatId=${chatId}, sessionId=${sessionId}, userId=${userId}, hasConnection=${!!connection}`,
  );

  let apiKeys = await getKeys(userId);
  console.log(
    `[Telegram AI] getKeys result: hasBinance=${!!apiKeys?.binanceApiKey}, hasLLM=${!!apiKeys?.llmApiKey}, llmProvider=${apiKeys?.llmProvider}`,
  );

  if ((!apiKeys || !apiKeys.llmApiKey) && connection) {
    const altKeys = await getKeys(sessionId);
    if (altKeys?.llmApiKey) {
      console.log(
        `[Telegram AI] Keys found in bot session (user may need to re-link). Using bot session keys.`,
      );
      apiKeys = altKeys;
    }
  }

  if (!apiKeys || !apiKeys.llmApiKey) {
    return "⚠️ You haven't configured your AI API keys yet.\n\nPlease visit the ClawLens web app → Settings → API Keys to add your LLM provider key (OpenAI, Gemini, Groq, etc.).\n\nOnce configured, you can chat with me directly here!";
  }

  try {
    // ── Fix 4: Build conversation history BEFORE skill routing ──
    const history = await getChatHistory(chatId);
    const lastInvokedSkills = await getLastInvokedSkills(chatId);

    // ── LLM-Powered Intent Classification ──
    const priorMessages = history.map((m) => ({ role: m.role, content: m.content }));
    const skillInvocations = await skillRouter.analyzeIntentSmart(userMessage, {
      llmProvider: apiKeys.llmProvider,
      llmApiKey: apiKeys.llmApiKey,
      llmModel: apiKeys.llmModel,
      llmBaseUrl: apiKeys.llmBaseUrl,
      llmEndpoint: apiKeys.llmEndpoint,
      llmDeploymentName: apiKeys.llmDeploymentName,
    }, {
      priorMessages,
      lastInvokedSkills,
    });

    let skillResults: string[] = [];
    let skillsUsed: string[] = [];
    let failedSkills: string[] = [];

    if (skillInvocations.length > 0) {
      const skillContext = {
        sessionId: userId,
        userId: userId,
        apiKeys: {
          binanceApiKey: apiKeys.binanceApiKey || "",
          binanceSecretKey: apiKeys.binanceSecretKey || "",
          llmProvider: apiKeys.llmProvider,
          llmApiKey: apiKeys.llmApiKey,
          llmModel: apiKeys.llmModel,
          llmBaseUrl: apiKeys.llmBaseUrl,
          llmEndpoint: apiKeys.llmEndpoint,
          llmDeploymentName: apiKeys.llmDeploymentName,
          squareApiKey: apiKeys.squareApiKey,
        },
      };

      const skillOutput = await skillRouter.executeSkills(skillInvocations, skillContext);
      skillResults = skillOutput.results.map((r) => {
        const dataObj = r.data as Record<string, any> | undefined;
        const hasErrorState = 
          !r.success || 
          dataObj?.status === "unavailable" || 
          dataObj?.status === "error" || 
          (r.summary && r.summary.toLowerCase().includes("unavailable")) ||
          dataObj?.error !== undefined;
          
        let text = "";
        if (hasErrorState) {
          text = r.summary ? r.summary : JSON.stringify(r.data);
          text = `[ERROR: TOOL EXECUTION FAILED] ${text}\n🛑 CRITICAL INSTRUCTION TO AI: DO NOT INVENT OR HALLUCINATE DATA. TELL THE USER THE TOOL FAILED.`;
        } else {
          text = r.summary 
            ? `${r.summary}\n\nDATA FETCHED:\n${JSON.stringify(r.data)}` 
            : JSON.stringify(r.data);
        }
        return text;
      });
      skillsUsed = skillOutput.skillsUsed;
      failedSkills = skillOutput.failedSkills;
    }

    const hasPortfolio = !!(apiKeys.binanceApiKey && apiKeys.binanceSecretKey);

    // ── Fix 4: Conversation context built after skill routing (for LLM) ──
    let conversationContext = "";
    if (history.length > 0) {
      conversationContext =
        "\n\n--- CONVERSATION HISTORY (most recent messages) ---\n" +
        history
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 500)}`)
          .join("\n") +
        "\n--- END HISTORY ---";
    }

    let enrichedMessage = userMessage;

    // ── Fix 3: Report failed skills to LLM ──
    let failureContext = "";
    if (failedSkills.length > 0) {
      failureContext = `\n\n--- SKILL FAILURES ---\nThe following tools failed to return data: ${failedSkills.join(", ")}. Mention this to the user and suggest they check their API key settings or try again. Do NOT pretend the data loaded successfully.\n--- END FAILURES ---`;
    }

    const keyStatusContext = [
      `\n\n--- SYSTEM CONTEXT ---`,
      `Binance API Keys: ${hasPortfolio ? "CONFIGURED ✅" : "NOT CONFIGURED ❌ (user needs to add them in the web app Settings)"}`,
      `LLM Provider: ${apiKeys.llmProvider || "unknown"} ✅`,
      `Skills Executed: ${skillsUsed.length > 0 ? skillsUsed.join(", ") : "none"}`,
      failedSkills.length > 0 ? `⚠️ Failed Skills: ${failedSkills.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    enrichedMessage += keyStatusContext;
    enrichedMessage += failureContext;
    enrichedMessage += conversationContext;

    if (skillResults.length > 0) {
      enrichedMessage += `\n\n--- TOOL DATA (use this to answer) ---\n${skillResults.join("\n\n")}`;
    }

    const systemPrompt = getPersonalAssistantSystemPrompt("adaptive", firstName, {
      hasPortfolio,
      hasApiKeys: true,
    });

    const telegramSystemPrompt =
      systemPrompt +
      `\n\nIMPORTANT: You are responding via Telegram. Keep responses concise (under 3000 characters). Use plain text with minimal formatting. Use line breaks for readability. Do NOT use markdown headers (#) — use bold text with HTML <b>tags</b> instead if needed. Telegram supports HTML: <b>bold</b>, <i>italic</i>, <code>code</code>, <pre>preformatted</pre>.` +
      `\n\nIMPORTANT: ClawLens is currently in Beta. If a skill returns empty or limited data, do NOT say "not connected" — instead say the data is temporarily unavailable or the feature is in beta. Be helpful and suggest alternatives. If Binance keys are NOT CONFIGURED (see SYSTEM CONTEXT), gently suggest the user add them in the ClawLens web app → Settings, but still provide whatever market data you can from other skills.` +
      `\n\nIMPORTANT: You have access to conversation history. Use it to maintain context and provide coherent follow-up responses. If the user refers to something discussed earlier, use the history to understand what they mean.`;

    let result = await callAgentOnce(
      telegramSystemPrompt,
      enrichedMessage,
      apiKeys.llmProvider as LLMProvider,
      {
        apiKey: apiKeys.llmApiKey,
        baseUrl: apiKeys.llmBaseUrl,
        endpoint: apiKeys.llmEndpoint,
        deploymentName: apiKeys.llmDeploymentName,
      },
      apiKeys.llmModel || "gpt-4o",
      1500,
    );

    if (!result.success) {
      console.warn("[Telegram AI] First attempt failed, retrying...");
      await new Promise((r) => setTimeout(r, 1000));
      result = await callAgentOnce(
        telegramSystemPrompt,
        enrichedMessage,
        apiKeys.llmProvider as LLMProvider,
        {
          apiKey: apiKeys.llmApiKey,
          baseUrl: apiKeys.llmBaseUrl,
          endpoint: apiKeys.llmEndpoint,
          deploymentName: apiKeys.llmDeploymentName,
        },
        apiKeys.llmModel || "gpt-4o",
        1500,
      );
    }

    if (result.success && result.data) {
      let response = result.data;
      if (skillsUsed.length > 0) {
        response += `\n\n🔧 <i>Tools used: ${skillsUsed.join(", ")}</i>`;
      }

      // ── Fix 4: Save history after successful response ──
      const updatedHistory: ChatMessage[] = [
        ...history,
        { role: "user" as const, content: userMessage, timestamp: Date.now() },
        { role: "assistant" as const, content: response.slice(0, 1000), timestamp: Date.now() },
      ];
      await saveChatHistory(chatId, updatedHistory);

      // ── Fix 4: Save last invoked skills for follow-up detection ──
      if (skillsUsed.length > 0) {
        await saveLastInvokedSkills(chatId, skillsUsed);
      }

      return response;
    }

    return "❌ Sorry, I encountered an error generating a response. Please try again.";
  } catch (error) {
    console.error("[Telegram AI] Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);

    if (errMsg.includes("401") || errMsg.includes("Authentication")) {
      return "🔐 Your API key seems invalid or expired. Please update it in the ClawLens web app → Settings.";
    }
    if (errMsg.includes("429") || errMsg.includes("Rate")) {
      return "⏳ Rate limit reached. Please wait a moment and try again.";
    }
    if (errMsg.includes("timeout")) {
      return "⏱ The request timed out. Try a simpler question or try again shortly.";
    }

    return "❌ Something went wrong. Please try again or check your API key settings in the web app.";
  }
}
