import { AgentStatus } from "@/types";
import { Crown } from "lucide-react";
import { HoverBorderGradient } from "@/components/ui/HoverBorderGradient";

interface ArbiterCardProps {
  status: AgentStatus;
  lastVerdict?: string;
}

export function ArbiterCard({ status, lastVerdict }: ArbiterCardProps) {
  const isThinking = status === "thinking";
  const isDone = status === "done";

  return (
    <HoverBorderGradient
      containerClassName="w-full shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent),transparent_95%)]"
      className="p-5"
      color="var(--color-accent)"
    >
      <div className="flex justify-between items-center sm:items-start flex-col sm:flex-row gap-4 sm:gap-0">
        <div className="flex gap-3 items-center">
          <Crown className="w-5 h-5 text-accent drop-shadow-[0_0_6px_color-mix(in_srgb,var(--color-accent),transparent_70%)]" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-accent font-bold text-base">THE ARBITER</span>
            <span className="text-text-muted text-xs font-medium">
              Council Head · Synthesis Engine
            </span>
          </div>
        </div>

        <div>
          {isThinking ? (
            <span className="bg-accent-bg border border-[color-mix(in_srgb,var(--color-accent),transparent_70%)] text-accent text-xs rounded-full px-2.5 py-0.5 whitespace-nowrap animate-[subtle-pulse_2s_infinite]">
              Synthesizing...
            </span>
          ) : isDone ? (
            <span className="bg-accent-bg border border-[color-mix(in_srgb,var(--color-accent),transparent_70%)] text-accent text-xs rounded-full px-2.5 py-0.5 whitespace-nowrap">
              Concluded
            </span>
          ) : (
            <span className="bg-card border border-card-border text-text-muted text-xs rounded-full px-2.5 py-0.5 whitespace-nowrap">
              Standing By
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm italic w-full border-t border-card-border pt-4 text-text-secondary">
        {lastVerdict || "Awaiting council reports..."}
      </div>
    </HoverBorderGradient>
  );
}
