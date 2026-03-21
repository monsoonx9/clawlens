export const runtime = "edge";

import { NextRequest } from "next/server";
import { runCouncilDebate } from "@/lib/arbiter";
import { getKeys } from "@/lib/keyVault";
import { APIKeys, PortfolioSnapshot, UserPreferences, AgentName, ArbitersVerdict } from "@/types";

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function getSessionId(request: NextRequest): string | null {
  return request.cookies.get("clawlens_session")?.value || request.headers.get("x-session-id");
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "No session found. Please refresh the page." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate session ID format (basic UUID or session-like format)
    const isValidSessionId = /^[a-zA-Z0-9_-]{16,64}$/.test(sessionId);
    if (!isValidSessionId) {
      return new Response(JSON.stringify({ error: "Invalid session format." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKeys = await getKeys(sessionId);

    if (!apiKeys || !apiKeys.llmApiKey) {
      return new Response(
        JSON.stringify({ error: "API keys not found. Please add your API keys in settings." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const body = await request.json();
    const { query, portfolioSnapshot, preferences } = body as {
      query: string;
      apiKeys?: APIKeys;
      portfolioSnapshot: PortfolioSnapshot | null;
      preferences: UserPreferences;
    };

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing or empty query" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const MAX_QUERY_LENGTH = 10000;
    if (query.length > MAX_QUERY_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create SSE readable stream
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;
        const safeClose = () => {
          if (!isClosed) {
            try {
              controller.close();
            } catch {
              /* already closed */
            }
            isClosed = true;
          }
        };

        const enqueue = (data: Record<string, unknown>) => {
          if (isClosed) return;
          try {
            controller.enqueue(new TextEncoder().encode(sseEvent(data)));
          } catch {
            safeClose();
          }
        };

        try {
          await runCouncilDebate({
            query,
            sessionId,
            apiKeys,
            portfolio: portfolioSnapshot,
            preferences,
            signal: request.signal,

            onAgentStart: (agentId: AgentName, current?: number, total?: number) => {
              enqueue({ type: "agent_start", agentId, current, total });
            },

            onAgentChunk: (agentId: AgentName, chunk: string) => {
              enqueue({ type: "agent_chunk", agentId, chunk });
            },

            onAgentComplete: (agentId: AgentName, fullResponse: string, councilReport: string) => {
              enqueue({
                type: "agent_complete",
                agentId,
                fullResponse,
                councilReport,
              });
            },

            onAgentError: (agentId: AgentName, error: string) => {
              enqueue({ type: "agent_error", agentId, error });
            },

            onArbitrateStart: () => {
              enqueue({ type: "arbiter_start" });
            },

            onArbitrateChunk: (chunk: string) => {
              enqueue({ type: "arbiter_chunk", chunk });
            },

            onArbitrateComplete: (verdict: ArbitersVerdict) => {
              enqueue({ type: "arbiter_complete", verdict });
            },

            onRoundStart: (round: number, maxRounds: number) => {
              enqueue({ type: "round_start", round, maxRounds });
            },

            onRoundComplete: (round: number, maxRounds: number, reportsCount: number) => {
              enqueue({ type: "round_complete", round, maxRounds, reportsCount });
            },

            onConsensusCheck: (
              hasConsensus: boolean,
              agreement: number,
              direction?: "positive" | "negative",
            ) => {
              enqueue({ type: "consensus_check", hasConsensus, agreement, direction });
            },
          });

          enqueue({ type: "done" });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error during council debate";
          try {
            enqueue({ type: "error", message });
          } catch {
            /* stream closed */
          }
        } finally {
          safeClose();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process request";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
