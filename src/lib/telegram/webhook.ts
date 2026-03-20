export const runtime = "nodejs";

import crypto from "crypto";

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getWebhookUrl(secret: string, baseUrl?: string, sessionId?: string): string {
  let host = (
    baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://your-domain.vercel.app"
  ).replace(/\/$/, "");

  if (host.startsWith("http://") && !host.includes("localhost")) {
    host = host.replace("http://", "https://");
  }

  const basePath = `/api/telegram/webhook/${secret}`;

  if (sessionId) {
    return `${host}${basePath}/${sessionId}`;
  }

  return `${host}${basePath}`;
}

export function verifyWebhookSecret(secret: string, providedSecret: string): boolean {
  if (secret.length !== providedSecret.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(providedSecret));
}

export async function setUserWebhook(
  botToken: string,
  webhookUrl: string,
  secret: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/setWebhook`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deleteUserWebhook(
  botToken: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;

    const response = await fetch(url, {
      method: "POST",
    });

    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
