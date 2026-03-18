export function validateEnv() {
  const errors: string[] = [];

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const vaultSecret = process.env.VAULT_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!redisUrl) {
    errors.push("UPSTASH_REDIS_REST_URL is required");
  }

  if (!redisToken) {
    errors.push("UPSTASH_REDIS_REST_TOKEN is required");
  }

  if (!vaultSecret) {
    errors.push("VAULT_SECRET is required");
  } else if (vaultSecret.length < 32) {
    errors.push("VAULT_SECRET must be at least 32 characters");
  }

  if (!supabaseUrl) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is required for Personal Assistant");
  }

  if (!supabaseAnonKey) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is required for Personal Assistant");
  }

  if (errors.length > 0) {
    throw new Error(`[Env] Missing required environment variables:\n${errors.join("\n")}`);
  }

  return {
    redisUrl,
    redisToken,
    vaultSecret,
    supabaseUrl,
    supabaseAnonKey,
    telegramBotToken,
  };
}

export function getVaultSecret(): string {
  const secret = process.env.VAULT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("[Env] VAULT_SECRET must be set and be at least 32 characters");
  }
  return secret;
}
