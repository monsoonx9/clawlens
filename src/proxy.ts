import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createSession,
  getSession,
  cleanupOldSessions,
  generateDeviceFingerprint,
} from "@/lib/sessionManager";

const SESSION_COOKIE_NAME = "clawlens_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

let cleanupInitialized = false;

function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomUUID();
  return `${timestamp}-${randomPart}`;
}

function getSessionId(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value || null;
}

function setSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function proxy(request: NextRequest) {
  // Run cleanup periodically (only once per instance)
  if (!cleanupInitialized) {
    cleanupInitialized = true;
    cleanupOldSessions().catch(console.error);
  }

  const userAgent = request.headers.get("user-agent") || undefined;
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined;

  let sessionId = getSessionId(request);
  const isNewSession = !sessionId;

  if (isNewSession) {
    sessionId = generateSessionId();
    // Store session in Redis
    const fingerprint = generateDeviceFingerprint(userAgent);
    await createSession(
      sessionId,
      {
        fingerprint,
        userAgent: userAgent || "",
        screenResolution: "unknown",
        timezone: "unknown",
        language: "unknown",
        platform: "unknown",
      },
      userAgent,
      ipAddress,
    );
  } else {
    // Validate/update existing session in Redis
    // We can assume sessionId is not null here due to the if/else
    await getSession(sessionId!);
  }

  // Final confirmation that sessionId is not null
  const finalSessionId = sessionId!;

  // Important: Propagate session to the current request headers so the route handler can see it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-session-id", finalSessionId);

  // Also ensure the cookie is present in the request headers if it was just created
  if (isNewSession) {
    const existingCookie = requestHeaders.get("cookie") || "";
    const sessionCookie = `${SESSION_COOKIE_NAME}=${finalSessionId}`;
    requestHeaders.set(
      "cookie",
      existingCookie ? `${existingCookie}; ${sessionCookie}` : sessionCookie,
    );
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Also set it in the response for the client to store
  setSessionCookie(response, finalSessionId);
  response.headers.set("x-session-id", finalSessionId);

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
