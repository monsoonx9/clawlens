import { getRedis } from "./cache";

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days in seconds
const SESSION_PREFIX = "session:";

export interface SessionData {
  sessionId: string;
  createdAt: number;
  lastAccessedAt: number;
  deviceFingerprint: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface DeviceFingerprint {
  fingerprint: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
}

function getSessionRedisKey(sessionId: string): string {
  return `${SESSION_PREFIX}${sessionId}`;
}

export function generateDeviceFingerprint(
  userAgent?: string,
  screenResolution?: string,
  timezone?: string,
  language?: string,
): string {
  const ua = typeof window !== "undefined" ? navigator.userAgent : userAgent || "server";
  const sr =
    screenResolution ||
    (typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "unknown");
  const tz =
    timezone ||
    (typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "unknown");
  const lang = language || (typeof window !== "undefined" ? navigator.language : "unknown");
  const platform = typeof window !== "undefined" ? navigator.platform : "unknown";

  const fpData = `${ua}|${sr}|${tz}|${lang}|${platform}`;

  // Simple hash function for fingerprint
  let hash = 0;
  for (let i = 0; i < fpData.length; i++) {
    const char = fpData.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function createSession(
  sessionId: string,
  fingerprint: DeviceFingerprint,
  userAgent?: string,
  ipAddress?: string,
): Promise<SessionData | null> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[SessionManager] Redis not available, session not persisted");
    return null;
  }

  try {
    const now = Date.now();
    const sessionData: SessionData = {
      sessionId,
      createdAt: now,
      lastAccessedAt: now,
      deviceFingerprint: fingerprint.fingerprint,
      userAgent,
      ipAddress,
    };

    await redis.set(getSessionRedisKey(sessionId), JSON.stringify(sessionData), {
      ex: SESSION_TTL,
    });

    console.log(`[SessionManager] Created session ${sessionId.slice(0, 8)}...`);
    return sessionData;
  } catch (error) {
    console.error("[SessionManager] Failed to create session:", error);
    return null;
  }
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const data = await redis.get<SessionData | string>(getSessionRedisKey(sessionId));
    if (!data) return null;

    const session = typeof data === "string" ? (JSON.parse(data) as SessionData) : data;

    // Update last accessed time
    session.lastAccessedAt = Date.now();
    await redis.set(getSessionRedisKey(sessionId), JSON.stringify(session), { ex: SESSION_TTL });

    return session;
  } catch (error) {
    console.error("[SessionManager] Failed to get session:", error);
    return null;
  }
}

export async function validateSession(
  sessionId: string,
  currentFingerprint: DeviceFingerprint,
): Promise<{ valid: boolean; reason?: string; session?: SessionData }> {
  const session = await getSession(sessionId);

  if (!session) {
    return { valid: false, reason: "Session not found or expired" };
  }

  // Check if device fingerprint matches (optional security check)
  // Note: We allow sessions from different devices to support multi-device usage
  // but we log it for security monitoring
  if (session.deviceFingerprint !== currentFingerprint.fingerprint) {
    console.log(
      `[SessionManager] Session ${sessionId.slice(0, 8)}... accessed from different device`,
    );
    // Uncomment below to enforce device matching:
    // return { valid: false, reason: "Session invalid: device mismatch" };
  }

  return { valid: true, session };
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.del(getSessionRedisKey(sessionId));
    console.log(`[SessionManager] Deleted session ${sessionId.slice(0, 8)}...`);
    return true;
  } catch (error) {
    console.error("[SessionManager] Failed to delete session:", error);
    return false;
  }
}

export async function cleanupOldSessions(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  try {
    // Scan for all session keys
    const keys = await redis.keys(`${SESSION_PREFIX}*`);
    let deleted = 0;

    for (const key of keys) {
      try {
        const data = await redis.get<SessionData | string>(key);
        if (data) {
          const session = typeof data === "string" ? (JSON.parse(data) as SessionData) : data;
          const now = Date.now();
          const maxIdleTime = SESSION_TTL * 1000; // 30 days

          if (now - session.lastAccessedAt > maxIdleTime) {
            await redis.del(key);
            deleted++;
          }
        }
      } catch {
        // Skip invalid entries
      }
    }

    if (deleted > 0) {
      console.log(`[SessionManager] Cleaned up ${deleted} old sessions`);
    }

    return deleted;
  } catch (error) {
    console.error("[SessionManager] Failed to cleanup sessions:", error);
    return 0;
  }
}

export async function getSessionCount(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  try {
    const keys = await redis.keys(`${SESSION_PREFIX}*`);
    return keys.length;
  } catch {
    return 0;
  }
}
