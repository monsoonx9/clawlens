import { Skill, SkillResult } from "../types";
import { getTransaction, BSCNetwork } from "@/lib/bscClient";

export const bscTransactionAnalyzer: Skill = {
  id: "bsc/bsc-transaction-analyzer",
  name: "BSC Transaction Analyzer",
  namespace: "bsc",
  version: "1.0.0",
  description:
    "Get detailed information about any BSC (BNB Smart Chain) transaction including sender, recipient, value, gas used, and transaction status.",
  inputSchema: {
    txHash: {
      type: "string",
      required: true,
      description: "Transaction hash (0x...)",
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
      const txHash = String(input.txHash || "").trim();
      const network = (String(input.network || "bsc") || "bsc") as BSCNetwork;

      if (!txHash) {
        return {
          success: false,
          data: {},
          summary: "No transaction hash provided.",
          error: "txHash is required",
        };
      }

      if (!txHash.startsWith("0x") || txHash.length !== 66) {
        return {
          success: false,
          data: {},
          summary: "Invalid transaction hash format.",
          error: "txHash must be a valid transaction hash (0x... 66 chars)",
        };
      }

      const result = await getTransaction(txHash, network);

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary: `Transaction ${result.status}: ${result.value} BNB from ${result.from.slice(0, 6)}... to ${result.to.slice(0, 6)}... (Gas used: ${result.gasUsed})`,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch transaction" },
        summary: `Transaction data unavailable. Check your API keys or verify the transaction hash.`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
