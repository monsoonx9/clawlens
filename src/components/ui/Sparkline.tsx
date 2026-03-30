"use client";

import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { clsx } from "clsx";
import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number | string;
  height?: number;
  showAxis?: boolean;
  className?: string;
  positive?: boolean;
}

export function Sparkline({
  data,
  color,
  width = "100%",
  height = 32,
  showAxis = false,
  className,
  positive,
}: SparklineProps) {
  const chartData = useMemo(() => {
    return data.map((value, index) => ({ value, index }));
  }, [data]);

  const isPositive = useMemo(() => {
    if (positive !== undefined) return positive;
    if (data.length < 2) return true;
    return data[data.length - 1] >= data[0];
  }, [data, positive]);

  const lineColor = color || (isPositive ? "var(--color-risk-low)" : "var(--color-risk-extreme)");

  if (!data || data.length === 0) {
    return (
      <div
        className={clsx("bg-card-border animate-pulse rounded", className)}
        style={{ width, height }}
      />
    );
  }

  return (
    <div className={clsx("relative", className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          {showAxis && <YAxis domain={["dataMin", "dataMax"]} hide width={0} />}
          <defs>
            <linearGradient
              id={`sparkGradient-${isPositive ? "up" : "down"}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            fill={`url(#sparkGradient-${isPositive ? "up" : "down"})`}
            isAnimationActive={true}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MiniSparklineProps {
  data: number[];
  positive?: boolean;
  size?: "sm" | "md";
}

export function MiniSparkline({ data, positive, size = "sm" }: MiniSparklineProps) {
  const heights = { sm: 20, md: 28 };
  return <Sparkline data={data} positive={positive} height={heights[size]} className="w-16" />;
}
