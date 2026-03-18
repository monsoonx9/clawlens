// Use nodejs runtime for better stability with external fetches
export const runtime = "nodejs";

import { NextRequest } from "next/server";

function getSessionId(request: NextRequest): string | null {
  return request.cookies.get("clawlens_session")?.value || request.headers.get("x-session-id");
}

export async function POST(req: NextRequest) {
  try {
    const sessionId = getSessionId(req);

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "No session found. Please refresh the page." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { url, method, headers, body } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "Missing target URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // SSRF Protection: Validate URL against allowed domains
    const allowedDomains = [
      "api.openai.com",
      "api.anthropic.com",
      "api.groq.com",
      "openrouter.ai",
      "api.cohere.ai",
      "api.perplexity.ai",
      "api.mistral.ai",
      "cloudflare.com",
      "gateway.ai.cloudflare.com",
      "ollama.com",
      "api.ollama.com",
    ];

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!allowedDomains.includes(parsedUrl.hostname)) {
      return new Response(JSON.stringify({ error: "URL domain not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Block private/internal IP ranges
    const hostname = parsedUrl.hostname.toLowerCase();
    const isPrivateIP =
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local");

    if (isPrivateIP) {
      return new Response(JSON.stringify({ error: "Private/internal URLs not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Only allow HTTPS
    if (parsedUrl.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Only HTTPS URLs allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Filter out restricted headers that can cause fetch to fail
    const forbiddenHeaders = [
      "host",
      "connection",
      "content-length",
      "transfer-encoding",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailer",
      "upgrade",
      "cookie",
      "sec-fetch-dest",
      "sec-fetch-mode",
      "sec-fetch-site",
    ];

    const filteredHeaders: Record<string, string> = {
      "User-Agent": "ClawLens/1.0",
    };
    if (headers) {
      Object.keys(headers).forEach((key) => {
        if (!forbiddenHeaders.includes(key.toLowerCase())) {
          filteredHeaders[key] = headers[key];
        }
      });
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const response = await fetch(url, {
      method: method || "POST",
      headers: filteredHeaders,
      body: body || undefined,
      signal: controller.signal,
    }).catch((err) => {
      clearTimeout(timeoutId);
      console.error(`[Proxy] Fetch Error for ${url}:`, err.name, err.message);
      if (err.cause) console.error(`[Proxy] Error Cause:`, err.cause);
      throw err;
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("Content-Type");

    // Handle streaming
    if (contentType?.includes("text/event-stream")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Handle JSON or text
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        "Content-Type": contentType || "application/json",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LLM Proxy Error:", error);
    return new Response(
      JSON.stringify({
        error: "Proxy failed: " + message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
