"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AgentConfig } from "@/types";

interface RoundProgress {
  currentRound: number;
  maxRounds: number;
  reportsCount: number;
}

interface ConsensusStatus {
  hasConsensus: boolean;
  agreement: number;
  direction?: "positive" | "negative";
}

interface AgentDiscussionProps {
  activeAgents: AgentConfig[];
  currentRound?: RoundProgress;
  consensus?: ConsensusStatus;
  isComplete?: boolean;
}

export function AgentDiscussion({
  activeAgents,
  currentRound,
  consensus,
  isComplete = false,
}: AgentDiscussionProps) {
  const getDirectionIcon = () => {
    if (!consensus) return null;
    if (consensus.direction === "positive") {
      return <TrendingUp className="w-4 h-4 text-risk-low" />;
    }
    if (consensus.direction === "negative") {
      return <TrendingDown className="w-4 h-4 text-risk-extreme" />;
    }
    return <Minus className="w-4 h-4 text-text-muted" />;
  };

  const getConsensusColor = () => {
    if (!consensus) return "text-text-muted";
    if (consensus.agreement >= 75) return "text-risk-low";
    if (consensus.agreement >= 50) return "text-risk-moderate";
    return "text-risk-extreme";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-3 sm:p-4 mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-text-primary">Council Discussion</span>
        </div>

        {consensus && (
          <div className="flex items-center gap-2">
            {consensus.hasConsensus ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[color-mix(in_srgb,var(--color-risk-low),transparent_85%)] border border-[color-mix(in_srgb,var(--color-risk-low),transparent_70%)]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-risk-low" />
                <span className="text-xs font-medium text-risk-low">Consensus</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5">
                {getDirectionIcon()}
                <span className={`text-xs font-medium ${getConsensusColor()}`}>
                  {consensus.agreement}% aligned
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {currentRound && !isComplete ? (
          <motion.div
            key="rounds"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: currentRound.maxRounds }).map((_, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center"
                  >
                    <div
                      className={`w-8 h-2 rounded-full transition-colors ${
                        idx < currentRound.currentRound
                          ? "bg-accent"
                          : idx === currentRound.currentRound - 1
                            ? "bg-accent/50"
                            : "bg-card-border"
                      }`}
                    />
                    {idx < currentRound.maxRounds - 1 && (
                      <div
                        className={`w-3 h-0.5 ${
                          idx < currentRound.currentRound - 1
                            ? "bg-accent"
                            : idx === currentRound.currentRound - 1
                              ? "bg-accent/50"
                              : "bg-card-border"
                        }`}
                      />
                    )}
                  </motion.div>
                ))}
              </div>
              <span className="text-xs text-text-muted">
                Round {currentRound.currentRound}/{currentRound.maxRounds}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {activeAgents.slice(0, 5).map((agent) => (
                  <motion.div
                    key={agent.id}
                    initial={{ scale: 0, x: -10 }}
                    animate={{ scale: 1, x: 0 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-bg"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${agent.color}, transparent 80%)`,
                      color: agent.color,
                    }}
                    title={agent.displayName}
                  >
                    {agent.displayName.charAt(0)}
                  </motion.div>
                ))}
                {activeAgents.length > 5 && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-card-border border-2 border-bg text-text-muted">
                    +{activeAgents.length - 5}
                  </div>
                )}
              </div>
              <span className="text-xs text-text-muted">{activeAgents.length} agents debating</span>
            </div>
          </motion.div>
        ) : isComplete && consensus ? (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {consensus.hasConsensus ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-risk-low" />
                  <span className="text-sm text-risk-low">
                    Council reached {consensus.agreement}% consensus
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-risk-moderate" />
                  <span className="text-sm text-risk-moderate">
                    Views differed ({consensus.agreement}% agreement)
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {getDirectionIcon()}
              <span className="text-xs text-text-muted capitalize">
                {consensus.direction || "mixed"}
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
