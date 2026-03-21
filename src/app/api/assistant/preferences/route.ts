export const runtime = "edge";

import { NextRequest } from "next/server";
import { chatManager } from "@/lib/personalAssistant/chatManager";
import { PersonalityType } from "@/types";

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

const VALID_PERSONALITIES: PersonalityType[] = [
  "friendly",
  "professional",
  "adaptive",
  "technical",
];

export async function GET(request: NextRequest) {
  try {
    const validation = validateSession(request);
    if (validation.error) return validation.error;

    const preferences = await chatManager.getUserPreferences(validation.sessionId);

    return new Response(JSON.stringify({ preferences }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Assistant Preferences API] Error:", error);
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { personality, language, notificationEnabled, portfolioAccess, tradeAccess } = body;

    const validatedPersonality: PersonalityType | undefined =
      typeof personality === "string" &&
      VALID_PERSONALITIES.includes(personality as PersonalityType)
        ? (personality as PersonalityType)
        : undefined;

    const preferences = await chatManager.updateUserPreferences(validation.sessionId, {
      personality: validatedPersonality,
      language: typeof language === "string" ? language.slice(0, 10) : undefined,
      notificationEnabled:
        typeof notificationEnabled === "boolean" ? notificationEnabled : undefined,
      portfolioAccess: typeof portfolioAccess === "boolean" ? portfolioAccess : undefined,
      tradeAccess: typeof tradeAccess === "boolean" ? tradeAccess : undefined,
    });

    return new Response(JSON.stringify({ preferences }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Assistant Preferences API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
