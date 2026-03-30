"use client";

import { Eye, Plus, X, Wallet } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { EmptyList } from "@/components/ui/EmptyState";

interface Props {
  onAddClick: () => void;
}

export function WhaleTrackerWidget({ onAddClick }: Props) {
  const whaleWallets = useAppStore((s) => s.preferences.whaleWallets);
  const removeWhaleWallet = useAppStore((s) => s.removeWhaleWallet);

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col h-[280px] sm:h-[320px] md:h-[340px] transition-all duration-300">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h2 className="text-text-primary font-bold text-lg">Whale Tracker</h2>
        <span className="text-text-muted text-sm">
          {whaleWallets.length} wallet{whaleWallets.length !== 1 ? "s" : ""}
        </span>
      </div>

      {whaleWallets.length === 0 ? (
        <EmptyList
          icon={Eye}
          title="No wallets tracked"
          description="Monitor large transactions from smart money wallets."
        />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {whaleWallets.map((wallet) => (
              <div
                key={wallet.address}
                className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-card-hover transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[color-mix(in_srgb,var(--color-agent-shadow),transparent_90%)] flex items-center justify-center text-agent-shadow">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-text-primary font-semibold text-sm truncate max-w-[140px]">
                      {wallet.nickname}
                    </div>
                    <div className="text-text-dim text-[11px] font-mono truncate max-w-[160px]">
                      {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted text-[10px] uppercase font-semibold tracking-wider bg-card border border-card-border px-2 py-0.5 rounded-full">
                    {wallet.chain}
                  </span>
                  <button
                    onClick={() => removeWhaleWallet(wallet.address)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-risk-extreme transition-all"
                    aria-label={`Remove ${wallet.nickname || wallet.address} from watchlist`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onAddClick}
            className="mt-2 shrink-0 w-full border border-dashed border-card-border text-text-secondary text-sm font-medium py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-card-hover hover:border-card-border-hover transition-all touch-target"
          >
            <Plus className="w-4 h-4" />
            Add Wallet
          </button>
        </div>
      )}
    </div>
  );
}
