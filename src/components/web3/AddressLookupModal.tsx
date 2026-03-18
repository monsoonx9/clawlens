"use client";

import { useState, useEffect } from "react";
import {
  X,
  Wallet,
  Loader2,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getSkill } from "@/skills";
import { Select } from "@/components/ui/Select";
import type { SkillContext } from "@/skills/types";

interface AddressInfoData {
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialAddress?: string;
}

const CHAIN_OPTIONS = [
  { id: "bsc", label: "BSC", chainId: "56" },
  { id: "solana", label: "Solana", chainId: "CT_501" },
  { id: "base", label: "Base", chainId: "8453" },
];

function formatUSD(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0.00";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

export function AddressLookupModal({ isOpen, onClose, initialAddress }: Props) {
  const [address, setAddress] = useState(initialAddress || "");
  const [selectedChain, setSelectedChain] = useState("bsc");
  const [useOnChain, setUseOnChain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AddressInfoData | null>(null);
  const [onChainBalance, setOnChainBalance] = useState<{
    nativeBalance: string;
    network: string;
    tokens: Array<{
      symbol: string;
      contractAddress: string;
      balance: string;
    }>;
  } | null>(null);

  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress);
    }
  }, [initialAddress]);

  useEffect(() => {
    if (!isOpen) {
      setAddress("");
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  const handleLookup = async () => {
    if (!address.trim()) {
      setError("Please enter a wallet address");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setOnChainBalance(null);

    try {
      const context: SkillContext = {
        apiKeys: { binanceApiKey: "", binanceSecretKey: "" },
      };

      if (useOnChain && selectedChain === "bsc") {
        const bscSkill = getSkill("bsc/bsc-wallet-tracker");
        if (!bscSkill) throw new Error("BSC Wallet Tracker skill not found");

        const response = await bscSkill.execute(
          { address: address.trim(), network: "bsc" },
          context,
        );

        if (response.success && response.data) {
          setOnChainBalance({
            nativeBalance: response.data.nativeBalance as string,
            network: response.data.network as string,
            tokens:
              (response.data.tokens as Array<{
                symbol: string;
                contractAddress: string;
                balance: string;
              }>) || [],
          });
        } else {
          setError(response.error || "Failed to fetch on-chain balance");
        }
      } else {
        const skill = getSkill("binance/query-address-info");
        if (!skill) throw new Error("Address Info skill not found");

        // Validate address format based on chain
        const trimmedAddress = address.trim();
        let isValidAddress = false;

        if (selectedChain === "bsc" || selectedChain === "base") {
          // EVM address format
          isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmedAddress);
        } else if (selectedChain === "solana") {
          // Solana address format (base58 - proper validation)
          isValidAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmedAddress);
        }

        if (!isValidAddress) {
          setError(
            `Invalid ${selectedChain.toUpperCase()} address format. Please check and try again.`,
          );
          setLoading(false);
          return;
        }

        const response = await skill.execute(
          { address: trimmedAddress, chain: selectedChain },
          context,
        );

        if (response.success && response.data) {
          setResult(response.data as unknown as AddressInfoData);
        } else {
          // Provide more helpful error message
          const errorMsg = response.error || "Failed to fetch address info";
          if (errorMsg.includes("illegal parameter")) {
            setError("Invalid address or API temporarily unavailable. Please try again.");
          } else {
            setError(errorMsg);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch address info");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleLookup();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg),transparent_20%)] backdrop-blur-md p-4">
      <div className="glass-card w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-card-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--color-accent),transparent_85%)] flex items-center justify-center">
              <Wallet className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-text-primary font-bold text-lg">Address Lookup</h2>
              <p className="text-text-muted text-sm">View any wallet&apos;s token holdings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-2"
            aria-label="Close address lookup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-card-border shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter wallet address (0x... or bc1...)"
                className="w-full px-4 py-3 glass-input text-sm font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setUseOnChain(!useOnChain)}
                disabled={selectedChain !== "bsc"}
                title={
                  selectedChain !== "bsc"
                    ? "On-chain only available for BSC"
                    : "Use direct blockchain data"
                }
                className={`px-3 py-3 text-xs font-medium rounded-xl border transition-all ${
                  useOnChain && selectedChain === "bsc"
                    ? "bg-accent text-amoled border-accent"
                    : "glass-input text-text-muted border-card-border hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
              >
                On-Chain
              </button>
              <Select
                value={selectedChain}
                onChange={(value) => {
                  setSelectedChain(value);
                  setUseOnChain(false);
                }}
                options={CHAIN_OPTIONS.map((chain) => ({
                  value: chain.id,
                  label: chain.label,
                }))}
                className="w-auto"
              />
              <button
                onClick={handleLookup}
                disabled={loading || !address.trim()}
                className="px-6 py-3 bg-accent text-amoled text-sm font-bold rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Lookup"}
              </button>
            </div>
          </div>
          {error && <p className="text-risk-extreme text-sm mt-2">{error}</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent animate-spin mb-3" />
              <p className="text-text-muted text-sm">Fetching wallet data...</p>
            </div>
          )}

          {!loading && !result && !onChainBalance && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="w-12 h-12 text-text-muted mb-3" />
              <p className="text-text-muted text-sm">Enter a wallet address to view holdings</p>
            </div>
          )}

          {onChainBalance && !loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider">Native Balance</p>
                  <p className="text-text-primary font-bold text-2xl">
                    {parseFloat(onChainBalance.nativeBalance).toFixed(4)} BNB
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-text-muted text-xs uppercase tracking-wider">Tokens Found</p>
                  <p className="text-text-primary font-bold text-xl">
                    {onChainBalance.tokens.length}
                  </p>
                </div>
              </div>

              {/* Token List */}
              <div className="space-y-2">
                <p className="text-text-muted text-xs uppercase tracking-wider">
                  On-Chain Tokens (BSC)
                </p>
                {onChainBalance.tokens.length > 0 ? (
                  <div className="glass-card divide-y divide-[color-mix(in_srgb,var(--color-card-border),transparent_50%)]">
                    {onChainBalance.tokens.map((token, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-accent text-xs font-bold">{token.symbol}</span>
                          <span className="text-text-dim text-[10px] font-mono">
                            {token.contractAddress.slice(0, 6)}...
                            {token.contractAddress.slice(-4)}
                          </span>
                        </div>
                        <span className="text-text-primary font-semibold text-sm">
                          {parseFloat(token.balance).toFixed(6)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-muted text-xs">
                    No token balances found for this address
                  </p>
                )}
              </div>

              <p className="text-text-muted text-xs">
                Direct on-chain data from BSC blockchain • Showing tokens with balance &gt; 0
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider">Total Value</p>
                  <p className="text-text-primary font-bold text-2xl">
                    {formatUSD(result.totalValueUSD)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-text-muted text-xs uppercase tracking-wider">Tokens</p>
                  <p className="text-text-primary font-bold text-xl">{result.tokenCount}</p>
                </div>
              </div>

              <div className="glass-card p-3">
                <p className="text-text-muted text-xs font-mono break-all">{result.address}</p>
              </div>

              {result.tokens && result.tokens.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-card-border">
                        <th className="text-left px-3 py-2 text-xs font-bold text-text-muted uppercase">
                          Token
                        </th>
                        <th className="text-right px-3 py-2 text-xs font-bold text-text-muted uppercase">
                          Balance
                        </th>
                        <th className="text-right px-3 py-2 text-xs font-bold text-text-muted uppercase">
                          Price
                        </th>
                        <th className="text-right px-3 py-2 text-xs font-bold text-text-muted uppercase">
                          Value
                        </th>
                        <th className="text-right px-3 py-2 text-xs font-bold text-text-muted uppercase">
                          24h
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tokens.map((token, idx) => {
                        const change = parseFloat(token.percentChange24h || "0");
                        const isPositive = change >= 0;

                        return (
                          <tr
                            key={idx}
                            className="border-b border-[color-mix(in_srgb,var(--color-text-muted),transparent_90%)] hover:bg-[color-mix(in_srgb,var(--color-card-border),transparent_70%)]"
                          >
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-card-border flex items-center justify-center text-xs font-bold text-text-secondary">
                                  {token.symbol.slice(0, 2)}
                                </div>
                                <div>
                                  <p className="text-text-primary font-semibold text-sm">
                                    {token.symbol}
                                  </p>
                                  <p className="text-text-muted text-xs">{token.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="text-right px-3 py-3 text-text-primary text-sm font-medium">
                              {parseFloat(token.balance).toFixed(4)}
                            </td>
                            <td className="text-right px-3 py-3 text-text-secondary text-sm">
                              {formatUSD(token.price)}
                            </td>
                            <td className="text-right px-3 py-3 text-text-primary font-semibold text-sm">
                              {formatUSD(token.valueUSD)}
                            </td>
                            <td
                              className={`text-right px-3 py-3 text-sm font-medium ${isPositive ? "text-risk-low" : "text-risk-extreme"}`}
                            >
                              <div className="flex items-center justify-end gap-1">
                                {isPositive ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {isPositive ? "+" : ""}
                                {parseFloat(token.percentChange24h || "0").toFixed(2)}%
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-muted">No tokens found for this address</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-card-border shrink-0">
          {result && (
            <a
              href={`https://web3.binance.com/en/address/${selectedChain === "solana" ? "sol" : selectedChain === "base" ? "base" : "bsc"}/${result.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 glass hover:glass-strong text-text-primary text-sm font-medium rounded-xl transition-all"
            >
              View on Binance <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
