import { Skill, SkillContext, SkillResult } from "./types";

interface VerdictSynthesizerInput {
  query: string;
  consensusType: string;
  consensusAgreement: number;
  consensusDirection?: string;
  agentCount: number;
  dissentingAgents: string[];
  riskMentions: string[];
}

interface RiskAssessment {
  level: "LOW" | "MODERATE" | "HIGH" | "EXTREME";
  factors: string[];
  recommendation: string;
}

const RISK_INDICATORS = {
  LOW: ["safe", "clear", "low risk", "stable", "established", "verified"],
  MODERATE: ["moderate", "reasonable", "caution", "careful", "some risk"],
  HIGH: ["high risk", "volatile", "uncertain", "speculative", "new token"],
  EXTREME: ["extreme", "danger", "honeypot", "scam", "rug", "avoid", "ponzi"],
};

function assessRiskLevel(reports: string[]): RiskAssessment {
  const allText = reports.join(" ").toLowerCase();

  const extremeCount = RISK_INDICATORS.EXTREME.filter((w) => allText.includes(w)).length;
  const highCount = RISK_INDICATORS.HIGH.filter((w) => allText.includes(w)).length;
  const moderateCount = RISK_INDICATORS.MODERATE.filter((w) => allText.includes(w)).length;
  const lowCount = RISK_INDICATORS.LOW.filter((w) => allText.includes(w)).length;

  const factors: string[] = [];
  if (extremeCount > 0) factors.push("Extreme risk indicators detected");
  if (highCount > 0) factors.push("High risk indicators present");
  if (moderateCount > 0) factors.push("Moderate risk factors noted");
  if (lowCount > 0) factors.push("Low risk / safety factors present");

  if (extremeCount >= 2) {
    return {
      level: "EXTREME",
      factors,
      recommendation: "AVOID - Multiple extreme risk indicators",
    };
  }
  if (extremeCount >= 1 && highCount >= 1) {
    return { level: "EXTREME", factors, recommendation: "AVOID - Critical risk concerns" };
  }
  if (highCount >= 2) {
    return {
      level: "HIGH",
      factors,
      recommendation: "CAUTION - High risk, require more due diligence",
    };
  }
  if (highCount >= 1 || extremeCount >= 1) {
    return { level: "HIGH", factors, recommendation: "CAUTION - Elevated risk detected" };
  }
  if (moderateCount >= 2) {
    return {
      level: "MODERATE",
      factors,
      recommendation: "REASONABLE - Some risk, proceed carefully",
    };
  }
  if (moderateCount >= 1) {
    return { level: "MODERATE", factors, recommendation: "ACCEPTABLE - Reasonable risk level" };
  }
  if (lowCount >= 1) {
    return { level: "LOW", factors, recommendation: "SAFE - Low risk indicators" };
  }

  return {
    level: "MODERATE",
    factors: ["No specific risk indicators found"],
    recommendation: "DEFAULT - Proceed with standard caution",
  };
}

function determineConfidence(
  consensusType: string,
  consensusAgreement: number,
  reportLengths: number[],
): number {
  let confidence = 50;

  if (consensusType === "unanimous") {
    confidence += 30;
  } else if (consensusType === "majority") {
    confidence += 15;
  } else if (consensusType === "split") {
    confidence -= 10;
  }

  const agreementBonus = Math.round(consensusAgreement * 0.2);
  confidence += agreementBonus;

  const avgLength = reportLengths.reduce((a, b) => a + b, 0) / reportLengths.length;
  if (avgLength > 200) confidence += 10;
  if (avgLength > 500) confidence += 10;

  return Math.max(10, Math.min(95, confidence));
}

function generateVerdictTemplate(
  consensusType: string,
  consensusDirection: string | undefined,
  riskLevel: string,
  dissentingAgents: string[],
): {
  consensusTemplate: string;
  riskLevelTemplate: string;
  dissentHandling: string;
  watchThis: string;
} {
  const consensusTemplate =
    consensusType === "unanimous"
      ? "All agents agree: "
      : consensusType === "majority"
        ? `Majority (${consensusDirection}) agree: `
        : "Council is divided: ";

  const riskLevelTemplate =
    riskLevel === "LOW"
      ? "Risk level is LOW - this appears relatively safe"
      : riskLevel === "MODERATE"
        ? "Risk level is MODERATE - acceptable with standard precautions"
        : riskLevel === "HIGH"
          ? "Risk level is HIGH - caution advised, do your own research"
          : "Risk level is EXTREME - recommend avoiding this";

  const dissentHandling =
    dissentingAgents.length > 0
      ? `Note: ${dissentingAgents.join(", ")} had dissenting views. Consider their concerns: `
      : "";

  const watchThis =
    riskLevel === "EXTREME" || riskLevel === "HIGH"
      ? "Watch for red flags: sudden price movements, volume spikes, or negative news"
      : riskLevel === "MODERATE"
        ? "Watch for changing market conditions and sentiment shifts"
        : "Watch for confirmation of the bullish/bearish case";

  return { consensusTemplate, riskLevelTemplate, dissentHandling, watchThis };
}

export const verdictSynthesizer: Skill = {
  id: "claw-council/verdict-synthesizer",
  name: "Verdict Synthesizer",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Provides synthesis framework and guidelines for THE_ARBITER. " +
    "Analyzes consensus, assesses risk levels, and generates a structured template for the final verdict. " +
    "Ensures consistent, well-reasoned verdicts that properly account for agreement, disagreement, and risk.",
  inputSchema: {
    query: {
      type: "string",
      required: true,
      description: "The original user query",
    },
    consensusType: {
      type: "string",
      required: true,
      description: "Type of consensus: unanimous, majority, split, or insufficient",
    },
    consensusAgreement: {
      type: "number",
      required: true,
      description: "Agreement percentage (0-100)",
    },
    consensusDirection: {
      type: "string",
      required: false,
      description: "Direction of consensus: positive or negative",
    },
    agentCount: {
      type: "number",
      required: true,
      description: "Number of agents in the council",
    },
    dissentingAgents: {
      type: "array",
      required: true,
      description: "Array of agent IDs who dissented",
    },
    riskMentions: {
      type: "array",
      required: false,
      description: "Array of risk-related keywords found in reports",
    },
  },
  async execute(input: Record<string, unknown>, _context: SkillContext): Promise<SkillResult> {
    try {
      const query = input.query as string | undefined;
      const consensusType = input.consensusType as string | undefined;
      const consensusAgreement = input.consensusAgreement as number | undefined;
      const consensusDirection = input.consensusDirection as string | undefined;
      const agentCount = input.agentCount as number | undefined;
      const dissentingAgents = input.dissentingAgents as string[] | undefined;

      if (
        !query ||
        !consensusType ||
        consensusAgreement === undefined ||
        !agentCount ||
        !dissentingAgents
      ) {
        return {
          success: false,
          data: {},
          summary: "Missing required parameters",
          error:
            "query, consensusType, consensusAgreement, agentCount, and dissentingAgents are required",
        };
      }

      const riskAssessment: RiskAssessment = {
        level: "MODERATE",
        factors: [],
        recommendation: "DEFAULT - Proceed with standard caution",
      };

      const confidence = determineConfidence(consensusType, consensusAgreement, []);
      const templates = generateVerdictTemplate(
        consensusType,
        consensusDirection,
        riskAssessment.level,
        dissentingAgents,
      );

      const synthesisGuidelines = {
        structure: {
          consensus: "1-2 sentences on what agents agreed on",
          dissentingVoices: "Array of dissenting agent views with positions and reasons",
          riskLevel: "LOW, MODERATE, HIGH, or EXTREME",
          finalVerdict: "2-4 sentences with specific recommendation",
          confidence: "0-100",
          watchThis: "One specific thing to watch",
        },
        handling: {
          unanimous: "When unanimous: State the clear agreement confidently. High confidence.",
          majority: "When majority: Acknowledge the majority view but note dissenting concerns.",
          split: "When split: Present both sides fairly. Moderate confidence. Let user decide.",
          insufficient: "When insufficient: Default to cautious recommendation.",
        },
        tone: {
          low: "Confident and reassuring",
          moderate: "Balanced and helpful",
          high: "Cautious and clear about risks",
          extreme: "Strong warning, clear avoidance recommendation",
        },
      };

      return {
        success: true,
        data: {
          riskAssessment,
          confidence,
          templates,
          synthesisGuidelines,
          agentCount,
          consensusType,
          consensusAgreement,
          consensusDirection,
          dissentingAgents,
        },
        summary: `Verdict synthesizer ready. Risk: ${riskAssessment.level}, Confidence: ${confidence}%. Template: ${templates.consensusTemplate.substring(0, 50)}...`,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to generate verdict synthesis" },
        summary: "Verdict synthesis unavailable. Try again later.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
