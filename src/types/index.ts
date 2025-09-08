import { Address, PublicClient } from "viem";
import BigNumber from "bignumber.js";

// Swap V3 Routes Configuration Interfaces
export interface UseSwapV3RoutesAddressConfig {
  /**
   * Address of the Bitzy router contract
   * Used for executing swap transactions
   * @example "0xA5E0AE4e5103dc71cA290AA3654830442357A489"
   */
  routerAddress: Address;

  /**
   * Address of the Bitzy query contract
   * Used for fetching swap routes and pricing data
   * @example "0x5b5079587501Bd85d3CDf5bFDf299f4eaAe98c23"
   */
  bitzyQueryAddress: Address;

  /**
   * Address of the wrapped native token (e.g., pBTC on Botanix)
   * Used for handling native token swaps
   * @example "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56"
   */
  wrappedAddress: Address;

  /**
   * Address representing the native token (ETH/BTC)
   * Standard address used across all networks for native tokens
   * @example "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
   */
  nativeAddress: Address;
}

export interface UseSwapV3RoutesConfig {
  /**
   * Base URL for the Bitzy API
   * @default "https://api-public.bitzy.app"
   * @example "https://api-public.bitzy.app"
   */
  apiBaseUrl?: string;

  /**
   * API key for authentication (optional)
   * Used for premium features and rate limiting
   * @example "your-api-key-here"
   */
  apiKey?: string;

  /**
   * Contract addresses configuration for the specific network
   * Contains router, query, wrapped, and native token addresses
   */
  config?: UseSwapV3RoutesAddressConfig;

  /**
   * Default number of routes to split large swaps into
   * Higher values provide better execution but increase gas costs
   * @default 5
   * @example 5
   */
  defaultPartCount?: number;

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   * @example 30000
   */
  timeout?: number;

  /**
   * Additional HTTP headers to include with API requests
   * @example { "authen-key": "token" }
   */
  headers?: Record<string, string>;

  /**
   * Interval in milliseconds for automatic route refresh
   * Set to 0 to disable automatic refresh
   * @default 10000 (10 seconds)
   * @example 10000
   */
  refreshInterval?: number;

  /**
   * Viem PublicClient instance for blockchain interactions
   * Used for contract calls and blockchain state queries
   * @example publicClient from useAccount() hook
   */
  publicClient?: PublicClient;

  /**
   * Array of liquidity source types to include
   * 1 = V2, 2 = V3
   * @default [1, 2] (both V2 and V3)
   * @example [2] (V3 only)
   */
  types?: number[];

  /**
   * Array of enabled liquidity sources
   * 1 = BITZY, 2 = Other sources
   * @default [1] (BITZY only)
   * @example [1, 2] (BITZY and other sources)
   */
  enabledSources?: number[];

  /**
   * Override partCount calculation logic (offline mode only)
   * - If provided, this value will be used instead of automatic calculation
   * - **IGNORED when useOnlinePartCount is true** (best practice)
   * - If not provided, uses intelligent address-based logic:
   *   - High-value tokens (BTC, ETH, USDC, USDT): partCount = 5 (better routing)
   *   - Low-value tokens (meme tokens, small caps): partCount = 1 (simpler routing)
   *
   * IMPORTANT EXCEPTIONS & CONCERNS:
   *
   * ## Pair Liquidity Impact:
   * Even high-value tokens can cause issues in low-liquidity pairs:
   *
   * ### Problem Examples:
   * - **BTC-X pair** with only $100 liquidity → Using 5 parts for $1000 swap = 50% impact per part
   * - **USDC-X pair** with $100,000 liquidity → Using 5 parts for $1000 swap = 1% impact per part
   *
   * ### When to Override (offline mode only):
   * ```typescript
   * // Low liquidity pair - force single route
   * const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, {
   *   ...config,
   *   useOnlinePartCount: false, // Disable online mode
   *   forcePartCount: 1, // Avoid splitting in low liquidity
   * });
   *
   * // High liquidity pair - allow more routes
   * const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, {
   *   ...config,
   *   useOnlinePartCount: false, // Disable online mode
   *   forcePartCount: 5, // Safe to split in high liquidity
   * });
   * ```
   *
   * ### Concerns to Consider:
   * - **Slippage**: Too many parts in low liquidity = higher slippage
   * - **Gas costs**: More routes = higher transaction costs
   * - **Execution time**: More routes = longer execution
   * - **Price impact**: Each part affects price, compounding impact
   *
   * ### Recommended Approach:
   * 1. **Use useOnlinePartCount: true** for automatic pair liquidity detection
   * 2. **Use forcePartCount** only when online mode is disabled
   * 3. **Monitor slippage** and adjust accordingly
   */
  forcePartCount?: number;

  /**
   * Use online API to determine optimal partCount based on real pair liquidity
   * - If true, calls API to get actual pair liquidity and calculates optimal partCount
   * - If false or undefined, uses offline address-based logic
   * - Falls back to offline logic if API call fails
   * - Uses sensible defaults: 5% max impact, $10,000 min liquidity
   *
   * @example
   * ```typescript
   * // Use online API for accurate partCount calculation
   * const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, {
   *   ...config,
   *   useOnlinePartCount: true, // Get real-time pair liquidity data
   * });
   * ```
   */
  useOnlinePartCount?: boolean;
}

// Re-export BigNumber to ensure consistency
export type BN = BigNumber;
export { BigNumber };

// Utility function to ensure BigNumber compatibility
export const ensureBigNumber = (value: any): BigNumber => {
  if (value instanceof BigNumber) {
    return value;
  }
  return new BigNumber(value);
};

// Type guard to check if value is BigNumber
export const isBigNumber = (value: any): value is BigNumber => {
  return value instanceof BigNumber;
};

// Interface for address config with gas settings (extends UseSwapV3RoutesAddressConfig)
export interface SwapV3AddressConfig extends UseSwapV3RoutesAddressConfig {
  /**
   * Gas limit for transactions
   * @default BigInt(50_000_000_000)
   * @example BigInt(50_000_000_000)
   */
  gasLimit?: bigint;

  /**
   * Gas price for transactions (optional)
   * If not provided, uses network default
   * @example BigInt(20_000_000_000) // 20 gwei
   */
  gasPrice?: bigint;
}

// Token interface
export interface Token {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  chainId?: number;
}

// Swap route interface
export interface SwapRoute {
  routerAddress: Address;
  lpAddress: Address;
  fromToken: Address;
  toToken: Address;
  from: Address;
  to: Address;
  part: string;
  amountAfterFee: string;
  dexInterface: number;
}

// Swap result interface
export interface SwapResult {
  routes: SwapRoute[][];
  distributions: number[];
  amountOutRoutes: BigNumber[];
  amountOutBN: BigNumber;
  amountInParts: BigNumber[];
  isAmountOutError: boolean;
  isWrap?: "wrap" | "unwrap";
}

// Swap options interface
export interface SwapOptions {
  amountIn: string;
  srcToken: Token;
  dstToken: Token;
  chainId: number;
  partCount?: number;
  liquiditySources?: LiquiditySource[];
  types?: number[];
  enabledSources?: number[];
  /**
   * Force a specific partCount, overriding intelligent calculation
   * - If provided, this value will be used instead of automatic calculation
   * - If not provided, uses intelligent address-based logic:
   *   - High-value tokens (BTC, ETH, USDC, USDT): partCount = 5 (better routing)
   *   - Low-value tokens (meme tokens, small caps): partCount = 1 (simpler routing)
   */
  forcePartCount?: number;
}

// Liquidity source interface
export interface LiquiditySource {
  type: "V2" | "V3";
  source: string;
  enabled: boolean;
}

// Network configuration interface
export interface NetworkConfig {
  routerAddress: Address;
  bitzyQueryAddress: Address;
  wrappedAddress: Address;
  nativeAddress: Address;
}

// API response interfaces
export interface PathV3Response {
  data: {
    hops: any[];
    validPath: any[];
  };
}

// Error class that can be thrown
export class SwapError extends Error {
  public code: string;
  public details?: any;

  constructor(options: { message: string; code: string; details?: any }) {
    super(options.message);
    this.name = "SwapError";
    this.code = options.code;
    this.details = options.details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SwapError);
    }
  }
}

// ChainWrap utility type for network-specific configurations
export type ChainWrap<T> = {
  [chainId: number]: T;
};

// Liquidity sources configuration
export interface LiquiditySourcesConfig {
  types: number[];
  enabledSources: number[];
}

// Configuration interface
export interface SDKConfig {
  networks: Record<number, NetworkConfig>;
  defaultPartCount: number;
  apiBaseUrl?: string;
  timeout?: number;
}
