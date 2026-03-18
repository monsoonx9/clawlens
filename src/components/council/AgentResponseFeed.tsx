"use client";

import { AgentResponse, AgentConfig } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { AgentResponseCard } from "./AgentResponseCard";
import { useReducedMotion, getTransition } from "@/hooks/useReducedMotion";
import { Users, Loader2 } from "lucide-react";

interface AgentResponseFeedProps {
  agentResponses: AgentResponse[];
  agentConfigs: Record<string, AgentConfig>;
}

export function AgentResponseFeed({ agentResponses, agentConfigs }: AgentResponseFeedProps) {
  const prefersReduced = useReducedMotion();

  const completedAgents = agentResponses.filter((r) => r.isComplete || r.content).length;
  const totalAgents = agentResponses.length;
  const activeAgent = agentResponses.find((r) => r.isStreaming && r.content);
  const progressPercent = totalAgents > 0 ? (completedAgents / totalAgents) * 100 : 0;
  const isCouncilRunning = agentResponses.some((r) => r.isStreaming);
  const hasStarted = agentResponses.length > 0;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {hasStarted && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-card via-card to-[color-mix(in_srgb,var(--color-card),transparent_80%)] border border-card-border rounded-xl sm:rounded-2xl p-3 sm:p-4"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <motion.div
                  animate={isCouncilRunning ? { rotate: 360 } : {}}
                  transition={
                    isCouncilRunning ? { duration: 3, repeat: Infinity, ease: "linear" } : {}
                  }
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[color-mix(in_srgb,var(--color-accent),transparent_80%)] flex items-center justify-center"
                >
                  {isCouncilRunning ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                  ) : (
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                  )}
                </motion.div>
                {isCouncilRunning && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full"
                  />
                )}
              </div>
              <div>
                <h3 className="text-text-primary font-semibold xs:text-xs sm:text-sm">
                  {isCouncilRunning ? "Council in Session" : "Council Complete"}
                </h3>
                <p className="text-text-muted xs:text-[10px] sm:text-xs">
                  {completedAgents} of {totalAgents} agents have spoken
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="xs:text-base sm:text-lg font-bold text-accent">
                {Math.round(progressPercent)}%
              </div>
              <div className="text-text-muted xs:text-[10px] sm:text-xs">Complete</div>
            </div>
          </div>

          <div className="relative h-1.5 sm:h-2 bg-card-border rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-[color-mix(in_srgb,var(--color-accent),transparent_30%)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {isCouncilRunning && activeAgent && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-card-border flex items-center gap-1.5 sm:gap-2 flex-wrap"
            >
              <span className="text-text-muted xs:text-[10px] sm:text-xs">Current speaker:</span>
              <span
                className="xs:text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${agentConfigs[activeAgent.agentId]?.color}, transparent 80%)`,
                  color: agentConfigs[activeAgent.agentId]?.color,
                }}
              >
                {agentConfigs[activeAgent.agentId]?.displayName || activeAgent.agentId}
              </span>
              {activeAgent.currentIndex && activeAgent.totalAgents && (
                <span className="text-text-muted text-xs">
                  ({activeAgent.currentIndex}/{activeAgent.totalAgents})
                </span>
              )}
            </motion.div>
          )}
        </motion.div>
      )}

      <div className="relative">
        {hasStarted && totalAgents > 1 && (
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-card-border to-transparent -z-10" />
        )}

        <AnimatePresence mode="popLayout">
          {agentResponses.map((response, index) => {
            const config = agentConfigs[response.agentId];
            if (!config) return null;
            return (
              <motion.div
                key={`${response.agentId}-${index}`}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={getTransition(
                  {
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1],
                    delay: index * 0.08,
                  },
                  prefersReduced,
                )}
              >
                <AgentResponseCard response={response} agentConfig={config} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
