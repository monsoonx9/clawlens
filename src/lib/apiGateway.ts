// ---------------------------------------------------------------------------
// API Gateway - Centralized API Request Handler
// Provides retry, rate limiting, and caching for all external API calls
// ---------------------------------------------------------------------------

import { cacheGet, cacheSet, generateCacheKey } from "./cache";
import { withRetry, RetryResult } from "./retry";
import { getRateLimiter, RateLimiter } from "./rateLimiter";

export interface ApiGatewayOptions {
  baseUrl: string;
  cacheTtl?: number;
  cachePrefix?: string;
  rateLimiter?: RateLimiter;
  retry?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: "apiGateway" | "cache";
  cached?: boolean;
  attempts?: number;
}

function generateParamsHash(params: Record<string, unknown>): string {
  return Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join("&");
}

class ApiGateway {
  private baseUrl: string;
  private cacheTtl: number;
  private cachePrefix: string;
  private rateLimiter: RateLimiter;
  private retryEnabled: boolean;

  constructor(options: ApiGatewayOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.cacheTtl = options.cacheTtl ?? 30;
    this.cachePrefix = options.cachePrefix ?? "api";
    this.rateLimiter = options.rateLimiter ?? getRateLimiter();
    this.retryEnabled = options.retry ?? true;
  }

  async fetch<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    options: {
      method?: "GET" | "POST";
      cacheTtl?: number;
      useCache?: boolean;
      retry?: boolean;
    } = {},
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      cacheTtl = this.cacheTtl,
      useCache = true,
      retry = this.retryEnabled,
    } = options;

    const cacheKey = generateCacheKey(this.cachePrefix, endpoint, generateParamsHash(params));

    if (useCache) {
      const cached = await cacheGet<T>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          source: "cache",
          cached: true,
        };
      }
    }

    const fetchFn = async (): Promise<T> => {
      const url = new URL(`${this.baseUrl}${endpoint}`);

      if (method === "GET" && Object.keys(params).length > 0) {
        Object.entries(params).forEach(([k, v]) => {
          url.searchParams.append(k, String(v));
        });
      }

      const response = await fetch(url.toString(), {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: method === "POST" ? JSON.stringify(params) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    };

    const executeWithRetry = async (): Promise<ApiResponse<T>> => {
      if (retry) {
        const result = await withRetry<T>(fetchFn);

        if (!result.success) {
          return {
            success: false,
            error: result.error,
            source: "apiGateway",
            attempts: result.attempts,
          };
        }

        if (useCache && result.data) {
          await cacheSet(cacheKey, result.data, { ttl: cacheTtl });
        }

        return {
          success: true,
          data: result.data,
          source: "apiGateway",
          attempts: result.attempts,
        };
      }

      const data = await fetchFn();

      if (useCache) {
        await cacheSet(cacheKey, data, { ttl: cacheTtl });
      }

      return {
        success: true,
        data,
        source: "apiGateway",
      };
    };

    try {
      return await this.rateLimiter.execute(executeWithRetry);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        source: "apiGateway",
      };
    }
  }

  async get<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    options?: {
      cacheTtl?: number;
      useCache?: boolean;
      retry?: boolean;
    },
  ): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, params, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    options?: {
      cacheTtl?: number;
      useCache?: boolean;
      retry?: boolean;
    },
  ): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, params, { ...options, method: "POST" });
  }
}

export function createApiGateway(options: ApiGatewayOptions): ApiGateway {
  return new ApiGateway(options);
}

export function getApiGateway(options?: Partial<ApiGatewayOptions>): ApiGateway {
  return new ApiGateway({
    baseUrl: options?.baseUrl ?? "",
    cacheTtl: options?.cacheTtl ?? 30,
    cachePrefix: options?.cachePrefix ?? "api",
    rateLimiter: options?.rateLimiter,
    retry: options?.retry ?? true,
  });
}
