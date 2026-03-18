import { Skill, SkillContext, SkillResult } from "./types";

interface CouncilAnalyzerInput {
  agentReports: string[];
  agentNames: string[];
  query: string;
}

interface AgentReportAnalysis {
  agentId: string;
  role: string;
  hasData: boolean;
  hasRecommendation: boolean;
  dataDomains: string[];
}

const AGENT_ROLES: Record<string, string> = {
  SCOUT: "Market Discovery",
  THE_WARDEN: "Risk & Security",
  LENS: "Token Intelligence",
  SHADOW: "Smart Money Tracker",
  LEDGER: "Portfolio Manager",
  PULSE: "Sentiment Analyst",
  SAGE: "Education & Guidance",
  QUILL: "Trade Historian",
};

const ROLE_DATA_DOMAINS: Record<string, string[]> = {
  SCOUT: ["market-data", "trending", "momentum", "news"],
  THE_WARDEN: ["security", "risk-assessment", "audit", "contract-analysis"],
  LENS: ["technical-analysis", "price-data", "order-book", "on-chain-data"],
  SHADOW: ["whale-activity", "smart-money", "wallet-tracking", "accumulation"],
  LEDGER: ["portfolio", "allocation", "dca", "performance"],
  PULSE: ["sentiment", "fear-greed", "narrative", "social"],
  SAGE: ["education", "explanation", "guidance"],
  QUILL: ["trading-history", "patterns", "performance"],
};

function identifyDataDomains(report: string, agentId: string): string[] {
  const domains: string[] = [];
  const lower = report.toLowerCase();

  if (lower.includes("price") || lower.includes("$") || lower.includes("%")) {
    domains.push("price");
  }
  if (lower.includes("whale") || lower.includes("smart money") || lower.includes("wallet")) {
    domains.push("whale-data");
  }
  if (lower.includes("risk") || lower.includes("security") || lower.includes("audit")) {
    domains.push("risk-data");
  }
  if (lower.includes("volume") || lower.includes("liquidity") || lower.includes("order book")) {
    domains.push("liquidity-data");
  }
  if (
    lower.includes("sentiment") ||
    lower.includes("fear") ||
    lower.includes("greed") ||
    lower.includes("news")
  ) {
    domains.push("sentiment-data");
  }
  if (
    lower.includes("technical") ||
    lower.includes("rsi") ||
    lower.includes("macd") ||
    lower.includes("chart")
  ) {
    domains.push("technical-data");
  }
  if (lower.includes("portfolio") || lower.includes("allocation") || lower.includes("pnl")) {
    domains.push("portfolio-data");
  }

  return domains.length > 0 ? domains : ["general"];
}

export const councilAnalyzer: Skill = {
  id: "claw-council/council-analyzer",
  name: "Council Analyzer",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Analyzes the council's agent reports to understand their structure, roles, and data domains. " +
    "Provides insights into which agents responded, their focus areas, and what data they provided. " +
    "Helps THE_ARBITER understand the council composition before synthesizing.",
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
    query: {
      type: "string",
      required: true,
      description: "The original user query that was posed to the council",
    },
  },
  async execute(input: Record<string, unknown>, _context: SkillContext): Promise<SkillResult> {
    try {
      const agentReports = input.agentReports as string[] | undefined;
      const agentNames = input.agentNames as string[] | undefined;
      const query = input.query as string | undefined;

      if (!agentReports || !agentNames || !query) {
        return {
          success: false,
          data: {},
          summary: "Missing required parameters for council analysis",
          error: "agentReports, agentNames, and query are required",
        };
      }

      const analyses: AgentReportAnalysis[] = agentNames.map((agentId: string, index: number) => {
        const report = agentReports[index] || "";
        return {
          agentId,
          role: AGENT_ROLES[agentId] || "Unknown",
          hasData: report.length > 50,
          hasRecommendation: /\b(recommend|suggest|buy|sell|avoid|do|don't)\b/i.test(report),
          dataDomains: identifyDataDomains(report, agentId),
        };
      });

      const totalAgents = agentNames.length;
      const agentsWithData = analyses.filter((a) => a.hasData).length;
      const agentsWithRecommendations = analyses.filter((a) => a.hasRecommendation).length;

      const allDataDomains = new Set<string>();
      analyses.forEach((a) => a.dataDomains.forEach((d) => allDataDomains.add(d)));
      const dataCoverage = Array.from(allDataDomains);

      return {
        success: true,
        data: {
          analyses,
          summaryStats: {
            totalAgents,
            agentsWithData,
            agentsWithRecommendations,
            coveragePercentage: Math.round((agentsWithData / totalAgents) * 100),
          },
          query,
          dataCoverage,
        },
        summary: `Council analyzer: ${totalAgents} agents responded. ${agentsWithRecommendations} gave recommendations. Data domains: ${dataCoverage.join(", ")}`,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to analyze council reports" },
        summary: "Council analysis unavailable. Try again later.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
