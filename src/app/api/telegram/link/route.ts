export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { telegramClient } from "@/lib/telegram/client";

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

    const supabase = getSupabaseAdmin();

    const { data: connection, error: fetchError } = await supabase
      .from("telegram_connections")
      .select("telegram_chat_id, created_at")
      .eq("user_id", sessionId)
      .eq("is_active", true)
      .single();

    if (fetchError || !connection) {
      return new Response(JSON.stringify({ connected: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        connected: true,
        chatId: connection.telegram_chat_id,
        linkedAt: connection.created_at,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("[Telegram Link GET] Error:", error);
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
    const { chatId } = body;

    if (!chatId) {
      return new Response(JSON.stringify({ error: "chatId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("telegram_connections").upsert(
      {
        user_id: sessionId,
        telegram_chat_id: String(chatId),
        is_active: true,
        last_message_at: new Date().toISOString(),
      },
      {
        onConflict: "telegram_chat_id",
      },
    );

    if (error) {
      console.error("[Telegram Link] Error:", error);
      return new Response(JSON.stringify({ error: "Failed to link account" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await telegramClient.sendMessage(
        Number(chatId),
        "✅ Your Telegram has been successfully linked to your ClawLens account!",
      );
    } catch (e) {
      console.error("[Telegram Link] Error sending confirmation:", e);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Telegram Link API] Error:", error);
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

    const supabase = getSupabaseAdmin();

    const { data: connection, error: fetchError } = await supabase
      .from("telegram_connections")
      .select("telegram_chat_id")
      .eq("user_id", sessionId)
      .eq("is_active", true)
      .single();

    if (fetchError || !connection) {
      return new Response(JSON.stringify({ error: "No linked account found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase
      .from("telegram_connections")
      .update({ is_active: false })
      .eq("user_id", sessionId);

    if (error) {
      return new Response(JSON.stringify({ error: "Failed to unlink account" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await telegramClient.sendMessage(
        Number(connection.telegram_chat_id),
        "❌ Your Telegram has been unlinked from your ClawLens account.",
      );
    } catch (e) {
      console.error("[Telegram Unlink] Error sending confirmation:", e);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Telegram Unlink API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
