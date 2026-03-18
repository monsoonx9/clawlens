"use client";

import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { ArrowLeft, Clock, Download, RefreshCw, Search } from "lucide-react";
import { AgentResponseCard } from "@/components/council/AgentResponseCard";
import { ArbitersVerdictCard } from "@/components/council/ArbitersVerdictCard";
import { AGENTS } from "@/lib/constants";
import { useState } from "react";

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const session = useAppStore((s) => s.sessions.find((sess) => sess.id === sessionId));
  const sessions = useAppStore((s) => s.sessions);
  const [showSimilar, setShowSimilar] = useState(false);

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 w-full animate-in fade-in duration-500">
        <button
          onClick={() => router.push("/history")}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition group mb-8"
        >
          <div className="p-1 rounded bg-card border border-card-border group-hover:border-text-muted transition">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold">Back to History</span>
        </button>

        <div className="bg-card border border-card-border rounded-card p-8 sm:p-16 flex flex-col items-center text-center">
          <p className="text-text-primary text-lg font-semibold mb-1">Session not found</p>
          <p className="text-text-secondary text-sm">This session may have been cleared.</p>
        </div>
      </div>
    );
  }

  const timestamp = new Date(session.timestamp);
  const timeStr =
    timestamp.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    timestamp.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const handleRerun = () => {
    const currentQuery = encodeURIComponent(session.query);
    router.push(`/council?query=${currentQuery}`);
  };

  const exportAsMarkdown = () => {
    const lines: string[] = [
      `# Council Session`,
      ``,
      `**Date:** ${timeStr}`,
      ``,
      `## Query`,
      ``,
      `> ${session.query}`,
      ``,
      `---`,
      ``,
      `## Agent Responses`,
      ``,
    ];

    session.agentResponses.forEach((resp) => {
      const config = AGENTS[resp.agentId];
      const name = config?.displayName ?? resp.agentId;
      lines.push(`### ${name}`);
      lines.push(``);
      if (resp.error) {
        lines.push(`> ⚠️ Error: ${resp.error}`);
      } else {
        lines.push(resp.content || "_No response_");
      }
      if (resp.councilReport) {
        lines.push(``);
        lines.push(`**Council Report:** ${resp.councilReport}`);
      }
      lines.push(``);
      lines.push(`---`);
      lines.push(``);
    });

    if (session.verdict) {
      lines.push(`## The Arbiter's Verdict`);
      lines.push(``);
      lines.push(`**Consensus:** ${session.verdict.consensus ?? "N/A"}`);
      lines.push(``);
      lines.push(`**Risk Level:** ${session.verdict.riskLevel ?? "N/A"}`);
      lines.push(``);
      lines.push(`**Confidence:** ${session.verdict.confidence ?? "N/A"}%`);
      lines.push(``);
      lines.push(session.verdict.finalVerdict || "_No verdict text_");
      lines.push(``);
      if (session.verdict.watchThis) {
        lines.push(`**Watch This:** ${session.verdict.watchThis}`);
        lines.push(``);
      }
    }

    const blob = new Blob([lines.join("\n")], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clawlens-session-${sessionId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const findSimilarQueries = () => {
    const currentQueryLower = session.query.toLowerCase();
    const keywords = currentQueryLower.split(/\s+/).filter((w) => w.length > 3);

    return sessions
      .filter((s) => s.id !== session.id)
      .map((s) => {
        const queryLower = s.query.toLowerCase();
        const matchCount = keywords.filter((k) => queryLower.includes(k)).length;
        return { session: s, matchCount };
      })
      .filter((r) => r.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 5)
      .map((r) => r.session);
  };

  const similarSessions = findSimilarQueries();

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 w-full animate-in fade-in duration-500">
      {/* TOP BAR */}
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => router.push("/history")}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition group"
        >
          <div className="p-1 rounded bg-card border border-card-border group-hover:border-text-muted transition touch-target flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-semibold">Back to History</span>
        </button>

        <div className="flex items-center gap-2 text-text-muted">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">{timeStr}</span>
        </div>
      </div>

      {/* USER QUERY */}
      <div className="flex flex-col items-end mb-6 sm:mb-10 w-full">
        <div className="bg-card border border-card-border rounded-[16px_16px_4px_16px] px-4 sm:px-5 py-3 sm:py-4 max-w-[90%] sm:max-w-[70%] shadow-md w-full">
          <div className="text-text-muted text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
            Your query
          </div>
          <div className="text-text-primary text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">
            {session.query}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3 mr-2">
          <button
            onClick={handleRerun}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border border-card-border rounded-md text-text-primary hover:border-accent-primary hover:text-accent-primary transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-run This Query
          </button>
          <button
            onClick={exportAsMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border border-card-border rounded-md text-text-primary hover:border-accent-primary hover:text-accent-primary transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export .md
          </button>
          {similarSessions.length > 0 && (
            <button
              onClick={() => setShowSimilar(!showSimilar)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border border-card-border rounded-md text-text-primary hover:border-accent-secondary hover:text-accent-secondary transition"
            >
              <Search className="w-3.5 h-3.5" />
              Similar ({similarSessions.length})
            </button>
          )}
        </div>

        {/* Similar Queries */}
        {showSimilar && similarSessions.length > 0 && (
          <div className="mt-3 w-full max-w-[90%] sm:max-w-[70%]">
            <div className="text-text-muted text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">
              Similar queries
            </div>
            <div className="flex flex-col gap-2">
              {similarSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/history/${s.id}`)}
                  className="text-left px-3 py-2 text-xs bg-[color-mix(in_srgb,var(--color-card),transparent_50%)] border border-card-border rounded-md text-text-secondary hover:text-text-primary hover:border-text-muted transition line-clamp-2"
                >
                  {s.query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AGENT RESPONSES */}
      <div className="flex flex-col gap-3 sm:gap-5 mb-6 sm:mb-8">
        {session.agentResponses.map((response, i) => {
          const config = AGENTS[response.agentId];
          if (!config) return null;
          return (
            <AgentResponseCard
              key={`${response.agentId}-${i}`}
              response={{
                ...response,
                isStreaming: false,
                isComplete: true,
              }}
              agentConfig={config}
            />
          );
        })}
      </div>

      {/* ARBITER VERDICT */}
      <div className="mb-24">
        {session.verdict && (
          <ArbitersVerdictCard
            verdict={{
              ...session.verdict,
              isStreaming: false,
              isComplete: true,
            }}
            isLoading={false}
            onNewQuery={() => router.push("/council")}
          />
        )}
      </div>
    </div>
  );
}
