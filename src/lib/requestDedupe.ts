// ---------------------------------------------------------------------------
// Request Deduplication Module for ClawLens
// Prevents duplicate API requests by tracking in-flight requests
// ---------------------------------------------------------------------------

const inFlightRequests = new Map<string, Promise<unknown>>();

function generateRequestKey(endpoint: string, params: Record<string, unknown> = {}): string {
  const normalizedParams = Object.keys(params)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = params[key];
        return acc;
      },
      {} as Record<string, unknown>,
    );

  return `${endpoint}:${JSON.stringify(normalizedParams)}`;
}

export async function dedupedFetch<T>(
  endpoint: string,
  params: Record<string, unknown>,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const key = generateRequestKey(endpoint, params);

  if (inFlightRequests.has(key)) {
    console.log(`[Dedupe] Returning in-flight request for: ${key.substring(0, 50)}...`);
    return inFlightRequests.get(key) as Promise<T>;
  }

  const promise = fetchFn().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

export function clearDedupeCache(): void {
  inFlightRequests.clear();
}

export function getDedupeStats(): { pending: number; keys: string[] } {
  return {
    pending: inFlightRequests.size,
    keys: Array.from(inFlightRequests.keys()),
  };
}
