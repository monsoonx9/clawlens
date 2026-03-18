import { create } from "zustand";
import { useEffect, useState } from "react";
import {
  APIKeys,
  PortfolioSnapshot,
  UserPreferences,
  CouncilSession,
  AgentResponse,
  ArbitersVerdict,
  AgentName,
  WatchlistToken,
  WhaleWallet,
  WhaleWalletSnapshot,
  AppState,
} from "../types/index";

const MAX_WHALE_WALLETS = 20;
const MAX_WATCHLIST = 50;

const defaultPreferences: UserPreferences = {
  riskTolerance: 5,
  defaultInvestmentSize: 100,
  maxPerTrade: 500,
  maxPerToken: 1000,
  enabledAgents: [
    "SCOUT",
    "THE_WARDEN",
    "LENS",
    "SHADOW",
    "LEDGER",
    "PULSE",
    "SAGE",
    "QUILL",
    "FUTURES",
    "BLAZE",
  ],
  watchlist: [],
  whaleWallets: [],
};

interface AppStoreActions {
  setAPIKeys: (keys: APIKeys) => void;
  clearAPIKeys: () => void;
  clearAllUserData: () => void;
  setOnboarded: (value: boolean) => void;
  setPortfolio: (snapshot: PortfolioSnapshot) => void;
  updatePreferences: (partial: Partial<UserPreferences>) => void;
  saveToLocalStorage: () => void;
  startNewSession: (query: string) => void;
  addAgentResponse: (response: AgentResponse) => void;
  updateAgentResponse: (agentId: AgentName, updates: Partial<AgentResponse>) => void;
  setVerdict: (verdict: ArbitersVerdict) => void;
  finalizeSession: () => void;
  clearSessions: () => void;
  toggleAgent: (agentId: AgentName) => void;
  addToWatchlist: (token: WatchlistToken) => void;
  removeFromWatchlist: (address: string) => void;
  addWhaleWallet: (wallet: WhaleWallet) => void;
  removeWhaleWallet: (address: string) => void;
  updateWhaleSnapshots: (
    snapshots: Array<{
      address: string;
      holdings: Array<{
        token: string;
        contractAddress: string;
        chain: string;
        valueUSD: number;
      }>;
      timestamp: string;
    }>,
  ) => void;
  setLoading: (isLoading: boolean) => void;
  hydrateStore: (
    apiKeys: APIKeys | null,
    preferences: UserPreferences | null,
    isOnboarded: boolean,
    sessions?: CouncilSession[],
  ) => void;
  updateArbiterStream: (chunk: string) => void;
  setIsPortfolioRefreshing: (isRefreshing: boolean) => void;
  updateRoundProgress: (roundProgress: {
    currentRound: number;
    maxRounds: number;
    reportsCount: number;
  }) => void;
  updateConsensus: (consensus: {
    hasConsensus: boolean;
    agreement: number;
    direction?: "positive" | "negative";
  }) => void;
  saveKeysToServer: (keys: APIKeys) => Promise<boolean>;
  loadKeysFromServer: () => Promise<APIKeys | null>;
}

interface FullStore extends AppState, AppStoreActions {
  isLoading: boolean;
  isPortfolioRefreshing: boolean;
}

export const useAppStore = create<FullStore>((set, get) => ({
  apiKeys: null,
  isOnboarded: false,
  portfolio: null,
  preferences: defaultPreferences,
  sessions: [],
  activeSession: null,
  isLoading: false,
  isPortfolioRefreshing: false,

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setIsPortfolioRefreshing: (isRefreshing: boolean) => set({ isPortfolioRefreshing: isRefreshing }),

  hydrateStore: (apiKeys, preferences, isOnboarded, sessions) =>
    set({
      apiKeys,
      preferences: preferences || defaultPreferences,
      isOnboarded,
      sessions: sessions || [],
    }),

  setAPIKeys: (keys) => {
    set({ apiKeys: keys });
  },

  saveKeysToServer: async (keys: APIKeys): Promise<boolean> => {
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });

      if (!response.ok) {
        console.error("Failed to save keys to server");
        return false;
      }

      set({ apiKeys: keys });
      return true;
    } catch (error) {
      console.error("Failed to save keys to server:", error);
      return false;
    }
  },

  loadKeysFromServer: async (): Promise<APIKeys | null> => {
    try {
      const response = await fetch("/api/keys", {
        credentials: "include",
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data.hasKeys || !data.keys) {
        return null;
      }

      const keys: APIKeys = {
        binanceApiKey: data.keys.binanceApiKey || "",
        binanceSecretKey: data.keys.binanceSecretKey || "",
        llmProvider: data.keys.llmProvider,
        llmApiKey: data.keys.llmApiKey || "",
        llmModel: data.keys.llmModel,
        llmBaseUrl: data.keys.llmBaseUrl || "",
        llmEndpoint: data.keys.llmEndpoint || "",
        llmDeploymentName: data.keys.llmDeploymentName || "",
        squareApiKey: data.keys.squareApiKey || "",
      };

      set({ apiKeys: keys });
      return keys;
    } catch (error) {
      console.error("Failed to load keys from server:", error);
      return null;
    }
  },

  clearAPIKeys: async () => {
    try {
      await fetch("/api/keys", {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to clear keys from server:", error);
    }
    set({ apiKeys: null });
  },

  clearAllUserData: () => {
    const keysToRemove = [
      "clawlens_api_keys",
      "clawlens_preferences",
      "clawlens_sessions",
      "clawlens_notifications",
      "clawlens_price_alerts",
      "clawlens_triggered_watchlist_alerts",
      "clawlens_is_onboarded",
      "cl-vault-banner-dismissed",
    ];

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore errors for individual keys
      }
    });

    set({
      apiKeys: null,
      isOnboarded: false,
      preferences: defaultPreferences,
      sessions: [],
      activeSession: null,
      portfolio: null,
    });
  },

  setOnboarded: (value) => {
    set({ isOnboarded: value });
    try {
      localStorage.setItem("clawlens_is_onboarded", JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save onboarded state to localStorage", error);
    }
  },

  setPortfolio: (snapshot) => set({ portfolio: snapshot }),

  updatePreferences: (partial) => {
    set((state) => ({
      preferences: { ...state.preferences, ...partial },
    }));
    get().saveToLocalStorage();
  },

  saveToLocalStorage: () => {
    const state = get();
    try {
      localStorage.setItem("clawlens_preferences", JSON.stringify(state.preferences));
      localStorage.setItem("clawlens_is_onboarded", JSON.stringify(state.isOnboarded));
    } catch (error) {
      console.error("Failed to save to localStorage", error);
    }
  },

  startNewSession: (query) => {
    const newSession: CouncilSession = {
      id: crypto.randomUUID(),
      query,
      timestamp: new Date(),
      agentResponses: [],
      verdict: null,
      arbiterStreamText: "", // Reset arbiterStreamText for a new session
      relevantAgents: get().preferences.enabledAgents,
    };
    set({ activeSession: newSession });
  },

  addAgentResponse: (response) => {
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          agentResponses: [...state.activeSession.agentResponses, response],
        },
      };
    });
  },

  updateArbiterStream: (chunk: string) => {
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          arbiterStreamText: (state.activeSession.arbiterStreamText || "") + chunk,
        },
      };
    });
  },

  updateAgentResponse: (agentId, updates) => {
    set((state) => {
      if (!state.activeSession) return state;
      const updatedResponses = state.activeSession.agentResponses.map((r) =>
        r.agentId === agentId ? { ...r, ...updates } : r,
      );
      return {
        activeSession: {
          ...state.activeSession,
          agentResponses: updatedResponses,
        },
      };
    });
  },

  setVerdict: (verdict) => {
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          verdict,
        },
      };
    });
  },

  updateRoundProgress: (roundProgress: {
    currentRound: number;
    maxRounds: number;
    reportsCount: number;
  }) => {
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          roundProgress,
        },
      };
    });
  },

  updateConsensus: (consensus: {
    hasConsensus: boolean;
    agreement: number;
    direction?: "positive" | "negative";
  }) => {
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          consensus,
        },
      };
    });
  },

  finalizeSession: () => {
    set((state) => {
      if (!state.activeSession) return state;
      const updatedSessions = [state.activeSession, ...state.sessions];
      // Persist sessions to localStorage (keep only last 50 to avoid storage bloat)
      try {
        const toStore = updatedSessions.slice(0, 50);
        localStorage.setItem("clawlens_sessions", JSON.stringify(toStore));
      } catch (e) {
        console.error("Failed to persist sessions", e);
      }
      return {
        sessions: updatedSessions,
        activeSession: null,
      };
    });
  },

  clearSessions: () => {
    set({ sessions: [], activeSession: null });
    try {
      localStorage.removeItem("clawlens_sessions");
    } catch (e) {
      console.error("Failed to clear sessions from localStorage", e);
    }
  },

  toggleAgent: (agentId) => {
    set((state) => {
      const current = state.preferences.enabledAgents;
      const nextAgents = current.includes(agentId)
        ? current.filter((id) => id !== agentId)
        : [...current, agentId];

      const newPreferences = {
        ...state.preferences,
        enabledAgents: nextAgents,
      };
      get().updatePreferences(newPreferences);
      return state;
    });
  },

  addToWatchlist: (token) => {
    set((state) => {
      // Enforce max watchlist limit to prevent localStorage overflow
      if (state.preferences.watchlist.length >= MAX_WATCHLIST) {
        console.warn(
          `Maximum of ${MAX_WATCHLIST} watchlist items allowed. Please remove one first.`,
        );
        return state;
      }
      // Remove existing token with same contract address to avoid duplicates
      const updatedWatchlist = state.preferences.watchlist.filter(
        (t) => t.contractAddress !== token.contractAddress,
      );
      updatedWatchlist.push(token);

      // Save to localStorage
      try {
        const newPreferences = {
          ...state.preferences,
          watchlist: updatedWatchlist,
        };
        localStorage.setItem("clawlens_preferences", JSON.stringify(newPreferences));
      } catch (error) {
        console.error("Failed to save watchlist:", error);
      }

      // Return new state to trigger re-render
      return {
        ...state,
        preferences: {
          ...state.preferences,
          watchlist: updatedWatchlist,
        },
      };
    });
  },

  removeFromWatchlist: (address) => {
    set((state) => {
      const newWatchlist = state.preferences.watchlist.filter((t) => t.contractAddress !== address);

      // Save to localStorage
      try {
        const newPreferences = {
          ...state.preferences,
          watchlist: newWatchlist,
        };
        localStorage.setItem("clawlens_preferences", JSON.stringify(newPreferences));
      } catch (error) {
        console.error("Failed to save watchlist:", error);
      }

      return {
        ...state,
        preferences: {
          ...state.preferences,
          watchlist: newWatchlist,
        },
      };
    });
  },

  addWhaleWallet: (wallet) => {
    set((state) => {
      // Enforce max whale wallet limit to prevent localStorage overflow
      if (state.preferences.whaleWallets.length >= MAX_WHALE_WALLETS) {
        console.warn(
          `Maximum of ${MAX_WHALE_WALLETS} whale wallets allowed. Please remove one first.`,
        );
        return state;
      }
      // Remove existing wallet with same address to avoid duplicates
      const updatedWallets = state.preferences.whaleWallets.filter(
        (w) => w.address !== wallet.address,
      );
      updatedWallets.push(wallet);

      // Save to localStorage
      try {
        const newPreferences = {
          ...state.preferences,
          whaleWallets: updatedWallets,
        };
        localStorage.setItem("clawlens_preferences", JSON.stringify(newPreferences));
      } catch (error) {
        console.error("Failed to save whale wallets:", error);
      }

      return {
        ...state,
        preferences: {
          ...state.preferences,
          whaleWallets: updatedWallets,
        },
      };
    });
  },

  removeWhaleWallet: (address) => {
    set((state) => {
      const newWhaleWallets = state.preferences.whaleWallets.filter((w) => w.address !== address);

      // Save to localStorage
      try {
        const newPreferences = {
          ...state.preferences,
          whaleWallets: newWhaleWallets,
        };
        localStorage.setItem("clawlens_preferences", JSON.stringify(newPreferences));
      } catch (error) {
        console.error("Failed to save whale wallets:", error);
      }

      return {
        ...state,
        preferences: {
          ...state.preferences,
          whaleWallets: newWhaleWallets,
        },
      };
    });
  },

  updateWhaleSnapshots: (
    snapshots: Array<{
      address: string;
      holdings: Array<{
        token: string;
        contractAddress: string;
        chain: string;
        valueUSD: number;
      }>;
      timestamp: string;
    }>,
  ) => {
    set((state) => {
      const updatedWallets = state.preferences.whaleWallets.map((wallet) => {
        const snapshot = snapshots.find(
          (s) => s.address.toLowerCase() === wallet.address.toLowerCase(),
        );
        if (snapshot) {
          return {
            ...wallet,
            lastSnapshot: {
              holdings: snapshot.holdings,
              timestamp: snapshot.timestamp,
            },
          };
        }
        return wallet;
      });
      const newPreferences = {
        ...state.preferences,
        whaleWallets: updatedWallets,
      };
      // Save immediately after updating
      try {
        localStorage.setItem("clawlens_preferences", JSON.stringify(newPreferences));
      } catch (error) {
        console.error("Failed to save whale snapshots:", error);
      }
      return { preferences: newPreferences };
    });
  },
}));

export function useHydration(): boolean {
  const [isHydrated, setIsHydrated] = useState(false);
  const hydrateStore = useAppStore((state) => state.hydrateStore);
  const loadKeysFromServer = useAppStore((state) => state.loadKeysFromServer);

  useEffect(() => {
    let storedPreferences: UserPreferences | null = null;
    let storedOnboarded = false;

    // Load keys from server (secure key vault)
    loadKeysFromServer().then((serverKeys) => {
      // Hydrate preferences and other data from localStorage
      try {
        const localPrefs = localStorage.getItem("clawlens_preferences");
        if (localPrefs) {
          storedPreferences = JSON.parse(localPrefs);
        }

        const localOnboarded = localStorage.getItem("clawlens_is_onboarded");
        if (localOnboarded) {
          storedOnboarded = JSON.parse(localOnboarded);
        }
      } catch (e) {
        console.error("Failed to parse preferences from localStorage", e);
      }

      hydrateStore(serverKeys, storedPreferences, storedOnboarded);

      // Hydrate sessions
      try {
        const localSessions = localStorage.getItem("clawlens_sessions");
        if (localSessions) {
          const parsed = JSON.parse(localSessions) as CouncilSession[];
          const sessions: CouncilSession[] = parsed.map((s) => ({
            ...s,
            timestamp: new Date(s.timestamp),
            agentResponses:
              s.agentResponses?.map((r) => ({
                ...r,
                timestamp: new Date(r.timestamp),
              })) || [],
          }));
          useAppStore.setState({ sessions });
        }
      } catch (e) {
        console.error("Failed to parse sessions from localStorage", e);
      }

      const frame = requestAnimationFrame(() => setIsHydrated(true));
      return () => cancelAnimationFrame(frame);
    });
  }, [hydrateStore, loadKeysFromServer]);

  return isHydrated;
}
