import { Skill, SkillContext, SkillResult } from "./types";

interface ConsensusInput {
  agentReports: string[];
  agentNames: string[];
}

interface AgentPosition {
  agentId: string;
  position: string;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  keyPoint: string;
  confidence: number;
}

const SENTIMENT_KEYWORDS = {
  positive: [
    "buy",
    "bullish",
    "positive",
    "good",
    "safe",
    "recommend",
    "opportunity",
    "gain",
    "profit",
    "上涨",
    "bull",
    "accumulate",
    "long",
    "enter",
    "add",
  ],
  negative: [
    "sell",
    "bearish",
    "negative",
    "bad",
    "risky",
    "avoid",
    "danger",
    "loss",
    "short",
    "exit",
    "drop",
    "red flag",
    "honeypot",
    "scam",
    "rug",
  ],
  neutral: ["neutral", "unclear", "depends", "may", "could", "might", "uncertain"],
};

function extractSentiment(report: string): "positive" | "negative" | "neutral" | "mixed" {
  const lower = report.toLowerCase();

  const positiveCount = SENTIMENT_KEYWORDS.positive.filter((w) => lower.includes(w)).length;
  const negativeCount = SENTIMENT_KEYWORDS.negative.filter((w) => lower.includes(w)).length;

  if (positiveCount > 0 && negativeCount > 0) return "mixed";
  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

function extractKeyPoint(report: string): string {
  const sentences = report.split(/[.!?]/).filter((s) => s.trim().length > 10);

  for (const sentence of sentences) {
    if (/\b(recommend|suggest|conclusion|verdict|recommendation)\b/i.test(sentence)) {
      return sentence.trim().substring(0, 150);
    }
  }

  return sentences[0]?.trim().substring(0, 150) || report.substring(0, 150);
}

function calculateConfidence(report: string): number {
  const hasSpecificData = /\$[\d,.]+|%\d+\.?\d*|\d+[bx]?/i.test(report);
  const hasRecommendation = /\b(recommend|suggest|buy|sell|avoid|do|don't)\b/i.test(report);
  const hasReasoning = /\b(because|since|therefore|due to|as a result)\b/i.test(report);

  let confidence = 50;
  if (hasSpecificData) confidence += 20;
  if (hasRecommendation) confidence += 15;
  if (hasReasoning) confidence += 15;

  return Math.min(confidence, 100);
}

function calculateConsensus(positions: AgentPosition[]): {
  type: "unanimous" | "majority" | "split" | "insufficient";
  agreement: number;
  consensusDirection?: "positive" | "negative";
  dissentingAgents: string[];
} {
  if (positions.length < 2) {
    return { type: "insufficient", agreement: 0, dissentingAgents: [] };
  }

  const sentiments = positions.map((p) => p.sentiment);
  const positiveCount = sentiments.filter((s) => s === "positive").length;
  const negativeCount = sentiments.filter((s) => s === "negative").length;
  const total = positions.length;

  const agreement = Math.max(positiveCount, negativeCount) / total;

  if (agreement === 1) {
    return {
      type: "unanimous",
      agreement: 100,
      consensusDirection: positiveCount > negativeCount ? "positive" : "negative",
      dissentingAgents: [],
    };
  }

  if (agreement >= 0.6) {
    return {
      type: "majority",
      agreement: Math.round(agreement * 100),
      consensusDirection: positiveCount > negativeCount ? "positive" : "negative",
      dissentingAgents: positions
        .filter((p) => p.sentiment !== (positiveCount > negativeCount ? "positive" : "negative"))
        .map((p) => p.agentId),
    };
  }

  return {
    type: "split",
    agreement: Math.round(agreement * 100),
    dissentingAgents: positions.map((p) => p.agentId),
  };
}

export const consensusDetector: Skill = {
  id: "claw-council/consensus-detector",
  name: "Consensus Detector",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Analyzes agent reports to detect consensus, disagreement, and conflict. " +
    "Identifies agreement levels, key points of contention, and which agents disagree. " +
    "Helps THE_ARBITER understand the council's alignment before making a final verdict.",
  inputSchema: {
    agentReports: {
      type: "array",
      required: true,
      description: "Array of agent report strings from the council",
    },
    agentNames: {
      type: "array",
      required: true,
      description: "Array of agent IDs who submitted reports (e.g., ['SCOUT', 'THE_WARDEN'])",
    },
  },
  async execute(input: Record<string, unknown>, _context: SkillContext): Promise<SkillResult> {
    try {
      const agentReports = input.agentReports as string[] | undefined;
      const agentNames = input.agentNames as string[] | undefined;

      if (!agentReports || !agentNames) {
        return {
          success: false,
          data: {},
          summary: "Missing required parameters",
          error: "agentReports and agentNames are required",
        };
      }

      const positions: AgentPosition[] = agentNames.map((agentId: string, index: number) => {
        const report = agentReports[index] || "";
        return {
          agentId,
          position: report.substring(0, 500),
          sentiment: extractSentiment(report),
          keyPoint: extractKeyPoint(report),
          confidence: calculateConfidence(report),
        };
      });

      const consensus = calculateConsensus(positions);

      const keyPointsOfContention: string[] = [];
      if (consensus.type === "split" || consensus.type === "majority") {
        const positiveAgents = positions
          .filter((p) => p.sentiment === "positive")
          .map((p) => p.keyPoint)
          .slice(0, 2);
        const negativeAgents = positions
          .filter((p) => p.sentiment === "negative")
          .map((p) => p.keyPoint)
          .slice(0, 2);
        keyPointsOfContention.push(...positiveAgents, ...negativeAgents);
      }

      return {
        success: true,
        data: {
          positions,
          consensus,
          keyPointsOfContention,
          totalAgents: agentNames.length,
        },
        summary: `Consensus: ${consensus.type} (${consensus.agreement}% agreement). ${consensus.dissentingAgents.length} dissenting agents.`,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to detect consensus" },
        summary: "Consensus detection unavailable. Try again later.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
