"use client";

import { useState } from "react";
import { PortfolioAsset } from "@/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { clsx } from "clsx";

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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
              outerRadius={activeIndex !== null ? 85 : 80}
              paddingAngle={3}
              stroke="none"
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  className="transition-all duration-200"
                  style={{ opacity: activeIndex === null || activeIndex === index ? 1 : 0.5 }}
                  onMouseEnter={() => setActiveIndex(index)}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload;
                return (
                  <div className="bg-glass-strong backdrop-blur-md border border-card-border rounded-lg px-3 py-2 shadow-lg">
                    <div className="text-text-primary font-semibold text-sm">{item.name}</div>
                    <div className="text-text-secondary text-xs">
                      ${item.valueUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} (
                      {item.value.toFixed(2)}%)
                    </div>
                  </div>
                );
              }}
            />
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
          <div
            key={asset.symbol}
            className={clsx(
              "flex justify-between items-center p-1.5 rounded-lg transition-colors cursor-pointer",
              activeIndex === i && "bg-card-hover",
            )}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
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
                ${asset.valueUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
