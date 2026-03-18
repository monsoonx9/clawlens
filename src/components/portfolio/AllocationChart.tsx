"use client";

import { PortfolioAsset } from "@/types";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface AllocationChartProps {
  assets: PortfolioAsset[];
}

const COLORS = [
  "var(--color-accent)",
  "var(--color-agent-lens)",
  "var(--color-agent-shadow)",
  "var(--color-agent-pulse)",
  "var(--color-agent-ledger)",
  "var(--color-agent-sage)",
];

export function AllocationChart({ assets }: AllocationChartProps) {
  const data = assets.map((a) => ({
    name: a.symbol,
    value: a.allocation,
    valueUSD: a.valueUSD,
  }));

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="text-text-primary font-semibold mb-4">Allocation</div>

      {/* Chart */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-text-primary text-sm font-bold">{assets.length} Assets</span>
          <span className="text-text-muted text-xs">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 mt-4">
        {assets.map((asset, i) => (
          <div key={asset.symbol} className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <div
                className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_4px]"
                style={{
                  backgroundColor: COLORS[i % COLORS.length],
                  boxShadow: `0 0 6px color-mix(in srgb, ${COLORS[i % COLORS.length]}, transparent 75%)`,
                }}
              />
              <span className="text-text-primary text-sm">{asset.symbol}</span>
            </div>
            <div className="flex items-center">
              <span className="text-text-muted text-sm">{asset.allocation.toFixed(2)}%</span>
              <span className="text-text-secondary text-xs ml-3">
                $
                {asset.valueUSD.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
