"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

interface ConsensusGaugeProps {
  agreement: number; // 0 to 1
  hasConsensus: boolean;
  direction?: "positive" | "negative";
  size?: "sm" | "md" | "lg";
}

export function ConsensusGauge({
  agreement,
  hasConsensus,
  direction,
  size = "md",
}: ConsensusGaugeProps) {
  const prefersReduced = useReducedMotion();
  
  const percentage = Math.round(agreement * 100);
  const strokeDasharray = 251.2; // 2 * pi * 40
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  const getStatusColor = () => {
    if (!hasConsensus) return "var(--color-risk-high)";
    if (agreement >= 0.8) return "var(--color-agent-pulse)";
    if (agreement >= 0.5) return "var(--color-accent)";
    return "var(--color-risk-moderate)";
  };

  const statusColor = getStatusColor();

  const dimensions = {
    sm: { circle: 30, stroke: 4, text: "text-xs", icon: 14 },
    md: { circle: 50, stroke: 6, text: "text-sm", icon: 18 },
    lg: { circle: 70, stroke: 8, text: "text-base", icon: 24 },
  }[size];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        {/* SVG Gauge */}
        <svg
          width={dimensions.circle * 2 + 10}
          height={dimensions.circle * 2 + 10}
          viewBox="0 0 100 100"
          className="transform -rotate-90"
        >
          {/* Background Circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke="var(--color-card-border)"
            strokeWidth={dimensions.stroke}
          />
          {/* Progress Circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke={statusColor}
            strokeWidth={dimensions.stroke}
            strokeLinecap="round"
            initial={{ strokeDashoffset: strokeDasharray }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ strokeDasharray }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span 
            className={`font-black tracking-tight ${size === "lg" ? "text-2xl" : "text-xl"}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            style={{ color: statusColor }}
          >
            {percentage}%
          </motion.span>
        </div>
      </div>

      {/* Label and Status */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          {hasConsensus ? (
            <CheckCircle2 className="w-4 h-4 text-agent-pulse" />
          ) : (
            <AlertCircle className="w-4 h-4 text-risk-high" />
          )}
          <span className={`font-bold uppercase tracking-widest ${dimensions.text} ${hasConsensus ? "text-agent-pulse" : "text-risk-high"}`}>
            {hasConsensus ? "Consensus Reached" : "No Consensus"}
          </span>
        </div>
        
        {direction && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-card-border shadow-sm">
            {direction === "positive" ? (
              <TrendingUp className="w-3.5 h-3.5 text-agent-pulse" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-risk-high" />
            )}
            <span className={`text-[10px] font-black uppercase tracking-tighter ${direction === "positive" ? "text-agent-pulse" : "text-risk-high"}`}>
              {direction === "positive" ? "Bullish Sentiment" : "Bearish Sentiment"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
