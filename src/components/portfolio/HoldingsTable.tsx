import { PortfolioAsset, Chain } from "@/types";
import { Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface HoldingsTableProps {
  assets: PortfolioAsset[];
}

const chainColors: Record<Chain, string> = {
  BSC: "var(--color-chain-bsc)",
  ETH: "var(--color-chain-eth)",
  SOL: "var(--color-chain-sol)",
  BASE: "var(--color-chain-base)",
  POLYGON: "var(--color-chain-polygon)",
  ARB: "var(--color-chain-arb)",
};

export function HoldingsTable({ assets }: HoldingsTableProps) {
  const router = useRouter();

  const handleAskCouncil = (symbol: string) => {
    router.push(
      `/council?query=${encodeURIComponent(`Analyze ${symbol} and give me a recommendation`)}`,
    );
  };

  if (!assets || assets.length === 0) {
    return (
      <div className="glass-card p-4 sm:p-5 h-[400px] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
          <h2 className="text-text-primary font-bold text-lg">Holdings</h2>
          <span className="text-text-muted text-sm">{assets.length} assets</span>
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 bg-card border border-card-border rounded-full flex items-center justify-center mb-5">
            <Wallet className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-text-primary font-semibold text-lg mb-2">No assets found</h3>
          <p className="text-text-secondary text-sm max-w-[280px] mx-auto mb-6 leading-relaxed">
            Your connected Binance account doesn&apos;t have any spot balances yet. Deposit funds to
            start tracking.
          </p>
          <a
            href="https://www.binance.com/en/my/wallet/account/main/deposit/crypto"
            target="_blank"
            rel="noreferrer"
            className="bg-text-primary text-amoled font-bold px-6 py-2.5 rounded-full hover:scale-105 active:scale-95 hover:bg-text-secondary hover:shadow-glow transition-all touch-target"
          >
            Deposit on Binance
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-text-primary font-semibold">Holdings</span>
        <span className="text-text-muted text-sm">{assets.length} assets</span>
      </div>

      <div className="glass-card overflow-hidden h-[400px] flex flex-col">
        {/* Desktop Table */}
        <div className="hidden md:block flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="bg-[color-mix(in_srgb,var(--color-bg),transparent_20%)] text-text-muted text-[10px] uppercase tracking-wider border-b border-card-border">
                <th className="px-4 py-3 text-left font-semibold">Asset</th>
                <th className="px-3 py-3 text-left font-semibold">Holdings</th>
                <th className="px-3 py-3 text-left font-semibold">Price Context</th>
                <th className="px-3 py-3 text-left font-semibold">Allocation</th>
                <th className="px-3 py-3 text-left font-semibold">P&L</th>
                <th className="px-3 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, idx) => {
                const isPositive = asset.pnlPercent >= 0;
                const color = chainColors[asset.chain] || "var(--color-text-muted)";
                return (
                  <tr
                    key={asset.symbol}
                    className={`${idx % 2 === 0 ? "bg-transparent" : "bg-card"} border-b border-card-border last:border-0 hover:bg-card-hover transition-all`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold backdrop-blur-md shrink-0"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${color}, transparent 90%)`,
                            color,
                          }}
                        >
                          {asset.symbol.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-text-primary text-sm font-semibold truncate">
                            {asset.symbol}
                          </div>
                          <div className="text-text-muted text-xs truncate">{asset.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-text-primary text-sm font-semibold">
                        $
                        {asset.valueUSD.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-text-muted text-[10px] font-mono">
                        {asset.amount < 1
                          ? asset.amount.toFixed(4)
                          : asset.amount.toLocaleString(undefined, {
                              maximumFractionDigits: 3,
                            })}{" "}
                        {asset.symbol}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-secondary text-xs font-mono">
                          $
                          {asset.currentPrice < 0.01
                            ? asset.currentPrice.toFixed(6)
                            : asset.currentPrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                        </span>
                      </div>
                      <div className="text-text-dim text-[10px] whitespace-nowrap">
                        Avg: $
                        {asset.avgBuyPrice < 0.01
                          ? asset.avgBuyPrice.toFixed(6)
                          : asset.avgBuyPrice.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-text-primary text-xs font-bold">
                        {asset.allocation.toFixed(1)}%
                      </div>
                    </td>
                    <td
                      className={twMerge(
                        clsx(
                          "px-3 py-3 text-xs font-bold whitespace-nowrap",
                          isPositive ? "text-risk-low" : "text-risk-extreme",
                        ),
                      )}
                    >
                      <div className="flex items-center gap-0.5">
                        {isPositive ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {asset.pnlPercent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleAskCouncil(asset.symbol)}
                        className="text-xs font-bold px-3 py-1 rounded-full border transition-all touch-target"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${color}, transparent 90%)`,
                          borderColor: `color-mix(in srgb, ${color}, transparent 80%)`,
                          color: color,
                        }}
                      >
                        Ask Council
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden flex-1 overflow-y-auto custom-scrollbar divide-y divide-[color-mix(in_srgb,var(--color-card-border),transparent_94%)]">
          {assets.map((asset) => {
            const isPositive = asset.pnlPercent >= 0;
            const color = chainColors[asset.chain] || "var(--color-text-muted)";
            return (
              <div key={asset.symbol} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold backdrop-blur-md shrink-0"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${color}, transparent 90%)`,
                        color,
                      }}
                    >
                      {asset.symbol.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-text-primary text-sm font-semibold truncate">
                        {asset.symbol}
                      </div>
                      <div className="text-text-muted text-xs truncate">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-text-primary text-sm font-medium">
                      $
                      {asset.valueUSD.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div
                      className={twMerge(
                        clsx(
                          "text-xs font-medium flex items-center justify-end gap-0.5 mt-0.5",
                          isPositive ? "text-risk-low" : "text-risk-extreme",
                        ),
                      )}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {asset.pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>
                    {asset.allocation.toFixed(1)}% • {asset.amount.toLocaleString()} {asset.symbol}
                  </span>
                  <button
                    onClick={() => handleAskCouncil(asset.symbol)}
                    className="text-xs font-bold px-3 py-1 rounded-full border transition-all touch-target"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${color}, transparent 90%)`,
                      borderColor: `color-mix(in srgb, ${color}, transparent 85%)`,
                      color: color,
                    }}
                  >
                    Ask Council
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
