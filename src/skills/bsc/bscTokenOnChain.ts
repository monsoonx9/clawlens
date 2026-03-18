import { Skill, SkillResult } from "../types";
import { getERC20TokenInfo, BSCNetwork } from "@/lib/bscClient";

export const bscTokenOnChain: Skill = {
  id: "bsc/bsc-token-on-chain",
  name: "BSC Token On-Chain",
  namespace: "claw-council",
  version: "1.0.0",
  description:
    "Get on-chain information about any ERC20 token on BSC (BNB Smart Chain) including name, symbol, decimals, and total supply.",
  inputSchema: {
    tokenAddress: {
      type: "string",
      required: true,
      description: "ERC20 token contract address (0x...)",
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
      const tokenAddress = String(input.tokenAddress || "").trim();
      const network = (String(input.network || "bsc") || "bsc") as BSCNetwork;

      if (!tokenAddress) {
        return {
          success: false,
          data: {},
          summary: "No token address provided.",
          error: "tokenAddress is required",
        };
      }

      if (!tokenAddress.startsWith("0x") || tokenAddress.length !== 42) {
        return {
          success: false,
          data: {},
          summary: "Invalid token address format.",
          error: "tokenAddress must be a valid contract address (0x... 42 chars)",
        };
      }

      const result = await getERC20TokenInfo(tokenAddress, network);

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary: `${result.name} (${result.symbol}) on ${result.network}: ${result.totalSupply} total supply, ${result.decimals} decimals`,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch token info" },
        summary: `Token data unavailable. Check your API keys or verify the contract address.`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
