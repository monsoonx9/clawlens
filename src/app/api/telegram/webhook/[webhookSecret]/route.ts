export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { TelegramBotConfig, decryptTelegramBot } from "@/lib/keyVault";
import { UserTelegramClient } from "@/lib/telegram/userClient";
import { getMainKeyboard } from "@/lib/telegram/keyboards";
import { getRedis } from "@/lib/cache";

async function findBotConfigBySecret(webhookSecret: string): Promise<TelegramBotConfig | null> {
  const { getRedis } = await import("@/lib/cache");
  const redis = getRedis();

  if (!redis) {
    console.error("[Dynamic Webhook] Redis not available");
    return null;
  }

  const keys = await redis.keys("vault:telegram:*");

  for (const key of keys) {
    try {
      const encrypted = await redis.get<string>(key);
      if (!encrypted) continue;

      const { decryptTelegramBot } = await import("@/lib/keyVault");
      const config = decryptTelegramBot(encrypted);

      if (config.webhookSecret === webhookSecret) {
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

    const body = await request.json();

    const botConfig = await findBotConfigBySecret(webhookSecret);

    if (!botConfig) {
      console.error(
        "[Dynamic Webhook] Bot config not found for secret:",
        webhookSecret.slice(0, 8),
      );
      return new Response("Bot not found", { status: 404 });
    }

    const bot = UserTelegramClient.fromConfig(botConfig);

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
  request: NextRequest,
  { params }: { params: Promise<{ webhookSecret: string }> },
) {
  return new Response("Telegram Webhook is running", { status: 200 });
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

  if (text.startsWith("/")) {
    await handleCommand(bot, chatId, text, firstName);
    return;
  }

  // Route free text to the AI Assistant
  const { handleAIMessage } = await import("@/lib/telegram/messageHandler");
  await bot.sendMessage(chatId, "🤔 Thinking...");
  const response = await handleAIMessage(chatId, text, firstName);
  await bot.sendMessage(chatId, response);
}

async function handleCallbackQuery(
  bot: UserTelegramClient,
  callbackQuery: TelegramCallbackQuery,
): Promise<void> {
  const { id, data, message, from } = callbackQuery;

  if (!message || !data) return;

  const chatId = message.chat.id;
  const messageId = message.message_id;

  await bot.answerCallbackQuery(id);

  if (data === "back_main") {
    await bot.editMessageText(chatId, messageId, "👋 Main Menu", getMainKeyboard());
    return;
  }

  if (data === "action_portfolio") {
    const { handleAIMessage } = await import("@/lib/telegram/messageHandler");
    await bot.editMessageText(
      chatId,
      messageId,
      "🤔 Analyzing your portfolio...",
      getMainKeyboard(),
    );
    const response = await handleAIMessage(
      chatId,
      "Show me my full portfolio summary with values, PnL, and risk score",
      from.first_name,
    );
    await bot.sendMessage(chatId, response, getMainKeyboard());
    return;
  }

  if (data === "action_price") {
    await bot.editMessageText(
      chatId,
      messageId,
      "💰 Get Price\n\nSend me a token symbol (e.g., BTC, ETH)!",
      getMainKeyboard(),
    );
    return;
  }

  if (data === "action_alerts") {
    await bot.editMessageText(
      chatId,
      messageId,
      "🔔 Price Alerts\n\nAlerts are managed in the web app.",
      getMainKeyboard(),
    );
    return;
  }

  if (data === "action_settings") {
    await bot.editMessageText(
      chatId,
      messageId,
      "⚙️ Settings\n\nManage your bot settings in the web app!",
      getMainKeyboard(),
    );
    return;
  }
}

async function handleCommand(
  bot: UserTelegramClient,
  chatId: number,
  text: string,
  firstName: string,
): Promise<void> {
  const match = text.match(/^\/(\w+)(?:\s+(.*))?$/);
  if (!match) return;

  const command = match[1].toLowerCase();
  const args = match[2] || "";

  const context = { chatId, userId: String(chatId), username: "", firstName };
  const { handleStartCommand, handleHelpCommand, handleLinkCommand, handleUnlinkCommand } =
    await import("@/lib/telegram/commands");

  switch (command) {
    case "start": {
      const resp = await handleStartCommand(context);
      await bot.sendMessage(chatId, resp, getMainKeyboard());
      break;
    }

    case "help": {
      const resp = await handleHelpCommand(context);
      await bot.sendMessage(chatId, resp, getMainKeyboard());
      break;
    }

    case "link": {
      const resp = await handleLinkCommand(context);
      await bot.sendMessage(chatId, resp.text, resp.keyboard);
      break;
    }

    case "unlink": {
      const resp = await handleUnlinkCommand(context);
      await bot.sendMessage(chatId, resp, getMainKeyboard());
      break;
    }

    case "portfolio": {
      const { handleAIMessage } = await import("@/lib/telegram/messageHandler");
      await bot.sendMessage(chatId, "🤔 Analyzing your portfolio...", getMainKeyboard());
      const pResponse = await handleAIMessage(
        chatId,
        "Show me my full portfolio summary with values, PnL, and risk score",
        firstName,
      );
      await bot.sendMessage(chatId, pResponse, getMainKeyboard());
      break;
    }

    case "price": {
      if (!args) {
        await bot.sendMessage(chatId, "Please provide a symbol. Example: /price BTC");
      } else {
        const { handleAIMessage } = await import("@/lib/telegram/messageHandler");
        await bot.sendMessage(
          chatId,
          `🤔 Fetching price for ${args.toUpperCase()}...`,
          getMainKeyboard(),
        );
        const response = await handleAIMessage(
          chatId,
          `What is the current price of ${args.toUpperCase()}? Include 24h change, volume, and key levels.`,
          firstName,
        );
        await bot.sendMessage(chatId, response, getMainKeyboard());
      }
      break;
    }

    default:
      await bot.sendMessage(
        chatId,
        `Unknown command: /${command}\n\nType /help for available commands.`,
      );
  }
}
