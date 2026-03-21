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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const resolvedParams = await params;
    const validation = validateSession(request);
    if (validation.error) return validation.error;

    await chatManager.deleteSession(resolvedParams.sessionId, validation.sessionId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Assistant Session Delete API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const resolvedParams = await params;
    const validation = validateSession(request);
    if (validation.error) return validation.error;

    let title: string;
    try {
      const body = await request.json();
      title = body.title;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (title.length > 200) {
      return new Response(JSON.stringify({ error: "Title must be 200 characters or less" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await chatManager.updateSessionTitle(
      resolvedParams.sessionId,
      validation.sessionId,
      title.slice(0, 200),
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Assistant Session Patch API] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
