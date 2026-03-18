"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  History,
  PieChart,
  Settings,
  Home,
  Zap,
  TrendingUp,
  Shield,
  X,
} from "lucide-react";

const NAV_ACTIONS = [
  {
    id: "dashboard",
    name: "Dashboard",
    shortcut: ["G", "D"],
    icon: Home,
    route: "/dashboard",
  },
  {
    id: "council",
    name: "Start New Council",
    shortcut: ["O", "C"],
    icon: Zap,
    route: "/council",
  },
  {
    id: "portfolio",
    name: "View Portfolio",
    shortcut: ["G", "P"],
    icon: PieChart,
    route: "/portfolio",
  },
  {
    id: "history",
    name: "Council History",
    shortcut: ["G", "H"],
    icon: History,
    route: "/history",
  },
  {
    id: "settings",
    name: "Settings",
    shortcut: ["G", "S"],
    icon: Settings,
    route: "/settings",
  },
] as const;

const QUICK_QUERIES = [
  {
    id: "trending",
    name: "What are the top trending tokens right now?",
    icon: TrendingUp,
    query: "What are the top trending tokens right now?",
  },
  {
    id: "risk",
    name: "Analyze my portfolio risk",
    icon: Shield,
    query: "Analyze my portfolio risk",
  },
  {
    id: "signals",
    name: "Show me smart money signals",
    icon: TrendingUp,
    query: "Show me smart money signals",
  },
  {
    id: "fear",
    name: "What's the overall market fear/greed level?",
    icon: TrendingUp,
    query: "What's the overall market fear/greed level?",
  },
] as const;

type NavAction = (typeof NAV_ACTIONS)[number];
type QuickQuery = (typeof QUICK_QUERIES)[number];
type CommandItem = NavAction | QuickQuery;

export function CommandPalette() {
  return <CommandPaletteInner />;
}

function CommandPaletteInner() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const allItems: CommandItem[] = [...NAV_ACTIONS, ...QUICK_QUERIES];
  const filteredItems = allItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = useCallback(
    (item: CommandItem) => {
      setIsOpen(false);
      if ("query" in item && item.query) {
        router.push(`/council?query=${encodeURIComponent(item.query)}`);
      } else {
        router.push((item as NavAction).route);
      }
    },
    [router],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, handleSelect]);

  const isQuickQuery = (item: CommandItem): item is QuickQuery => {
    return "query" in item;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[color-mix(in_srgb,var(--color-bg),transparent_20%)] backdrop-blur-md z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] px-4 sm:px-0 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl bg-bg border border-card-border rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              <div className="flex items-center px-4 py-3 border-b border-card-border">
                <Search className="w-5 h-5 text-text-muted mr-3" />
                <input
                  ref={inputRef}
                  type="text"
                  aria-label="Search commands and quick queries"
                  className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder-text-muted text-lg"
                  placeholder="Type a command or search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-card-hover transition-colors"
                  aria-label="Close command palette"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {filteredItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-text-muted">
                    No results found for{" "}
                    <span className="text-text-primary font-medium">&quot;{search}&quot;</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs text-text-muted font-semibold uppercase tracking-wider">
                      Navigation
                    </div>
                    {filteredItems
                      .filter((item) => !isQuickQuery(item))
                      .map((item) => {
                        const navItem = item as NavAction;
                        const idx = filteredItems.indexOf(item);
                        const isSelected = idx === selectedIndex;
                        return (
                          <button
                            key={navItem.id}
                            className={`w-full flex items-center px-3 py-3 rounded-xl transition-colors ${isSelected ? "bg-[color-mix(in_srgb,var(--color-accent),transparent_85%)] border border-[color-mix(in_srgb,var(--color-accent),transparent_70%)] text-accent" : "bg-transparent border border-transparent text-text-secondary hover:bg-card-hover hover:text-text-primary"}`}
                            onClick={() => handleSelect(navItem)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-card">
                              <navItem.icon className="w-4 h-4" />
                            </div>
                            <span className="font-medium flex-1 text-left">{navItem.name}</span>
                            <div className="flex items-center gap-1">
                              {navItem.shortcut.map((key) => (
                                <kbd
                                  key={key}
                                  className="bg-card text-text-muted rounded border border-card-border px-2 py-0.5 text-xs font-mono"
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          </button>
                        );
                      })}

                    <div className="px-3 py-2 text-xs text-text-muted font-semibold uppercase tracking-wider mt-2">
                      Quick Queries
                    </div>
                    {filteredItems
                      .filter((item) => isQuickQuery(item))
                      .map((item) => {
                        const queryItem = item as QuickQuery;
                        const idx = filteredItems.indexOf(item);
                        const isSelected = idx === selectedIndex;
                        return (
                          <button
                            key={queryItem.id}
                            className={`w-full flex items-center px-3 py-3 rounded-xl transition-colors ${isSelected ? "bg-[color-mix(in_srgb,var(--color-accent),transparent_85%)] border border-[color-mix(in_srgb,var(--color-accent),transparent_70%)] text-accent" : "bg-transparent border border-transparent text-text-secondary hover:bg-card-hover hover:text-text-primary"}`}
                            onClick={() => handleSelect(queryItem)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-card">
                              <queryItem.icon className="w-4 h-4" />
                            </div>
                            <span className="font-medium flex-1 text-left text-sm">
                              {queryItem.name}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 bg-card border-t border-card-border flex items-center justify-between text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <span>Navigate</span>
                  <kbd className="bg-card border border-card-border rounded px-1.5 py-0.5 font-mono">
                    ↑
                  </kbd>
                  <kbd className="bg-card border border-card-border rounded px-1.5 py-0.5 font-mono">
                    ↓
                  </kbd>
                </div>
                <div className="flex items-center gap-2">
                  <span>Open</span>
                  <kbd className="bg-card border border-card-border rounded px-1.5 py-0.5 font-mono">
                    ↵
                  </kbd>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export function CommandPaletteWithSuspense() {
  return (
    <Suspense fallback={null}>
      <CommandPalette />
    </Suspense>
  );
}
