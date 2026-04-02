"use client";

import { AgentName, AgentStatus } from "@/types";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";
import { HoverBorderGradient } from "@/components/ui/HoverBorderGradient";
import { useReducedMotion, getTransition } from "@/hooks/useReducedMotion";
import {
  Search,
  Shield,
  Eye,
  Ghost,
  BookOpen,
  Activity,
  GraduationCap,
  Feather,
  Flame,
  Scale,
} from "lucide-react";

interface AgentCardProps {
  agentId: AgentName;
  displayName: string;
  role: string;
  color: string;
  status: AgentStatus;
  lastResponse?: string;
  enabled: boolean;
  isLoading?: boolean;
}

const agentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  SCOUT: Search,
  THE_WARDEN: Shield,
  LENS: Eye,
  SHADOW: Ghost,
  LEDGER: BookOpen,
  PULSE: Activity,
  SAGE: GraduationCap,
  QUILL: Feather,
  FUTURES: Flame,
  BLAZE: Flame,
  THE_ARBITER: Scale,
};

// hexToRgb removed in favor of color-mix

export function AgentCard({
  agentId,
  displayName,
  role,
  color,
  status,
  lastResponse,
  enabled,
  isLoading = false,
}: AgentCardProps) {
  const prefersReduced = useReducedMotion();
  const AgentIcon = agentIcons[agentId] || Scale;

  const isThinking = status === "thinking";
  const isSpeaking = status === "speaking";
  const isDone = status === "done";
  const isActive = isThinking || isSpeaking;
  const isDisabled = !enabled || status === "disabled";

  const thinkingAnimation =
    isActive && !prefersReduced
      ? {
          boxShadow: isSpeaking
            ? [
                `0 0 0px color-mix(in srgb, ${color}, transparent)`,
                `0 0 20px color-mix(in srgb, ${color}, transparent 50%)`,
                `0 0 0px color-mix(in srgb, ${color}, transparent)`,
              ]
            : [
                `0 0 0px color-mix(in srgb, ${color}, transparent)`,
                `0 0 16px color-mix(in srgb, ${color}, transparent 70%)`,
                `0 0 0px color-mix(in srgb, ${color}, transparent)`,
              ],
        }
      : {};

  const thinkingTransition =
    isActive && !prefersReduced
      ? {
          duration: isSpeaking ? 1.2 : 1.5,
          repeat: Infinity,
          ease: "easeInOut" as const,
        }
      : {};

  const doneAnimation =
    isDone && !prefersReduced
      ? {
          backgroundColor: [
            `color-mix(in srgb, ${color}, transparent 90%)`,
            "color-mix(in srgb, var(--color-bg), transparent 90%)",
          ],
        }
      : {};

  const doneTransition =
    isDone && !prefersReduced ? { duration: 0.6, ease: "easeOut" as const } : {};

  return (
    <motion.div
      className={twMerge(clsx("transition-all duration-300"))}
      animate={{
        ...thinkingAnimation,
        ...doneAnimation,
        borderColor: isActive ? `color-mix(in srgb, ${color}, transparent 40%)` : undefined,
      }}
      transition={isActive ? thinkingTransition : doneTransition}
      style={
        isActive ? { borderColor: `color-mix(in srgb, ${color}, transparent 40%)` } : undefined
      }
    >
      <HoverBorderGradient
        containerClassName={twMerge(
          clsx(
            "w-full cursor-default relative overflow-hidden transition-all duration-300",
            !isDisabled && "hover:scale-[1.02]",
            isDisabled && "opacity-40",
            isLoading && "animate-pulse opacity-50",
          ),
        )}
        className="p-4"
        color={color}
      >
        {/* Top row */}
        <div className="flex justify-between items-center relative z-10">
          <div className="flex gap-3 items-center">
            <motion.div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: `color-mix(in srgb, ${color}, transparent 70%)`,
              }}
              animate={isActive && !prefersReduced ? { scale: [1, 1.05, 1] } : {}}
              transition={isActive && !prefersReduced ? { duration: 2, repeat: Infinity } : {}}
            >
              <span style={{ color }}>
                <AgentIcon className="w-4 h-4" />
              </span>
            </motion.div>
            <div>
              <div className="text-text-primary text-sm font-semibold">{displayName}</div>
              <div className="text-text-muted text-xs">{role}</div>
            </div>
          </div>

          {/* Status chip */}
          <div>
            {isLoading ? (
              <div className="w-12 h-5 bg-card rounded-full" />
            ) : isDisabled ? (
              <span className="bg-card border border-card-border text-text-dim text-xs rounded-full px-2.5 py-0.5 whitespace-nowrap">
                Disabled
              </span>
            ) : isSpeaking ? (
              <motion.span
                className="bg-accent-bg border border-[color-mix(in_srgb,var(--color-accent),transparent_50%)] text-accent text-xs rounded-full px-2.5 py-0.5 whitespace-nowrap"
                animate={prefersReduced ? {} : { scale: [1, 1.05, 1] }}
                transition={getTransition({ duration: 0.8, repeat: Infinity }, prefersReduced)}
              >
                Speaking...
              </motion.span>
            ) : isThinking ? (
              <motion.span
                className="bg-accent-bg border border-[color-mix(in_srgb,var(--color-accent),transparent_70%)] text-accent text-xs rounded-full px-2.5 py-0.5 whitespace-nowrap"
                animate={prefersReduced ? {} : { opacity: [1, 0.5, 1] }}
                transition={getTransition({ duration: 1.2, repeat: Infinity }, prefersReduced)}
              >
                Thinking...
              </motion.span>
            ) : isDone ? (
              <span className="bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-low),transparent_75%)] text-risk-low text-xs rounded-full px-2.5 py-0.5 whitespace-nowrap">
                Ready
              </span>
            ) : (
              <span className="bg-card border border-card-border text-text-muted text-xs rounded-full px-2.5 py-0.5 whitespace-nowrap">
                Idle
              </span>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-3 text-text-muted text-xs italic line-clamp-2 border-t border-card-border pt-3 relative z-10">
          {isLoading ? (
            <div className="h-3 w-3/4 bg-card-border rounded mt-1" />
          ) : isDisabled ? (
            "Agent is disabled in preferences."
          ) : (
            lastResponse || "Awaiting your query..."
          )}
        </div>
      </HoverBorderGradient>
    </motion.div>
  );
}
