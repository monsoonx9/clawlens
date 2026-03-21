import { PortfolioSnapshot, UserPreferences } from "@/types";

// ---------------------------------------------------------------------------
// Skill System Types — The foundation for all Claw Council skills
// ---------------------------------------------------------------------------

/** A parameter definition for a skill's input schema. */
export interface SkillParam {
  type: "string" | "number" | "boolean" | "array" | "object";
  required: boolean;
  description: string;
  default?: string | number | boolean | string[] | Record<string, unknown>;
}

/** Runtime context passed to every skill execution. */
export interface SkillContext {
  sessionId?: string;
  apiKeys: {
    binanceApiKey: string;
    binanceSecretKey: string;
    llmProvider?: string;
    llmApiKey?: string;
    llmModel?: string;
    llmBaseUrl?: string;
    llmEndpoint?: string;
    llmDeploymentName?: string;
    squareApiKey?: string;
  };
  portfolio?: PortfolioSnapshot;
  preferences?: UserPreferences;
}

/** The result returned by every skill execution. */
export interface SkillResult {
  success: boolean;
  data: Record<string, unknown>;
  summary: string;
  error?: string;
}

/** A Claw Council skill definition. */
export interface Skill {
  id: string;
  name: string;
  description: string;
  namespace: "claw-council" | "binance" | "bsc" | "binance-square";
  version: string;
  inputSchema: Record<string, SkillParam>;
  execute: (input: Record<string, unknown>, context: SkillContext) => Promise<SkillResult>;
}
