import { Skill, SkillResult } from "../types";
import { getLatestBlock, getBlockByNumber, BSCNetwork } from "@/lib/bscClient";

export const bscBlockExplorer: Skill = {
  id: "bsc/bsc-block-explorer",
  name: "BSC Block Explorer",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Get the latest block or block by number on BSC (BNB Smart Chain). Returns block information including timestamp, transactions, gas used, and miner.",
  inputSchema: {
    blockNumber: {
      type: "number",
      required: false,
      description: "Block number to query. If not provided, returns the latest block.",
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
      const blockNumberInput = input.blockNumber;
      const network = (String(input.network || "bsc") || "bsc") as BSCNetwork;

      let result;

      if (blockNumberInput !== undefined && blockNumberInput !== null) {
        const blockNum = BigInt(Number(blockNumberInput));
        result = await getBlockByNumber(blockNum, network);
      } else {
        result = await getLatestBlock(network);
      }

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary: `Block #${result.number} on ${result.network}: ${result.transactions} transactions, Gas used: ${result.gasUsed}`,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch block" },
        summary: `Block data unavailable. Check your API keys or try again later.`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
