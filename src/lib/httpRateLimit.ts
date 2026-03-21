import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000,
};

export function getRateLimitIdentifier(request: NextRequest): string {
  const sessionId = request.cookies.get("clawlens_session")?.value;
  if (sessionId) {
    return `session:${sessionId}`;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();

  let entry = rateLimitStore.get(identifier);

  if (!entry || now >= entry.resetTime) {
    entry = { count: 0, resetTime: now + config.windowMs };
  }

  entry.count++;
  rateLimitStore.set(identifier, entry);

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig = DEFAULT_CONFIG,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const identifier = getRateLimitIdentifier(request);
    const { allowed, remaining, resetIn } = checkRateLimit(identifier, config);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(resetIn),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetIn),
          },
        },
      );
    }

    const response = await handler(request);

    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(resetIn));

    return response;
  };
}

setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime + 60000) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => rateLimitStore.delete(key));
}, 60000);
