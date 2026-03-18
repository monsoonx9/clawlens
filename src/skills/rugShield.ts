import { Skill, SkillResult } from "./types";
import {
  RugShieldResult,
  RugShieldRiskFactor,
  RugShieldSafetyFactor,
  CreatorProfile,
} from "@/types";

// ---------------------------------------------------------------------------
// Rug Shield Skill — 6-source audit with creator wallet profiling
// ---------------------------------------------------------------------------

type Verdict = "CLEAR" | "YELLOW_FLAG" | "RED_FLAG" | "UNKNOWN";

interface AuditInput {
  honeypotRisk: boolean;
  top10HolderPercent: number;
  liquidityUSD: number;
  holderCount: number;
  permissionFlags: string[];
  isOnMemeRush: boolean;
  smartMoneyBuying: boolean;
  mintable?: boolean;
  mintAuthorityRenounced?: boolean;
  pausable?: boolean;
  creatorAddress?: string;
  creatorPreviousDeployments?: number;
  creatorAvgLiquidity?: number;
  ageHours?: number;
  listedOnBinance?: boolean;
  inBinanceAlpha?: boolean;
  auditDataAvailable?: boolean;
}

function mapScoreToVerdict(score: number): {
  verdict: Verdict;
  color: string;
  emoji: string;
} {
  if (score <= 20) return { verdict: "CLEAR", color: "var(--color-risk-low)", emoji: "✅" };
  if (score <= 55)
    return { verdict: "YELLOW_FLAG", color: "var(--color-risk-moderate)", emoji: "⚠️" };
  return { verdict: "RED_FLAG", color: "var(--color-risk-extreme)", emoji: "🚩" };
}

export const rugShield: Skill = {
  id: "claw-council/rug-shield",
  name: "Rug Shield",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Comprehensive token security audit with 6-source risk assessment. Scores a " +
    "contract across honeypot detection, holder concentration, liquidity depth, " +
    "permission flags, freshness, smart money presence, mintability, and creator " +
    "wallet history. Produces a CLEAR/YELLOW/RED verdict with actionable explanation.",
  inputSchema: {
    contractAddress: {
      type: "string",
      required: true,
      description: "Token contract address",
    },
    chain: { type: "string", required: true, description: "Blockchain chain" },
    auditData: {
      type: "object",
      required: true,
      description: "Pre-fetched audit data",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const contractAddress = String(input.contractAddress || "");
      const chain = String(input.chain || "ETH");
      const auditData = input.auditData as AuditInput | null;
      const auditDataAvailable = input.auditDataAvailable !== false;

      if (!contractAddress) {
        return {
          success: false,
          data: {},
          summary: "No contract address provided.",
          error: "contractAddress is required",
        };
      }

      if (!auditDataAvailable || auditData === null) {
        const result: RugShieldResult = {
          contractAddress,
          chain: chain as "BSC",
          verdict: "UNKNOWN",
          riskPoints: -1,
          confidence: 0,
          criticalFlags: [],
          riskFactors: [],
          safetyFactors: [],
          creatorProfile: {
            address: "Unknown",
            previousDeploymentCount: 0,
            avgLiquidityUSDOfPrevious: 0,
            verdict: "Clean",
            reason: "No audit data available for analysis.",
          },
          tokenMetrics: {
            liquidityUSD: 0,
            holderCount: 0,
            top10HolderPercent: 0,
            ageHours: 0,
            listedOnBinance: false,
            inBinanceAlpha: false,
          },
          verdictExplanation:
            "Audit data could not be retrieved for this contract. Manual verification is strongly recommended before investing. Do not rely on this report.",
          actionRecommendation:
            "Cannot assess risk without audit data. Perform your own due diligence before investing.",
        };
        const summary =
          "⚠️ Rug Shield: UNKNOWN - Audit data unavailable. Manual verification strongly recommended.";
        return {
          success: true,
          data: result as unknown as Record<string, unknown>,
          summary,
        };
      }

      const shortAddress = `${contractAddress.slice(0, 6)}…${contractAddress.slice(-4)}`;
      let riskPoints = 0;
      const criticalFlags: string[] = [];
      const riskFactors: RugShieldRiskFactor[] = [];
      const safetyFactors: RugShieldSafetyFactor[] = [];

      // ── Risk Factor 1: Honeypot (+35) ──
      if (auditData.honeypotRisk) {
        riskPoints += 35;
        criticalFlags.push("HONEYPOT_DETECTED");
        riskFactors.push({
          category: "Honeypot",
          description: "Token has honeypot characteristics — you may be unable to sell.",
          points: 35,
          severity: "CRITICAL",
        });
      }

      // ── Risk Factor 2: Concentration (+20) ──
      const holderConcentration = auditData.top10HolderPercent || 0;
      if (holderConcentration > 60) {
        riskPoints += 20;
        criticalFlags.push("EXTREME_CONCENTRATION");
        riskFactors.push({
          category: "Concentration",
          description: `Top 10 holders control ${holderConcentration}% of supply — extreme dump risk.`,
          points: 20,
          severity: "CRITICAL",
        });
      } else if (holderConcentration > 40) {
        riskPoints += 12;
        riskFactors.push({
          category: "Concentration",
          description: `Top 10 holders control ${holderConcentration}% of supply — moderate concentration.`,
          points: 12,
          severity: "MEDIUM",
        });
      }

      // ── Risk Factor 3: Liquidity (+15) ──
      const liquidity = auditData.liquidityUSD || 0;
      if (liquidity < 10000) {
        riskPoints += 15;
        criticalFlags.push("MICRO_LIQUIDITY");
        riskFactors.push({
          category: "Liquidity",
          description: `Only $${liquidity.toLocaleString()} liquidity — cannot exit without massive slippage.`,
          points: 15,
          severity: "HIGH",
        });
      } else if (liquidity < 100000) {
        riskPoints += 8;
        riskFactors.push({
          category: "Liquidity",
          description: `Liquidity $${liquidity.toLocaleString()} — thin for meaningful positions.`,
          points: 8,
          severity: "MEDIUM",
        });
      }

      // ── Risk Factor 4: Holder count (+10) ──
      const holders = auditData.holderCount || 0;
      if (holders < 100) {
        riskPoints += 10;
        riskFactors.push({
          category: "Holder Count",
          description: `Only ${holders} holders — extremely thin market. Could be wash trading.`,
          points: 10,
          severity: "HIGH",
        });
      } else if (holders < 500) {
        riskPoints += 5;
        riskFactors.push({
          category: "Holder Count",
          description: `${holders} holders — still very early and thin.`,
          points: 5,
          severity: "MEDIUM",
        });
      }

      // ── Risk Factor 5: Permissions (+25) ──
      const perms = auditData.permissionFlags || [];
      if (perms.length > 0) {
        const permPoints = Math.min(25, perms.length * 8);
        riskPoints += permPoints;
        if (perms.length >= 3) criticalFlags.push("MULTIPLE_DANGEROUS_PERMISSIONS");
        riskFactors.push({
          category: "Permissions",
          description: `Dangerous contract permissions: ${perms.join(", ")}.`,
          points: permPoints,
          severity: perms.length >= 3 ? "CRITICAL" : "HIGH",
        });
      }

      // ── Risk Factor 6: Mintability (+15) ──
      if (auditData.mintable && !auditData.mintAuthorityRenounced) {
        riskPoints += 15;
        criticalFlags.push("UNRENOUNCED_MINT");
        riskFactors.push({
          category: "Mintability",
          description: "Token supply can be inflated — mint authority NOT renounced.",
          points: 15,
          severity: "CRITICAL",
        });
      }

      // ── Risk Factor 7: Pausable (+10) ──
      if (auditData.pausable) {
        riskPoints += 10;
        riskFactors.push({
          category: "Pausable",
          description: "Contract can be paused by owner — transfers can be frozen.",
          points: 10,
          severity: "HIGH",
        });
      }

      // ── Risk Factor 8: Freshness (+10) ──
      if (auditData.isOnMemeRush) {
        riskPoints += 10;
        riskFactors.push({
          category: "Freshness",
          description: "Token on meme-rush (newly launched) — higher pump-and-dump risk.",
          points: 10,
          severity: "MEDIUM",
        });
      }

      // ── Safety Factor 1: Smart money buying (-10) ──
      if (auditData.smartMoneyBuying) {
        riskPoints -= 10;
        safetyFactors.push({
          category: "Smart Money",
          description: "Smart money wallets are actively buying — reduces rug concern.",
          points: -10,
        });
      }

      // ── Safety Factor 2: Listed on Binance (-15) ──
      if (auditData.listedOnBinance) {
        riskPoints -= 15;
        safetyFactors.push({
          category: "Binance Listed",
          description: "Token is listed on Binance — passed their due diligence process.",
          points: -15,
        });
      }

      // ── Safety Factor 3: High holder count (-5) ──
      if (holders > 10000) {
        riskPoints -= 5;
        safetyFactors.push({
          category: "Wide Distribution",
          description: `${holders.toLocaleString()} holders — well distributed token.`,
          points: -5,
        });
      }

      // ── Creator Profile ──
      const creatorAddress = auditData.creatorAddress || "Unknown";
      const prevDeployments = auditData.creatorPreviousDeployments || 0;
      const avgLiq = auditData.creatorAvgLiquidity || 0;
      let creatorVerdict: CreatorProfile["verdict"] = "Clean";
      let creatorReason = "No previous suspicious activity detected.";

      if (prevDeployments > 5 && avgLiq < 50000) {
        creatorVerdict = "Suspicious";
        creatorReason = `Creator has deployed ${prevDeployments} contracts with avg liquidity <$50k — serial deployer pattern.`;
        riskPoints += 10;
        riskFactors.push({
          category: "Creator History",
          description: creatorReason,
          points: 10,
          severity: "HIGH",
        });
      } else if (prevDeployments > 10 && avgLiq < 20000) {
        creatorVerdict = "Known Rugger";
        creatorReason = `Creator deployed ${prevDeployments}+ low-liquidity contracts — strong rug-pull history.`;
        riskPoints += 20;
        criticalFlags.push("KNOWN_RUGGER_CREATOR");
        riskFactors.push({
          category: "Creator History",
          description: creatorReason,
          points: 20,
          severity: "CRITICAL",
        });
      }

      const creatorProfile: CreatorProfile = {
        address: creatorAddress,
        previousDeploymentCount: prevDeployments,
        avgLiquidityUSDOfPrevious: avgLiq,
        verdict: creatorVerdict,
        reason: creatorReason,
      };

      // ── Final Score ──
      const clampedScore = Math.max(0, Math.min(100, riskPoints));
      const { verdict, emoji } = mapScoreToVerdict(clampedScore);
      const confidence = Math.min(100, 40 + riskFactors.length * 8 + safetyFactors.length * 5);

      let verdictExplanation: string;
      let actionRecommendation: string;

      if (verdict === "CLEAR") {
        verdictExplanation = `Token ${shortAddress} on ${chain} passed audit screening with a risk score of ${clampedScore}/100. No critical red flags detected.`;
        actionRecommendation =
          "Proceed with normal position sizing. This does not guarantee safety — always use stop losses.";
      } else if (verdict === "YELLOW_FLAG") {
        verdictExplanation = `Token ${shortAddress} on ${chain} shows moderate warning signs (${clampedScore}/100). ${criticalFlags.length} critical flag(s).`;
        actionRecommendation =
          "Proceed with extreme caution. Use small position size (<2% of portfolio). Set tight stop-losses.";
      } else {
        verdictExplanation = `Token ${shortAddress} on ${chain} has CRITICAL red flags (${clampedScore}/100). ${criticalFlags.join(", ")}.`;
        actionRecommendation =
          "THE WARDEN STRONGLY RECOMMENDS AVOIDING THIS TOKEN. Multiple critical risk indicators triggered.";
      }

      const result: RugShieldResult = {
        contractAddress,
        chain: chain as "BSC",
        verdict,
        riskPoints: clampedScore,
        confidence,
        criticalFlags,
        riskFactors,
        safetyFactors,
        creatorProfile,
        tokenMetrics: {
          liquidityUSD: liquidity,
          holderCount: holders,
          top10HolderPercent: holderConcentration,
          ageHours: auditData.ageHours || 0,
          listedOnBinance: auditData.listedOnBinance || false,
          inBinanceAlpha: auditData.inBinanceAlpha || false,
        },
        verdictExplanation,
        actionRecommendation,
      };

      const summary = `${emoji} Rug Shield: ${verdict} (${clampedScore}/100). ${riskFactors.length} risk factors, ${safetyFactors.length} safety factors. ${verdictExplanation}`;
      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: false,
        data: { status: "unavailable", message: "Unable to audit token contract" },
        summary:
          "Rug shield audit unavailable. Check your API keys or verify the contract address.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
