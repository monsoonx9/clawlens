"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, PieChart, Settings, Zap, Bot } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useHaptic } from "@/hooks/useHaptic";

const navItems = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Council", href: "/council", icon: Users },
  { name: "Assistant", href: "/assistant", icon: Bot },
  { name: "Web3", href: "/web3", icon: Zap },
  { name: "Portfolio", href: "/portfolio", icon: PieChart },
  { name: "More", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { trigger } = useHaptic();

  const handlePress = () => {
    trigger("light");
  };

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-50 bg-[color-mix(in_srgb,var(--color-bg),transparent_10%)] backdrop-blur-xl border border-[color-mix(in_srgb,var(--color-card-border),transparent_50%)] rounded-2xl shadow-glow-lg pb-safe">
      <nav className="flex justify-between items-center h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handlePress}
              className="flex flex-col items-center justify-center flex-1 h-full py-1 touch-manipulation"
            >
              <div
                className={twMerge(
                  clsx(
                    "flex items-center justify-center rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px]",
                    isActive
                      ? "bg-[color-mix(in_srgb,var(--color-accent),transparent_85%)]"
                      : "hover:bg-[color-mix(in_srgb,var(--color-card-border),transparent_50%)]",
                  ),
                )}
              >
                <item.icon
                  className={twMerge(
                    clsx(
                      "w-5 h-5 transition-colors",
                      isActive
                        ? "text-accent drop-shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent),transparent_60%)]"
                        : "text-text-secondary",
                    ),
                  )}
                />
              </div>
              <span
                className={twMerge(
                  clsx(
                    "text-[10px] font-medium transition-colors mt-0.5",
                    isActive ? "text-accent" : "text-text-secondary",
                  ),
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
