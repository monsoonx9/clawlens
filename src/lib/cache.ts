import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
let redisInitialized = false;

export function getRedis(): Redis | null {
  if (redis) return redis;

  // Skip cache on client-side - only use on server
  if (typeof window !== "undefined") {
    return null;
  }

  // Server-only env vars - never expose to client
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    if (!redisInitialized) {
      console.warn("[Cache] Redis credentials not configured - caching disabled");
      redisInitialized = true;
    }
    return null;
  }

  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    if (!redisInitialized) {
      console.log("[Cache] Upstash Redis connected successfully");
      redisInitialized = true;
    }

    return redis;
  } catch (error) {
    console.error("[Cache] Failed to initialize Redis:", error);
    return null;
  }
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const data = await client.get<T>(key);
    return data ?? null;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  options: CacheOptions = {},
): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  const { ttl = 60 } = options; // Default 60 seconds

  try {
    await client.set(key, JSON.stringify(value), { ex: ttl });
    return true;
  } catch (error) {
    console.error("Cache set error:", error);
    return false;
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error("Cache delete error:", error);
    return false;
  }
}

export function generateCacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(":")}`;
}

export function generateUserCacheKey(
  sessionId: string,
  prefix: string,
  ...parts: string[]
): string {
  return `user:${sessionId}:${prefix}:${parts.join(":")}`;
}
