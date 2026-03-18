"use client";

import { CouncilSession } from "@/types";
import { AGENTS } from "@/lib/constants";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Clock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";

interface SessionCardProps {
  session: CouncilSession;
}

export function SessionCard({ session }: SessionCardProps) {
  const router = useRouter();

  const timestamp = new Date(session.timestamp);
  const timeStr =
    timestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " · " +
    timestamp.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const maxVisibleAgents = 6;
  const agents = session.agentResponses;
  const visibleAgents = agents.slice(0, maxVisibleAgents);
  const extraCount = agents.length - maxVisibleAgents;

  const verdict = session.verdict;

  return (
    <div
      onClick={() => router.push(`/history/${session.id}`)}
      className="glass-card p-4 sm:p-5 cursor-pointer group"
    >
      {/* Top row */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-text-muted">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">{timeStr}</span>
        </div>
        {verdict && <RiskBadge level={verdict.riskLevel} className="text-[10px] px-2 py-0.5" />}
      </div>

      {/* Query preview */}
      <p className="text-text-primary text-sm font-medium mt-3 line-clamp-2 leading-relaxed">
        {session.query}
      </p>

      {/* Agents row */}
      <div className="mt-3 flex gap-1.5 flex-wrap items-center">
        {visibleAgents.map((response) => {
          const config = AGENTS[response.agentId];
          if (!config) return null;
          return (
            <div
              key={response.agentId}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border backdrop-blur-md"
              style={{
                backgroundColor: `color-mix(in srgb, ${config.color}, transparent 90%)`,
                borderColor: `color-mix(in srgb, ${config.color}, transparent 80%)`,
                color: config.color,
              }}
              title={config.displayName}
            >
              {config.initial}
            </div>
          );
        })}
        {extraCount > 0 && (
          <span className="text-text-muted text-[10px] bg-card border border-card-border rounded-full px-2 py-0.5 font-medium">
            +{extraCount} more
          </span>
        )}
      </div>

      {/* Verdict preview */}
      {verdict && verdict.finalVerdict && (
        <div className="mt-3">
          <span className="text-text-muted text-xs font-medium">Final Verdict: </span>
          <p className="text-text-secondary text-sm line-clamp-2 mt-0.5 leading-relaxed">
            {verdict.finalVerdict}
          </p>
        </div>
      )}

      {/* Bottom row */}
      <div className="mt-3 pt-3 border-t border-card-border flex justify-between items-center">
        {verdict ? (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-card-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent shadow-[0_0_4px_color-mix(in_srgb,var(--color-accent),transparent_70%)] transition-all"
                style={{ width: `${Math.min(verdict.confidence, 100)}%` }}
              />
            </div>
            <span className="text-text-muted text-xs">{verdict.confidence}%</span>
          </div>
        ) : (
          <span className="text-text-muted text-xs italic">No verdict</span>
        )}

        <div className="flex items-center gap-1 text-accent text-xs font-medium group-hover:underline">
          View Full Debate
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonSessionCard() {
  return (
    <div className="glass-card p-4 sm:p-5">
      {/* Top row */}
      <div className="flex justify-between items-center mb-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>

      {/* Query preview */}
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />

      {/* Agents row */}
      <div className="flex gap-1.5 mb-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-6 h-6 rounded-full" />
        ))}
      </div>

      {/* Verdict preview */}
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-5/6 mb-4" />

      {/* Bottom row */}
      <div className="pt-3 border-t border-card-border flex justify-between items-center mt-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-20 h-1.5 rounded-full" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
