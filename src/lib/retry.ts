// ---------------------------------------------------------------------------
// Retry Utility with Exponential Backoff
// Provides configurable retry logic for API calls
// ---------------------------------------------------------------------------

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: "retry";
  attempts: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 500,
  maxDelay: 10000,
  onRetry: () => {},
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        source: "retry",
        attempts: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxAttempts) {
        const delay = Math.min(opts.baseDelay * Math.pow(2, attempt - 1), opts.maxDelay);
        opts.onRetry(attempt, lastError);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "Unknown error after retries",
    source: "retry",
    attempts: opts.maxAttempts,
  };
}

export function createRetryable<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): () => Promise<RetryResult<T>> {
  return () => withRetry(fn, options);
}
