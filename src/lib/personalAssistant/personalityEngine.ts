import { PersonalityType } from "@/types";

interface PersonalityConfig {
  tone: string;
  detailLevel: "brief" | "moderate" | "detailed";
  useEmojis: boolean;
  useTechnicalTerms: boolean;
  responseFormat: "paragraph" | "bullet" | "mixed";
  greetingStyle: string;
}

const PERSONALITY_CONFIGS: Record<PersonalityType, PersonalityConfig> = {
  friendly: {
    tone: "warm and conversational",
    detailLevel: "moderate",
    useEmojis: true,
    useTechnicalTerms: false,
    responseFormat: "paragraph",
    greetingStyle: "Hey there! 👋 ",
  },
  professional: {
    tone: "formal and concise",
    detailLevel: "brief",
    useEmojis: false,
    useTechnicalTerms: true,
    responseFormat: "bullet",
    greetingStyle: "Hello. ",
  },
  adaptive: {
    tone: "balanced and context-aware",
    detailLevel: "moderate",
    useEmojis: false,
    useTechnicalTerms: true,
    responseFormat: "mixed",
    greetingStyle: "",
  },
  technical: {
    tone: "precise and data-driven",
    detailLevel: "detailed",
    useEmojis: false,
    useTechnicalTerms: true,
    responseFormat: "bullet",
    greetingStyle: "",
  },
};

export class PersonalityEngine {
  private personality: PersonalityType;
  private config: PersonalityConfig;
  private userExpertiseLevel: "beginner" | "intermediate" | "advanced" = "intermediate";

  constructor(personality: PersonalityType = "adaptive") {
    this.personality = personality;
    this.config = PERSONALITY_CONFIGS[personality];
  }

  setPersonality(personality: PersonalityType): void {
    this.personality = personality;
    this.config = PERSONALITY_CONFIGS[personality];
  }

  getPersonality(): PersonalityType {
    return this.personality;
  }

  setUserExpertise(level: "beginner" | "intermediate" | "advanced"): void {
    this.userExpertiseLevel = level;
    if (this.personality === "adaptive") {
      if (level === "beginner") {
        this.config.detailLevel = "moderate";
      } else if (level === "advanced") {
        this.config.detailLevel = "detailed";
      }
    }
  }

  formatResponse(content: string, skillResults?: string[]): string {
    let formatted = content;

    if (this.config.useEmojis && this.personality === "friendly") {
      formatted = this.addEmojis(formatted);
    }

    if (this.config.responseFormat === "bullet" && !formatted.includes("\n•")) {
      formatted = this.toBulletPoints(formatted);
    }

    if (skillResults && skillResults.length > 0 && this.personality !== "technical") {
      formatted = this.addSkillContext(formatted, skillResults);
    }

    return formatted;
  }

  getGreeting(): string {
    return this.config.greetingStyle;
  }

  formatSystemPrompt(
    basePrompt: string,
    context?: {
      userName?: string;
      hasPortfolio?: boolean;
      recentTopics?: string[];
    },
  ): string {
    let prompt = basePrompt;

    if (this.personality === "friendly") {
      prompt +=
        "\n\nBe warm and friendly. Use emojis sparingly. Make complex things easy to understand.";
    } else if (this.personality === "technical") {
      prompt += "\n\nUse precise technical terminology. Include specific metrics and data points.";
    } else if (this.personality === "professional") {
      prompt += "\n\nBe concise and direct. Focus on actionable insights.";
    }

    if (context?.userName) {
      prompt += `\n\nUser's name: ${context.userName}`;
    }

    if (context?.hasPortfolio === false) {
      prompt += "\n\nNote: User hasn't connected their portfolio yet.";
    }

    return prompt;
  }

  shouldIncludeDetails(): boolean {
    return this.config.detailLevel !== "brief";
  }

  shouldUseTechnicalTerms(): boolean {
    return this.config.useTechnicalTerms || this.userExpertiseLevel === "advanced";
  }

  private addEmojis(text: string): string {
    let result = text;
    const emojiMap: Record<string, string> = {
      price: "💰",
      up: "📈",
      down: "📉",
      warning: "⚠️",
      success: "✅",
      error: "❌",
      portfolio: "💼",
      token: "🪙",
      whale: "🐋",
      news: "📰",
      analysis: "🔍",
      trend: "📊",
      alert: "🔔",
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (Math.random() > 0.7) {
        result = result.replace(new RegExp(`\\b${key}\\b`, "gi"), `${key} ${emoji}`);
      }
    }

    return result;
  }

  private toBulletPoints(text: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const bullets = sentences
      .filter((s) => s.length > 10)
      .map((s) => `• ${s.trim()}`)
      .join("\n");

    return bullets || text;
  }

  private addSkillContext(text: string, skills: string[]): string {
    const skillNames = skills.map((s) => s.replace(/-/g, " ")).join(", ");
    return `${text}\n\n_Used: ${skillNames}_`;
  }
}

export const personalityEngine = new PersonalityEngine();

export function createPersonalityEngine(personality: PersonalityType): PersonalityEngine {
  return new PersonalityEngine(personality);
}
