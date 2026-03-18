"use client";

import { useState } from "react";
import { X, Plus, Loader2, BadgeCheck, AlertCircle } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { WhaleWallet } from "@/types";
import { getSkill } from "@/skills";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddWhaleModal({ isOpen, onClose }: Props) {
  const [address, setAddress] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isWhale: boolean;
    balance: string;
  } | null>(null);
  const apiKeys = useAppStore((s) => s.apiKeys);
  const addWhaleWallet = useAppStore((s) => s.addWhaleWallet);

  if (!isOpen) return null;

  const isValidEthAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const handleAdd = async () => {
    const trimmedAddr = address.trim();
    const trimmedName = nickname.trim();

    if (!trimmedAddr) {
      setError("Please enter a wallet address.");
      return;
    }
    if (!isValidEthAddress(trimmedAddr)) {
      setError("Invalid wallet address. Must be 0x followed by 40 hex characters.");
      return;
    }

    setVerifying(true);
    setVerificationResult(null);

    try {
      const whaleSkill = getSkill("bsc/bsc-whale-movement");
      if (whaleSkill) {
        const result = await whaleSkill.execute(
          {
            address: trimmedAddr,
            threshold: 100,
            network: "bsc",
          },
          {
            apiKeys: {
              binanceApiKey: apiKeys?.binanceApiKey || "",
              binanceSecretKey: apiKeys?.binanceSecretKey || "",
            },
          },
        );
        if (result.success) {
          setVerificationResult({
            isWhale: result.data.isWhale as boolean,
            balance: result.data.balance as string,
          });
        }
      }
    } catch (err) {
      console.error("Whale verification failed:", err);
      setVerifying(false);
      setError("Failed to verify wallet. Please try again.");
      return;
    }

    setVerifying(false);

    // Only add wallet after successful verification
    const wallet: WhaleWallet = {
      address: trimmedAddr,
      nickname: trimmedName || `Whale ${trimmedAddr.slice(0, 6)}…${trimmedAddr.slice(-4)}`,
      chain: "BSC",
      addedAt: new Date(),
    };

    addWhaleWallet(wallet);
    setAddress("");
    setNickname("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg),transparent_20%)] backdrop-blur-md">
      <div className="glass-card p-6 w-full max-w-sm mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close add whale modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-text-primary font-bold text-lg mb-1">Track a Whale</h3>
        <p className="text-text-secondary text-sm mb-5">
          Add a wallet address to monitor its activity.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-text-primary text-xs font-medium mb-1">
              Wallet Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError("");
              }}
              placeholder="0x... or bc1..."
              className="w-full glass-input px-4 py-3 text-sm font-mono placeholder-text-dim"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-text-primary text-xs font-medium mb-1">
              Nickname (optional)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="e.g. Jump Trading, Binance Hot"
              className="w-full glass-input px-4 py-3 text-sm placeholder-text-dim"
            />
          </div>

          {error && (
            <p className="text-risk-extreme text-xs bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_85%)] rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {verifying && (
            <div className="flex items-center gap-2 text-text-secondary text-xs bg-card border border-card-border rounded-xl px-3 py-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Verifying on BSC blockchain...
            </div>
          )}

          {verificationResult && (
            <div
              className={`rounded-xl px-3 py-2 flex items-center gap-2 ${
                verificationResult.isWhale
                  ? "bg-[color-mix(in_srgb,var(--color-risk-low),transparent_90%)] border border-[color-mix(in_srgb,var(--color-risk-low),transparent_85%)]"
                  : "bg-card border border-card-border"
              }`}
            >
              {verificationResult.isWhale ? (
                <BadgeCheck className="w-4 h-4 text-risk-low" />
              ) : (
                <AlertCircle className="w-4 h-4 text-text-muted" />
              )}
              <div className="text-xs">
                <span className="text-text-primary font-medium">
                  {verificationResult.isWhale ? "Verified Whale" : "Not a Whale"}
                </span>
                <span className="text-text-secondary">
                  {" "}
                  • {parseFloat(verificationResult.balance).toFixed(4)} BNB on BSC
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={!address.trim()}
            className="w-full bg-accent text-amoled font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-target"
          >
            <Plus className="w-4 h-4" /> Track Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
