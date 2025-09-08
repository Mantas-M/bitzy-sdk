import { Token, SwapResult, SwapOptions, SwapV3AddressConfig } from "../types";
import { SwapV3Service } from "../services/SwapV3Service";
import {
  getLiquiditySources,
  getContractAddresses,
  DEFAULT_PART_COUNT,
  DEFAULT_API_BASE_URL,
} from "../constants";
import { APIClient } from "../api/Client";
import { PublicClient } from "viem";

export interface FetchSwapRouteConfig {
  apiBaseUrl?: string;
  networks?: Record<number, any>;
  defaultPartCount?: number;
  timeout?: number;
  headers?: Record<string, string>;
  /**
   * Force a specific partCount, overriding intelligent calculation
   * - If provided, this value will be used instead of automatic calculation
   * - If not provided, uses intelligent address-based logic:
   *   - High-value tokens (BTC, ETH, USDC, USDT): partCount = 5 (better routing)
   *   - Low-value tokens (meme tokens, small caps): partCount = 1 (simpler routing)
   */
  forcePartCount?: number;
}

/**
 * Common function to fetch swap routes
 * Can be used in any JavaScript/TypeScript environment
 */
export async function fetchSwapRoute(
  options: SwapOptions,
  config: FetchSwapRouteConfig = {}
): Promise<SwapResult> {
  // Provide default values for optional config properties
  const {
    apiBaseUrl = DEFAULT_API_BASE_URL,
    defaultPartCount = DEFAULT_PART_COUNT,
    timeout = 30000,
    headers = {},
  } = config;

  // Get network-specific configuration
  const chainId = options.chainId;
  const networkConfig = getContractAddresses(chainId);

  if (!networkConfig) {
    throw new Error(`Unsupported network: ${chainId}`);
  }

  // Create proper APIClient instance
  const apiClient = APIClient.getInstance({
    baseUrl: apiBaseUrl,
    timeout: timeout,
    headers: headers,
  });

  const swapService = new SwapV3Service({
    config: {
      routerAddress: networkConfig.routerAddress,
      bitzyQueryAddress: networkConfig.bitzyQueryAddress,
      wrappedAddress: networkConfig.wrappedAddress,
      nativeAddress: networkConfig.nativeAddress,
    } as SwapV3AddressConfig,
    defaultPartCount: defaultPartCount,
    apiClient: apiClient,
  });

  return swapService.fetchRoute(options);
}

/**
 * Batch fetch multiple swap routes
 */
export async function fetchBatchSwapRoutes(
  swaps: Array<{ options: SwapOptions; config: FetchSwapRouteConfig }>
): Promise<Array<{ success: boolean; data?: SwapResult; error?: string }>> {
  const results = await Promise.allSettled(
    swaps.map(async ({ options, config }) => {
      try {
        const result = await fetchSwapRoute(options, config);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
  );

  return results.map((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return {
        success: false,
        error: result.reason?.message || "Unknown error",
      };
    }
  });
}

/**
 * Simple quote function
 */
export async function getSwapQuote(
  srcToken: Token,
  dstToken: Token,
  amountIn: string,
  chainId: number,
  config: FetchSwapRouteConfig = {}
): Promise<{ amountOut: string; routes: number }> {
  const result = await fetchSwapRoute(
    {
      amountIn,
      srcToken,
      dstToken,
      chainId,
    },
    config
  );

  return {
    amountOut: result.amountOutBN.toFixed(0),
    routes: result.routes.length,
  };
}

export interface SimplifiedSwapOptions {
  amountIn: string;
  srcToken: Token;
  dstToken: Token;
  chainId: number;
  partCount?: number;
  publicClient?: PublicClient;
}

/**
 * Simplified swap route fetching for 3rd party users
 * Automatically uses network-specific liquidity sources
 */
export async function fetchSwapRouteSimple(
  options: SimplifiedSwapOptions,
  config: FetchSwapRouteConfig = {}
): Promise<SwapResult> {
  const { types, enabledSources } = getLiquiditySources(options.chainId);

  return fetchSwapRoute(
    {
      ...options,
      types,
      enabledSources,
    },
    {
      ...config,
      forcePartCount: config.forcePartCount,
    }
  );
}

// Export as default for easier imports
export default fetchSwapRoute;
