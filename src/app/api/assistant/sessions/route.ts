export const runtime = "edge";

import { NextRequest } from "next/server";
import { chatManager } from "@/lib/personalAssistant/chatManager";

function getSessionId(request: NextRequest): string | null {
  return request.cookies.get("clawlens_session")?.value || request.headers.get("x-session-id");
}

function validateSession(
  request: NextRequest,
): { sessionId: string; error: null } | { sessionId: null; error: Response } {
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return {
      sessionId: null,
      error: new Response(JSON.stringify({ error: "No session found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  const isValidSessionId = /^[a-zA-Z0-9_-]{16,64}$/.test(sessionId);
  if (!isValidSessionId) {
    return {
      sessionId: null,
      error: new Response(JSON.stringify({ error: "Invalid session format" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { sessionId, error: null };
}

export async function GET(request: NextRequest) {
  try {
    const validation = validateSession(request);
    if (validation.error) return validation.error;

    const sessions = await chatManager.getSessions(validation.sessionId);

    return new Response(JSON.stringify({ sessions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Assistant Sessions API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = validateSession(request);
    if (validation.error) return validation.error;

    let title: string | undefined;
    try {
      const body = await request.json();
      title = typeof body.title === "string" ? body.title.slice(0, 200) : undefined;
    } catch {
      title = undefined;
    }

    const newSession = await chatManager.createSession(validation.sessionId, title);

    return new Response(JSON.stringify({ session: newSession }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Assistant Sessions API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
