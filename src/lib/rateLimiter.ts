// ---------------------------------------------------------------------------
// Rate Limiter Utility
// Provides configurable rate limiting for API calls
// Uses token bucket algorithm with environment variable configuration
// ---------------------------------------------------------------------------

interface RateLimiterOptions {
  maxConcurrent?: number;
  maxRequestsPerSecond?: number;
}

interface QueueItem {
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

export class RateLimiter {
  private maxConcurrent: number;
  private maxRequestsPerSecond: number;
  private concurrentCount = 0;
  private requestTimestamps: number[] = [];
  private queue: QueueItem[] = [];
  private processing = false;

  constructor(options: RateLimiterOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? this.getFromEnv("MAX_CONCURRENT_API_REQUESTS", 5);
    this.maxRequestsPerSecond =
      options.maxRequestsPerSecond ?? this.getFromEnv("MAX_API_REQUESTS_PER_SECOND", 10);
  }

  private getFromEnv(key: string, defaultValue: number): number {
    const envValue = process.env[key];
    if (envValue !== undefined) {
      const parsed = parseInt(envValue, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  private async waitForSlot(): Promise<void> {
    if (this.concurrentCount >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.concurrentCount < this.maxConcurrent) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
      });
    }

    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < 1000);

    if (this.requestTimestamps.length >= this.maxRequestsPerSecond) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = 1000 - (now - oldestTimestamp);
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.concurrentCount++;
    this.requestTimestamps.push(Date.now());
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      await this.waitForSlot();

      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      } finally {
        this.concurrentCount--;
      }
    }

    this.processing = false;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processQueue();
    });
  }

  getStats(): {
    concurrent: number;
    queued: number;
    maxConcurrent: number;
    maxPerSecond: number;
  } {
    return {
      concurrent: this.concurrentCount,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxPerSecond: this.maxRequestsPerSecond,
    };
  }
}

const globalLimiter = new RateLimiter();

export function getRateLimiter(): RateLimiter {
  return globalLimiter;
}

export function createRateLimiter(options?: RateLimiterOptions): RateLimiter {
  return new RateLimiter(options);
}

export async function withRateLimit<T>(fn: () => Promise<T>, limiter?: RateLimiter): Promise<T> {
  const activeLimiter = limiter ?? globalLimiter;
  return activeLimiter.execute(fn);
}
