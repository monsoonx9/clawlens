"use client";

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { useAssistantStore } from "@/store/assistantStore";
import { useToast } from "@/components/ui/Toast";
import { TelegramBotSettings } from "@/components/settings/TelegramBotSettings";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  MessageCircle,
  Plus,
  Settings,
  Send,
  Loader2,
  Bot,
  User,
  X,
  Menu,
  Pencil,
  Check,
  Trash2,
} from "lucide-react";
import { AssistantSession, PersonalityType } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const QUICK_PROMPTS = [
  {
    id: "portfolio",
    text: "What's my portfolio value?",
    description: "View connected wallet balances",
  },
  {
    id: "trending",
    text: "Show me trending tokens",
    description: "Discover the hottest tokens right now",
  },
  { id: "btc", text: "Analyze BTC price", description: "Get Bitcoin technical analysis" },
  {
    id: "gainers",
    text: "What are the top gainers today?",
    description: "Track market leaders and volume",
  },
  {
    id: "whale",
    text: "Check for whale movements",
    description: "Monitor large on-chain transfers",
  },
  {
    id: "sentiment",
    text: "What's the market sentiment?",
    description: "Fear & Greed index and news",
  },
  { id: "education", text: "Explain smart money to me", description: "Learn trading concepts" },
  { id: "history", text: "Show my trade history", description: "Review your recent performance" },
];

interface StreamEvent {
  type: string;
  content?: string;
  sessionId?: string;
  skills?: string[];
  error?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function AssistantPage() {
  const { toast } = useToast();
  const store = useAssistantStore();
  const activeSessionRef = useRef<AssistantSession | null>(null);
  const sessionsLoadedRef = useRef(false);

  const sessions = store.sessions;
  const activeSession = store.activeSession;
  const messages = store.messages;
  const isStreaming = store.isStreaming;
  const error = store.error;
  const personality = store.personality;

  const setSessions = store.setSessions;
  const setActiveSession = store.setActiveSession;
  const setMessages = store.setMessages;
  const addMessage = store.addMessage;
  const setLoading = store.setLoading;
  const setStreaming = store.setStreaming;
  const setError = store.setError;
  const clearMessages = store.clearMessages;
  const setPersonality = store.setPersonality;

  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"personality" | "telegram">("personality");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadPersonality = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/preferences", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.preferences?.personality) {
        setPersonality(data.preferences.personality as PersonalityType);
      }
    } catch (err) {
      console.error("Failed to load personality:", err);
    }
  }, [setPersonality]);

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await fetch("/api/assistant/sessions", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !activeSessionRef.current) {
          setActiveSession(data.sessions[0]);
          activeSessionRef.current = data.sessions[0];
        }
      }
      sessionsLoadedRef.current = true;
    } catch (err) {
      console.error("Failed to load sessions:", err);
      toast("error", "Failed to load conversations");
    } finally {
      setSessionsLoading(false);
    }
  }, [setSessions, setActiveSession, toast]);

  const loadMessages = useCallback(
    async (sessionId: string) => {
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
        toast("error", "Failed to load messages");
      }
    },
    [setMessages, toast],
  );

  useEffect(() => {
    loadPersonality();
  }, [loadPersonality]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!sessionsLoadedRef.current) return;
    if (activeSession) {
      activeSessionRef.current = activeSession;
      loadMessages(activeSession.sessionId);
    }
  }, [activeSession, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" });
  }, [messages, streamingContent, isStreaming]);

  const createNewSession = async () => {
    try {
      const res = await fetch("/api/assistant/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "New Conversation" }),
      });
      const data = await res.json();
      if (data.session) {
        setSessions([data.session, ...sessions]);
        setActiveSession(data.session);
        clearMessages();
        toast("success", "New conversation created");
      }
    } catch (err) {
      console.error("Failed to create session:", err);
      toast("error", "Failed to create conversation");
    }
  };

  const ensureSessionExists = async () => {
    if (activeSession) return activeSession;

    try {
      const res = await fetch("/api/assistant/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "New Conversation" }),
      });
      const data = await res.json();
      if (data.session) {
        setSessions([data.session, ...sessions]);
        setActiveSession(data.session);
        return data.session;
      }
    } catch (err) {
      console.error("Failed to create session:", err);
      toast("error", "Failed to create conversation");
    }
    return null;
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      setDeletingSession(sessionId);
      await fetch(`/api/assistant/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setSessions(sessions.filter((s) => s.sessionId !== sessionId));

      if (activeSession?.sessionId === sessionId) {
        const remaining = sessions.filter((s) => s.sessionId !== sessionId);
        setActiveSession(remaining[0] || null);
        clearMessages();
      }
      toast("success", "Conversation deleted");
    } catch (err) {
      console.error("Failed to delete session:", err);
      toast("error", "Failed to delete conversation");
    } finally {
      setDeletingSession(null);
    }
  };

  const renameSession = async (sessionId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;

    try {
      await fetch(`/api/assistant/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setSessions(
        sessions.map((s) => (s.sessionId === sessionId ? { ...s, title: editTitle.trim() } : s)),
      );
      if (activeSession?.sessionId === sessionId) {
        setActiveSession({ ...activeSession, title: editTitle.trim() });
      }
      setEditingSessionId(null);
      setEditTitle("");
      toast("success", "Conversation renamed");
    } catch (err) {
      console.error("Failed to rename session:", err);
      toast("error", "Failed to rename conversation");
    }
  };

  const startEditing = (session: AssistantSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.sessionId);
    setEditTitle(session.title);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const session = await ensureSessionExists();
    if (!session) {
      toast("error", "Please create a conversation first");
      return;
    }

    const userMessage = input.trim();
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setLoading(true);
    setStreaming(true);
    setError(null);
    setStreamingContent("");

    abortControllerRef.current = new AbortController();

    addMessage({
      id: `temp_${Date.now()}`,
      sessionId: session.sessionId,
      role: "user",
      content: userMessage,
      skillsUsed: [],
      createdAt: new Date(),
    });

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage,
          sessionId: session.sessionId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to send message");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));

              if (event.type === "chunk" && event.content) {
                setStreamingContent((prev) => prev + event.content);
              } else if (event.type === "complete") {
                addMessage({
                  id: `asst_${Date.now()}`,
                  sessionId: session.sessionId,
                  role: "assistant",
                  content: event.content || streamingContent,
                  skillsUsed: [],
                  createdAt: new Date(),
                });
                setStreamingContent("");
              } else if (event.type === "error") {
                setError(event.error || "An error occurred");
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setStreamingContent("");
      } else {
        setError(err.message || "Failed to send message");
        toast("error", err.message || "Failed to send message");
      }
    } finally {
      setLoading(false);
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectQuickPrompt = (prompt: { id: string; text: string }) => {
    setInput(prompt.text);
    inputRef.current?.focus();
  };

  const updatePersonality = async (newPersonality: typeof personality) => {
    setPersonality(newPersonality);
    try {
      await fetch("/api/assistant/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ personality: newPersonality }),
      });
      toast("success", `Personality set to ${newPersonality}`);
    } catch (err) {
      console.error("Failed to save personality:", err);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <>
      {/* Page Content - renders inside ClientLayout's main */}
      <div className="flex h-[calc(100dvh-60px)] md:h-[calc(100dvh-60px)]">
        {/* Chat Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 280 : 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={`hidden lg:flex flex-col h-full border-r border-[var(--color-card-border)] bg-[var(--color-bg)] overflow-hidden ${
            sidebarOpen ? "w-[280px]" : "w-0"
          }`}
        >
          {/* New Chat Button */}
          <div className="p-4 border-b border-[var(--color-card-border)]">
            <button
              onClick={createNewSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-accent)] text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Plus size={18} />
              <span>New Chat</span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sessionsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center p-6">
                <MessageCircle size={32} className="mx-auto mb-3 text-[var(--color-text-dim)]" />
                <p className="text-sm text-[var(--color-text-dim)]">No conversations yet</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.sessionId}
                  onClick={() => setActiveSession(session)}
                  className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    activeSession?.sessionId === session.sessionId
                      ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30"
                      : "hover:bg-[var(--color-card-hover)] border border-transparent"
                  }`}
                >
                  {editingSessionId === session.sessionId ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameSession(session.sessionId, e);
                          if (e.key === "Escape") setEditingSessionId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-[var(--color-bg)] px-3 py-2 rounded-lg text-sm border border-[var(--color-card-border)] focus:outline-none focus:border-[var(--color-accent)]"
                        autoFocus
                      />
                      <button
                        onClick={(e) => renameSession(session.sessionId, e)}
                        className="p-2 hover:bg-[var(--color-accent)]/20 rounded-lg text-[var(--color-accent)]"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <MessageCircle size={16} className="text-[var(--color-accent)] shrink-0" />
                      <span className="flex-1 truncate text-sm text-[var(--color-text-primary)]">
                        {session.title}
                      </span>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={(e) => startEditing(session, e)}
                          className="p-1.5 hover:bg-[var(--color-bg)] rounded-lg"
                        >
                          <Pencil size={12} className="text-[var(--color-text-secondary)]" />
                        </button>
                        <button
                          onClick={(e) => deleteSession(session.sessionId, e)}
                          disabled={deletingSession === session.sessionId}
                          className="p-1.5 hover:bg-[var(--color-bg)] rounded-lg"
                        >
                          {deletingSession === session.sessionId ? (
                            <Loader2 size={12} className="animate-spin text-risk-extreme" />
                          ) : (
                            <Trash2 size={12} className="text-risk-extreme" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Settings */}
          <div className="p-4 border-t border-[var(--color-card-border)]">
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--color-card-hover)] transition-colors text-sm text-[var(--color-text-secondary)]"
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </div>
        </motion.aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-full min-w-0">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 border-b border-[var(--color-card-border)] bg-[var(--color-bg)]/80 backdrop-blur-md flex items-center gap-4 shrink-0">
            <button
              onClick={toggleSidebar}
              className="hidden lg:block p-2 rounded-lg hover:bg-[var(--color-card-hover)]"
            >
              {sidebarOpen ? (
                <X size={22} className="text-[var(--color-text-primary)]" />
              ) : (
                <Menu size={22} className="text-[var(--color-text-primary)]" />
              )}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-card-hover)]"
            >
              <Menu size={22} className="text-[var(--color-text-primary)]" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)] flex items-center justify-center shadow-[0_0_20px_var(--color-accent-glow)]">
                <Bot size={18} className="text-black" />
              </div>
              <div>
                <h1 className="text-base font-bold text-[var(--color-text-primary)]">
                  Claw Assistant
                </h1>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {personality === "adaptive"
                    ? "Adaptive"
                    : personality.charAt(0).toUpperCase() + personality.slice(1)}{" "}
                  • Online
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 bg-black/50 z-40"
                onClick={() => setSidebarOpen(false)}
              >
                <motion.aside
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="w-[280px] h-full bg-[var(--color-bg)] border-r border-[var(--color-card-border)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-[var(--color-card-border)]">
                    <button
                      onClick={createNewSession}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-accent)] text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      <Plus size={18} />
                      <span>New Chat</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {sessionsLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="text-center p-6">
                        <MessageCircle
                          size={32}
                          className="mx-auto mb-3 text-[var(--color-text-dim)]"
                        />
                        <p className="text-sm text-[var(--color-text-dim)]">No conversations yet</p>
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <div
                          key={session.sessionId}
                          onClick={() => {
                            setActiveSession(session);
                            setSidebarOpen(false);
                          }}
                          className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                            activeSession?.sessionId === session.sessionId
                              ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30"
                              : "hover:bg-[var(--color-card-hover)] border border-transparent"
                          }`}
                        >
                          <MessageCircle
                            size={16}
                            className="text-[var(--color-accent)] shrink-0"
                          />
                          <span className="flex-1 truncate text-sm text-[var(--color-text-primary)]">
                            {session.title}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.aside>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-4">
            {messages.length === 0 && !isStreaming ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="flex flex-col items-center justify-center h-full text-center px-4"
              >
                <motion.div
                  variants={itemVariants}
                  className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_40px_var(--color-accent-glow)]"
                >
                  <Bot size={28} className="text-black" />
                </motion.div>
                <motion.h2
                  variants={itemVariants}
                  className="text-xl sm:text-2xl font-extrabold text-[var(--color-text-primary)] mb-2"
                >
                  How can I help you today?
                </motion.h2>
                <motion.p
                  variants={itemVariants}
                  className="text-[var(--color-text-secondary)] mb-6 sm:mb-8 max-w-md"
                >
                  Ask me anything about crypto, trading, or your portfolio
                </motion.p>
                <motion.div variants={containerVariants} className="w-full max-w-2xl">
                  <div className="flex sm:grid sm:grid-cols-2 gap-2 sm:gap-3 w-[calc(100vw-16px)] sm:w-full max-w-2xl px-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 sm:pb-0 -mx-4 sm:mx-0">
                    {QUICK_PROMPTS.map((prompt) => (
                      <motion.button
                        key={prompt.id}
                        variants={itemVariants}
                        onClick={() => {
                          selectQuickPrompt(prompt);
                          setInput(prompt.text);
                          inputRef.current?.focus();
                        }}
                        className="shrink-0 w-[260px] sm:w-auto snap-center text-left p-3 sm:p-4 rounded-xl glass border border-[var(--color-card-border)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-card-hover)] transition-all duration-200 group"
                      >
                        <p className="text-sm sm:text-base text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors duration-200">
                          {prompt.text}
                        </p>
                        <p className="text-xs text-[var(--color-text-dim)] mt-1">
                          {prompt.description}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="max-w-3xl mx-auto space-y-4"
              >
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className={`flex gap-3 sm:gap-4 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center shrink-0 shadow-[0_0_15px_var(--color-accent-glow)]">
                        <Bot size={14} className="text-black" />
                      </div>
                    )}
                    <div className="flex flex-col max-w-[85%] sm:max-w-[75%]">
                      <div
                        className={
                          message.role === "user"
                            ? "px-3 sm:px-4 py-2 sm:py-3 rounded-[20px] rounded-tr-[4px] bg-[var(--color-accent)] text-black font-medium text-sm sm:text-base shadow-sm"
                            : "glass px-3 sm:px-4 py-2 sm:py-3 rounded-[20px] rounded-tl-[4px]"
                        }
                      >
                        <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-card-border prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-table:border prose-table:border-card-border prose-table:rounded-xl overflow-hidden max-w-none text-[var(--color-text-primary)]">
                          {message.role === "user" ? (
                            <p className="whitespace-pre-wrap leading-relaxed m-0">
                              {message.content}
                            </p>
                          ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          )}
                        </div>
                        {message.skillsUsed && message.skillsUsed.length > 0 && (
                          <div className="mt-2 flex gap-1 sm:gap-2 flex-wrap">
                            {message.skillsUsed.map((skill) => (
                              <span
                                key={skill}
                                className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-[10px] bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center shrink-0">
                        <User size={14} className="text-[var(--color-accent)]" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {isStreaming && streamingContent && (
                  <motion.div variants={itemVariants} className="flex gap-3 sm:gap-4 justify-start">
                    <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center shrink-0 shadow-[0_0_15px_var(--color-accent-glow)]">
                      <Bot size={14} className="text-black" />
                    </div>
                    <div className="glass px-3 sm:px-4 py-2 sm:py-3 rounded-[20px] rounded-tl-[4px]">
                      <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-card-border prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-table:border prose-table:border-card-border prose-table:rounded-xl overflow-hidden max-w-none text-[var(--color-text-primary)]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                      </div>
                      <span className="inline-block w-2 h-4 bg-[var(--color-accent)] animate-pulse ml-1" />
                    </div>
                  </motion.div>
                )}

                {error && (
                  <div className="p-3 sm:p-4 rounded-xl bg-risk-extreme/10 border border-risk-extreme/30 text-risk-extreme text-sm">
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </motion.div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-6 border-t border-[var(--color-card-border)] bg-[var(--color-bg)]/80 backdrop-blur-md shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-end gap-2 sm:gap-3 p-1.5 sm:p-2 glass rounded-xl border border-[var(--color-card-border)] focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_var(--color-accent-glow),0_0_20px_var(--color-accent-glow)] transition-all duration-200">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onInput={(e) => {
                    e.currentTarget.style.height = "auto";
                    e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-transparent px-3 sm:px-4 py-2 sm:py-3 max-h-32 resize-none focus:outline-none text-sm sm:text-base text-[var(--color-text-primary)] placeholder-[var(--color-text-dim)] scrollbar-hide"
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming}
                  className="p-2.5 sm:p-3 rounded-xl bg-[var(--color-accent)] text-black font-bold hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isStreaming ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
              <p className="text-center text-[10px] sm:text-xs text-[var(--color-text-dim)] mt-2 sm:mt-3">
                AI can make mistakes. Consider verifying important information.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl glass rounded-[20px] max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-card-border shrink-0">
                <h2 className="text-lg sm:text-xl font-bold text-text-primary">Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg hover:bg-card-hover transition-colors"
                >
                  <X size={20} className="text-text-secondary" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-card-border shrink-0 px-2 sm:px-4">
                <button
                  onClick={() => setSettingsTab("personality")}
                  className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                    settingsTab === "personality"
                      ? "text-accent"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Personality
                  {settingsTab === "personality" && (
                    <motion.div
                      layoutId="settingsTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                    />
                  )}
                </button>
                <button
                  onClick={() => setSettingsTab("telegram")}
                  className={`px-4 py-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                    settingsTab === "telegram"
                      ? "text-accent"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Telegram Bot
                  {settingsTab === "telegram" && (
                    <motion.div
                      layoutId="settingsTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                    />
                  )}
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {settingsTab === "personality" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-3">
                        Response Style
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {(["adaptive", "friendly", "professional", "technical"] as const).map(
                          (p) => (
                            <button
                              key={p}
                              onClick={() => updatePersonality(p)}
                              className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                personality === p
                                  ? "bg-accent text-black shadow-[0_0_20px_var(--color-accent-glow)]"
                                  : "glass hover:border-accent/50 text-text-secondary hover:text-text-primary"
                              }`}
                            >
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                          ),
                        )}
                      </div>
                      <p className="text-xs text-text-dim mt-3">
                        {personality === "adaptive"
                          ? "I adapt to your communication style"
                          : personality === "friendly"
                            ? "Warm, conversational, and approachable"
                            : personality === "professional"
                              ? "Concise, direct, and business-focused"
                              : "Technical, precise, and data-driven"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <TelegramBotSettings />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
