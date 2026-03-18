import { AgentResponse, AgentConfig } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Brain,
  MessageSquareQuote,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";

function formatCouncilReport(report: string, maxLength: number = 400): string {
  if (!report || report.trim().length === 0) {
    return "No verdict available.";
  }

  const trimmed = report.trim();

  // If it looks like JSON (starts with { or [)
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return formatJsonAsText(json, maxLength);
    } catch {
      // Not valid JSON, continue
    }
  }

  // Check for JSON embedded in text
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const json = JSON.parse(jsonMatch[0]);
      return formatJsonAsText(json, maxLength);
    } catch {
      // Not valid JSON
    }
  }

  // Already plain text - truncate if too long
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength).trim() + "...";
  }

  return trimmed;
}

function formatJsonAsText(json: unknown, maxLength: number): string {
  const parts: string[] = [];

  // Priority fields to extract
  const priorityFields = [
    "directAnswer",
    "recommendation",
    "verdict",
    "conclusion",
    "actionPlan",
    "summary",
    "wardenVerdict",
    "councilVerdict",
    "actionRecommendation",
    "advice",
  ];

  const obj = json as Record<string, unknown>;

  // Try priority fields first
  for (const field of priorityFields) {
    if (obj[field]) {
      const value = obj[field];
      if (typeof value === "string" && value.length > 10) {
        parts.push(value);
        break;
      } else if (typeof value === "object" && value !== null) {
        const nested = formatNestedObject(value);
        if (nested) parts.push(nested);
      }
    }
  }

  // Add key metrics if we don't have a good verdict yet
  if (parts.length === 0 || parts[0].length < 50) {
    const metrics: string[] = [];

    const portfolioHealth = obj.portfolioHealth as Record<string, unknown> | undefined;
    const tradeHistory = obj.tradeHistory as Record<string, unknown> | undefined;
    const marketSentiment = obj.marketSentiment as Record<string, unknown> | undefined;

    if (obj.riskScore || portfolioHealth?.riskScore) {
      const score = obj.riskScore || portfolioHealth?.riskScore;
      metrics.push(`Risk: ${score}`);
    }
    if (portfolioHealth?.concentration || obj.concentration) {
      const conc = portfolioHealth?.concentration || obj.concentration;
      metrics.push(`Concentration: ${conc}`);
    }
    if (portfolioHealth?.totalValue || obj.totalValue) {
      const val = portfolioHealth?.totalValue || obj.totalValue;
      metrics.push(`Value: ${val}`);
    }
    if (obj.winRate || tradeHistory?.winRate) {
      const win = obj.winRate || tradeHistory?.winRate;
      metrics.push(`Win Rate: ${win}`);
    }
    if (obj.fearGreedIndex || marketSentiment?.btcFearGreedIndex) {
      const fgi = obj.fearGreedIndex || marketSentiment?.btcFearGreedIndex;
      metrics.push(`Fear & Greed: ${fgi}`);
    }

    if (metrics.length > 0) {
      parts.unshift(metrics.join(" | "));
    }
  }

  const result = parts.join(" ").trim();

  if (result.length > maxLength) {
    return result.slice(0, maxLength).trim() + "...";
  }

  return result || "Analysis complete.";
}

function formatNestedObject(obj: unknown): string | null {
  if (obj === null) {
    return null;
  }

  if (typeof obj === "string") {
    return obj.length > 10 ? obj : null;
  }

  if (typeof obj !== "object") {
    return null;
  }

  const parts: string[] = [];
  const o = obj as Record<string, unknown>;

  // Flatten common nested fields
  if (o.recommendation && typeof o.recommendation === "string") {
    parts.push(o.recommendation);
  }
  if (o.verdict && typeof o.verdict === "string") {
    parts.push(o.verdict);
  }
  if (o.action && typeof o.action === "string") {
    parts.push(o.action);
  }
  if (o.grade && typeof o.grade === "string") {
    parts.push(`Grade: ${o.grade}`);
  }
  if (o.winRate && typeof o.winRate === "string") {
    parts.push(`Win Rate: ${o.winRate}`);
  }

  // Handle nested portfolioHealth
  if (o.portfolioHealth && typeof o.portfolioHealth === "object") {
    const ph = o.portfolioHealth as Record<string, unknown>;
    if (ph.riskScore) parts.push(`Risk: ${ph.riskScore}`);
    if (ph.concentration) parts.push(`Concentrated: ${ph.concentration}`);
    if (ph.totalValue) parts.push(`Value: ${ph.totalValue}`);
  }

  // Handle nested marketSentiment
  if (o.marketSentiment && typeof o.marketSentiment === "object") {
    const ms = o.marketSentiment as Record<string, unknown>;
    if (ms.fearGreedIndex || ms.btcFearGreedIndex) {
      parts.push(`F&G: ${ms.fearGreedIndex || ms.btcFearGreedIndex}`);
    }
  }

  return parts.length > 0 ? parts.join(" | ") : null;
}

// Function to convert JSON blocks to readable text in Deep Dive
function formatDeepDiveAsText(content: string): string {
  if (!content) return "";

  // Try to find and parse JSON blocks
  const jsonBlockRegex = /\{[\s\S]*?\}/g;
  let formatted = content;

  // First, try to parse the entire content as JSON if it starts with {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return formatJsonAsText(parsed, 10000);
    } catch {
      // Not valid JSON, continue with regex approach
    }
  }

  // Find JSON-like blocks and convert them
  const matches = trimmed.match(jsonBlockRegex);
  if (!matches) return content;

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match);
      // Convert to readable bullet points
      const lines = formatJsonAsText(parsed, 5000);
      formatted = formatted.replace(match, lines);
    } catch {
      // Not valid JSON, leave as is
    }
  }

  return formatted;
}

function parseRugShieldScore(text: string): { score: number; verdict: string } | null {
  const patterns = [
    /risk\s*(?:points|score)[:\s]+(\d{1,3})\s*(?:\/\s*100)?/i,
    /(\d{1,3})\s*\/\s*100\s*(?:risk|rug)/i,
    /scored?\s+(\d{1,3})\s*(?:\/\s*100|out of 100|points)/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const score = parseInt(m[1], 10);
      if (score >= 0 && score <= 100) {
        const verdict = score <= 20 ? "CLEAR" : score <= 55 ? "YELLOW_FLAG" : "RED_FLAG";
        return { score, verdict };
      }
    }
  }
  if (/\bCLEAR\b/.test(text)) return { score: 10, verdict: "CLEAR" };
  if (/\bYELLOW[_\s]?FLAG\b/i.test(text)) return { score: 40, verdict: "YELLOW_FLAG" };
  if (/\bRED[_\s]?FLAG\b/i.test(text)) return { score: 75, verdict: "RED_FLAG" };
  return null;
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  CLEAR: {
    bg: "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_85%)]",
    text: "text-risk-low",
    border: "border-[color-mix(in_srgb,var(--color-risk-low),transparent_70%)]",
    icon: "🟢",
  },
  YELLOW_FLAG: {
    bg: "bg-[color-mix(in_srgb,var(--color-risk-moderate),transparent_85%)]",
    text: "text-risk-moderate",
    border: "border-[color-mix(in_srgb,var(--color-risk-moderate),transparent_70%)]",
    icon: "🟡",
  },
  RED_FLAG: {
    bg: "bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_85%)]",
    text: "text-risk-extreme",
    border: "border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_70%)]",
    icon: "🔴",
  },
};

interface AgentResponseCardProps {
  response: AgentResponse;
  agentConfig: AgentConfig;
}

// Fixed streaming component with proper state management
function SmoothStreamingText({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(!isStreaming);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const targetContentRef = useRef(content);

  // Update ref when content changes (not during render)
  useEffect(() => {
    targetContentRef.current = content;
  }, [content]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Handle streaming logic
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const targetText = targetContentRef.current;

    // If not streaming and content exists, show all
    if (!isStreaming) {
      setDisplayedText(targetText);
      setIsComplete(true);
      return;
    }

    // If content is empty, don't start streaming
    if (!targetText) {
      return;
    }

    // Start streaming
    setIsComplete(false);
    let currentIndex = 0;
    const totalLength = targetText.length;

    // If new content is longer than current display, start from current position
    if (displayedText.length > 0 && targetText.startsWith(displayedText)) {
      currentIndex = displayedText.length;
    }

    if (currentIndex >= totalLength) {
      setDisplayedText(targetText);
      setIsComplete(true);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (currentIndex >= totalLength) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setDisplayedText(targetText);
        setIsComplete(true);
        return;
      }

      // Get fresh target in case it changed
      const freshTarget = targetContentRef.current;

      // If target changed completely, restart
      if (freshTarget !== targetText) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setDisplayedText(freshTarget);
        setIsComplete(!isStreaming);
        return;
      }

      const nextIndex = Math.min(currentIndex + 3, totalLength); // Speed up: 3 chars at a time
      const newText = freshTarget.slice(0, nextIndex);
      setDisplayedText(newText);
      currentIndex = nextIndex;
    }, 20); // Faster: 20ms instead of 35ms

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [content, isStreaming]);

  return (
    <span className="whitespace-pre-wrap">
      {displayedText}
      {isStreaming && !isComplete && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-0.5 h-4 ml-0.5 align-middle"
          style={{ backgroundColor: "currentColor" }}
        />
      )}
    </span>
  );
}

function extractKeyFindings(content: string): string[] {
  const findings: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("•") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith("★") ||
      trimmed.startsWith("►")
    ) {
      findings.push(trimmed.replace(/^[•\-★►]\s*/, ""));
    }
  }

  return findings.slice(0, 5);
}

function removeKeyFindings(content: string): string {
  const result = content;
  const lines = result.split("\n");
  const filteredLines = lines.filter(
    (line) =>
      !(
        line.trim().startsWith("•") ||
        line.trim().startsWith("-") ||
        line.trim().startsWith("★") ||
        line.trim().startsWith("►")
      ),
  );
  return filteredLines.join("\n").trim();
}

export function AgentResponseCard({ response, agentConfig }: AgentResponseCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const rugScore = useMemo(() => {
    if (response.agentId !== "THE_WARDEN" || !response.content) return null;
    return parseRugShieldScore(response.content);
  }, [response.agentId, response.content]);

  const isThinking = Boolean(response.isStreaming) && !response.content;
  const isSpeaking = Boolean(response.isStreaming) && Boolean(response.content);
  const isComplete = response.isComplete && !response.isStreaming;

  const formattedCouncilReport = useMemo(() => {
    if (!response.councilReport) return "";
    return formatCouncilReport(response.councilReport, 350);
  }, [response.councilReport]);

  const keyFindings = useMemo(() => {
    if (!response.content) return [];
    return extractKeyFindings(response.content);
  }, [response.content]);

  const deepDive = useMemo(() => {
    if (!response.content) return "";
    const cleaned = removeKeyFindings(response.content);
    return formatDeepDiveAsText(cleaned);
  }, [response.content]);

  const verdictStyle =
    rugScore && VERDICT_STYLES[rugScore.verdict]
      ? VERDICT_STYLES[rugScore.verdict]
      : VERDICT_STYLES.YELLOW_FLAG;

  const statusText = isThinking
    ? "Analyzing..."
    : isSpeaking
      ? "Delivering verdict..."
      : "Complete";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="relative"
    >
      {isSpeaking && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: [0.3, 0.6, 0.3], x: 0 }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-20 rounded-full"
          style={{ backgroundColor: agentConfig.color }}
        />
      )}

      <div
        className={`glass-card overflow-hidden transition-all duration-500 ${
          isSpeaking ? "border-2" : ""
        }`}
        style={{
          borderColor: isSpeaking ? agentConfig.color : undefined,
          boxShadow: isSpeaking
            ? `0 0 40px color-mix(in srgb, ${agentConfig.color}, transparent 85%), 0 8px 32px color-mix(in_srgb, var(--color-bg), black 40%)`
            : undefined,
        }}
      >
        <AnimatePresence mode="wait">
          {response.error ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-5"
            >
              <div className="bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_70%)] rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-risk-extreme shrink-0 mt-0.5" />
                <div>
                  <p className="text-risk-extreme font-medium mb-1">Agent encountered an error</p>
                  <p className="text-[color-mix(in_srgb,var(--color-risk-extreme),transparent_20%)] text-sm whitespace-pre-wrap">
                    {response.error}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : isThinking ? (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${agentConfig.color}, transparent 80%)`,
                    color: agentConfig.color,
                  }}
                >
                  {agentConfig.displayName.charAt(0)}
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="xs:text-base sm:text-lg font-bold"
                      style={{ color: agentConfig.color }}
                    >
                      {agentConfig.displayName}
                    </span>
                    {response.currentIndex && response.totalAgents && (
                      <span className="xs:text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-card-border">
                        {response.currentIndex}/{response.totalAgents}
                      </span>
                    )}
                  </div>
                  <span className="text-text-muted xs:text-xs sm:text-sm">{agentConfig.role}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 py-3 sm:py-4 bg-[color-mix(in_srgb,var(--color-card-border),transparent_70%)] rounded-xl px-3 sm:px-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Brain className="w-5 h-5" style={{ color: agentConfig.color }} />
                </motion.div>
                <motion.span
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="xs:text-xs sm:text-sm font-medium"
                  style={{ color: agentConfig.color }}
                >
                  {agentConfig.displayName} is analyzing your query...
                </motion.span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center xs:text-lg sm:text-xl font-bold"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${agentConfig.color}, transparent 80%)`,
                        color: agentConfig.color,
                      }}
                    >
                      {agentConfig.displayName.charAt(0)}
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="xs:text-base sm:text-lg font-bold"
                          style={{ color: agentConfig.color }}
                        >
                          {agentConfig.displayName}
                        </span>
                        {response.currentIndex && response.totalAgents && (
                          <span className="xs:text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-card-border">
                            {response.currentIndex}/{response.totalAgents}
                          </span>
                        )}
                      </div>
                      <span className="text-text-muted xs:text-xs sm:text-sm">
                        {agentConfig.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isComplete && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1 text-xs text-risk-low"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete
                      </motion.div>
                    )}
                  </div>
                </div>

                {response.councilReport && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`${verdictStyle.bg} ${verdictStyle.border} border rounded-xl p-3 sm:p-4 mb-3 sm:mb-4`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <MessageSquareQuote
                        className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 ${verdictStyle.text}`}
                        style={{ color: agentConfig.color }}
                      />
                      <div className="flex-1">
                        <div
                          className="xs:text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1"
                          style={{ color: agentConfig.color }}
                        >
                          Council Verdict
                        </div>
                        <SmoothStreamingText
                          content={formattedCouncilReport}
                          isStreaming={isSpeaking}
                        />
                        {rugScore && (
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-2">
                            <ShieldCheck
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${verdictStyle.text}`}
                            />
                            <span
                              className={`xs:text-[10px] sm:text-xs font-medium ${verdictStyle.text}`}
                            >
                              Risk Score: {rugScore.score}/100 —{" "}
                              {rugScore.verdict.replace("_", " ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {keyFindings.length > 0 && isComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-3 sm:mb-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        style={{ color: agentConfig.color }}
                      />
                      <span
                        className="xs:text-xs sm:text-sm font-semibold"
                        style={{ color: agentConfig.color }}
                      >
                        Key Findings
                      </span>
                    </div>
                    <ul className="space-y-1 sm:space-y-1.5">
                      {keyFindings.map((finding, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                          className="flex items-start gap-1.5 sm:gap-2 xs:text-xs sm:text-sm text-text-secondary"
                        >
                          <span
                            className="mt-1 w-1 h-1 sm:mt-1.5 sm:w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: agentConfig.color }}
                          />
                          <SmoothStreamingText content={finding} isStreaming={isSpeaking} />
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {deepDive && deepDive.length > 50 && isComplete && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="flex items-center gap-1.5 sm:gap-2 xs:text-xs sm:text-sm text-text-muted hover:text-text-primary transition-colors mb-2"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                      {isExpanded ? "Hide" : "Show"} Deep Dive Analysis
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 border-t border-card-border">
                            <SmoothStreamingText content={deepDive} isStreaming={isSpeaking} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {isSpeaking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 py-1.5 sm:py-2"
                    style={{ color: agentConfig.color }}
                  >
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    <span className="xs:text-[10px] sm:text-xs">{statusText}</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
