export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getTelegramBot, generateLinkCode } from "@/lib/keyVault";

function getSessionId(request: NextRequest): string | null {
  return request.cookies.get("clawlens_session")?.value || request.headers.get("x-session-id");
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

    const config = await getTelegramBot(sessionId);

    if (!config) {
      return new Response(JSON.stringify({ error: "No bot connected" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const code = await generateLinkCode(sessionId);

    if (!code) {
      return new Response(JSON.stringify({ error: "Failed to generate code" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ code }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Telegram Generate Code API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
