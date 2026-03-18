"use client";

import { useState, useRef } from "react";
import { ArbitersVerdict } from "@/types";
import { RiskBadge } from "@/components/ui/RiskBadge";
import {
  Crown,
  Eye,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  Loader2,
  Share2,
  Download,
} from "lucide-react";
import { AGENTS } from "@/lib/constants";
import { motion } from "framer-motion";
import { useReducedMotion, getTransition } from "@/hooks/useReducedMotion";
import { SquarePostModal } from "@/components/square/SquarePostModal";
import { formatVerdictAsSquarePost } from "@/lib/squareClient";
import html2canvas from "html2canvas";

interface ArbitersVerdictCardProps {
  verdict: ArbitersVerdict | null;
  arbiterStreamText?: string;
  isLoading: boolean;
  onNewQuery: () => void;
  onSaveToHistory?: () => void;
  query?: string;
}

export function ArbitersVerdictCard({
  verdict,
  arbiterStreamText,
  isLoading,
  onNewQuery,
  onSaveToHistory,
  query,
}: ArbitersVerdictCardProps) {
  const prefersReduced = useReducedMotion();
  const [showSquareModal, setShowSquareModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // If not complete and we have streaming text, show the streaming view
  if (verdict && !verdict.isComplete && arbiterStreamText) {
    return (
      <div className="bg-accent-bg backdrop-blur-md border border-[color-mix(in_srgb,var(--color-accent),transparent_70%)] rounded-2xl p-6 mt-6 shadow-[0_0_30px_color-mix(in_srgb,var(--color-accent),transparent_95%)]">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-5 h-5 text-accent animate-pulse" />
          <span className="text-accent text-sm font-bold tracking-widest uppercase">
            The Arbiter is synthesizing...
          </span>
        </div>
        <div className="bg-[color-mix(in_srgb,var(--color-card),transparent_50%)] rounded-xl p-4 border border-[color-mix(in_srgb,var(--color-card-border),transparent_50%)] min-h-[100px]">
          <p className="text-text-primary text-sm font-mono whitespace-pre-wrap leading-relaxed [opacity:0.9] transition-opacity duration-75">
            {arbiterStreamText}
            <span className="inline-block w-1.5 h-3.5 bg-accent ml-1 animate-[blink_1s_infinite] align-middle" />
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !verdict || !verdict.isComplete) {
    return (
      <div className="bg-accent-bg backdrop-blur-md border-2 border-[color-mix(in_srgb,var(--color-accent),transparent_80%)] rounded-2xl p-6 mt-6 animate-[subtle-pulse_2s_infinite]">
        <div className="flex items-center gap-3 justify-center py-8">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
          <span className="text-accent font-semibold">The Arbiter is synthesizing...</span>
        </div>
      </div>
    );
  }

  const squareContent = formatVerdictAsSquarePost({
    query: query || "",
    finalVerdict: verdict.finalVerdict,
    riskLevel: verdict.riskLevel,
    confidence: verdict.confidence,
    watchThis: verdict.watchThis || "",
  });

  const handleExportImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        // Ensure nice resolution and dark mode rendering
        scale: 2,
        backgroundColor: "var(--color-bg)",
        logging: false,
        useCORS: true,
      });
      const dataURL = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `clawlens-verdict-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    } catch (error) {
      console.error("Failed to export image:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <motion.div
        ref={cardRef}
        className="bg-accent-bg backdrop-blur-md border-2 border-[color-mix(in_srgb,var(--color-accent),transparent_70%)] rounded-2xl p-6 mt-6 shadow-[0_0_40px_color-mix(in_srgb,var(--color-accent),transparent_92%)]"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={getTransition({ duration: 0.5, ease: "easeOut", delay: 0.2 }, prefersReduced)}
      >
        {/* Header */}
        <div className="flex justify-between items-start sm:items-center mb-5 flex-col sm:flex-row gap-4 sm:gap-0">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-accent drop-shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent),transparent_70%)]" />
            <div>
              <div className="text-accent text-lg font-bold">THE ARBITER</div>
              <div className="text-text-muted text-sm font-medium">Final Verdict</div>
            </div>
          </div>
          <RiskBadge level={verdict.riskLevel} />
        </div>

        <div className="border-t border-card-border" />

        {/* Consensus */}
        <div className="mt-5">
          <div className="text-text-muted text-xs uppercase tracking-widest font-bold mb-2">
            Council Consensus
          </div>
          <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
            {verdict.consensus}
          </p>
        </div>

        <div className="border-t border-card-border mt-5" />

        {/* Dissenting Voices */}
        {verdict.dissentingVoices && verdict.dissentingVoices.length > 0 && (
          <>
            <div className="mt-5">
              <div className="text-text-muted text-xs uppercase tracking-widest font-bold mb-3">
                Dissenting Voices
              </div>
              <div className="space-y-3">
                {verdict.dissentingVoices.map((dissent, idx) => {
                  const config = AGENTS[dissent.agentId];
                  if (!config) return null;
                  return (
                    <div key={idx} className="flex gap-3 items-start">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap mt-0.5 backdrop-blur-md"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${config.color}, transparent 90%)`,
                          color: config.color,
                          border: `1px solid color-mix(in srgb, ${config.color}, transparent 85%)`,
                        }}
                      >
                        {config.displayName}
                      </span>
                      <p className="text-text-secondary text-sm leading-relaxed">
                        {dissent.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-card-border mt-5" />
          </>
        )}

        {/* Final Verdict */}
        <div className="mt-5">
          <div className="text-text-muted text-xs uppercase tracking-widest font-bold mb-2">
            Final Verdict
          </div>
          <p className="text-text-primary text-base font-medium leading-relaxed whitespace-pre-wrap">
            {verdict.finalVerdict}
          </p>

          {/* Confidence */}
          <div className="mt-5 max-w-sm">
            <div className="flex justify-between text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
              <span>Confidence</span>
              <span className="text-accent">{verdict.confidence}%</span>
            </div>
            <div className="w-full bg-card border border-card-border rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-accent h-full rounded-full shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent),transparent_70%)]"
                initial={{ width: "0%" }}
                animate={{ width: `${verdict.confidence}%` }}
                transition={getTransition(
                  { duration: 1.2, ease: "easeOut", delay: 0.8 },
                  prefersReduced,
                )}
              />
            </div>
          </div>
        </div>

        {/* Watch Items */}
        {verdict.watchThis && (
          <div className="mt-6 flex gap-2 items-start bg-[color-mix(in_srgb,var(--color-card),transparent_60%)] backdrop-blur-md p-3.5 rounded-2xl border border-card-border">
            <Eye className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <span className="text-accent text-sm font-bold block mb-1">Watch This</span>
              <div className="text-text-secondary text-sm space-y-1">{verdict.watchThis}</div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3" data-html2canvas-ignore>
          <button
            onClick={handleExportImage}
            disabled={isExporting}
            className="glass-strong border border-card-border rounded-full px-5 py-2 text-text-secondary text-sm font-medium hover:bg-card-hover hover:border-card-border-hover hover:text-text-primary transition-all flex gap-2 items-center disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? "Exporting..." : "Export as Image"}
          </button>
          <button
            onClick={() => {
              if (onSaveToHistory && !isSaved) {
                onSaveToHistory();
                setIsSaved(true);
              }
            }}
            disabled={isSaved}
            className={`backdrop-blur-md border rounded-full px-5 py-2 text-sm font-medium transition-all flex gap-2 items-center ${
              isSaved
                ? "bg-[color-mix(in_srgb,var(--color-accent),transparent_90%)] border-[color-mix(in_srgb,var(--color-accent),transparent_70%)] text-accent cursor-default"
                : "bg-card border-card-border text-text-secondary hover:bg-card-hover hover:border-card-border-hover hover:text-text-primary"
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {isSaved ? "Saved!" : "Save to History"}
          </button>
          <button
            onClick={() => setShowSquareModal(true)}
            className="bg-transparent border border-[color-mix(in_srgb,var(--color-agent-pulse),transparent_70%)] text-agent-pulse px-5 py-2 rounded-full text-sm font-medium hover:bg-[color-mix(in_srgb,var(--color-agent-pulse),transparent_90%)] transition-all flex gap-2 items-center"
          >
            <Share2 className="w-4 h-4" />
            Share on Square
          </button>
          <button
            onClick={onNewQuery}
            className="bg-text-primary text-amoled font-bold px-6 py-2 rounded-full text-sm hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all flex gap-2 items-center"
          >
            New Query
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Square Post Modal */}
      <SquarePostModal
        isOpen={showSquareModal}
        onClose={() => setShowSquareModal(false)}
        initialContent={squareContent}
        postTitle="Share Council Verdict"
      />
    </>
  );
}
