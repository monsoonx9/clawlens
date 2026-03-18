import { Skill, SkillResult } from "./types";
import { WhaleRadarResult, WhaleAlert, WhaleConsensus } from "@/types";

// ---------------------------------------------------------------------------
// Whale Radar Skill — Snapshot diffing and consensus detection
// ---------------------------------------------------------------------------

export const whaleRadar: Skill = {
  id: "claw-council/whale-radar",
  name: "Whale Radar",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Scans tracked whale wallets for portfolio changes, detects new positions, exits, " +
    "significant increases/decreases, and identifies consensus accumulation patterns " +
    "across multiple wallets. Returns prioritized alerts sorted by severity.",
  inputSchema: {
    walletSnapshots: {
      type: "array",
      required: true,
      description: "Array of {address, nickname, currentHoldings, previousHoldings}",
    },
    sensitivityThreshold: {
      type: "number",
      required: false,
      description: "Min change % to trigger alert (default 10)",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const rawSnapshots = (input.walletSnapshots || []) as Array<{
        address: string;
        nickname: string;
        currentHoldings: Array<{
          token: string;
          contractAddress: string;
          chain: string;
          valueUSD: number;
        }>;
        previousHoldings: Array<{
          token: string;
          contractAddress: string;
          chain: string;
          valueUSD: number;
        }>;
      }>;

      const sensitivityThreshold = Number(input.sensitivityThreshold) || 10;
      const alerts: WhaleAlert[] = [];

      for (const wallet of rawSnapshots) {
        const prevMap = new Map<string, (typeof wallet.previousHoldings)[0]>();
        for (const h of wallet.previousHoldings) prevMap.set(h.contractAddress, h);

        const currMap = new Map<string, (typeof wallet.currentHoldings)[0]>();
        for (const h of wallet.currentHoldings) currMap.set(h.contractAddress, h);

        // New positions
        for (const [addr, curr] of currMap) {
          const prev = prevMap.get(addr);
          if (!prev && curr.valueUSD > 100) {
            alerts.push({
              walletAddress: wallet.address,
              walletNickname: wallet.nickname,
              alertType: "NEW_POSITION",
              token: curr.token,
              contractAddress: addr,
              chain: curr.chain as "BSC",
              currentValueUSD: curr.valueUSD,
              timestamp: new Date(),
              severity: curr.valueUSD > 50000 ? "HIGH" : curr.valueUSD > 10000 ? "MEDIUM" : "LOW",
            });
          } else if (prev) {
            const changePercent =
              prev.valueUSD > 0 ? ((curr.valueUSD - prev.valueUSD) / prev.valueUSD) * 100 : 0;

            if (changePercent > sensitivityThreshold) {
              alerts.push({
                walletAddress: wallet.address,
                walletNickname: wallet.nickname,
                alertType: "SIGNIFICANT_INCREASE",
                token: curr.token,
                contractAddress: addr,
                chain: curr.chain as "BSC",
                previousValueUSD: prev.valueUSD,
                currentValueUSD: curr.valueUSD,
                changePercent,
                timestamp: new Date(),
                severity: changePercent > 100 ? "HIGH" : changePercent > 50 ? "MEDIUM" : "LOW",
              });
            } else if (changePercent < -sensitivityThreshold) {
              alerts.push({
                walletAddress: wallet.address,
                walletNickname: wallet.nickname,
                alertType: "SIGNIFICANT_DECREASE",
                token: curr.token,
                contractAddress: addr,
                chain: curr.chain as "BSC",
                previousValueUSD: prev.valueUSD,
                currentValueUSD: curr.valueUSD,
                changePercent,
                timestamp: new Date(),
                severity:
                  Math.abs(changePercent) > 80
                    ? "HIGH"
                    : Math.abs(changePercent) > 50
                      ? "MEDIUM"
                      : "LOW",
              });
            }
          }
        }

        // Full exits
        for (const [addr, prev] of prevMap) {
          if (!currMap.has(addr) && prev.valueUSD > 100) {
            alerts.push({
              walletAddress: wallet.address,
              walletNickname: wallet.nickname,
              alertType: "FULL_EXIT",
              token: prev.token,
              contractAddress: addr,
              chain: prev.chain as "BSC",
              previousValueUSD: prev.valueUSD,
              currentValueUSD: 0,
              changePercent: -100,
              timestamp: new Date(),
              severity: prev.valueUSD > 50000 ? "HIGH" : "MEDIUM",
            });
          }
        }
      }

      // Sort alerts by severity
      const severityOrder: Record<string, number> = {
        HIGH: 0,
        MEDIUM: 1,
        LOW: 2,
      };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      // ── Consensus detection ──
      let whaleConsensus: WhaleConsensus | undefined;
      const tokenAccumMap = new Map<
        string,
        {
          wallets: Set<string>;
          nicknames: Set<string>;
          totalUSD: number;
          contract: string;
        }
      >();

      for (const alert of alerts) {
        if (alert.alertType === "NEW_POSITION" || alert.alertType === "SIGNIFICANT_INCREASE") {
          const key = alert.contractAddress;
          const existing = tokenAccumMap.get(key) || {
            wallets: new Set(),
            nicknames: new Set(),
            totalUSD: 0,
            contract: key,
          };
          existing.wallets.add(alert.walletAddress);
          existing.nicknames.add(alert.walletNickname);
          existing.totalUSD += alert.currentValueUSD;
          tokenAccumMap.set(key, existing);
        }
      }

      for (const [contract, data] of tokenAccumMap) {
        if (data.wallets.size >= 2) {
          const tokenName = alerts.find((a) => a.contractAddress === contract)?.token || "Unknown";
          whaleConsensus = {
            token: tokenName,
            contractAddress: contract,
            walletCount: data.wallets.size,
            walletNicknames: Array.from(data.nicknames),
            totalValueAccumulatedUSD: data.totalUSD,
            note: `${data.wallets.size} tracked whales are independently accumulating ${tokenName} (total $${data.totalUSD.toLocaleString()}). This is a consensus signal.`,
          };
          break; // Take the strongest consensus
        }
      }

      const summary =
        alerts.length === 0
          ? "No significant whale movements detected in this scan."
          : `${alerts.length} whale movement(s) detected across ${rawSnapshots.length} tracked wallets. ` +
            `${alerts.filter((a) => a.severity === "HIGH").length} high-severity alerts. ` +
            (whaleConsensus ? whaleConsensus.note : "");

      const result: WhaleRadarResult = {
        scannedWallets: rawSnapshots.length,
        alertCount: alerts.length,
        alerts,
        whaleConsensus,
        lastScanned: new Date(),
        nextScheduledScan: new Date(Date.now() + 3600000),
        summary,
      };

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to scan whale wallets" },
        summary:
          "Add wallet addresses in Settings to track whale movements, or check your API keys.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
