import { Skill, SkillResult } from "../types";
import { readContract, getCode, BSCNetwork } from "@/lib/bscClient";

export const bscContractReader: Skill = {
  id: "bsc/bsc-contract-reader",
  name: "BSC Contract Reader",
  namespace: "bsc",
  version: "1.0.0",
  description:
    "Read data from any BSC (BNB Smart Chain) smart contract by calling view/pure functions. Also check if an address is a contract or EOA.",
  inputSchema: {
    contractAddress: {
      type: "string",
      required: true,
      description: "Smart contract address (0x...)",
    },
    functionName: {
      type: "string",
      required: false,
      description: "Name of the function to call",
    },
    abi: {
      type: "array",
      required: false,
      description: "Contract ABI as JSON array",
    },
    args: {
      type: "array",
      required: false,
      description: "Function arguments as array",
    },
    checkContract: {
      type: "boolean",
      required: false,
      description: "Just check if address is a contract (no function call)",
      default: false,
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
      const contractAddress = String(input.contractAddress || "").trim();
      const network = (String(input.network || "bsc") || "bsc") as BSCNetwork;
      const checkContract = Boolean(input.checkContract);

      if (!contractAddress) {
        return {
          success: false,
          data: {},
          summary: "No contract address provided.",
          error: "contractAddress is required",
        };
      }

      if (!contractAddress.startsWith("0x") || contractAddress.length !== 42) {
        return {
          success: false,
          data: {},
          summary: "Invalid contract address format.",
          error: "contractAddress must be a valid address (0x... 42 chars)",
        };
      }

      if (checkContract) {
        const result = await getCode(contractAddress, network);
        return {
          success: true,
          data: result as unknown as Record<string, unknown>,
          summary: `${contractAddress.slice(0, 6)}... is ${result.isContract ? "a smart contract" : "an EOA"} on ${result.network}`,
        };
      }

      const functionName = String(input.functionName || "");
      const abi = Array.isArray(input.abi) ? input.abi : [];
      const args = Array.isArray(input.args) ? input.args : [];

      if (!functionName || abi.length === 0) {
        return {
          success: false,
          data: {},
          summary: "functionName and abi are required for contract reading.",
          error: "functionName and abi are required",
        };
      }

      const result = await readContract(
        contractAddress,
        abi as readonly unknown[],
        functionName,
        args,
        network,
      );

      return {
        success: true,
        data: result as unknown as Record<string, unknown>,
        summary: `Called ${functionName} on ${contractAddress.slice(0, 6)}...: ${JSON.stringify(result.result)}`,
      };
    } catch (error) {
      return {
        success: true,
        data: { status: "unavailable", message: "Unable to read contract" },
        summary: `Contract data unavailable. Check your API keys or verify the contract address.`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
