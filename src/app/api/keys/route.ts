export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { storeKeys, getKeys, deleteKeys } from "@/lib/keyVault";
import { APIKeys } from "@/types";

function getSessionId(request: NextRequest): string | null {
  return request.cookies.get("clawlens_session")?.value || null;
}

function getSessionIdFromHeaders(request: NextRequest): string | null {
  return request.headers.get("x-session-id");
}

function isMaskedKey(key: string | undefined): boolean {
  if (!key) return false;
  return key.includes("****");
}

async function mergeKeys(sessionId: string, newKeys: APIKeys): Promise<APIKeys> {
  const existingKeys = await getKeys(sessionId);

  if (!existingKeys) {
    return newKeys;
  }

  return {
    binanceApiKey:
      newKeys.binanceApiKey && !isMaskedKey(newKeys.binanceApiKey)
        ? newKeys.binanceApiKey
        : existingKeys.binanceApiKey || "",
    binanceSecretKey:
      newKeys.binanceSecretKey && !isMaskedKey(newKeys.binanceSecretKey)
        ? newKeys.binanceSecretKey
        : existingKeys.binanceSecretKey || "",
    llmProvider: newKeys.llmProvider || existingKeys.llmProvider || "openai",
    llmApiKey:
      newKeys.llmApiKey && !isMaskedKey(newKeys.llmApiKey)
        ? newKeys.llmApiKey
        : existingKeys.llmApiKey || "",
    llmModel: newKeys.llmModel || existingKeys.llmModel || "gpt-5.4",
    llmBaseUrl: newKeys.llmBaseUrl || existingKeys.llmBaseUrl || "",
    llmEndpoint: newKeys.llmEndpoint || existingKeys.llmEndpoint || "",
    llmDeploymentName: newKeys.llmDeploymentName || existingKeys.llmDeploymentName || "",
    squareApiKey:
      newKeys.squareApiKey && !isMaskedKey(newKeys.squareApiKey)
        ? newKeys.squareApiKey
        : existingKeys.squareApiKey || "",
  };
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionId(request) || getSessionIdFromHeaders(request);

    if (!sessionId) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    const keys = await getKeys(sessionId);

    if (!keys) {
      return NextResponse.json({ hasKeys: false });
    }

    // Mask sensitive keys for security - never return full keys to client
    const maskKey = (key: string | undefined, showChars: number = 4): string => {
      if (!key) return "";
      if (key.length <= showChars * 2) return "****";
      return key.slice(0, showChars) + "****" + key.slice(-showChars);
    };

    return NextResponse.json({
      hasKeys: true,
      keys: {
        binanceApiKey: maskKey(keys.binanceApiKey),
        binanceSecretKey: maskKey(keys.binanceSecretKey),
        llmProvider: keys.llmProvider,
        llmApiKey: maskKey(keys.llmApiKey),
        llmModel: keys.llmModel,
        llmBaseUrl: keys.llmBaseUrl,
        llmEndpoint: keys.llmEndpoint,
        llmDeploymentName: keys.llmDeploymentName,
        squareApiKey: maskKey(keys.squareApiKey),
      },
    });
  } catch (error) {
    console.error("[API/keys] GET error:", error);
    return NextResponse.json({ error: "Failed to retrieve keys" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionId(request) || getSessionIdFromHeaders(request);

    if (!sessionId) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    const body = await request.json();
    const { keys } = body as { keys: APIKeys };

    const hasAtLeastOneKey = keys?.binanceApiKey || keys?.llmApiKey || keys?.squareApiKey;
    if (!keys || !hasAtLeastOneKey) {
      return NextResponse.json(
        { error: "At least one API key is required (binance, llm, or square)" },
        { status: 400 },
      );
    }

    const mergedKeys = await mergeKeys(sessionId, keys);

    // Validate API key formats - basic length checks (only for new unmasked keys)
    const MIN_KEY_LENGTH = 8;
    const errors: string[] = [];

    if (
      keys.binanceApiKey &&
      !isMaskedKey(keys.binanceApiKey) &&
      keys.binanceApiKey.length < MIN_KEY_LENGTH
    ) {
      errors.push("Binance API key is too short");
    }
    if (
      keys.binanceSecretKey &&
      !isMaskedKey(keys.binanceSecretKey) &&
      keys.binanceSecretKey.length < MIN_KEY_LENGTH
    ) {
      errors.push("Binance Secret key is too short");
    }
    if (keys.llmApiKey && !isMaskedKey(keys.llmApiKey) && keys.llmApiKey.length < MIN_KEY_LENGTH) {
      errors.push("LLM API key is too short");
    }
    if (
      keys.squareApiKey &&
      !isMaskedKey(keys.squareApiKey) &&
      keys.squareApiKey.length < MIN_KEY_LENGTH
    ) {
      errors.push("Square API key is too short");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    const success = await storeKeys(sessionId, mergedKeys);

    if (!success) {
      return NextResponse.json({ error: "Failed to store keys" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API/keys] POST error:", error);
    return NextResponse.json({ error: "Failed to store keys" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = getSessionId(request) || getSessionIdFromHeaders(request);

    if (!sessionId) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    await deleteKeys(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API/keys] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete keys" }, { status: 500 });
  }
}
