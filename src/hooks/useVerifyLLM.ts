"use client";

import { useState, useCallback } from "react";
import { callAgentOnce } from "@/lib/llmClient";
import { LLMProvider } from "@/types";

// ---------------------------------------------------------------------------
// useVerifyLLM
// ---------------------------------------------------------------------------
// Shared hook for verifying an LLM connection in both onboarding and settings.
// Uses callAgentOnce with a minimal probe prompt so the real API is tested.
// ---------------------------------------------------------------------------

export interface VerifyLLMOptions {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  endpoint?: string;
  deploymentName?: string;
}

export function useVerifyLLM() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Call this whenever user changes provider / model / key in the form
  const resetVerification = useCallback(() => {
    setIsVerified(false);
    setError(null);
  }, []);

  const verify = useCallback(async (opts: VerifyLLMOptions): Promise<boolean> => {
    const { provider, apiKey, model, baseUrl, endpoint, deploymentName } = opts;

    // Ollama is local — treat any non-empty baseUrl (or default) as verified without
    // a live call, because we can't call Ollama from inside the Next.js API route.
    if (provider === "ollama") {
      setIsVerified(true);
      setError(null);
      return true;
    }

    if (!apiKey.trim()) {
      setError("Please enter your API key first.");
      return false;
    }

    if (provider === "azure-openai" && (!endpoint || !deploymentName)) {
      setError("Azure OpenAI requires an Endpoint URL and Deployment Name.");
      return false;
    }

    setIsVerifying(true);
    setIsVerified(false);
    setError(null);

    try {
      const res = await callAgentOnce(
        "You are a connectivity test endpoint.",
        "Reply with exactly the word: OK",
        provider,
        { apiKey, baseUrl, endpoint, deploymentName },
        model,
        10, // tiny token budget
        false, // no JSON needed
      );

      if (!res.success || !res.data) {
        throw new Error(res.error || "Empty response received. The model may not be available.");
      }

      // Accept any response that contains "ok" (case-insensitive) or is non-empty
      const trimmed = res.data.trim().toLowerCase();
      if (trimmed.length === 0) {
        throw new Error("Empty response received. The model may not be available.");
      }

      setIsVerified(true);
      setError(null);
      return true;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Connection failed. Check your API key and model.";
      setError(msg);
      setIsVerified(false);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return { isVerifying, isVerified, error, verify, resetVerification };
}
