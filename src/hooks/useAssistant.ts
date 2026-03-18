import { useState, useCallback, useRef } from "react";
import { AssistantMessage, AssistantSession, PersonalityType } from "@/types";

interface UseAssistantOptions {
  onMessage?: (message: AssistantMessage) => void;
  onError?: (error: string) => void;
}

export function useAssistant(options?: UseAssistantOptions) {
  const [sessions, setSessions] = useState<AssistantSession[]>([]);
  const [activeSession, setActiveSession] = useState<AssistantSession | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/sessions", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !activeSession) {
          setActiveSession(data.sessions[0]);
          await loadMessages(data.sessions[0].sessionId);
        }
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  }, [activeSession]);

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/assistant/sessions/${sessionId}/messages`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, []);

  const createSession = useCallback(async (title?: string) => {
    try {
      const res = await fetch("/api/assistant/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title || "New Conversation" }),
      });
      const data = await res.json();
      if (data.session) {
        setSessions((prev) => [data.session, ...prev]);
        setActiveSession(data.session);
        setMessages([]);
        return data.session;
      }
    } catch (err) {
      console.error("Failed to create session:", err);
      throw err;
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      setIsLoading(true);
      setIsStreaming(true);
      setError(null);

      const tempUserMessage: AssistantMessage = {
        id: `temp_${Date.now()}`,
        sessionId: activeSession?.sessionId || "",
        role: "user",
        content,
        skillsUsed: [],
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, tempUserMessage]);

      try {
        abortControllerRef.current = new AbortController();

        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            message: content,
            sessionId: activeSession?.sessionId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to send message");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let streamingContent = "";
        let fullContent = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6));

                if (event.type === "chunk" && event.content) {
                  streamingContent += event.content;
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg?.role === "assistant") {
                      return [...prev.slice(0, -1), { ...lastMsg, content: streamingContent }];
                    }
                    return [
                      ...prev,
                      {
                        id: `asst_${Date.now()}`,
                        sessionId: activeSession?.sessionId || "",
                        role: "assistant",
                        content: streamingContent,
                        skillsUsed: [],
                        createdAt: new Date(),
                      },
                    ];
                  });
                } else if (event.type === "complete") {
                  fullContent = event.content || streamingContent;
                } else if (event.type === "error") {
                  setError(event.error || "An error occurred");
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        if (fullContent || streamingContent) {
          const finalContent = fullContent || streamingContent;
          const assistantMessage: AssistantMessage = {
            id: `asst_${Date.now()}`,
            sessionId: activeSession?.sessionId || "",
            role: "assistant",
            content: finalContent,
            skillsUsed: [],
            createdAt: new Date(),
          };

          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === "assistant") {
              return [...prev.slice(0, -1), assistantMessage];
            }
            return [...prev, assistantMessage];
          });

          options?.onMessage?.(assistantMessage);
        }
      } catch (err: any) {
        setError(err.message || "Failed to send message");
        options?.onError?.(err.message);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [activeSession, isStreaming, options],
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await fetch(`/api/assistant/sessions/${sessionId}`, {
          method: "DELETE",
          credentials: "include",
        });
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
        if (activeSession?.sessionId === sessionId) {
          setActiveSession(null);
          setMessages([]);
        }
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    },
    [activeSession],
  );

  return {
    sessions,
    activeSession,
    messages,
    isLoading,
    isStreaming,
    error,
    loadSessions,
    loadMessages,
    createSession,
    sendMessage,
    deleteSession,
    abort,
    setActiveSession,
    setSessions,
  };
}
