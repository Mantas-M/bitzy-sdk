import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Token,
  SwapResult,
  SwapOptions,
  SwapV3AddressConfig,
  UseSwapV3RoutesConfig,
  UseSwapV3RoutesAddressConfig,
} from "../types";
import { debounce } from "../utils";
import { SwapV3Service } from "../services/SwapV3Service";
import { APIClient } from "../api/Client";
import BigNumber from "bignumber.js";
import { Address, zeroAddress } from "viem";
import { PublicClient } from "viem";
import {
  getPartCountOffline,
  getPartCountOnline,
  getPartCountWithFallback,
} from "../utils/PartCount";
import {
  getContractAddresses,
  getLiquiditySources,
  DEFAULT_API_BASE_URL,
} from "../constants";

export interface UseSwapV3RoutesReturn {
  routes: any[][];
  distributions: number[];
  amountOutRoutes: any[];
  amountOutBN: BigNumber;
  amountInParts: any[];
  fetchRoute: () => Promise<void>;
  isLoading: boolean;
  isAmountOutError: boolean;
  isFirstFetch: boolean;
  isWrap?: "wrap" | "unwrap";
  error: string | null;
  clearError: () => void;
}

// Type for debounced function with cancel method
interface DebouncedFunction {
  (): void;
  cancel: () => void;
}

/**
 * Hot React Hook for Bitzy Swap V3 Routes
 *
 * Provides real-time swap route finding with automatic updates and intelligent routing optimization.
 *
 * ## Key Features:
 *
 * ### Intelligent partCount Logic:
 * - **High-value tokens** (BTC, ETH, USDC, USDT): Uses `partCount = 5` for optimal execution
 * - **Low-value tokens** (meme tokens, small caps): Uses `partCount = 1` for simplicity
 *
 * ### Benefits:
 * - **BTC/ETH swaps**: Use 5 routes for optimal execution and better pricing
 * - **Meme token swaps**: Use 1 route for simplicity and lower gas costs
 * - **Stablecoin swaps**: Use 5 routes for better price discovery
 * - **Easy to extend**: Just add more addresses to the high-value list
 *
 * ### Important Exceptions:
 * **Pair liquidity matters more than token value!**
 * - BTC-X pair with $100 liquidity → 5 parts for $1000 = 50% impact per part
 * - USDC-X pair with $100,000 liquidity → 5 parts for $1000 = 1% impact per part
 *
 * ### User Control:
 * - **Online mode**: Use `useOnlinePartCount: true` for automatic pair liquidity detection
 * - **Offline mode**: Override with `forcePartCount` parameter (ignored when online mode is enabled)
 * - Customize `defaultPartCount` for high-value tokens
 * - **Best practice**: Use online mode for accurate results, offline mode for speed
 *
 * ## Usage Examples:
 *
 * ```typescript
 * // Minimal usage with defaults
 * const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId);
 * // Uses: apiBaseUrl from DEFAULT_API_BASE_URL, apiKey from NEXT_PUBLIC_BITZY_API_KEY env var or fallback
 *
 * // With custom API URL
 * const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, {
 *   apiBaseUrl: "https://api-public.bitzy.app",
 * });
 *
 * // With custom API key
 * const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, {
 *   apiKey: "your-custom-api-key",
 * });
 *
 * // With custom liquidity sources
 * const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, {
 *   apiBaseUrl: "https://api-public.bitzy.app",
 *   types: [2], // Only V3
 *   enabledSources: [1], // Only BITZY
 * });
 *
 * // With custom address config
 * const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, {
 *   apiBaseUrl: "https://api-public.bitzy.app",
 *   config: addressConfig,
 * });
 *
 * // Force specific partCount
 * const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, {
 *   apiBaseUrl: "https://api-public.bitzy.app",
 *   config: addressConfig,
 *   forcePartCount: 3, // Always use 3 routes
 * });
 *
 * // Custom default for high-value tokens
 * const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, {
 *   apiBaseUrl: "https://api-public.bitzy.app",
 *   config: addressConfig,
 *   defaultPartCount: 7, // High-value tokens use 7 routes instead of 5
 * });
 *
 * // CRITICAL: Check pair liquidity first!
 * // Low liquidity pair - force single route
 * const lowLiquidityResult = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, {
 *   apiBaseUrl: "https://api-public.bitzy.app",
 *   config: addressConfig,
 *   forcePartCount: 1, // Avoid splitting in low liquidity pairs
 * });
 *
 * // High liquidity pair - safe to use multiple routes
 * const highLiquidityResult = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, {
 *   apiBaseUrl: "https://api-public.bitzy.app",
 *   config: addressConfig,
 *   forcePartCount: 5, // Safe to split in high liquidity pairs
 * });
 * ```
 */
export const useSwapV3Routes = (
  srcToken: Token | undefined | null,
  dstToken: Token | undefined | null,
  amountIn: string,
  chainId: number,
  config: UseSwapV3RoutesConfig = {}
): UseSwapV3RoutesReturn => {
  // Memoize stable default objects to prevent infinite re-renders
  const defaultHeaders = useMemo(() => ({}), []);
  const defaultAddressConfig = useMemo(
    () =>
      ({
        routerAddress: zeroAddress,
        bitzyQueryAddress: zeroAddress,
        wrappedAddress: zeroAddress,
        nativeAddress: zeroAddress,
      } as UseSwapV3RoutesAddressConfig),
    []
  );

  // Memoize entire config destructuring to prevent infinite re-renders
  const {
    apiBaseUrl,
    addressConfig,
    defaultPartCount,
    timeout,
    headers,
    refreshInterval,
    publicClient,
    configTypes,
    configEnabledSources,
    forcePartCount,
    useOnlinePartCount,
  } = useMemo(() => {
    const {
      apiBaseUrl = DEFAULT_API_BASE_URL,
      config: addressConfig = defaultAddressConfig,
      defaultPartCount = 5,
      timeout = 30000,
      headers = defaultHeaders,
      refreshInterval = 10000,
      publicClient,
      types: configTypes,
      enabledSources: configEnabledSources,
      forcePartCount,
      useOnlinePartCount = false,
    } = config;

    return {
      apiBaseUrl,
      addressConfig,
      defaultPartCount,
      timeout,
      headers,
      refreshInterval,
      publicClient,
      configTypes,
      configEnabledSources,
      forcePartCount,
      useOnlinePartCount,
    };
  }, [config, defaultHeaders, defaultAddressConfig]);

  // Get default liquidity sources for the network
  const defaultLiquiditySources = useMemo(
    () => getLiquiditySources(chainId),
    [chainId]
  );
  const types = useMemo(
    () => configTypes ?? defaultLiquiditySources.types,
    [configTypes, defaultLiquiditySources.types]
  );
  const enabledSources = useMemo(
    () => configEnabledSources ?? defaultLiquiditySources.enabledSources,
    [configEnabledSources, defaultLiquiditySources.enabledSources]
  );

  // Debug logs to track what's causing re-renders
  useEffect(() => {
    console.log("config", config);
  }, [config]);

  useEffect(() => {
    console.log("srcToken", srcToken);
  }, [srcToken]);

  useEffect(() => {
    console.log("dstToken", dstToken);
  }, [dstToken]);

  useEffect(() => {
    console.log("amountIn", amountIn);
  }, [amountIn]);

  useEffect(() => {
    console.log("chainId", chainId);
  }, [chainId]);

  useEffect(() => {
    console.log("apiBaseUrl", apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    console.log("addressConfig", addressConfig);
  }, [addressConfig]);

  useEffect(() => {
    console.log("defaultPartCount", defaultPartCount);
  }, [defaultPartCount]);

  useEffect(() => {
    console.log("timeout", timeout);
  }, [timeout]);

  useEffect(() => {
    console.log("headers", headers);
  }, [headers]);

  useEffect(() => {
    console.log("types", types);
  }, [types]);

  useEffect(() => {
    console.log("enabledSources", enabledSources);
  }, [enabledSources]);

  const [amountOutBN, setAmountOutBN] = useState<BigNumber>(new BigNumber(0));
  const [routes, setRoutes] = useState<any[][]>([]);
  const [distributions, setDistributions] = useState<number[]>([]);
  const [amountOutRoutes, setAmountOutRoutes] = useState<any[]>([]);
  const [amountInParts, setAmountInParts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAmountOutError, setIsAmountOutError] = useState(false);
  const [isWrap, setIsWrap] = useState<"wrap" | "unwrap">();
  const [isFirstFetch, setIsFirstFetch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlinePartCount, setOnlinePartCount] = useState<number | null>(null);

  // Calculate partCount using utility functions
  const partCount = useMemo(() => {
    console.log("partCount", 0, useOnlinePartCount);
    // If online partCount is enabled, ignore forcePartCount (best practice)
    if (useOnlinePartCount) {
      // Use online partCount if available, otherwise fallback to offline
      return onlinePartCount !== null
        ? onlinePartCount
        : getPartCountOffline(srcToken, dstToken, chainId, defaultPartCount);
    }
    console.log("partCount", 1, forcePartCount);

    // When online is disabled, allow user to override with forcePartCount
    if (forcePartCount !== undefined) {
      return forcePartCount;
    }
    console.log("partCount", 2, defaultPartCount);

    // Use offline logic by default (fast and reliable)
    return getPartCountOffline(srcToken, dstToken, chainId, defaultPartCount);
  }, [
    defaultPartCount,
    forcePartCount,
    useOnlinePartCount,
    onlinePartCount,
    srcToken,
    dstToken,
    chainId,
  ]);

  // Fetch online partCount when enabled
  useEffect(() => {
    if (!useOnlinePartCount || !srcToken || !dstToken || !amountIn) {
      setOnlinePartCount(null);
      return;
    }

    const fetchOnlinePartCount = async () => {
      try {
        const onlinePartCountValue = await getPartCountWithFallback(
          srcToken,
          dstToken,
          amountIn,
          chainId,
          apiBaseUrl,
          defaultPartCount
        );
        setOnlinePartCount(onlinePartCountValue);
      } catch (error) {
        console.warn("Failed to fetch online partCount:", error);
        setOnlinePartCount(null);
      }
    };

    fetchOnlinePartCount();
  }, [
    useOnlinePartCount,
    srcToken,
    dstToken,
    amountIn,
    chainId,
    apiBaseUrl,
    defaultPartCount,
  ]);

  // Initialize service with useMemo for hot reloading
  const swapService = useMemo(() => {
    // Get default addresses if config is not provided
    const defaultAddresses = getContractAddresses(chainId);
    const finalAddressConfig: SwapV3AddressConfig =
      addressConfig && Object.keys(addressConfig).length > 0
        ? addressConfig
        : {
            routerAddress:
              defaultAddresses?.routerAddress ||
              "0x0000000000000000000000000000000000000000",
            bitzyQueryAddress:
              defaultAddresses?.bitzyQueryAddress ||
              "0x0000000000000000000000000000000000000000",
            wrappedAddress:
              defaultAddresses?.wrappedAddress ||
              "0x0000000000000000000000000000000000000000",
            nativeAddress:
              defaultAddresses?.nativeAddress ||
              "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          };

    // Create proper APIClient instance
    const apiClient = APIClient.getInstance({
      baseUrl: apiBaseUrl,
      timeout: timeout,
      headers: headers,
    });

    return new SwapV3Service({
      config: finalAddressConfig,
      defaultPartCount: defaultPartCount,
      apiClient,
      publicClient: publicClient,
    });
  }, [
    addressConfig,
    defaultPartCount,
    apiBaseUrl,
    timeout,
    headers,
    publicClient,
    chainId,
  ]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchRoute = useCallback(async () => {
    if (!srcToken || !dstToken || !amountIn || amountIn === "0") {
      setAmountOutBN(new BigNumber(0));
      setRoutes([]);
      setDistributions([]);
      setAmountOutRoutes([]);
      setAmountInParts([]);
      setIsAmountOutError(false);
      setIsFirstFetch(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const options: SwapOptions = {
        amountIn,
        srcToken,
        dstToken,
        chainId,
        partCount: partCount,
        types: types,
        enabledSources: enabledSources,
      };

      const result: SwapResult = await swapService.fetchRoute(options);

      setAmountOutBN(result.amountOutBN);
      setRoutes(result.routes);
      setDistributions(result.distributions);
      setAmountOutRoutes(result.amountOutRoutes);
      setAmountInParts(result.amountInParts);
      setIsAmountOutError(result.isAmountOutError);
      setIsWrap(result.isWrap);
      setIsFirstFetch(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Error fetching route:", err);

      setAmountOutBN(new BigNumber(0));
      setRoutes([]);
      setDistributions([]);
      setAmountOutRoutes([]);
      setAmountInParts([]);
      setIsAmountOutError(true);
      setIsFirstFetch(false);
    } finally {
      setIsLoading(false);
    }
  }, [
    swapService,
    srcToken,
    dstToken,
    amountIn,
    chainId,
    partCount,
    types,
    enabledSources,
  ]);

  // Debounced version for performance
  const debouncedFetchRoute = useMemo(
    () => debounce(fetchRoute, 300) as DebouncedFunction,
    [fetchRoute]
  );

  // Auto-fetch on dependencies change
  useEffect(() => {
    if (!amountIn || amountIn === "0") {
      setAmountOutBN(new BigNumber(0));
      setRoutes([]);
      setDistributions([]);
      setAmountOutRoutes([]);
      setAmountInParts([]);
      setIsAmountOutError(false);
      setIsFirstFetch(false);
      setError(null);
      return;
    }

    debouncedFetchRoute();

    // Poll every 10 seconds for fresh routes
    const intervalId = setInterval(() => {
      debouncedFetchRoute();
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
      // Safely call cancel if it exists
      if (typeof debouncedFetchRoute.cancel === "function") {
        debouncedFetchRoute.cancel();
      }
    };
  }, [
    amountIn,
    srcToken?.address,
    dstToken?.address,
    debouncedFetchRoute,
    refreshInterval,
  ]);

  // Hot reload support - reinitialize service when config changes
  useEffect(() => {
    // This will trigger a re-fetch when config changes
    if (isFirstFetch) {
      fetchRoute();
    }
  }, [fetchRoute, isFirstFetch, swapService]);

  return {
    routes,
    distributions,
    amountOutRoutes,
    amountOutBN,
    amountInParts,
    fetchRoute,
    isLoading,
    isAmountOutError,
    isFirstFetch,
    isWrap,
    error,
    clearError,
  };
};

// Export as default for easier imports
export default useSwapV3Routes;
