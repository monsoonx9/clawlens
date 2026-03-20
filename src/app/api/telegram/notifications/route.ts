export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getTelegramBot } from "@/lib/keyVault";

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

    const botConfig = await getTelegramBot(sessionId);
    if (!botConfig) {
      return new Response(JSON.stringify({ configured: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseAdmin();

    const { data: connection } = await supabase
      .from("telegram_connections")
      .select("notification_settings")
      .eq("user_id", sessionId)
      .eq("is_active", true)
      .single();

    const settings = connection?.notification_settings || {
      telegramEnabled: true,
      priceAlerts: true,
      whaleAlerts: true,
      portfolioDigest: true,
      newsAlerts: true,
      digestTime: "09:00",
    };

    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Telegram Notifications API] Error:", error);
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

    const botConfig = await getTelegramBot(sessionId);
    if (!botConfig) {
      return new Response(JSON.stringify({ error: "No bot connected" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("telegram_connections")
      .update({ notification_settings: body })
      .eq("user_id", sessionId)
      .eq("is_active", true);

    if (error) {
      console.error("[Telegram Notifications API] Error updating settings:", error);
      return new Response(JSON.stringify({ error: "Failed to update settings" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Telegram Notifications API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
