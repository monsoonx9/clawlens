export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { TelegramBotConfig } from "@/lib/keyVault";
import { UserTelegramClient } from "@/lib/telegram/userClient";
import { getMainKeyboard, getHelpKeyboard } from "@/lib/telegram/keyboards";
import { getTelegramBot } from "@/lib/keyVault";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

const BOT_COMMANDS = [
  { command: "start", description: "Start the bot" },
  { command: "help", description: "Show all commands" },
  { command: "link", description: "Link your account" },
  { command: "portfolio", description: "View your portfolio" },
  { command: "price", description: "Get token price (e.g., /price BTC)" },
  { command: "alerts", description: "Manage price alerts" },
  { command: "settings", description: "Bot preferences" },
  { command: "ask", description: "Ask a question" },
  { command: "subscribe", description: "Subscribe to alerts" },
  { command: "digest", description: "Set daily portfolio summary" },
  { command: "whale", description: "Recent whale activity" },
  { command: "rug", description: "Check contract safety" },
];

async function setupBotCommands(bot: UserTelegramClient): Promise<void> {
  try {
    await bot.setMyCommands(BOT_COMMANDS);
    await bot.setChatMenuButton();
  } catch (error) {
    console.error("[TelegramBot] Failed to set up commands:", error);
  }
}

async function findBotConfigBySecret(
  secret: string,
  sessionId?: string,
): Promise<TelegramBotConfig | null> {
  if (sessionId) {
    const config = await getTelegramBot(sessionId);
    if (config && config.webhookSecret === secret) {
      return config;
    }
  }

  const { getRedis } = await import("@/lib/cache");
  const redis = getRedis();

  if (!redis) {
    return null;
  }

  const keys = await redis.keys("vault:telegram:*");

  for (const key of keys) {
    try {
      const encrypted = await redis.get<string>(key);
      if (!encrypted) continue;

      const { decryptTelegramBot } = await import("@/lib/keyVault");
      const config = decryptTelegramBot(encrypted);

      if (config.webhookSecret === secret) {
        return config;
      }
    } catch (e) {
      console.error("[Dynamic Webhook] Error checking key:", e);
    }
  }

  return null;
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ webhookSecret: string }> },
) {
  try {
    const resolvedParams = await params;
    const webhookSecret = resolvedParams.webhookSecret;

    const secretToken = request.headers.get("x-telegram-bot-api-secret-token");

    if (secretToken !== webhookSecret) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const sessionId = pathParts.length > 4 ? pathParts[pathParts.length - 1] : undefined;

    const body = await request.json();

    const botConfig = await findBotConfigBySecret(webhookSecret, sessionId);

    if (!botConfig) {
      console.error("[Dynamic Webhook] Bot config not found");
      return new Response("Bot not found", { status: 404 });
    }

    const bot = UserTelegramClient.fromConfig(botConfig);

    const commandsKey = `telegram:commands_setup:${webhookSecret.slice(0, 8)}`;
    const { getRedis } = await import("@/lib/cache");
    const redis = getRedis();
    if (redis) {
      const alreadySetup = await redis.get(commandsKey);
      if (!alreadySetup) {
        await setupBotCommands(bot);
        await redis.set(commandsKey, "1", { ex: 86400 });
      }
    }

    if (body.message) {
      await handleMessage(bot, body.message, botConfig);
    } else if (body.callback_query) {
      await handleCallbackQuery(bot, body.callback_query);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Dynamic Webhook] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  _context: { params: Promise<{ webhookSecret: string }> },
) {
  return new Response("Telegram Webhook is running", { status: 200 });
}

async function autoLinkUser(
  chatId: number,
  telegramUserId: number,
  sessionId: string,
  username?: string,
  firstName?: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("telegram_connections").upsert(
    {
      user_id: sessionId,
      telegram_chat_id: String(chatId),
      telegram_user_id: String(telegramUserId),
      username,
      first_name: firstName,
      is_active: true,
      last_message_at: new Date().toISOString(),
    },
    {
      onConflict: "telegram_chat_id",
    },
  );

  return !error;
}

async function handleMessage(
  bot: UserTelegramClient,
  message: TelegramMessage,
  config: TelegramBotConfig,
): Promise<void> {
  const { chat, text, from } = message;

  if (!text) return;

  const chatId = chat.id;
  const firstName = from.first_name;
  const username = from.username;
  const telegramUserId = from.id;

  if (text.startsWith("/")) {
    await handleCommand(bot, chatId, telegramUserId, text, config.sessionId, username, firstName);
    return;
  }

  const { handleAIMessage } = await import("@/lib/telegram/messageHandler");

  if (text === "📊 Portfolio") {
    await bot.sendMessage(chatId, "🤔 Fetching your portfolio...", getMainKeyboard());
    const response = await handleAIMessage(
      chatId,
      config.sessionId,
      "Show me my full portfolio summary with values, PnL, and risk score",
      firstName,
    );
    await bot.sendMessage(chatId, response, getMainKeyboard());
    return;
  }

  if (text === "💰 Price") {
    await bot.sendMessage(
      chatId,
      "💰 Get Price\n\nSend me a token symbol (e.g., BTC, ETH)!",
      getMainKeyboard(),
    );
    return;
  }

  if (text === "🔔 Alerts") {
    const { handleAlertsCommand } = await import("@/lib/telegram/commands");
    const resp = await handleAlertsCommand({ chatId, userId: config.sessionId, firstName });
    if (typeof resp === "string") {
      await bot.sendMessage(chatId, resp, getMainKeyboard());
    } else {
      await bot.sendMessage(chatId, resp.text, resp.keyboard);
    }
    return;
  }

  if (text === "⚙️ Settings") {
    const { handleSettingsCommand } = await import("@/lib/telegram/commands");
    const resp = await handleSettingsCommand({ chatId, userId: config.sessionId, firstName });
    if (typeof resp === "string") {
      await bot.sendMessage(chatId, resp, getMainKeyboard());
    } else {
      await bot.sendMessage(chatId, resp.text, resp.keyboard);
    }
    return;
  }

  await bot.sendMessage(chatId, "🤔 Thinking...", getMainKeyboard());
  const response = await handleAIMessage(chatId, config.sessionId, text, firstName);
  await bot.sendMessage(chatId, response, getMainKeyboard());
}

async function handleCallbackQuery(
  bot: UserTelegramClient,
  callbackQuery: TelegramCallbackQuery,
): Promise<void> {
  const { id, data, message } = callbackQuery;

  if (!message || !data) return;

  const chatId = message.chat.id;
  const messageId = message.message_id;

  await bot.answerCallbackQuery(id);

  if (data === "back_main") {
    await bot.editMessageText(chatId, messageId, "👋 Main Menu", getMainKeyboard());
    return;
  }

  if (data.startsWith("help_")) {
    const category = data.replace("help_", "");
    await bot.editMessageText(
      chatId,
      messageId,
      `📚 ${category.charAt(0).toUpperCase() + category.slice(1)} Help\n\nType /${category} to get started!`,
      getHelpKeyboard(),
    );
    return;
  }
}

async function handleCommand(
  bot: UserTelegramClient,
  chatId: number,
  telegramUserId: number,
  text: string,
  sessionId: string,
  username?: string,
  firstName?: string,
): Promise<void> {
  const match = text.match(/^\/(\w+)(?:\s+(.*))?$/);
  if (!match) return;

  const command = match[1].toLowerCase();
  const args = match[2] || "";

  const context = { chatId, userId: sessionId, username, firstName };

  switch (command) {
    case "start": {
      const { handleStartCommand } = await import("@/lib/telegram/commands");
      const response = await handleStartCommand(context);
      await bot.sendMessage(chatId, response, getMainKeyboard());
      break;
    }

    case "help": {
      const { handleHelpCommand } = await import("@/lib/telegram/commands");
      const response = await handleHelpCommand(context);
      await bot.sendMessage(chatId, response.text, response.keyboard);
      break;
    }

    case "link": {
      if (!args.trim()) {
        await bot.sendMessage(
          chatId,
          "🔗 *Link Your Account*\n\nSend /link followed by your code.\n\nGet your code from the ClawLens dashboard in Settings → Telegram Bot.",
          getMainKeyboard(),
        );
        break;
      }

      const { validateLinkCode } = await import("@/lib/keyVault");
      const validSessionId = await validateLinkCode(args.trim().toUpperCase());

      if (!validSessionId) {
        await bot.sendMessage(
          chatId,
          "❌ Invalid or expired link code.\n\nPlease get a new code from Settings → Telegram Bot.",
          getMainKeyboard(),
        );
        break;
      }

      const linked = await autoLinkUser(
        chatId,
        telegramUserId,
        validSessionId,
        username,
        firstName,
      );

      if (linked) {
        await bot.sendMessage(
          chatId,
          "✅ *Account Linked!*\n\nYour Telegram is now connected to your ClawLens account.\n\nYou can now access all features including portfolio, alerts, and chat with AI!",
          getMainKeyboard(),
        );
      } else {
        await bot.sendMessage(
          chatId,
          "❌ Failed to link account. Please try again.",
          getMainKeyboard(),
        );
      }
      break;
    }

    case "portfolio": {
      const { handleAIMessage } = await import("@/lib/telegram/messageHandler");
      await bot.sendMessage(chatId, "🤔 Fetching your portfolio...", getMainKeyboard());
      const response = await handleAIMessage(
        chatId,
        sessionId,
        "Show me my full portfolio summary with values, PnL, and risk score",
        firstName,
      );
      await bot.sendMessage(chatId, response, getMainKeyboard());
      break;
    }

    case "price": {
      if (!args) {
        await bot.sendMessage(
          chatId,
          "Please provide a symbol. Example: /price BTC",
          getMainKeyboard(),
        );
      } else {
        const { handleAIMessage } = await import("@/lib/telegram/messageHandler");
        await bot.sendMessage(
          chatId,
          `🤔 Fetching price for ${args.toUpperCase()}...`,
          getMainKeyboard(),
        );
        const response = await handleAIMessage(
          chatId,
          sessionId,
          `What is the current price of ${args.toUpperCase()}? Include 24h change, volume, and key levels.`,
          firstName,
        );
        await bot.sendMessage(chatId, response, getMainKeyboard());
      }
      break;
    }

    case "alerts": {
      const { handleAlertsCommand } = await import("@/lib/telegram/commands");
      const resp = await handleAlertsCommand(context);
      if (typeof resp === "string") {
        await bot.sendMessage(chatId, resp, getMainKeyboard());
      } else {
        await bot.sendMessage(chatId, resp.text, resp.keyboard);
      }
      break;
    }

    case "settings": {
      const { handleSettingsCommand } = await import("@/lib/telegram/commands");
      const resp = await handleSettingsCommand(context);
      if (typeof resp === "string") {
        await bot.sendMessage(chatId, resp, getMainKeyboard());
      } else {
        await bot.sendMessage(chatId, resp.text, resp.keyboard);
      }
      break;
    }

    case "ask": {
      if (!args.trim()) {
        await bot.sendMessage(
          chatId,
          "Please provide a question. Example: /ask what's the price of ETH?",
          getMainKeyboard(),
        );
        break;
      }
      const { handleAIMessage } = await import("@/lib/telegram/messageHandler");
      await bot.sendMessage(chatId, "🤔 Thinking...", getMainKeyboard());
      const response = await handleAIMessage(chatId, sessionId, args.trim(), firstName);
      await bot.sendMessage(chatId, response, getMainKeyboard());
      break;
    }

    case "subscribe": {
      const { handleSubscribeCommand } = await import("@/lib/telegram/commands");
      const response = await handleSubscribeCommand(context, args);
      await bot.sendMessage(chatId, response, getMainKeyboard());
      break;
    }

    case "digest": {
      const { handleDigestCommand } = await import("@/lib/telegram/commands");
      const response = await handleDigestCommand(context, args);
      await bot.sendMessage(chatId, response, getMainKeyboard());
      break;
    }

    case "whale": {
      const { handleWhaleCommand } = await import("@/lib/telegram/commands");
      const response = await handleWhaleCommand(context);
      await bot.sendMessage(chatId, response, getMainKeyboard());
      break;
    }

    case "rug": {
      const { handleRugCheckCommand } = await import("@/lib/telegram/commands");
      const response = await handleRugCheckCommand(context, args);
      await bot.sendMessage(chatId, response, getMainKeyboard());
      break;
    }

    default:
      await bot.sendMessage(
        chatId,
        `Unknown command: /${command}\n\nType /help for available commands.`,
        getMainKeyboard(),
      );
  }
}
