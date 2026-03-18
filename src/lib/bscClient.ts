import { createPublicClient, http, formatEther, formatUnits, Chain } from "viem";
import { cacheGet, cacheSet, generateCacheKey } from "./cache";

export type BSCNetwork = "bsc" | "bscTestnet" | "opbnb" | "opbnbTestnet";

const BSC_RPC_ENDPOINTS: Record<BSCNetwork, string[]> = {
  bsc: [
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.binance.org",
    "https://bsc-dataseed2.binance.org",
    "https://bsc-dataseed3.binance.org",
  ],
  bscTestnet: [
    "https://data-seed-prebsc-1-s1.binance.org:8545",
    "https://data-seed-prebsc-2-s1.binance.org:8545",
  ],
  opbnb: ["https://opbnb-dataseed1.binance.org", "https://opbnb-dataseed2.binance.org"],
  opbnbTestnet: [
    "https://opbnb-testnet-dataseed1.bnbchain.org",
    "https://opbnb-testnet-dataseed2.bnbchain.org",
  ],
};

const clientCache: Map<string, ReturnType<typeof createPublicClient>> = new Map();

function getClient(network: BSCNetwork = "bsc"): ReturnType<typeof createPublicClient> {
  const cacheKey = `bsc_${network}`;

  if (!clientCache.has(cacheKey)) {
    const rpcUrl = BSC_RPC_ENDPOINTS[network][0];
    const chain = getChainConfig(network);
    clientCache.set(
      cacheKey,
      createPublicClient({
        chain,
        transport: http(rpcUrl, { timeout: 15000 }),
      }),
    );
  }

  return clientCache.get(cacheKey)!;
}

function getChainConfig(network: BSCNetwork): Chain {
  switch (network) {
    case "bsc":
      return {
        id: 56,
        name: "BNB Smart Chain",
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
        rpcUrls: {
          default: { http: BSC_RPC_ENDPOINTS.bsc },
          public: { http: BSC_RPC_ENDPOINTS.bsc },
        },
        blockExplorers: {
          default: {
            name: "BscScan",
            url: "https://bscscan.com",
            apiUrl: "https://api.bscscan.com/api",
          },
        },
      };
    case "bscTestnet":
      return {
        id: 97,
        name: "BNB Smart Chain Testnet",
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
        rpcUrls: {
          default: { http: BSC_RPC_ENDPOINTS.bscTestnet },
          public: { http: BSC_RPC_ENDPOINTS.bscTestnet },
        },
        blockExplorers: {
          default: {
            name: "BscScan",
            url: "https://testnet.bscscan.com",
            apiUrl: "https://api-testnet.bscscan.com/api",
          },
        },
      };
    case "opbnb":
      return {
        id: 204,
        name: "opBNB",
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
        rpcUrls: {
          default: { http: BSC_RPC_ENDPOINTS.opbnb },
          public: { http: BSC_RPC_ENDPOINTS.opbnb },
        },
        blockExplorers: {
          default: {
            name: "opBNB Scan",
            url: "https://opbnb.bscscan.com",
            apiUrl: "https://api-opbnb.bscscan.com/api",
          },
        },
      };
    case "opbnbTestnet":
      return {
        id: 5611,
        name: "opBNB Testnet",
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
        rpcUrls: {
          default: { http: BSC_RPC_ENDPOINTS.opbnbTestnet },
          public: { http: BSC_RPC_ENDPOINTS.opbnbTestnet },
        },
        blockExplorers: {
          default: {
            name: "opBNB Scan",
            url: "https://testnet.opbnbscan.com",
            apiUrl: "https://testnet.opbnbscan.com",
          },
        },
      };
  }
}

export { getChainConfig };

export interface NativeBalanceResult {
  address: string;
  balance: string;
  balanceWei: string;
  network: BSCNetwork;
}

export async function getNativeBalance(
  address: string,
  network: BSCNetwork = "bsc",
): Promise<NativeBalanceResult> {
  const client = getClient(network);
  const balanceWei = await client.getBalance({
    address: address as `0x${string}`,
  });
  const balance = formatEther(balanceWei);
  return { address, balance, balanceWei: balanceWei.toString(), network };
}

export interface ERC20BalanceResult {
  address: string;
  tokenAddress: string;
  balance: string;
  balanceWei: string;
  decimals: number;
  symbol: string;
  network: BSCNetwork;
}

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "symbol",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

export async function getERC20Balance(
  address: string,
  tokenAddress: string,
  network: BSCNetwork = "bsc",
): Promise<ERC20BalanceResult> {
  const client = getClient(network);
  const [balanceWei, decimals, symbol] = await Promise.all([
    client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    }),
    client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
    client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "symbol",
    }),
  ]);
  const balance = formatUnits(balanceWei, decimals);
  return {
    address,
    tokenAddress,
    balance,
    balanceWei: balanceWei.toString(),
    decimals,
    symbol,
    network,
  };
}

export interface TransactionResult {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueWei: string;
  gasUsed: string;
  gasPrice: string;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  status: "success" | "failed";
  network: BSCNetwork;
}

export async function getTransaction(
  txHash: string,
  network: BSCNetwork = "bsc",
): Promise<TransactionResult> {
  const client = getClient(network);
  const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
  const receipt = await client.getTransactionReceipt({
    hash: txHash as `0x${string}`,
  });
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to || "",
    value: formatEther(tx.value),
    valueWei: tx.value.toString(),
    gasUsed: receipt.gasUsed.toString(),
    gasPrice: tx.gasPrice?.toString() || "0",
    blockNumber: Number(receipt.blockNumber),
    blockHash: receipt.blockHash,
    timestamp: Number(block.timestamp) * 1000,
    status: receipt.status === "success" ? "success" : "failed",
    network,
  };
}

export interface BlockResult {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  transactions: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  difficulty: string;
  network: BSCNetwork;
}

export async function getLatestBlock(network: BSCNetwork = "bsc"): Promise<BlockResult> {
  const client = getClient(network);
  const blockNumber = await client.getBlockNumber();
  return getBlockByNumber(blockNumber, network);
}

export async function getBlockByNumber(
  blockNumber: bigint,
  network: BSCNetwork = "bsc",
): Promise<BlockResult> {
  const client = getClient(network);
  const block = await client.getBlock({ blockNumber });
  return {
    number: Number(block.number),
    hash: block.hash || "",
    parentHash: block.parentHash,
    timestamp: Number(block.timestamp) * 1000,
    transactions: block.transactions.length,
    gasUsed: block.gasUsed.toString(),
    gasLimit: block.gasLimit.toString(),
    miner: block.miner,
    difficulty: block.difficulty.toString(),
    network,
  };
}

export interface TokenInfoResult {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  network: BSCNetwork;
}

const ERC20_TOKEN_INFO_ABI = [
  {
    name: "name",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    name: "symbol",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "totalSupply",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export async function getERC20TokenInfo(
  tokenAddress: string,
  network: BSCNetwork = "bsc",
): Promise<TokenInfoResult> {
  const client = getClient(network);
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_TOKEN_INFO_ABI,
      functionName: "name",
    }),
    client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_TOKEN_INFO_ABI,
      functionName: "symbol",
    }),
    client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_TOKEN_INFO_ABI,
      functionName: "decimals",
    }),
    client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_TOKEN_INFO_ABI,
      functionName: "totalSupply",
    }),
  ]);
  return {
    address: tokenAddress,
    name,
    symbol,
    decimals,
    totalSupply: formatUnits(totalSupply, decimals),
    network,
  };
}

export interface NFTInfoResult {
  address: string;
  tokenId: string;
  uri: string;
  owner: string;
  network: BSCNetwork;
}

const ERC721_ABI = [
  {
    name: "tokenURI",
    type: "function",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    name: "ownerOf",
    type: "function",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

export async function getNFTInfo(
  collectionAddress: string,
  tokenId: string,
  network: BSCNetwork = "bsc",
): Promise<NFTInfoResult> {
  const client = getClient(network);
  const [uri, owner] = await Promise.all([
    client.readContract({
      address: collectionAddress as `0x${string}`,
      abi: ERC721_ABI,
      functionName: "tokenURI",
      args: [BigInt(tokenId)],
    }),
    client.readContract({
      address: collectionAddress as `0x${string}`,
      abi: ERC721_ABI,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    }),
  ]);
  return { address: collectionAddress, tokenId, uri, owner, network };
}

export interface ContractReadResult {
  address: string;
  functionName: string;
  result: unknown;
  network: BSCNetwork;
}

export async function readContract(
  contractAddress: string,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[] = [],
  network: BSCNetwork = "bsc",
): Promise<ContractReadResult> {
  const client = getClient(network);
  const result = await client.readContract({
    address: contractAddress as `0x${string}`,
    abi: abi as any,
    functionName,
    args,
  });
  return { address: contractAddress, functionName, result, network };
}

export interface CodeResult {
  address: string;
  isContract: boolean;
  code: string;
  network: BSCNetwork;
}

export async function getCode(address: string, network: BSCNetwork = "bsc"): Promise<CodeResult> {
  const client = getClient(network);
  const code = await client.getCode({ address: address as `0x${string}` });
  return { address, isContract: code !== "0x", code: code || "0x", network };
}

export interface GasPriceResult {
  gasPrice: string;
  gasPriceWei: string;
  gasPriceGwei: string;
  network: BSCNetwork;
}

export async function getGasPrice(network: BSCNetwork = "bsc"): Promise<GasPriceResult> {
  const client = getClient(network);
  const gasPriceWei = await client.getGasPrice();
  const gasPrice = formatUnits(gasPriceWei, 9);
  return {
    gasPrice: gasPrice.toString(),
    gasPriceWei: gasPriceWei.toString(),
    gasPriceGwei: gasPrice,
    network,
  };
}

export interface ChainInfoResult {
  network: BSCNetwork;
  chainId: number;
  blockNumber: number;
  chainName: string;
}

export async function getChainInfo(network: BSCNetwork = "bsc"): Promise<ChainInfoResult> {
  const client = getClient(network);
  const [chainId, blockNumber] = await Promise.all([client.getChainId(), client.getBlockNumber()]);
  const chainNames: Record<BSCNetwork, string> = {
    bsc: "BNB Smart Chain",
    bscTestnet: "BNB Smart Chain Testnet",
    opbnb: "opBNB",
    opbnbTestnet: "opBNB Testnet",
  };
  return {
    network,
    chainId,
    blockNumber: Number(blockNumber),
    chainName: chainNames[network],
  };
}

export const SUPPORTED_NETWORKS: BSCNetwork[] = ["bsc", "bscTestnet", "opbnb", "opbnbTestnet"];
