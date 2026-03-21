import { Skill, SkillResult } from "../types";
import { getNFTInfo, BSCNetwork } from "@/lib/bscClient";

export const bscNftPortfolio: Skill = {
  id: "bsc/bsc-nft-portfolio",
  name: "BSC NFT Portfolio",
  namespace: "bsc",
  version: "1.0.0",
  description:
    "Get information about any NFT (ERC721) on BSC (BNB Smart Chain) including token URI, metadata location, and current owner.",
  inputSchema: {
    collectionAddress: {
      type: "string",
      required: true,
      description: "NFT collection contract address (0x...)",
    },
    tokenId: {
      type: "string",
      required: true,
      description: "NFT token ID",
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
      const collectionAddress = String(input.collectionAddress || "").trim();
      const tokenId = String(input.tokenId || "").trim();
      const network = (String(input.network || "bsc") || "bsc") as BSCNetwork;

      if (!collectionAddress) {
        return {
          success: false,
          data: {},
          summary: "No collection address provided.",
          error: "collectionAddress is required",
        };
      }

      if (!tokenId) {
        return {
          success: false,
          data: {},
          summary: "No token ID provided.",
          error: "tokenId is required",
        };
      }

      if (!collectionAddress.startsWith("0x") || collectionAddress.length !== 42) {
        return {
          success: false,
          data: {},
          summary: "Invalid collection address format.",
          error: "collectionAddress must be a valid contract address (0x... 42 chars)",
        };
      }

      const result = await getNFTInfo(collectionAddress, tokenId, network);

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary: `NFT #${result.tokenId} on ${result.network}: Owner ${result.owner.slice(0, 6)}..., URI: ${result.uri}`,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch NFT info" },
        summary: `NFT data unavailable. Check your API keys or verify the NFT contract address.`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
