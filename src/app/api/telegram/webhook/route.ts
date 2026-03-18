export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { handleMessage, handleCallbackQuery } from "@/lib/telegram/messageHandler";

const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const secretToken = request.headers.get("x-telegram-bot-api-secret-token");

    if (SECRET_TOKEN && secretToken !== SECRET_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();

    if (body.message) {
      await handleMessage(body.message);
    } else if (body.callback_query) {
      await handleCallbackQuery(body.callback_query);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function GET() {
  return new Response("Telegram Webhook is running", { status: 200 });
}
