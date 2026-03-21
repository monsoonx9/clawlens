import { Skill, SkillResult } from "../types";
import { getNativeBalance, getChainInfo, BSCNetwork } from "@/lib/bscClient";

const WHALE_THRESHOLD_BNB = 100;

export const bscWhaleMovement: Skill = {
  id: "bsc/bsc-whale-movement",
  name: "BSC Whale Movement",
  namespace: "bsc",
  version: "1.0.0",
  description:
    "Monitor BSC (BNB Smart Chain) wallet addresses for large BNB holdings (whale tracking). Checks if an address holds more than 100 BNB.",
  inputSchema: {
    address: {
      type: "string",
      required: true,
      description: "BSC wallet address to check (0x...)",
    },
    threshold: {
      type: "number",
      required: false,
      description: "Whale threshold in BNB (default: 100)",
      default: 100,
    },
    network: {
      type: "string",
      required: false,
      description: "Network: bsc, bscTestnet, opbnb, opbnbTestnet",
      default: "bsc",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const address = String(input.address || "").trim();
      const network = (String(input.network || "bsc") || "bsc") as BSCNetwork;
      const threshold = Number(input.threshold) || WHALE_THRESHOLD_BNB;

      if (!address) {
        return {
          success: false,
          data: {},
          summary: "No wallet address provided.",
          error: "address is required",
        };
      }

      if (!address.startsWith("0x") || address.length !== 42) {
        return {
          success: false,
          data: {},
          summary: "Invalid BSC address format.",
          error: "address must be a valid BSC address (0x... 42 chars)",
        };
      }

      const balanceResult = await getNativeBalance(address, network);
      const chainInfo = await getChainInfo(network);
      const balance = parseFloat(balanceResult.balance);
      const isWhale = balance >= threshold;

      const result = {
        address: balanceResult.address,
        network: chainInfo.chainName,
        balance: balanceResult.balance,
        threshold,
        isWhale,
        classification: isWhale ? "Whale" : "Non-Whale",
      };

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary: `${address.slice(0, 6)}...${address.slice(-4)} on ${chainInfo.chainName}: ${balance.toFixed(4)} BNB — ${isWhale ? "WHALE" : "Non-whale"} (threshold: ${threshold} BNB)`,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to check whale status" },
        summary: `Whale data unavailable. Check your API keys or verify the wallet address.`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
