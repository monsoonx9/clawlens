"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, PieChart, Clock, Zap, BarChart3, Bot } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";
import { useCallback, useRef } from "react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Council", href: "/council", icon: Users },
  { name: "Assistant", href: "/assistant", icon: Bot },
  { name: "Portfolio", href: "/portfolio", icon: PieChart },
  { name: "Web3", href: "/web3", icon: Zap },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "History", href: "/history", icon: Clock },
];

function NavItem({
  item,
  isActive,
}: {
  item: (typeof navItems)[number];
  isActive: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!ref.current || isActive) return;
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ref.current.style.setProperty("--spot-x", `${x}px`);
      ref.current.style.setProperty("--spot-y", `${y}px`);
    },
    [isActive],
  );

  return (
    <Link
      ref={ref}
      href={item.href}
      onMouseMove={handleMouseMove}
      className={twMerge(
        clsx(
          "group relative flex items-center gap-3 px-3 lg:px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 justify-center lg:justify-start touch-target overflow-hidden",
          isActive
            ? "bg-[color-mix(in_srgb,var(--color-accent),transparent_90%)] text-accent backdrop-blur-md"
            : "text-text-secondary hover:text-text-primary",
        ),
      )}
      title={item.name}
    >
      {isActive && (
        <motion.div
          layoutId="activeNav"
          className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-accent),transparent_90%)] rounded-full border border-[color-mix(in_srgb,var(--color-accent),transparent_80%)]"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      {/* Spotlight glow on hover (non-active items) */}
      {!isActive && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(120px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in srgb, var(--color-accent), transparent 85%), transparent 70%)",
          }}
          aria-hidden="true"
        />
      )}
      <item.icon className="w-5 h-5 shrink-0 relative z-10" />
      <span className="hidden lg:inline relative z-10">{item.name}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const apiKeys = useAppStore((state) => state.apiKeys);
  const preferences = useAppStore((state) => state.preferences);

  const isBinanceConnected = !!apiKeys?.binanceApiKey;
  const isLLMConnected = !!apiKeys?.llmApiKey;
  const activeAgentsCount = preferences?.enabledAgents?.length || 0;

  return (
    <aside className="hidden md:flex flex-col h-screen bg-[color-mix(in_srgb,var(--color-bg),transparent_5%)] backdrop-blur-md border-r border-card-border shrink-0 w-[60px] lg:w-[240px] transition-all duration-300 relative z-20">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-card-border justify-center lg:justify-start">
        <div className="logo-container">
          <Image
            src="/logo_v1.webp"
            alt="ClawLens Logo"
            width={32}
            height={32}
            className="shrink-0 logo-glow"
            priority
          />
        </div>
        <div className="hidden lg:flex flex-col">
          <span className="text-text-primary font-bold text-lg tracking-tight leading-tight">
            ClawLens
          </span>
          <span className="text-[10px] uppercase font-bold text-accent tracking-widest mt-0.5 opacity-90">
            Beta
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return <NavItem key={item.href} item={item} isActive={isActive} />;
        })}
      </nav>

      {/* Connection Status — hidden on tablet icon mode */}
      <div className="hidden lg:block p-4 border-t border-card-border space-y-3">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "w-2 h-2 rounded-full shadow-[0_0_6px]",
              isBinanceConnected
                ? "bg-risk-low shadow-[0_0_6px_color-mix(in_srgb,var(--color-risk-low),transparent_60%)]"
                : "bg-risk-extreme shadow-[0_0_6px_color-mix(in_srgb,var(--color-risk-extreme),transparent_60%)]",
            )}
          />
          <span className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">
            Binance {isBinanceConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "w-2 h-2 rounded-full shadow-[0_0_6px]",
              isLLMConnected
                ? "bg-risk-low shadow-[0_0_6px_color-mix(in_srgb,var(--color-risk-low),transparent_60%)]"
                : "bg-risk-extreme shadow-[0_0_6px_color-mix(in_srgb,var(--color-risk-extreme),transparent_60%)]",
            )}
          />
          <span className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">
            AI Model {isLLMConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent),transparent_40%)]" />
          <span className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">
            {activeAgentsCount} Agents Active
          </span>
        </div>
      </div>

      {/* Tablet: compact status dots only */}
      <div className="lg:hidden flex flex-col items-center gap-2 p-3 border-t border-card-border">
        <div
          className={clsx(
            "w-2.5 h-2.5 rounded-full",
            isBinanceConnected
              ? "bg-risk-low shadow-[0_0_6px_var(--color-risk-low)]"
              : "bg-risk-extreme shadow-[0_0_6px_var(--color-risk-extreme)]",
          )}
          title={`Binance ${isBinanceConnected ? "Connected" : "Disconnected"}`}
        />
        <div
          className={clsx(
            "w-2.5 h-2.5 rounded-full",
            isLLMConnected
              ? "bg-risk-low shadow-[0_0_6px_var(--color-risk-low)]"
              : "bg-risk-extreme shadow-[0_0_6px_var(--color-risk-extreme)]",
          )}
          title={`AI ${isLLMConnected ? "Connected" : "Disconnected"}`}
        />
        <div
          className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent),transparent_40%)]"
          title={`${activeAgentsCount} Agents`}
        />
      </div>
    </aside>
  );
}
