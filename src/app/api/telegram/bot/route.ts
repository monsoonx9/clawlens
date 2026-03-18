export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  getTelegramBot,
  storeTelegramBot,
  deleteTelegramBot,
  TelegramBotConfig,
} from "@/lib/keyVault";
import {
  generateWebhookSecret,
  getWebhookUrl,
  setUserWebhook,
  deleteUserWebhook,
} from "@/lib/telegram/webhook";
import { UserTelegramClient } from "@/lib/telegram/userClient";

function getSessionId(request: NextRequest): string | null {
  return request.cookies.get("clawlens_session")?.value || request.headers.get("x-session-id");
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "No session found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const config = await getTelegramBot(sessionId);

    if (!config) {
      return new Response(JSON.stringify({ configured: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.vercel.app";
    const webhookUrl = getWebhookUrl(config.webhookSecret, appUrl);

    return new Response(
      JSON.stringify({
        configured: true,
        botUsername: config.botUsername,
        isActive: config.isActive,
        webhookUrl,
        webhookConfigured: config.isActive,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("[Telegram Bot API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "No session found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { botToken } = body;

    if (!botToken) {
      return new Response(JSON.stringify({ error: "botToken is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bot = new UserTelegramClient(botToken);
    const botInfo = await bot.getMe();

    if (!botInfo) {
      return new Response(JSON.stringify({ error: "Invalid bot token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const webhookSecret = generateWebhookSecret();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return new Response(
        JSON.stringify({
          error: "NEXT_PUBLIC_APP_URL not configured. Please set your Vercel deployment URL.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const webhookUrl = getWebhookUrl(webhookSecret, appUrl);
    const webhookResult = await setUserWebhook(botToken, webhookUrl, webhookSecret);

    if (!webhookResult.success) {
      console.error("[Telegram Bot API] Webhook setup failed:", webhookResult.error);
    }

    const config: TelegramBotConfig = {
      botToken,
      botUsername: botInfo.username,
      webhookSecret,
      isActive: webhookResult.success,
    };

    await storeTelegramBot(sessionId, config);

    return new Response(
      JSON.stringify({
        success: true,
        configured: true,
        botUsername: botInfo.username,
        webhookUrl,
        webhookConfigured: webhookResult.success,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("[Telegram Bot API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "No session found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const config = await getTelegramBot(sessionId);

    if (config) {
      await deleteUserWebhook(config.botToken);
      await deleteTelegramBot(sessionId);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Telegram Bot API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
