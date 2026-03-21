import { Skill, SkillResult } from "./types";
import { getAddressTokenBalance, formatUSD, formatPercent, ChainId } from "@/lib/binanceWeb3Client";

export interface AddressInfoResult {
  address: string;
  chainId: string;
  tokens: Array<{
    symbol: string;
    name: string;
    contractAddress: string;
    balance: string;
    price: string;
    valueUSD: string;
    percentChange24h: string;
  }>;
  totalValueUSD: number;
  tokenCount: number;
}

export const addressInfo: Skill = {
  id: "binance/query-address-info",
  name: "Address Info",
  namespace: "binance",
  version: "1.0.0",
  description:
    "Query any on-chain wallet address to retrieve all token holdings, current prices, and 24h price changes. Supports BSC, Base, and Solana chains.",
  inputSchema: {
    address: {
      type: "string",
      required: true,
      description: "Wallet address to query",
    },
    chain: {
      type: "string",
      required: false,
      description: "Blockchain: bsc, base, solana",
    },
  },

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    try {
      const address = String(input.address || "").trim();
      const chain = String(input.chain || "bsc").toLowerCase();

      if (!address) {
        return {
          success: false,
          data: {},
          summary: "No wallet address provided.",
          error: "address is required",
        };
      }

      const chainIdMap: Record<string, ChainId> = {
        bsc: "56",
        base: "8453",
        solana: "CT_501",
      };
      const chainId = chainIdMap[chain] || "56";

      const response = await getAddressTokenBalance(address, chainId);

      let totalValueUSD = 0;
      const tokens = response.list.map((token) => {
        const balance = parseFloat(token.remainQty);
        const price = parseFloat(token.price);
        const valueUSD = balance * price;
        totalValueUSD += valueUSD;

        return {
          symbol: token.symbol,
          name: token.name,
          contractAddress: token.contractAddress,
          balance: token.remainQty,
          price: token.price,
          valueUSD: valueUSD.toFixed(2),
          percentChange24h: token.percentChange24h,
        };
      });

      tokens.sort((a, b) => parseFloat(b.valueUSD) - parseFloat(a.valueUSD));

      const result: AddressInfoResult = {
        address,
        chainId,
        tokens: tokens.slice(0, 50),
        totalValueUSD,
        tokenCount: tokens.length,
      };

      const topHoldings = tokens
        .slice(0, 3)
        .map((t) => `${t.symbol} (${formatUSD(t.valueUSD)})`)
        .join(", ");
      const summary =
        `👤 Wallet ${address.slice(0, 6)}...${address.slice(-4)}: ` +
        `${tokens.length} tokens, Total: ${formatUSD(totalValueUSD)}. ` +
        `Top: ${topHoldings}`;

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to query address info" },
        summary: "Address info unavailable. Check your API keys or verify the wallet address.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
