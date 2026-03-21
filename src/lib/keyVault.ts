import CryptoJS from "crypto-js";
import { getRedis } from "./cache";
import { getVaultSecret } from "./env";
import { APIKeys } from "@/types";

const KEYS_TTL = 60 * 60 * 24 * 30;
const LINK_CODE_TTL = 60 * 5;

function getKeysRedisKey(sessionId: string): string {
  return `vault:keys:${sessionId}`;
}

function getTelegramBotRedisKey(sessionId: string): string {
  return `vault:telegram:${sessionId}`;
}

function getLinkCodeRedisKey(code: string): string {
  return `telegram:link:${code}`;
}

export function encryptKeys(keys: APIKeys): string {
  const secret = getVaultSecret();
  return CryptoJS.AES.encrypt(JSON.stringify(keys), secret).toString();
}

export function decryptKeys(encrypted: string): APIKeys {
  const secret = getVaultSecret();
  const bytes = CryptoJS.AES.decrypt(encrypted, secret);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error("[KeyVault] Failed to decrypt keys - invalid encrypted data");
  }

  return JSON.parse(decrypted) as APIKeys;
}

export async function storeKeys(sessionId: string, keys: APIKeys): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    console.error("[KeyVault] Redis not available");
    return false;
  }

  try {
    const encrypted = encryptKeys(keys);
    await redis.set(getKeysRedisKey(sessionId), encrypted, { ex: KEYS_TTL });
    return true;
  } catch (error) {
    console.error("[KeyVault] Failed to store keys:", error);
    return false;
  }
}

export async function getKeys(sessionId: string): Promise<APIKeys | null> {
  const redis = getRedis();
  if (!redis) {
    console.error("[KeyVault] Redis not available");
    return null;
  }

  try {
    const encrypted = await redis.get<string>(getKeysRedisKey(sessionId));
    if (!encrypted) {
      return null;
    }
    return decryptKeys(encrypted);
  } catch (error) {
    console.error("[KeyVault] Failed to get keys:", error);
    return null;
  }
}

export async function deleteKeys(sessionId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    await redis.del(getKeysRedisKey(sessionId));
    return true;
  } catch (error) {
    console.error("[KeyVault] Failed to delete keys:", error);
    return false;
  }
}

export async function hasKeys(sessionId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    const exists = await redis.exists(getKeysRedisKey(sessionId));
    return exists === 1;
  } catch {
    return false;
  }
}

export interface TelegramBotConfig {
  botToken: string;
  botUsername: string;
  webhookSecret: string;
  isActive: boolean;
  sessionId: string;
}

export function encryptTelegramBot(config: TelegramBotConfig): string {
  const secret = getVaultSecret();
  return CryptoJS.AES.encrypt(JSON.stringify(config), secret).toString();
}

export function decryptTelegramBot(encrypted: string): TelegramBotConfig {
  const secret = getVaultSecret();
  const bytes = CryptoJS.AES.decrypt(encrypted, secret);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error("[KeyVault] Failed to decrypt Telegram bot config");
  }

  return JSON.parse(decrypted) as TelegramBotConfig;
}

export async function storeTelegramBot(
  sessionId: string,
  config: TelegramBotConfig,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    console.error("[KeyVault] Redis not available");
    return false;
  }

  try {
    const encrypted = encryptTelegramBot(config);
    await redis.set(getTelegramBotRedisKey(sessionId), encrypted, { ex: KEYS_TTL });
    return true;
  } catch (error) {
    console.error("[KeyVault] Failed to store Telegram bot:", error);
    return false;
  }
}

export async function getTelegramBotBySession(
  sessionId: string,
): Promise<TelegramBotConfig | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    const encrypted = await redis.get<string>(getTelegramBotRedisKey(sessionId));
    if (!encrypted) {
      return null;
    }
    return decryptTelegramBot(encrypted);
  } catch (error) {
    console.error("[KeyVault] Failed to get Telegram bot:", error);
    return null;
  }
}

export async function deleteTelegramBot(sessionId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    await redis.del(getTelegramBotRedisKey(sessionId));
    return true;
  } catch (error) {
    console.error("[KeyVault] Failed to delete Telegram bot:", error);
    return false;
  }
}

export async function hasTelegramBot(sessionId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    const exists = await redis.exists(getTelegramBotRedisKey(sessionId));
    return exists === 1;
  } catch {
    return false;
  }
}

export async function generateLinkCode(sessionId: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await redis.set(getLinkCodeRedisKey(code), sessionId, { ex: LINK_CODE_TTL });
    return code;
  } catch (error) {
    console.error("[KeyVault] Failed to generate link code:", error);
    return null;
  }
}

export async function validateLinkCode(code: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    const sessionId = await redis.get<string>(getLinkCodeRedisKey(code));
    return sessionId;
  } catch (error) {
    console.error("[KeyVault] Failed to validate link code:", error);
    return null;
  }
}

export async function deleteLinkCode(code: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    await redis.del(getLinkCodeRedisKey(code));
  } catch (error) {
    console.error("[KeyVault] Failed to delete link code:", error);
  }
}

export interface ValidateLinkCodeResult {
  valid: boolean;
  sessionId: string | null;
  expired: boolean;
  wrongBot: boolean;
}

export async function validateLinkCodeForSession(
  code: string,
  sessionId: string,
): Promise<ValidateLinkCodeResult> {
  const redis = getRedis();
  if (!redis) {
    return { valid: false, sessionId: null, expired: false, wrongBot: false };
  }

  try {
    const storedSessionId = await redis.get<string>(getLinkCodeRedisKey(code));

    if (!storedSessionId) {
      return { valid: false, sessionId: null, expired: true, wrongBot: false };
    }

    await redis.del(getLinkCodeRedisKey(code));

    if (storedSessionId !== sessionId) {
      return { valid: false, sessionId: storedSessionId, expired: false, wrongBot: true };
    }

    return { valid: true, sessionId: storedSessionId, expired: false, wrongBot: false };
  } catch (error) {
    console.error("[KeyVault] Failed to validate link code for session:", error);
    return { valid: false, sessionId: null, expired: false, wrongBot: false };
  }
}

export async function getTelegramBot(sessionId: string): Promise<TelegramBotConfig | null> {
  return getTelegramBotBySession(sessionId);
}
