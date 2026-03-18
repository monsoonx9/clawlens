import CryptoJS from "crypto-js";
import { getRedis } from "./cache";
import { getVaultSecret } from "./env";
import { APIKeys } from "@/types";

const KEYS_TTL = 60 * 60 * 24 * 30;

function getKeysRedisKey(sessionId: string): string {
  return `vault:keys:${sessionId}`;
}

function getTelegramBotRedisKey(sessionId: string): string {
  return `vault:telegram:${sessionId}`;
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
    console.log(`[KeyVault] Keys stored for session ${sessionId.slice(0, 8)}...`);
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
    console.log(`[KeyVault] Keys deleted for session ${sessionId.slice(0, 8)}...`);
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
    console.log(`[KeyVault] Telegram bot stored for session ${sessionId.slice(0, 8)}...`);
    return true;
  } catch (error) {
    console.error("[KeyVault] Failed to store Telegram bot:", error);
    return false;
  }
}

export async function getTelegramBot(sessionId: string): Promise<TelegramBotConfig | null> {
  const redis = getRedis();
  if (!redis) {
    console.error("[KeyVault] Redis not available");
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
    console.log(`[KeyVault] Telegram bot deleted for session ${sessionId.slice(0, 8)}...`);
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
