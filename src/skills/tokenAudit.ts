import { Skill, SkillResult } from "./types";
import { getTokenAudit, ChainId, TokenAudit } from "@/lib/binanceWeb3Client";

export interface BinanceTokenAuditResult {
  contractAddress: string;
  chainId: string;
  audit: {
    hasResult: boolean;
    isSupported: boolean;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
    riskScore: number;
    buyTax: string | null;
    sellTax: string | null;
    isVerified: boolean;
  };
  riskChecks: Array<{
    category: string;
    checks: Array<{
      title: string;
      description: string;
      isRisky: boolean;
      severity: "RISK" | "CAUTION";
    }>;
  }>;
  summary: string;
  recommendation: string;
}

function getRiskLevel(level: number): "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN" {
  if (level <= 1) return "LOW";
  if (level <= 3) return "MEDIUM";
  if (level >= 4) return "HIGH";
  return "UNKNOWN";
}

function getRecommendation(
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN",
  buyTax: string | null,
  sellTax: string | null,
): string {
  const buyTaxNum = parseFloat(buyTax || "0");
  const sellTaxNum = parseFloat(sellTax || "0");

  if (riskLevel === "HIGH" || sellTaxNum > 20) {
    return "AVOID - High risk detected. Do not trade this token.";
  }
  if (riskLevel === "MEDIUM" || buyTaxNum > 10 || sellTaxNum > 10) {
    return "CAUTION - Moderate risk. If trading, use small position and tight stops.";
  }
  if (buyTaxNum > 5 || sellTaxNum > 5) {
    return "WARNING - Notable trading tax detected. Factor into entry/exit.";
  }
  return "Proceed with normal caution. Always DYOR.";
}

export const tokenAudit: Skill = {
  id: "binance/query-token-audit",
  name: "Token Audit",
  namespace: "binance",
  version: "1.4.0",
  description:
    "Official Binance token security audit. Detects honeypots, scams, and malicious contracts. Returns risk level, trading taxes, and detailed security checks. Use before trading any token.",
  inputSchema: {
    contractAddress: {
      type: "string",
      required: true,
      description: "Token contract address to audit",
    },
    chain: {
      type: "string",
      required: false,
      description: "Blockchain: bsc, base, solana, ethereum",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const contractAddress = String(input.contractAddress || "").trim();
      const chain = String(input.chain || "bsc").toLowerCase();

      if (!contractAddress) {
        return {
          success: false,
          data: {},
          summary: "No contract address provided.",
          error: "contractAddress is required",
        };
      }

      const chainIdMap: Record<string, ChainId> = {
        bsc: "56",
        base: "8453",
        solana: "CT_501",
        ethereum: "1",
      };
      const chainId = chainIdMap[chain] || "56";

      const audit = await getTokenAudit(chainId, contractAddress);

      if (!audit.hasResult || !audit.isSupported) {
        return {
          success: true,
          data: {
            contractAddress,
            chainId,
            audit: {
              hasResult: audit.hasResult,
              isSupported: audit.isSupported,
              riskLevel: "UNKNOWN",
              riskScore: 0,
              buyTax: null,
              sellTax: null,
              isVerified: false,
            },
            riskChecks: [],
            summary: "Audit data not available for this token.",
            recommendation: "Unable to verify - audit not available. Exercise extreme caution.",
          } as unknown as Record<string, unknown>,
          summary: `⚠️ Audit unavailable for ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)} on ${chain}`,
        };
      }

      const riskLevel = getRiskLevel(audit.riskLevel);

      const riskChecks = audit.riskItems.map((item) => ({
        category: item.id,
        checks: item.details.map((d) => ({
          title: d.title,
          description: d.description,
          isRisky: d.isHit,
          severity: d.riskType,
        })),
      }));

      const result: BinanceTokenAuditResult = {
        contractAddress,
        chainId,
        audit: {
          hasResult: audit.hasResult,
          isSupported: audit.isSupported,
          riskLevel,
          riskScore: audit.riskLevel,
          buyTax: audit.extraInfo.buyTax,
          sellTax: audit.extraInfo.sellTax,
          isVerified: audit.extraInfo.isVerified,
        },
        riskChecks,
        summary: `${riskLevel} RISK (${audit.riskLevel}/5). Tax: Buy ${audit.extraInfo.buyTax || "?"}%, Sell ${audit.extraInfo.sellTax || "?"}%.`,
        recommendation: getRecommendation(
          riskLevel,
          audit.extraInfo.buyTax,
          audit.extraInfo.sellTax,
        ),
      };

      const emoji = riskLevel === "HIGH" ? "🔴" : riskLevel === "MEDIUM" ? "🟡" : "🟢";
      const summary =
        `${emoji} AUDIT: ${riskLevel} RISK for ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}. ` +
        `Tax: ${audit.extraInfo.buyTax || "?"}%/${audit.extraInfo.sellTax || "?"}%. ` +
        result.recommendation;

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: false,
        data: { status: "unavailable", message: "Unable to perform token audit" },
        summary: "Token audit unavailable. Check your API keys or verify the contract address.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
