// ---------------------------------------------------------------------------
// Skill Execution Limiter
// Limits concurrent skill executions per council session
// ---------------------------------------------------------------------------

import { RateLimiter, createRateLimiter } from "./rateLimiter";

const MAX_CONCURRENT_SKILLS = parseInt(process.env.MAX_CONCURRENT_SKILLS || "5", 10);

class SkillLimiter {
  private limiter: RateLimiter;
  private static instance: SkillLimiter;

  private constructor() {
    this.limiter = createRateLimiter({
      maxConcurrent: MAX_CONCURRENT_SKILLS,
      maxRequestsPerSecond: 20,
    });
  }

  static getInstance(): SkillLimiter {
    if (!SkillLimiter.instance) {
      SkillLimiter.instance = new SkillLimiter();
    }
    return SkillLimiter.instance;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.execute(fn);
  }

  getStats() {
    return this.limiter.getStats();
  }
}

export const skillLimiter = SkillLimiter.getInstance();

export async function withSkillThrottle<T>(fn: () => Promise<T>): Promise<T> {
  return skillLimiter.execute(fn);
}

export function getSkillLimiterStats() {
  return skillLimiter.getStats();
}
