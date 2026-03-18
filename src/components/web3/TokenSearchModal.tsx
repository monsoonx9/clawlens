"use client";

import { useState, useEffect } from "react";
import {
  X,
  Search,
  Loader2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Info,
  BarChart3,
} from "lucide-react";
import { getSkill } from "@/skills";
import type { SkillContext } from "@/skills/types";

interface TokenSearchResult {
  symbol: string;
  name: string;
  chainId: string;
  contractAddress: string;
  price: string;
  marketCap: string;
  volume24h: string;
  percentChange24h: string;
}

interface TokenDynamic {
  price: string;
  priceHigh24h: string;
  priceLow24h: string;
  percentChange5m: string;
  percentChange1h: string;
  percentChange4h: string;
  percentChange24h: string;
  volume24h: string;
  marketCap: string;
  liquidity: string;
  holders: string;
  top10HolderPercent: string;
  circulatingSupply: string;
  totalSupply: string;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  creatorAddress: string;
  createTime: number;
  links: Array<{ label: string; link: string }>;
  isBlacklist: boolean;
  isWhitelist: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function formatUSD(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "$0.00";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(6)}`;
}

function formatNumber(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toLocaleString();
}

const CHAIN_LABELS: Record<string, string> = {
  "56": "BSC",
  "8453": "Base",
  CT_501: "Solana",
  "1": "ETH",
};

export function TokenSearchModal({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenSearchResult | null>(null);
  const [tokenDynamic, setTokenDynamic] = useState<TokenDynamic | null>(null);
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "details">("overview");

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSearchResults([]);
      setSelectedToken(null);
      setTokenDynamic(null);
      setTokenMetadata(null);
      setError(null);
      setActiveTab("overview");
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      const skill = getSkill("binance/query-token-info");
      if (!skill) throw new Error("Token Info skill not found");

      const context: SkillContext = {
        apiKeys: { binanceApiKey: "", binanceSecretKey: "" },
      };

      const response = await skill.execute({ mode: "search", query: query.trim() }, context);

      if (response.success && response.data) {
        const data = response.data as { searchResults?: TokenSearchResult[] };
        setSearchResults(data.searchResults || []);
        if (data.searchResults?.length === 0) {
          setError("No tokens found");
        }
      } else {
        setError(response.error || "Search failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectToken = async (token: TokenSearchResult) => {
    setSelectedToken(token);
    setLoading(true);
    setTokenDynamic(null);
    setTokenMetadata(null);

    try {
      const skill = getSkill("binance/query-token-info");
      if (!skill) throw new Error("Token Info skill not found");

      const context: SkillContext = {
        apiKeys: { binanceApiKey: "", binanceSecretKey: "" },
      };

      const chainMap: Record<string, string> = {
        "56": "bsc",
        "8453": "base",
        CT_501: "solana",
        "1": "ethereum",
      };

      const chain = chainMap[token.chainId] || "bsc";

      const [dynamicRes, metadataRes] = await Promise.all([
        skill.execute({ mode: "dynamic", contractAddress: token.contractAddress, chain }, context),
        skill.execute({ mode: "metadata", contractAddress: token.contractAddress, chain }, context),
      ]);

      if (dynamicRes.success && dynamicRes.data) {
        setTokenDynamic(dynamicRes.data as unknown as TokenDynamic);
      }
      if (metadataRes.success && metadataRes.data) {
        setTokenMetadata(metadataRes.data as unknown as TokenMetadata);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  const change = selectedToken ? parseFloat(selectedToken.percentChange24h) : 0;
  const isPositive = change >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg),transparent_20%)] backdrop-blur-md p-4">
      <div className="glass-card w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-card-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--color-accent),transparent_85%)] flex items-center justify-center">
              <Search className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-text-primary font-bold text-lg">Token Search</h2>
              <p className="text-text-muted text-sm">Find any token on BSC, Base, or Solana</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-2"
            aria-label="Close search modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-card-border shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by token name or symbol..."
                className="w-full pl-10 pr-4 py-3 glass-input text-sm"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-6 py-3 bg-accent text-amoled text-sm font-bold rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-card-border overflow-y-auto max-h-[30vh] md:max-h-none">
            {error && searchResults.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-text-muted text-sm">{error}</p>
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="p-2">
                {searchResults.map((token, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectToken(token)}
                    className={`w-full p-3 rounded-xl text-left transition-colors ${
                      selectedToken?.contractAddress === token.contractAddress
                        ? "bg-[color-mix(in_srgb,var(--color-accent),transparent_85%)] border border-[color-mix(in_srgb,var(--color-accent),transparent_75%)]"
                        : "hover:bg-[color-mix(in_srgb,var(--color-card-border),transparent_70%)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-text-primary font-semibold text-sm">{token.symbol}</p>
                        <p className="text-text-muted text-xs truncate max-w-[120px]">
                          {token.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-text-primary text-sm font-medium">
                          {formatUSD(token.price)}
                        </p>
                        <p
                          className={`text-xs ${parseFloat(token.percentChange24h) >= 0 ? "text-risk-low" : "text-risk-extreme"}`}
                        >
                          {parseFloat(token.percentChange24h) >= 0 ? "+" : ""}
                          {token.percentChange24h}%
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searching && (
              <div className="p-4 flex justify-center">
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
              </div>
            )}
            {!searching && searchResults.length === 0 && !error && (
              <div className="p-4 text-center">
                <Search className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-text-muted text-sm">Search for a token</p>
              </div>
            )}
          </div>

          <div className="w-full md:w-2/3 flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            ) : selectedToken ? (
              <>
                <div className="p-4 border-b border-card-border shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-card-border flex items-center justify-center text-text-primary font-bold">
                        {selectedToken.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-text-primary font-bold text-lg">
                          {selectedToken.symbol}
                        </h3>
                        <p className="text-text-muted text-sm">{selectedToken.name}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-card-border text-text-muted text-xs rounded-full">
                      {CHAIN_LABELS[selectedToken.chainId] || selectedToken.chainId}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-text-primary">
                      {formatUSD(selectedToken.price)}
                    </span>
                    <span
                      className={`flex items-center text-sm font-medium ${isPositive ? "text-risk-low" : "text-risk-extreme"}`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {isPositive ? "+" : ""}
                      {selectedToken.percentChange24h}%
                    </span>
                  </div>
                </div>

                <div className="flex border-b border-card-border shrink-0">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      activeTab === "overview"
                        ? "text-accent border-b-2 border-accent"
                        : "text-text-muted"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab("details")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      activeTab === "details"
                        ? "text-accent border-b-2 border-accent"
                        : "text-text-muted"
                    }`}
                  >
                    Details
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {activeTab === "overview" && tokenDynamic && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-card p-3">
                        <p className="text-text-muted text-xs mb-1">Market Cap</p>
                        <p className="text-text-primary font-bold">
                          {formatUSD(tokenDynamic.marketCap)}
                        </p>
                      </div>
                      <div className="glass-card p-3">
                        <p className="text-text-muted text-xs mb-1">24h Volume</p>
                        <p className="text-text-primary font-bold">
                          {formatUSD(tokenDynamic.volume24h)}
                        </p>
                      </div>
                      <div className="glass-card p-3">
                        <p className="text-text-muted text-xs mb-1">24h High</p>
                        <p className="text-text-primary font-bold">
                          {formatUSD(tokenDynamic.priceHigh24h)}
                        </p>
                      </div>
                      <div className="glass-card p-3">
                        <p className="text-text-muted text-xs mb-1">24h Low</p>
                        <p className="text-text-primary font-bold">
                          {formatUSD(tokenDynamic.priceLow24h)}
                        </p>
                      </div>
                      <div className="glass-card p-3">
                        <p className="text-text-muted text-xs mb-1">Liquidity</p>
                        <p className="text-text-primary font-bold">
                          {formatUSD(tokenDynamic.liquidity)}
                        </p>
                      </div>
                      <div className="glass-card p-3">
                        <p className="text-text-muted text-xs mb-1">Holders</p>
                        <p className="text-text-primary font-bold">
                          {formatNumber(tokenDynamic.holders)}
                        </p>
                      </div>
                      <div className="glass-card p-3">
                        <p className="text-text-muted text-xs mb-1">Top 10 Holders</p>
                        <p className="text-text-primary font-bold">
                          {tokenDynamic.top10HolderPercent}%
                        </p>
                      </div>
                      <div className="glass-card p-3">
                        <p className="text-text-muted text-xs mb-1">Circ. Supply</p>
                        <p className="text-text-primary font-bold">
                          {formatNumber(tokenDynamic.circulatingSupply)}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === "details" && tokenMetadata && (
                    <div className="space-y-4">
                      <div className="glass-card p-3">
                        <p className="text-text-muted text-xs mb-1">Contract Address</p>
                        <p className="text-text-primary text-sm font-mono break-all">
                          {selectedToken.contractAddress}
                        </p>
                      </div>
                      <div className="glass-card p-3">
                        <p className="text-text-muted text-xs mb-1">Decimals</p>
                        <p className="text-text-primary font-bold">{tokenMetadata.decimals}</p>
                      </div>
                      <div className="glass-card p-3">
                        <p className="text-text-muted text-xs mb-1">Creator Address</p>
                        <p className="text-text-primary text-sm font-mono break-all">
                          {tokenMetadata.creatorAddress}
                        </p>
                      </div>
                      {tokenMetadata.links && tokenMetadata.links.length > 0 && (
                        <div className="glass-card p-3">
                          <p className="text-text-muted text-xs mb-2">Links</p>
                          <div className="flex flex-wrap gap-2">
                            {tokenMetadata.links.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-card-border text-accent text-xs rounded-full hover:underline"
                              >
                                {link.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!tokenDynamic && activeTab === "overview" && (
                    <div className="text-center py-8">
                      <p className="text-text-muted text-sm">Loading market data...</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-10 h-10 text-text-muted mx-auto mb-2" />
                  <p className="text-text-muted text-sm">Select a token to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedToken && (
          <div className="p-4 border-t border-card-border shrink-0">
            <a
              href={`https://web3.binance.com/en/trade/token-${selectedToken.chainId === "56" ? "bsc" : selectedToken.chainId === "8453" ? "base" : selectedToken.chainId === "CT_501" ? "sol" : "eth"}/${selectedToken.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-accent text-amoled text-sm font-bold rounded-xl hover:scale-105 transition-transform"
            >
              Trade on Binance <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
