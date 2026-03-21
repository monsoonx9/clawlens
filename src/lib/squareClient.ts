// ---------------------------------------------------------------------------
// Binance Square API Client for ClawLens
// Posts content to Binance Square using the X-Square-OpenAPI-Key.
// This key is separate from the trading API key — no HMAC signing required.
// ---------------------------------------------------------------------------

export interface SquarePostResult {
  success: boolean;
  postUrl?: string;
  errorCode?: string;
  errorMessage?: string;
}

const SQUARE_POST_URL = "https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add";

const SQUARE_ERROR_CODES: Record<string, string> = {
  "000000": "Success",
  "10004": "Network error. Please try again.",
  "10005": "Only allowed for users who have completed identity verification.",
  "10007": "Feature unavailable.",
  "20002": "Detected sensitive words.",
  "20013": "Content length is limited.",
  "20020": "Publishing empty content is not supported.",
  "20022": "Detected sensitive words (with risk segments).",
  "20041": "Potential security risk with the URL.",
  "30004": "User not found.",
  "30008": "Banned for violating platform guidelines.",
  "220003": "API Key not found.",
  "220004": "API Key expired.",
  "220009": "Daily post limit exceeded for OpenAPI.",
  "220010": "Unsupported content type.",
  "220011": "Content body must not be empty.",
  "2000001": "Account permanently blocked from posting.",
  "2000002": "Device permanently blocked from posting.",
};

/**
 * Posts plain text content to Binance Square.
 * Requires a separate X-Square-OpenAPI-Key from the trading API key.
 * Does NOT require HMAC signing — key goes in the header directly.
 * @param content - The text to post (plain text only, no images)
 * @param apiKey - The user's X-Square-OpenAPI-Key
 */
export async function postToSquare(content: string, apiKey: string): Promise<SquarePostResult> {
  if (!content.trim()) {
    return {
      success: false,
      errorCode: "20020",
      errorMessage: "Cannot publish empty content.",
    };
  }
  if (content.length > 2000) {
    return {
      success: false,
      errorCode: "20013",
      errorMessage: "Content exceeds 2000 character limit.",
    };
  }

  try {
    // Use absolute URL on server-side, relative on client-side
    const isBrowser = typeof window !== "undefined";
    const proxyUrl = isBrowser
      ? "/api/binance/proxy"
      : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/binance/proxy`;

    // Use proxy instead of direct call to avoid CORS
    const response = await fetch(proxyUrl, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: "/bapi/composite/v1/public/pgc/openApi/content/add",
        baseUrl: "www.binance.com",
        method: "POST",
        customHeaders: {
          "X-Square-OpenAPI-Key": apiKey,
          clienttype: "binanceSkill",
        },
        params: {
          bodyTextOnly: content,
        },
      }),
    });

    const data = await response.json();

    if (data.code === "000000" && data.data?.id) {
      const postUrl = `https://www.binance.com/square/post/${data.data.id}`;
      return { success: true, postUrl };
    }

    const knownError = SQUARE_ERROR_CODES[data.code];
    return {
      success: false,
      errorCode: data.code,
      errorMessage: knownError || data.message || `Unknown error: ${data.code}`,
    };
  } catch {
    return {
      success: false,
      errorCode: "10004",
      errorMessage: "Network error. Please try again.",
    };
  }
}

/**
 * Takes a raw Council verdict or agent report and formats it as
 * a concise, engaging Binance Square post (max 280 chars for readability).
 * This is a pure formatting function — no API calls.
 */
export function formatVerdictAsSquarePost(params: {
  query: string;
  finalVerdict: string;
  riskLevel: string;
  confidence: number;
  watchThis: string;
}): string {
  const riskEmoji: Record<string, string> = {
    LOW: "🟢",
    MODERATE: "🟡",
    HIGH: "🟠",
    EXTREME: "🔴",
  };

  const post =
    `${riskEmoji[params.riskLevel] || "⚪"} Council Verdict: ${params.finalVerdict.slice(0, 180)}\n\n` +
    `Risk: ${params.riskLevel} | Confidence: ${params.confidence}%\n` +
    `👁 Watch: ${params.watchThis.slice(0, 80)}\n\n` +
    `#ClawLens #BinanceSquare #CryptoAI`;

  return post.slice(0, 500);
}

/**
 * Formats a Fear & Greed score update as a Square post.
 */
export function formatFearIndexAsSquarePost(params: {
  token: string;
  score: number;
  label: string;
  interpretation: string;
}): string {
  const emoji =
    params.score >= 80
      ? "🤑"
      : params.score >= 60
        ? "😏"
        : params.score <= 20
          ? "😱"
          : params.score <= 40
            ? "😰"
            : "😐";

  return (
    `${emoji} ${params.token} Fear & Greed: ${params.score}/100 — ${params.label}\n\n` +
    `${params.interpretation.slice(0, 220)}\n\n` +
    `#ClawLens #FearAndGreed #${params.token}`
  ).slice(0, 500);
}

/**
 * Formats a whale consensus alert as a Square post.
 */
export function formatWhaleAlertAsSquarePost(params: {
  token: string;
  walletCount: number;
  totalValueUSD: number;
}): string {
  return (
    `🐋 WHALE CONSENSUS ALERT\n\n` +
    `${params.walletCount} tracked smart money wallets just entered $${params.token} simultaneously.\n` +
    `Combined tracked exposure: $${params.totalValueUSD.toLocaleString()}\n\n` +
    `Rare convergence signal. ClawLens Claw Council investigating.\n\n` +
    `#ClawLens #WhaleAlert #${params.token} #SmartMoney`
  ).slice(0, 500);
}
