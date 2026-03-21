import { describe, it, expect } from "vitest";
import { routeQuery } from "@/lib/arbiter";
import { AgentName } from "@/types";

const ALL_AGENTS: AgentName[] = [
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
];

describe("routeQuery", () => {
  describe("BSC/BNB Chain queries", () => {
    it("should route BSC trending queries to BLAZE, SHADOW, THE_WARDEN, LENS", () => {
      const result = routeQuery("What tokens are trending on BSC?", ALL_AGENTS);
      expect(result).toContain("BLAZE");
      expect(result).toContain("SHADOW");
      expect(result).toContain("THE_WARDEN");
      expect(result).toContain("LENS");
    });

    it("should route BSC whale queries to BLAZE and SHADOW", () => {
      const result = routeQuery("Show BSC whale activity", ALL_AGENTS);
      expect(result).toContain("BLAZE");
      expect(result).toContain("SHADOW");
    });

    it("should route BSC token queries to BLAZE", () => {
      const result = routeQuery("Analyze this BSC token", ALL_AGENTS);
      expect(result).toContain("BLAZE");
    });
  });

  describe("Institutional Flow queries", () => {
    it("should route institutional flow queries to SHADOW, FUTURES, SCOUT", () => {
      const result = routeQuery("Where is institutional money flowing?", ALL_AGENTS);
      expect(result).toContain("SHADOW");
      expect(result).toContain("FUTURES");
      expect(result).toContain("SCOUT");
    });

    it("should route smart money accumulation queries to SHADOW and SCOUT", () => {
      const result = routeQuery("Is smart money accumulating BTC?", ALL_AGENTS);
      expect(result).toContain("SHADOW");
      expect(result).toContain("SCOUT");
    });
  });

  describe("Price Alerts queries", () => {
    it("should route alert queries to LEDGER and PULSE", () => {
      const result = routeQuery("Alert me when BTC hits 100k", ALL_AGENTS);
      expect(result).toContain("LEDGER");
      expect(result).toContain("PULSE");
    });

    it("should route notification queries to LEDGER", () => {
      const result = routeQuery("Set a price notification", ALL_AGENTS);
      expect(result).toContain("LEDGER");
    });
  });

  describe("Futures/Perpetual queries", () => {
    it("should route futures queries to FUTURES, LENS, SHADOW, THE_WARDEN", () => {
      const result = routeQuery("What's the funding rate on BTC futures?", ALL_AGENTS);
      expect(result).toContain("FUTURES");
      expect(result).toContain("LENS");
      expect(result).toContain("SHADOW");
      expect(result).toContain("THE_WARDEN");
    });

    it("should route leverage queries to FUTURES and THE_WARDEN", () => {
      const result = routeQuery("What's the best leverage for this trade?", ALL_AGENTS);
      expect(result).toContain("FUTURES");
      expect(result).toContain("THE_WARDEN");
    });

    it("should route liquidation queries to THE_WARDEN", () => {
      const result = routeQuery("When is the next liquidation cascade?", ALL_AGENTS);
      expect(result).toContain("THE_WARDEN");
    });
  });

  describe("Trading Signals queries", () => {
    it("should route signal queries to SHADOW, THE_WARDEN, SCOUT", () => {
      const result = routeQuery("What are the best buy signals right now?", ALL_AGENTS);
      expect(result).toContain("SHADOW");
      expect(result).toContain("THE_WARDEN");
      expect(result).toContain("SCOUT");
    });

    it("should route entry/exit queries to SHADOW", () => {
      const result = routeQuery("What's a good entry point for SOL?", ALL_AGENTS);
      expect(result).toContain("SHADOW");
    });
  });

  describe("Social/Posting queries", () => {
    it("should route posting queries to SCOUT, LEDGER, SAGE", () => {
      const result = routeQuery("Post this analysis to Binance Square", ALL_AGENTS);
      expect(result).toContain("SCOUT");
      expect(result).toContain("LEDGER");
      expect(result).toContain("SAGE");
    });

    it("should route share queries to SAGE for advice", () => {
      const result = routeQuery("Share my portfolio on social media", ALL_AGENTS);
      expect(result).toContain("SAGE");
    });
  });

  describe("NFT queries", () => {
    it("should route NFT queries to LEDGER, LENS, SHADOW, PULSE", () => {
      const result = routeQuery("What are the trending NFT collections?", ALL_AGENTS);
      expect(result).toContain("LEDGER");
      expect(result).toContain("LENS");
      expect(result).toContain("SHADOW");
      expect(result).toContain("PULSE");
    });

    it("should route NFT volume queries to PULSE", () => {
      const result = routeQuery("NFT trading volume this week", ALL_AGENTS);
      expect(result).toContain("PULSE");
    });
  });

  describe("DeFi/Yield queries", () => {
    it("should route DeFi queries to BLAZE, SHADOW, THE_WARDEN, LEDGER", () => {
      const result = routeQuery("Best yield farming opportunities on BSC?", ALL_AGENTS);
      expect(result).toContain("BLAZE");
      expect(result).toContain("SHADOW");
      expect(result).toContain("THE_WARDEN");
      expect(result).toContain("LEDGER");
    });

    it("should route yield queries to BLAZE", () => {
      const result = routeQuery("Best yield farming on BSC?", ALL_AGENTS);
      expect(result).toContain("BLAZE");
    });

    it("should route DEX queries to BLAZE", () => {
      const result = routeQuery("Best DEX for swapping on BSC?", ALL_AGENTS);
      expect(result).toContain("BLAZE");
    });
  });

  describe("Market Metrics queries", () => {
    it("should route market cap queries to SCOUT, LENS, PULSE", () => {
      const result = routeQuery("What's the market cap of BNB?", ALL_AGENTS);
      expect(result).toContain("SCOUT");
      expect(result).toContain("LENS");
      expect(result).toContain("PULSE");
    });

    it("should route circulating supply queries to SCOUT", () => {
      const result = routeQuery("What is the circulating supply of CAKE?", ALL_AGENTS);
      expect(result).toContain("SCOUT");
    });
  });

  describe("Wallet Clustering queries", () => {
    it("should route cluster queries to SHADOW and BLAZE", () => {
      const result = routeQuery("Find related wallets to this address", ALL_AGENTS);
      expect(result).toContain("SHADOW");
      expect(result).toContain("BLAZE");
    });

    it("should route coordinated wallet queries to SHADOW", () => {
      const result = routeQuery("Show me coordinated wallets", ALL_AGENTS);
      expect(result).toContain("SHADOW");
    });
  });

  describe("Trending queries", () => {
    it("should route trending BSC queries to SCOUT and BLAZE", () => {
      const result = routeQuery("What's trending on BSC right now?", ALL_AGENTS);
      expect(result).toContain("SCOUT");
      expect(result).toContain("BLAZE");
    });
  });

  describe("Edge cases", () => {
    it("should return minimum 3 agents when no patterns match", () => {
      const result = routeQuery("Hello how are you", ALL_AGENTS);
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it("should not exceed 6 agents", () => {
      const result = routeQuery(
        "What's trending on BSC, show me whale activity and funding rates",
        ALL_AGENTS,
      );
      expect(result.length).toBeLessThanOrEqual(6);
    });

    it("should filter out disabled agents", () => {
      const enabledOnly: AgentName[] = ["SCOUT", "LEDGER", "PULSE"];
      const result = routeQuery("What's trending on BSC?", enabledOnly);
      expect(result.every((a) => enabledOnly.includes(a))).toBe(true);
    });
  });
});
