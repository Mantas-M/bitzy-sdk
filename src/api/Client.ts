import { Token, LiquiditySource, PathV3Response } from "../types";
import { API_ENDPOINTS, ERROR_CODES } from "../constants";
import { SwapError } from "../types";

export interface APIClientConfig {
  baseUrl: string;
  timeout: number;
  headers?: Record<string, string>;
}

export class APIClient {
  private static instance: APIClient | null = null;
  private config: APIClientConfig;

  private constructor(config: APIClientConfig) {
    this.config = config;
  }

  /**
   * Get singleton instance of APIClient
   * Initializes once with API key and reuses for all requests
   *
   * API Key Priority:
   * 1. Custom headers (if "authen-key" provided in config.headers)
   * 2. NEXT_PUBLIC_BITZY_API_KEY environment variable
   * 3. No authentication (if neither provided)
   */
  static getInstance(config: APIClientConfig): APIClient {
    if (!APIClient.instance) {
      // Add API key to headers if not already present

      console.log(3232, process.env.NEXT_PUBLIC_BITZY_API_KEY);
      const configWithApiKey = {
        ...config,
        headers: {
          // First: Environment variable (fallback)
          ...(process.env.NEXT_PUBLIC_BITZY_API_KEY && {
            "authen-key": process.env.NEXT_PUBLIC_BITZY_API_KEY,
          }),
          // Second: Custom headers (can override environment variable)
          ...config.headers,
        },
      };
      APIClient.instance = new APIClient(configWithApiKey);
    }
    return APIClient.instance;
  }

  /**
   * Reset singleton instance (useful for testing or API key changes)
   */
  static resetInstance(): void {
    APIClient.instance = null;
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new SwapError({
            message: "Request timeout",
            code: ERROR_CODES.API_ERROR,
            details: { endpoint, timeout: this.config.timeout },
          });
        }
        throw new SwapError({
          message: error.message,
          code: ERROR_CODES.API_ERROR,
          details: { endpoint, originalError: error },
        });
      }

      throw new SwapError({
        message: "Unknown API error",
        code: ERROR_CODES.API_ERROR,
        details: { endpoint, originalError: error },
      });
    }
  }

  /**
   * Get V3 path for swap routing
   */
  async getPathV3(
    srcToken: Token,
    dstToken: Token,
    amountIn: string,
    types: number[],
    enabledSources: number[]
  ): Promise<PathV3Response> {
    const params = {
      src: srcToken.address,
      dest: dstToken.address,
      amount: amountIn,
      typeId: types,
      sourceId: enabledSources,
    };

    const query = this.buildQueryString(params);

    return this.request<PathV3Response>(`${API_ENDPOINTS.PATH_V3}?${query}`, {
      method: "GET",
    });
  }

  /**
   * Get asset minimum partCount from SDK API
   * Returns minimum amounts for tokens to use multiple routes
   */
  async getAssetMinimum(): Promise<any> {
    return this.request<any>(API_ENDPOINTS.ASSET_MINIMUM, {
      method: "GET",
    });
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(queries: any): string {
    return Object.keys(queries)
      .reduce((result: any, key: string) => {
        return [
          ...result,
          `${key}=${
            Array.isArray(queries[key])
              ? '["' + queries[key].map((v: any) => v).join('","') + '"]'
              : queries[key]
          }`,
        ];
      }, [])
      .join("&");
  }
}
