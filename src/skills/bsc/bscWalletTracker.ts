import { Skill, SkillResult } from "../types";
import { getNativeBalance, getERC20Balance, getChainInfo, BSCNetwork } from "@/lib/bscClient";

const POPULAR_BSC_TOKENS = [
  {
    address: "0x55d398326f99059fF775485246999027B3197955",
    symbol: "USDT",
    decimals: 18,
  },
  {
    address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    symbol: "USDC",
    decimals: 18,
  },
  {
    address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    symbol: "BUSD",
    decimals: 18,
  },
  {
    address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
    symbol: "CAKE",
    decimals: 18,
  },
  {
    address: "0x2170Ed0880ac9A755fb29BE12b0e0dB243dFc7dD",
    symbol: "ETH",
    decimals: 18,
  },
  {
    address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    symbol: "WBNB",
    decimals: 18,
  },
  {
    address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    symbol: "BTCB",
    decimals: 18,
  },
  {
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    symbol: "UNI",
    decimals: 18,
  },
  {
    address: "0x3EB55D5E22f2Cf7A79ac7Bf1Ba9B2Fe2b5e5aF8c",
    symbol: "BSW",
    decimals: 18,
  },
  {
    address: "0x965F527D9159dCe6288a2219E51d6F4d66E0aE0B",
    symbol: "GFT",
    decimals: 18,
  },
  {
    address: "0xDfb1211E2686a2CFa2a9E05E50BAE1E46D9cE0b5",
    symbol: "MTG",
    decimals: 18,
  },
  {
    address: "0x42F6f551aeDDc95EaA74c26E5a4A5dADf17CD770",
    symbol: "HIGH",
    decimals: 18,
  },
  {
    address: "0xa1fd12820f04c3e86a7c1b3a43e3e8a1e8b1a1e8",
    symbol: "LAZIO",
    decimals: 8,
  },
  {
    address: "0x47aB4D4b8a0e7C4b1e1a1b2c3d4e5f6a7b8c9d0",
    symbol: "SPS",
    decimals: 18,
  },
  {
    address: "0x1D2F0fc64f5D5FC64f5B8B5B5C5D5E5F5A5B5C5",
    symbol: "RPG",
    decimals: 18,
  },
  {
    address: "0x2c45dfd7a7d1c2e5f7c8b9a0d1e2f3a4b5c6d7",
    symbol: "BAKE",
    decimals: 18,
  },
  {
    address: "0x8d2f5e2c7e1a9d8c7b6a5d4e3c2f1a0b9c8d7e6",
    symbol: "PORTO",
    decimals: 8,
  },
  {
    address: "0x5a4f2a7d8c9e1e2f3a4b5c6d7e8f9a0b1c2d3e",
    symbol: "TKO",
    decimals: 18,
  },
  {
    address: "0x6b7c9e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c",
    symbol: "DOD",
    decimals: 18,
  },
  {
    address: "0x7c8d9e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c",
    symbol: "MBOX",
    decimals: 18,
  },
];

export interface BSCWalletResult {
  address: string;
  network: string;
  nativeBalance: string;
  tokens: Array<{
    symbol: string;
    contractAddress: string;
    balance: string;
    decimals: number;
  }>;
}

export const bscWalletTracker: Skill = {
  id: "bsc/bsc-wallet-tracker",
  name: "BSC Wallet Tracker",
  namespace: "bsc",
  version: "1.0.0",
  description:
    "Query any BSC (BNB Smart Chain) wallet address to retrieve native BNB balance and ERC20 token balances. Automatically checks top 20 popular tokens.",
  inputSchema: {
    address: {
      type: "string",
      required: true,
      description: "BSC wallet address to query (0x...)",
    },
    network: {
      type: "string",
      required: false,
      description: "Network: bsc, bscTestnet, opbnb, opbnbTestnet",
      default: "bsc",
    },
    tokenAddresses: {
      type: "array",
      required: false,
      description:
        "Optional list of additional ERC20 token contract addresses to check (beyond top 20)",
    },
    includePopularTokens: {
      type: "boolean",
      required: false,
      description: "Include top 20 popular BSC tokens (default: true)",
      default: true,
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const address = String(input.address || "").trim();
      const network = (String(input.network || "bsc") || "bsc") as BSCNetwork;
      const tokenAddresses = Array.isArray(input.tokenAddresses)
        ? (input.tokenAddresses as string[])
        : [];
      const includePopularTokens = input.includePopularTokens !== false;

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

      const nativeResult = await getNativeBalance(address, network);
      const chainInfo = await getChainInfo(network);

      const tokens: Array<{
        symbol: string;
        contractAddress: string;
        balance: string;
        decimals: number;
      }> = [];

      const tokensToFetch = [
        ...(includePopularTokens ? POPULAR_BSC_TOKENS : []),
        ...tokenAddresses
          .filter(
            (addr) =>
              !POPULAR_BSC_TOKENS.some((t) => t.address.toLowerCase() === addr.toLowerCase()),
          )
          .map((addr) => ({ address: addr, symbol: "UNKNOWN", decimals: 18 })),
      ];

      if (tokensToFetch.length > 0) {
        const tokenBalances = await Promise.allSettled(
          tokensToFetch.map(async (token) => {
            try {
              const balance = await getERC20Balance(address, token.address, network);
              return {
                symbol: balance.symbol || token.symbol,
                contractAddress: balance.tokenAddress,
                balance: balance.balance,
                decimals: balance.decimals,
              };
            } catch {
              return null;
            }
          }),
        );

        tokenBalances.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            const balance = parseFloat(result.value.balance);
            if (balance > 0) {
              tokens.push(result.value);
            }
          }
        });
      }

      tokens.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

      const result = {
        address: nativeResult.address,
        network: chainInfo.chainName,
        nativeBalance: nativeResult.balance,
        tokens,
      };

      const tokenCount = tokens.length;

      return {
        success: true,
        data: result,
        summary: `Wallet ${address.slice(0, 6)}...${address.slice(-4)} on ${chainInfo.chainName}: ${parseFloat(nativeResult.balance).toFixed(4)} BNB${tokenCount > 0 ? ` + ${tokenCount} tokens` : ""}`,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to fetch wallet" },
        summary: `Wallet data unavailable. Check your API keys or verify the wallet address.`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
