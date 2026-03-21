export const runtime = "edge";

import { NextRequest } from "next/server";
import { chatManager } from "@/lib/personalAssistant/chatManager";
import { skillRouter } from "@/lib/personalAssistant/skillRouter";
import { PersonalityEngine } from "@/lib/personalAssistant/personalityEngine";
import { getPersonalAssistantSystemPrompt } from "@/agents/personalAssistant";
import { getKeys } from "@/lib/keyVault";
import { streamAgentResponse } from "@/lib/llmClient";

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function getSessionId(request: NextRequest): string | null {
  return request.cookies.get("clawlens_session")?.value || request.headers.get("x-session-id");
}

interface ChatRequest {
  message: string;
  sessionId?: string;
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
    const { message, sessionId: providedSessionId } = body as ChatRequest;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing or empty message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const MAX_MESSAGE_LENGTH = 10000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({
          error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    let activeSessionId = providedSessionId;

    if (!activeSessionId) {
      const newSession = await chatManager.createSession(sessionId);
      activeSessionId = newSession.sessionId;
    }

    const userPreferences = await chatManager.getUserPreferences(sessionId);
    const personality = userPreferences?.personality || "adaptive";
    const personalityEngine = new PersonalityEngine(personality);

    const messages = await chatManager.getMessages(activeSessionId, sessionId);

    const priorMessages = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Get last invoked skills from session for follow-up detection
    const lastInvokedSkills = await chatManager.getLastInvokedSkills(activeSessionId);

    const skillInvocations = skillRouter.analyzeIntent(message, {
      priorMessages,
      lastInvokedSkills,
    });
    let skillResults: string[] = [];
    let skillsUsed: string[] = [];
    let failedSkills: string[] = [];

    if (skillInvocations.length > 0) {
      const skillContext = {
        sessionId,
        userId: sessionId,
        signal: request.signal,
        apiKeys: {
          binanceApiKey: apiKeys.binanceApiKey || "",
          binanceSecretKey: apiKeys.binanceSecretKey || "",
          llmProvider: apiKeys.llmProvider,
          llmApiKey: apiKeys.llmApiKey,
          llmModel: apiKeys.llmModel,
          squareApiKey: apiKeys.squareApiKey,
        },
      };

      const skillOutput = await skillRouter.executeSkills(skillInvocations, skillContext);
      skillResults = skillOutput.results.map((r) => r.summary || JSON.stringify(r.data, null, 2));
      skillsUsed = skillOutput.skillsUsed;
      failedSkills = skillOutput.failedSkills;

      // Update last invoked skills for future follow-ups
      if (skillsUsed.length > 0) {
        await chatManager.updateLastInvokedSkills(activeSessionId, sessionId, skillsUsed);
      }
    }

    const hasPortfolio = !!(apiKeys?.binanceApiKey && apiKeys?.binanceSecretKey);
    const systemPrompt = getPersonalAssistantSystemPrompt(personality, undefined, {
      hasPortfolio: !!(apiKeys?.binanceApiKey && apiKeys?.binanceSecretKey),
      hasApiKeys: !!apiKeys,
    });

    // Build skill results context
    let skillContextNote = "";
    if (failedSkills.length > 0) {
      skillContextNote = `\n\nNote: Some requested features could not be retrieved: ${failedSkills.join(", ")}. Please acknowledge this limitation in your response.`;
    }

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
          enqueue({ type: "session_start", sessionId: activeSessionId });
          enqueue({ type: "skills_invoked", skills: skillsUsed });

          const conversationHistory = [
            { role: "system" as const, content: systemPrompt },
            ...priorMessages,
            { role: "user" as const, content: message },
          ];

          if (skillResults.length > 0) {
            conversationHistory.splice(2, 0, {
              role: "system" as const,
              content: `Relevant data from my tools:\n\n${skillResults.join("\n\n")}${skillContextNote}`,
            });
          }

          let fullResponse = "";
          const lastMessage = conversationHistory[conversationHistory.length - 1].content;
          const systemContent = conversationHistory[0].content;

          for await (const chunk of streamAgentResponse(
            systemContent,
            lastMessage,
            apiKeys.llmProvider,
            {
              apiKey: apiKeys.llmApiKey,
              baseUrl: apiKeys.llmBaseUrl,
              endpoint: apiKeys.llmEndpoint,
              deploymentName: apiKeys.llmDeploymentName,
            },
            apiKeys.llmModel,
            1500,
            request.signal,
          )) {
            fullResponse += chunk;
            enqueue({ type: "chunk", content: chunk });
          }

          const formattedResponse = personalityEngine.formatResponse(fullResponse, skillsUsed);

          await chatManager.addMessage(activeSessionId!, sessionId, "user", message, []);
          await chatManager.addMessage(
            activeSessionId!,
            sessionId,
            "assistant",
            formattedResponse,
            skillsUsed,
            {
              modelUsed: apiKeys.llmModel,
            },
          );

          if (messages.length === 0) {
            const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
            await chatManager.updateSessionTitle(activeSessionId!, sessionId, title);
          }

          enqueue({ type: "complete", content: formattedResponse });
        } catch (error: any) {
          console.error("[Assistant API] Error:", error);
          enqueue({
            type: "error",
            error: error.message || "An error occurred while processing your request",
          });
        } finally {
          safeClose();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[Assistant API] Top-level error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "No session found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessions = await chatManager.getSessions(sessionId);

    return new Response(JSON.stringify({ sessions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Assistant API GET] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
