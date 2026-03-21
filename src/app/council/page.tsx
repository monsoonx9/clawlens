"use client";

import { useState, KeyboardEvent, useEffect, useRef } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { useCouncilSession } from "@/hooks/useCouncilSession";
import { ArrowRight, ArrowLeft, Loader2, Share2 } from "lucide-react";
import { AgentCard } from "@/components/council/AgentCard";
import { ArbiterCard } from "@/components/council/ArbiterCard";
import { AgentResponseCard } from "@/components/council/AgentResponseCard";
import { ArbitersVerdictCard } from "@/components/council/ArbitersVerdictCard";
import { AgentDiscussion } from "@/components/council/AgentDiscussion";
import { CouncilErrorBoundary } from "@/components/council/CouncilErrorBoundary";
import { AGENTS, AGENT_LIST } from "@/lib/constants";
import { AgentStatus } from "@/types";

const QUICK_PROMPTS = [
  "Audit a token contract",
  "Check my portfolio health",
  "Show smart money signals",
  "What tokens are trending on BSC?",
  "Explain DCA to me",
  "Track a whale wallet",
  "Analyze my trade history",
  "What is my biggest risk right now?",
];

export default function CouncilPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeSession, preferences, apiKeys, startNewSession, finalizeSession, saveToHistory } =
    useAppStore();
  const { isLoading, error, startSession, abortSession } = useCouncilSession();

  const [query, setQuery] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevResponseCountRef = useRef(0);

  // Fixed scroll behavior - only scroll when NEW responses are added
  useEffect(() => {
    const currentCount = activeSession?.agentResponses?.length || 0;

    // Only scroll when a new response is added
    if (currentCount > prevResponseCountRef.current && bottomRef.current) {
      // Small delay to allow content to render
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 100);
      prevResponseCountRef.current = currentCount;
      return () => clearTimeout(timer);
    }
  }, [activeSession?.agentResponses?.length]);

  // Also scroll when verdict comes in
  useEffect(() => {
    if (activeSession?.verdict?.isComplete && bottomRef.current) {
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeSession?.verdict?.isComplete]);

  useEffect(() => {
    const queryParam = searchParams.get("query");
    if (queryParam && !isLoading) {
      const decodedQuery = decodeURIComponent(queryParam);
      const currentQuery = activeSession?.query || "";

      // Start new session if query changed or no active session
      if (decodedQuery !== currentQuery) {
        setTimeout(() => {
          setQuery(decodedQuery);
          startNewSession(decodedQuery);
          startSession(decodedQuery);
          router.replace("/council");
        }, 0);
      } else if (!activeSession) {
        // First load with query
        setTimeout(() => {
          setQuery(decodedQuery);
          startNewSession(decodedQuery);
          startSession(decodedQuery);
          router.replace("/council");
        }, 0);
      }
    }
  }, [searchParams, activeSession, isLoading, startNewSession, startSession, router]);

  const handleSubmit = () => {
    if (!query.trim() || isLoading) return;
    if (preferences.enabledAgents.length === 0) {
      return;
    }
    const q = query.trim();
    setQuery("");
    startNewSession(q);
    startSession(q);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getAgentStatus = (agentId: string): AgentStatus => {
    if (!activeSession) return "idle";
    const response = activeSession.agentResponses.find((r) => r.agentId === agentId);
    if (!response) return "idle";
    if (response.error) return "disabled";
    if (response.isStreaming && response.content) return "speaking";
    if (response.isStreaming) return "thinking";
    if (response.isComplete) return "done";
    return "idle";
  };

  const getLastResponse = (agentId: string): string | undefined => {
    if (!activeSession) return undefined;
    const response = activeSession.agentResponses.find((r) => r.agentId === agentId);
    return response?.councilReport || undefined;
  };

  // ------------------------------------------------------------------
  // STATE A: COMMAND CENTER
  // ------------------------------------------------------------------
  if (!activeSession) {
    const agentsExcludingArbiter = AGENT_LIST.filter((a) => a.id !== "THE_ARBITER");

    return (
      <CouncilErrorBoundary>
        <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 w-full animate-in fade-in duration-500">
          {/* QUERY BAR */}
          <div className="mb-6 sm:mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Image
                src="/logo_v1.webp"
                alt="Council Logo"
                width={24}
                height={24}
                className="drop-shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent),transparent_60%)]"
              />
              <span className="text-text-primary text-base sm:text-[16px] font-semibold">
                Ask the Council
              </span>
            </div>

            <div className="relative group">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the Council anything... e.g. 'Should I buy this token?'"
                className="w-full glass-input p-3 sm:p-5 text-text-primary placeholder-text-dim  resize-none min-h-[80px] sm:min-h-[100px] text-sm sm:text-base transition-all"
              />
            </div>

            {preferences.enabledAgents.length === 0 && (
              <div className="mt-2 text-risk-moderate text-sm bg-[color-mix(in_srgb,var(--color-risk-moderate),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-moderate),transparent_80%)] rounded-xl px-3 sm:px-4 py-2">
                No agents enabled. Please enable at least one agent in Settings to use the Council.
              </div>
            )}

            {error && (
              <div
                className="mt-2 text-risk-extreme text-sm bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] rounded-xl px-3 sm:px-4 py-2"
                role="alert"
                aria-live="polite"
              >
                {error === "Invalid API credentials"
                  ? "Your API credentials appear to be invalid. Please check your settings and ensure your keys have correct permissions."
                  : error === "Connection failed"
                    ? "Unable to connect to the AI service. Please check your internet connection and try again."
                    : error.includes("429")
                      ? "Too many requests. Please wait a moment and try again."
                      : error}
              </div>
            )}

            <div className="flex justify-between items-center mt-3">
              <div className="text-text-muted text-xs hidden sm:block">
                Press{" "}
                <kbd className="bg-card px-1.5 py-0.5 rounded text-[10px] font-mono mx-1 text-text-secondary">
                  Enter
                </kbd>{" "}
                to submit,{" "}
                <kbd className="bg-card px-1.5 py-0.5 rounded text-[10px] font-mono mx-1 text-text-secondary">
                  Shift+Enter
                </kbd>{" "}
                for new line
              </div>
              <div className="sm:hidden" />

              <button
                onClick={handleSubmit}
                disabled={!query.trim() || isLoading || preferences.enabledAgents.length === 0}
                className="bg-text-primary disabled:opacity-50 disabled:cursor-not-allowed text-amoled font-bold px-4 sm:px-5 py-2.5 rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all touch-target text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    Ask Council
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </>
                )}
              </button>
            </div>

            {/* QUICK PROMPTS */}
            <div className="mt-6 sm:mt-8">
              <div className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3">
                Quick prompts
              </div>
              <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar snap-x mobile-edge-scroll">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <div
                    key={i}
                    className="glass px-3 sm:px-4 py-2 text-text-secondary text-xs sm:text-sm font-medium cursor-pointer hover:border-card-border-hover hover:text-text-primary hover:bg-card-hover transition-all whitespace-nowrap snap-start shrink-0 rounded-full"
                    onClick={() => setQuery(prompt)}
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AGENT GRID */}
          <div>
            <div className="flex justify-between items-end mb-4 sm:mb-5 border-b border-card-border pb-3 sm:pb-4">
              <div className="text-text-primary text-base sm:text-lg font-semibold tracking-tight">
                The Claw Council
              </div>
              <div className="text-text-muted text-xs sm:text-sm font-medium">
                {preferences.enabledAgents.filter((a) => a !== "THE_ARBITER").length} agents active
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {agentsExcludingArbiter.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agentId={agent.id}
                  displayName={agent.displayName}
                  role={agent.role}
                  color={agent.color}
                  status={getAgentStatus(agent.id)}
                  lastResponse={getLastResponse(agent.id)}
                  enabled={preferences.enabledAgents.includes(agent.id)}
                />
              ))}
            </div>

            {/* ARBITER ROW */}
            <div className="mt-3 sm:mt-5">
              <ArbiterCard status="idle" />
            </div>
          </div>

          {/* DAILY SQUARE BRIEFING */}
          <div className="mt-6 sm:mt-8">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-1">
                <Share2 className="w-5 h-5 text-agent-pulse" />
                <span className="text-text-primary font-semibold">Square Briefing</span>
              </div>
              <p className="text-text-muted text-xs mb-4 ml-8">
                Auto-generate a market update to post on Binance Square
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                {[
                  {
                    emoji: "📊",
                    label: "Portfolio Update",
                    prompt:
                      "Generate a brief market update about my current portfolio holdings for posting on social media",
                  },
                  {
                    emoji: "🔥",
                    label: "Trending Report",
                    prompt:
                      "What are the top trending tokens right now? Give me a summary to share.",
                  },
                  {
                    emoji: "⚠️",
                    label: "Risk Alert",
                    prompt:
                      "What is the single biggest risk in the current market I should warn my followers about?",
                  },
                ].map((chip) => {
                  const hasKey = !!apiKeys?.squareApiKey;
                  return (
                    <button
                      key={chip.label}
                      onClick={() => {
                        if (!hasKey) return;
                        setQuery(chip.prompt);
                        startNewSession(chip.prompt);
                        startSession(chip.prompt);
                      }}
                      disabled={!hasKey}
                      title={!hasKey ? "Add Square API key in Settings" : ""}
                      className={`glass px-4 py-2 text-sm transition-all whitespace-nowrap snap-start shrink-0 rounded-full ${
                        hasKey
                          ? "text-text-secondary hover:border-card-border-hover hover:text-text-primary hover:bg-card-hover cursor-pointer"
                          : "text-text-muted opacity-50 cursor-not-allowed"
                      }`}
                    >
                      {chip.emoji} {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CouncilErrorBoundary>
    );
  }

  // ------------------------------------------------------------------
  // STATE B: DEBATE VIEW
  // ------------------------------------------------------------------
  const totalAgents = activeSession.agentResponses.length;
  const completedAgents = activeSession.agentResponses.filter((r) => r.isComplete).length;
  const isAllComplete = completedAgents === totalAgents && totalAgents > 0;
  const progressPercent = totalAgents === 0 ? 0 : Math.round((completedAgents / totalAgents) * 100);

  return (
    <CouncilErrorBoundary>
      <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 w-full animate-in slide-in-from-right-8 duration-500">
        {/* TOP BAR */}
        <div className="flex justify-between items-center gap-3 flex-wrap mb-6 sm:mb-8">
          <button
            onClick={() => {
              abortSession();
              finalizeSession();
            }}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition group touch-target"
          >
            <div className="p-1.5 rounded-full bg-card border border-card-border group-hover:border-card-border-hover transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-semibold">Back</span>
          </button>

          <button
            onClick={() => {
              abortSession();
              finalizeSession();
            }}
            className="bg-text-primary text-amoled px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all flex gap-2 items-center shrink-0"
          >
            New Query
          </button>
        </div>
        {/* USER QUERY */}
        <div className="flex justify-end mb-6 sm:mb-10 w-full">
          <div className="glass-card rounded-[20px_20px_4px_20px] px-4 sm:px-5 py-3 sm:py-4 max-w-[90%] sm:max-w-[70%]">
            <div className="text-text-muted text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
              Your query
            </div>
            <div className="text-text-primary text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">
              {activeSession.query}
            </div>
          </div>
        </div>
        {/* PROGRESS BAR */}
        {!isAllComplete && (
          <div className="glass-card p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5 rounded-full border-2 border-[color-mix(in_srgb,var(--color-accent),transparent_80%)] border-t-accent animate-spin shrink-0" />
              <div className="text-text-muted text-xs sm:text-sm font-medium">
                <span className="text-text-primary">
                  {completedAgents}/{totalAgents}
                </span>{" "}
                <span className="hidden sm:inline">agents </span>responded
              </div>
            </div>
            <div className="w-full bg-card rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-accent h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* AGENT DISCUSSION - Shows round progress and consensus */}
        {(activeSession.roundProgress || activeSession.consensus) && (
          <AgentDiscussion
            activeAgents={AGENT_LIST.filter((a) =>
              activeSession.agentResponses.some((r) => r.agentId === a.id),
            )}
            currentRound={activeSession.roundProgress}
            consensus={activeSession.consensus}
            isComplete={isAllComplete}
          />
        )}

        {/* AGENT RESPONSES FEED */}
        <div className="flex flex-col gap-3 sm:gap-5 mb-6 sm:mb-8">
          {activeSession.agentResponses.map((response, i) => {
            const config = AGENTS[response.agentId];
            if (!config) return null;
            return (
              <AgentResponseCard
                key={`${response.agentId}-${i}`}
                response={response}
                agentConfig={config}
              />
            );
          })}
        </div>
        {/* ARBITER VERDICT (Always show if it exists or if debating is done) */}
        {(activeSession.verdict || isAllComplete) && (
          <div className="mt-6 sm:mt-10">
            <ArbitersVerdictCard
              verdict={activeSession.verdict ?? null}
              arbiterStreamText={activeSession.arbiterStreamText}
              isLoading={!activeSession.verdict?.isComplete}
              query={activeSession.query}
              onNewQuery={() => finalizeSession()}
              onSaveToHistory={() => {
                if (activeSession.verdict?.isComplete) {
                  saveToHistory();
                }
              }}
            />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </CouncilErrorBoundary>
  );
}
