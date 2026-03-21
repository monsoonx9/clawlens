"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useAnalytics } from "@/components/ui/AnalyticsProvider";
import {
  AgentName,
  AgentResponse,
  ArbitersVerdict,
  PortfolioSnapshot,
  PortfolioAsset,
} from "@/types";
import { getSkill } from "@/skills";
import type { SkillContext } from "@/skills";

// ---------------------------------------------------------------------------
// SSE Event Shapes (must match API route output)
// ---------------------------------------------------------------------------

interface SSEAgentStart {
  type: "agent_start";
  agentId: AgentName;
  current?: number;
  total?: number;
}
interface SSEAgentChunk {
  type: "agent_chunk";
  agentId: AgentName;
  chunk: string;
}
interface SSEAgentComplete {
  type: "agent_complete";
  agentId: AgentName;
  fullResponse: string;
  councilReport: string;
}
interface SSEAgentError {
  type: "agent_error";
  agentId: AgentName;
  error: string;
}
interface SSEArbiterStart {
  type: "arbiter_start";
}
interface SSEArbiterChunk {
  type: "arbiter_chunk";
  chunk: string;
}
interface SSEArbiterComplete {
  type: "arbiter_complete";
  verdict: ArbitersVerdict;
}
interface SSERoundStart {
  type: "round_start";
  round: number;
  maxRounds: number;
}
interface SSERoundComplete {
  type: "round_complete";
  round: number;
  maxRounds: number;
  reportsCount: number;
}
interface SSEConsensusCheck {
  type: "consensus_check";
  hasConsensus: boolean;
  agreement: number;
  direction?: "positive" | "negative";
}
interface SSEError {
  type: "error";
  message: string;
}
interface SSEDone {
  type: "done";
}

type SSEEvent =
  | SSEAgentStart
  | SSEAgentChunk
  | SSEAgentComplete
  | SSEAgentError
  | SSEArbiterStart
  | SSEArbiterChunk
  | SSEArbiterComplete
  | SSERoundStart
  | SSERoundComplete
  | SSEConsensusCheck
  | SSEError
  | SSEDone;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCouncilSession() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const {
    apiKeys,
    portfolio,
    preferences,
    startNewSession,
    addAgentResponse,
    updateAgentResponse,
    setVerdict,
    updateArbiterStream,
    finalizeSession,
    setPortfolio,
    setIsPortfolioRefreshing,
    updateRoundProgress,
    updateConsensus,
  } = useAppStore();

  const { trackEvent } = useAnalytics();
  const trackEventRef = useRef(trackEvent);

  useEffect(() => {
    trackEventRef.current = trackEvent;
  }, [trackEvent]);

  const refreshPortfolio = useCallback(async () => {
    if (!apiKeys?.binanceApiKey || !apiKeys?.binanceSecretKey) {
      return portfolio;
    }

    setIsPortfolioRefreshing(true);
    try {
      const skill = getSkill("claw-council/portfolio-pulse");
      if (!skill) throw new Error("Portfolio Pulse skill not found");

      const context: SkillContext = {
        sessionId:
          typeof document !== "undefined"
            ? document.cookie.match(/clawlens_session=([^;]+)/)?.[1]
            : undefined,
        apiKeys: {
          binanceApiKey: apiKeys.binanceApiKey,
          binanceSecretKey: apiKeys.binanceSecretKey,
        },
        preferences,
      };

      const result = await skill.execute({}, context);

      if (result.success && result.data) {
        const raw = result.data as Record<string, unknown>;
        const mapped: PortfolioSnapshot = {
          totalValueUSD: (raw.totalValueUSD as number) ?? 0,
          totalPnlUSD: (raw.totalPnlUSD as number) ?? (raw.totalUnrealizedPnLUSD as number) ?? 0,
          totalPnlPercent:
            (raw.totalPnlPercent as number) ?? (raw.totalUnrealizedPnLPercent as number) ?? 0,
          change24hUSD: (raw.change24hUSD as number) ?? 0,
          change24hPercent: (raw.change24hPercent as number) ?? 0,
          riskScore: (raw.riskScore as number) ?? 0,
          assets: (raw.assets as PortfolioAsset[]) ?? [],
          lastUpdated: raw.lastUpdated ? new Date(raw.lastUpdated as string) : new Date(),
        };
        setPortfolio(mapped);
        return mapped;
      }
      return portfolio;
    } catch (error) {
      console.error("Failed to refresh portfolio:", error);
      return portfolio;
    } finally {
      setIsPortfolioRefreshing(false);
    }
  }, [apiKeys, preferences, portfolio, setPortfolio, setIsPortfolioRefreshing]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case "agent_start": {
          const newResponse: AgentResponse = {
            agentId: event.agentId,
            content: "",
            councilReport: "",
            isStreaming: true,
            isComplete: false,
            timestamp: new Date(),
            currentIndex: event.current,
            totalAgents: event.total,
          };
          addAgentResponse(newResponse);
          break;
        }

        case "agent_chunk": {
          const state = useAppStore.getState();
          const existing = state.activeSession?.agentResponses.find(
            (r) => r.agentId === event.agentId,
          );
          if (existing) {
            updateAgentResponse(event.agentId, {
              content: existing.content + event.chunk,
            });
          }
          break;
        }

        case "agent_complete": {
          updateAgentResponse(event.agentId, {
            content: event.fullResponse,
            councilReport: event.councilReport,
            isStreaming: false,
            isComplete: true,
          });
          break;
        }

        case "agent_error": {
          updateAgentResponse(event.agentId, {
            error: event.error,
            isStreaming: false,
            isComplete: true,
          });
          break;
        }

        case "arbiter_start": {
          break;
        }

        case "arbiter_chunk": {
          updateArbiterStream(event.chunk);
          break;
        }

        case "arbiter_complete": {
          const verdict: ArbitersVerdict = {
            ...event.verdict,
            isStreaming: false,
            isComplete: true,
          };
          setVerdict(verdict);
          break;
        }

        case "round_start": {
          updateRoundProgress({
            currentRound: event.round,
            maxRounds: event.maxRounds,
            reportsCount: 0,
          });
          break;
        }

        case "round_complete": {
          updateRoundProgress({
            currentRound: event.round,
            maxRounds: event.maxRounds,
            reportsCount: event.reportsCount,
          });
          break;
        }

        case "consensus_check": {
          updateConsensus({
            hasConsensus: event.hasConsensus,
            agreement: event.agreement,
            direction: event.direction,
          });
          break;
        }

        case "error": {
          setError(event.message);
          finalizeSession();
          break;
        }

        case "done": {
          trackEventRef.current("session_complete");
          break;
        }
      }
    },
    [
      addAgentResponse,
      updateAgentResponse,
      setVerdict,
      updateArbiterStream,
      finalizeSession,
      updateRoundProgress,
      updateConsensus,
      setError,
    ],
  );

  const startSession = useCallback(
    async (query: string) => {
      if (!apiKeys) {
        setError("API keys not configured. Please complete onboarding.");
        return;
      }

      // Abort any existing connection
      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      setIsLoading(true);
      setError(null);

      // Refresh portfolio data before starting session
      const latestPortfolio = await refreshPortfolio();

      // Start a new session in the store
      startNewSession(query);
      trackEventRef.current("council_query", { query: query.slice(0, 100) });

      try {
        const response = await fetch("/api/council", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            apiKeys,
            portfolioSnapshot: latestPortfolio || portfolio,
            preferences,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorBody.error || `Server error: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body received from server");
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        let isReading = true;
        try {
          while (isReading) {
            const { value, done } = await reader.read();
            if (done) {
              isReading = false;
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              try {
                const event: SSEEvent = JSON.parse(trimmed.substring(6));
                handleEvent(event);
              } catch {
                // Ignore malformed SSE lines
              }
            }
          }

          // Process any remaining buffer
          if (buffer.trim().startsWith("data: ")) {
            try {
              const event: SSEEvent = JSON.parse(buffer.trim().substring(6));
              handleEvent(event);
            } catch {
              // Ignore
            }
          }
        } catch (err) {
          // Handle abort/errors during reading
          if (err instanceof DOMException && err.name === "AbortError") {
            // User or unmount cancelled the request - cleanup reader
            try {
              reader.cancel();
            } catch {
              // Ignore cleanup errors
            }
            throw err; // Re-throw to be caught below
          }
          throw err;
        } finally {
          // Always ensure reader is released
          try {
            reader.releaseLock();
          } catch {
            // Ignore if already released
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User or unmount cancelled the request
          return;
        }
        const message = err instanceof Error ? err.message : "Connection failed";
        setError(message);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [
      apiKeys,
      portfolio,
      preferences,
      startNewSession,
      refreshPortfolio,
      setPortfolio,
      setIsPortfolioRefreshing,
      handleEvent,
    ],
  );

  const cancelSession = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const { isPortfolioRefreshing } = useAppStore();

  return {
    isLoading,
    isPortfolioRefreshing,
    error,
    startSession,
    cancelSession,
    abortSession: cancelSession,
  };
}
