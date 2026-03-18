import { telegramClient } from "./client";
import { parseCommand, COMMANDS } from "./commands";
import { getMainKeyboard } from "./keyboards";
import { getKeys } from "@/lib/keyVault";
import { skillRouter } from "@/lib/personalAssistant/skillRouter";
import { PersonalityEngine } from "@/lib/personalAssistant/personalityEngine";
import { getPersonalAssistantSystemPrompt } from "@/agents/personalAssistant";
import { callAgentOnce } from "@/lib/llmClient";
import { LLMProvider } from "@/types";
import { getRedis } from "@/lib/cache";

// ---------------------------------------------------------------------------
// Conversation Memory — stores last N messages per chat in Redis
// ---------------------------------------------------------------------------

const MAX_HISTORY = 10; // keep last 10 messages (5 user + 5 assistant)
const HISTORY_TTL = 60 * 60 * 24; // 24 hours

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
    // Keep only last MAX_HISTORY messages
    const trimmed = history.slice(-MAX_HISTORY);
    await redis.set(getChatHistoryKey(chatId), JSON.stringify(trimmed), { ex: HISTORY_TTL });
  } catch (e) {
    console.error("[Telegram] Failed to save chat history:", e);
  }
}

// ---------------------------------------------------------------------------
// Core AI conversation handler (shared by free-text and /ask)
// ---------------------------------------------------------------------------

export async function handleAIMessage(
  chatId: number,
  userMessage: string,
  firstName?: string,
): Promise<string> {
  const user = await telegramClient.getUserByChatId(chatId);

  if (!user) {
    return "👋 Hi! I'm ClawLens Bot. Use /link to connect your account first, then you can chat with me!";
  }

  // Fetch the user's API keys via their web session
  const apiKeys = await getKeys(user.userId);

  if (!apiKeys || !apiKeys.llmApiKey) {
    return "⚠️ You haven't configured your AI API keys yet.\n\nPlease visit the ClawLens web app → Settings → API Keys to add your LLM provider key (OpenAI, Gemini, Groq, etc.).\n\nOnce configured, you can chat with me directly here!";
  }

  try {
    // Load conversation history for context
    const history = await getChatHistory(chatId);

    // Run skill router to gather data
    const skillInvocations = skillRouter.analyzeIntent(userMessage);
    let skillResults: string[] = [];
    let skillsUsed: string[] = [];

    if (skillInvocations.length > 0) {
      const skillContext = {
        sessionId: user.userId,
        userId: user.userId,
        apiKeys: {
          binanceApiKey: apiKeys.binanceApiKey || "",
          binanceSecretKey: apiKeys.binanceSecretKey || "",
          llmProvider: apiKeys.llmProvider,
          llmApiKey: apiKeys.llmApiKey,
          llmModel: apiKeys.llmModel,
          squareApiKey: apiKeys.squareApiKey,
        },
      };

      const skillOutput = await skillRouter.executeSkills(skillInvocations, skillContext);
      skillResults = skillOutput.results.map((r) => r.summary || JSON.stringify(r.data, null, 2));
      skillsUsed = skillOutput.skillsUsed;
    }

    // Build system prompt
    const hasPortfolio = !!(apiKeys.binanceApiKey && apiKeys.binanceSecretKey);
    const systemPrompt = getPersonalAssistantSystemPrompt("adaptive", firstName, {
      hasPortfolio,
      hasApiKeys: true,
    });

    // Build conversation history context for the LLM
    let conversationContext = "";
    if (history.length > 0) {
      conversationContext =
        "\n\n--- CONVERSATION HISTORY (most recent messages) ---\n" +
        history
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 500)}`)
          .join("\n") +
        "\n--- END HISTORY ---";
    }

    // Build the final user message with all context
    let enrichedMessage = userMessage;

    // Add explicit key status context
    const keyStatusContext = [
      `\n\n--- SYSTEM CONTEXT ---`,
      `Binance API Keys: ${hasPortfolio ? "CONFIGURED ✅" : "NOT CONFIGURED ❌ (user needs to add them in the web app Settings)"}`,
      `LLM Provider: ${apiKeys.llmProvider || "unknown"} ✅`,
      `Skills Executed: ${skillsUsed.length > 0 ? skillsUsed.join(", ") : "none"}`,
    ].join("\n");

    enrichedMessage += keyStatusContext;
    enrichedMessage += conversationContext;

    if (skillResults.length > 0) {
      enrichedMessage += `\n\n--- TOOL DATA (use this to answer) ---\n${skillResults.join("\n\n")}`;
    }

    // Add Telegram-specific instructions
    const telegramSystemPrompt =
      systemPrompt +
      `\n\nIMPORTANT: You are responding via Telegram. Keep responses concise (under 3000 characters). Use plain text with minimal formatting. Use line breaks for readability. Do NOT use markdown headers (#) — use bold text with HTML <b>tags</b> instead if needed. Telegram supports HTML: <b>bold</b>, <i>italic</i>, <code>code</code>, <pre>preformatted</pre>.` +
      `\n\nIMPORTANT: ClawLens is currently in Beta. If a skill returns empty or limited data, do NOT say "not connected" — instead say the data is temporarily unavailable or the feature is in beta. Be helpful and suggest alternatives. If Binance keys are NOT CONFIGURED (see SYSTEM CONTEXT), gently suggest the user add them in the ClawLens web app → Settings, but still provide whatever market data you can from other skills.` +
      `\n\nIMPORTANT: You have access to conversation history. Use it to maintain context and provide coherent follow-up responses. If the user refers to something discussed earlier, use the history to understand what they mean.`;

    // Call LLM with retry logic
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

    // Retry once on failure
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

      // Save conversation to history
      const updatedHistory: ChatMessage[] = [
        ...history,
        { role: "user", content: userMessage, timestamp: Date.now() },
        { role: "assistant", content: response.slice(0, 1000), timestamp: Date.now() },
      ];
      await saveChatHistory(chatId, updatedHistory);

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

// ---------------------------------------------------------------------------
// Message & Callback Handlers
// ---------------------------------------------------------------------------

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
  };
  text?: string;
}

interface TelegramCallbackQuery {
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
}

export async function handleMessage(message: TelegramMessage): Promise<void> {
  const { chat, text, from } = message;

  if (!text) return;

  const chatId = chat.id;
  const userId = from.id;
  const firstName = from.first_name;
  const username = from.username;

  if (text.startsWith("/")) {
    await handleCommand(chatId, text, { chatId, userId: String(userId), username, firstName });
    return;
  }

  // ── Real-time AI conversation for all free-text messages ──
  // Send native Telegram "typing..." indicator instead of a text message
  await telegramClient.sendChatAction(chatId, "typing");

  const response = await handleAIMessage(chatId, text, firstName);
  await telegramClient.sendMessage(chatId, response);
}

export async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<void> {
  const { id, data, message, from } = callbackQuery;

  if (!message || !data) return;

  const chatId = message.chat.id;

  await telegramClient.answerCallbackQuery(id);

  const action = data;

  if (action === "back_main") {
    await telegramClient.editMessageText(
      chatId,
      message.message_id,
      "👋 Main Menu",
      getMainKeyboard(),
    );
    return;
  }

  if (action === "action_portfolio") {
    // Use AI to get real portfolio data
    await telegramClient.editMessageText(
      chatId,
      message.message_id,
      "📊 Fetching your portfolio...",
    );
    const response = await handleAIMessage(
      chatId,
      "Show me my full portfolio summary with values, PnL, and risk score",
      from.first_name,
    );
    await telegramClient.sendMessage(chatId, response);
    return;
  }

  if (action === "action_price") {
    await telegramClient.editMessageText(
      chatId,
      message.message_id,
      "💰 <b>Get Price</b>\n\nSend me a token symbol (e.g., BTC, ETH) to get the price.",
      getMainKeyboard(),
    );
    return;
  }

  if (action === "action_alerts") {
    const user = await telegramClient.getUserByChatId(chatId);
    if (!user) {
      await telegramClient.editMessageText(
        chatId,
        message.message_id,
        "❌ Please link your account first with /link",
        getMainKeyboard(),
      );
      return;
    }

    await telegramClient.editMessageText(
      chatId,
      message.message_id,
      "🔔 <b>Price Alerts</b>\n\nSend me a message like 'Set alert for BTC at $100000' to create alerts.",
      getMainKeyboard(),
    );
    return;
  }

  if (action === "action_settings") {
    await telegramClient.editMessageText(
      chatId,
      message.message_id,
      "⚙️ <b>Settings</b>\n\nVisit the ClawLens web app to manage your settings.",
      getMainKeyboard(),
    );
    return;
  }

  if (action.startsWith("settings_")) {
    await handleSettingsAction(chatId, message.message_id, action);
    return;
  }

  if (action.startsWith("alerts_")) {
    await handleAlertsAction(chatId, message.message_id, action);
    return;
  }
}

async function handleCommand(
  chatId: number,
  text: string,
  context: { chatId: number; userId?: string; username?: string; firstName?: string },
): Promise<void> {
  const parsed = parseCommand(text);
  if (!parsed) {
    await telegramClient.sendMessage(chatId, "Unknown command. Type /help for available commands.");
    return;
  }

  const { command, args } = parsed;

  switch (command) {
    case "start": {
      const { handleStartCommand } = await import("./commands");
      const response = await handleStartCommand(context);
      await telegramClient.sendMessage(chatId, response);
      break;
    }

    case "help": {
      const { handleHelpCommand } = await import("./commands");
      const response = await handleHelpCommand(context);
      await telegramClient.sendMessage(chatId, response);
      break;
    }

    case "link": {
      const { handleLinkCommand } = await import("./commands");
      const response = await handleLinkCommand(context);
      await telegramClient.sendMessage(chatId, response.text, response.keyboard);
      break;
    }

    case "unlink": {
      const { handleUnlinkCommand } = await import("./commands");
      const response = await handleUnlinkCommand(context);
      await telegramClient.sendMessage(chatId, response);
      break;
    }

    case "portfolio": {
      // Real AI-powered portfolio command
      await telegramClient.sendMessage(chatId, "📊 Fetching your portfolio...");
      const response = await handleAIMessage(
        chatId,
        "Show me my full portfolio summary with values, PnL, and risk score",
        context.firstName,
      );
      await telegramClient.sendMessage(chatId, response);
      break;
    }

    case "price": {
      if (!args.trim()) {
        await telegramClient.sendMessage(chatId, "Please specify a symbol. Example: /price BTC");
        break;
      }
      // Real AI-powered price query
      await telegramClient.sendMessage(chatId, `💰 Looking up ${args.trim().toUpperCase()}...`);
      const response = await handleAIMessage(
        chatId,
        `What is the current price of ${args.trim().toUpperCase()}? Include 24h change, volume, and key levels.`,
        context.firstName,
      );
      await telegramClient.sendMessage(chatId, response);
      break;
    }

    case "alerts": {
      const { handleAlertsCommand } = await import("./commands");
      const response = await handleAlertsCommand(context);
      if (typeof response === "string") {
        await telegramClient.sendMessage(chatId, response);
      } else {
        await telegramClient.sendMessage(chatId, response.text, response.keyboard);
      }
      break;
    }

    case "settings": {
      const { handleSettingsCommand } = await import("./commands");
      const response = await handleSettingsCommand(context);
      if (typeof response === "string") {
        await telegramClient.sendMessage(chatId, response);
      } else {
        await telegramClient.sendMessage(chatId, response.text, response.keyboard);
      }
      break;
    }

    case "ask": {
      if (!args.trim()) {
        await telegramClient.sendMessage(
          chatId,
          "Please provide a question. Example: /ask what's the price of ETH?",
        );
        break;
      }
      // Real AI-powered ask command
      await telegramClient.sendMessage(chatId, "🤔 Thinking...");
      const response = await handleAIMessage(chatId, args.trim(), context.firstName);
      await telegramClient.sendMessage(chatId, response);
      break;
    }

    default:
      await telegramClient.sendMessage(
        chatId,
        `Unknown command: /${command}. Type /help for available commands.`,
      );
  }
}

async function handleSettingsAction(
  chatId: number,
  messageId: number,
  action: string,
): Promise<void> {
  const { getSettingsKeyboard, getConfirmKeyboard, getMainKeyboard } = await import("./keyboards");

  if (action === "settings_notifications") {
    await telegramClient.editMessageText(
      chatId,
      messageId,
      "🔔 <b>Notifications</b>\n\nNotification settings are managed in your web app dashboard.",
      getSettingsKeyboard(),
    );
    return;
  }

  if (action === "settings_portfolio") {
    await telegramClient.editMessageText(
      chatId,
      messageId,
      "📊 <b>Portfolio Access</b>\n\nPortfolio access is currently controlled via your Binance API keys in the web app settings.",
      getSettingsKeyboard(),
    );
    return;
  }

  if (action === "settings_link") {
    await telegramClient.editMessageText(
      chatId,
      messageId,
      `🔗 <b>Link Account</b>\n\nYour chat ID: <code>${chatId}</code>\n\nEnter this in your ClawLens settings.`,
      getSettingsKeyboard(),
    );
    return;
  }

  if (action === "settings_unlink") {
    await telegramClient.editMessageText(
      chatId,
      messageId,
      "❌ <b>Unlink Account</b>\n\nAre you sure you want to unlink your account?",
      getConfirmKeyboard("unlink"),
    );
    return;
  }

  if (action.startsWith("confirm_unlink")) {
    await telegramClient.unlinkUser(chatId);
    await telegramClient.editMessageText(
      chatId,
      messageId,
      "✅ Your account has been unlinked.",
      getMainKeyboard(),
    );
    return;
  }

  if (action.startsWith("cancel_")) {
    await telegramClient.editMessageText(chatId, messageId, "Action cancelled.", getMainKeyboard());
    return;
  }
}

async function handleAlertsAction(
  chatId: number,
  messageId: number,
  action: string,
): Promise<void> {
  const { getAlertsKeyboard } = await import("./keyboards");

  if (action === "alerts_add") {
    await telegramClient.editMessageText(
      chatId,
      messageId,
      "➕ <b>Add Alert</b>\n\nSend me a message like:\n<code>Set alert for BTC at $100000</code>",
      getAlertsKeyboard(),
    );
    return;
  }

  if (action === "alerts_list") {
    await telegramClient.editMessageText(
      chatId,
      messageId,
      "📋 <b>Your Alerts</b>\n\nNo alerts configured yet.",
      getAlertsKeyboard(),
    );
    return;
  }

  if (action === "alerts_delete") {
    await telegramClient.editMessageText(
      chatId,
      messageId,
      "🗑 <b>Delete Alert</b>\n\nNo alerts to delete.",
      getAlertsKeyboard(),
    );
    return;
  }
}
