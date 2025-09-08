import { Token, ChainWrap } from "../types";
import { DEFAULT_API_BASE_URL, API_ENDPOINTS } from "../constants";
import { APIClient } from "../api/Client";
import BigNumber from "bignumber.js";

// Cache for minimum amounts data
interface MinimumAmountsCache {
  data: any[];
  timestamp: number;
  expiresAt: number;
}

let minimumAmountsCache: MinimumAmountsCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get minimum amounts with caching
 * Caches the result for 5 minutes to avoid repeated API calls
 */
async function getMinimumAmounts(
  apiBaseUrl: string,
  apiKey?: string
): Promise<any[]> {
  const now = Date.now();

  // Check if cache is valid
  if (minimumAmountsCache && now < minimumAmountsCache.expiresAt) {
    console.log("Using cached minimum amounts data");
    return minimumAmountsCache.data;
  }

  // Fetch fresh data using singleton APIClient
  console.log("Fetching fresh minimum amounts data from API");
  const apiClient = APIClient.getInstance({
    baseUrl: apiBaseUrl,
    timeout: 5000,
    headers: {
      ...(apiKey && { "authen-key": apiKey }),
    },
  });

  const data = await apiClient.getAssetMinimum();

  if (!data.success) {
    throw new Error(`API request failed: ${data.error || "Unknown error"}`);
  }

  // Update cache
  minimumAmountsCache = {
    data: data.data || [],
    timestamp: now,
    expiresAt: now + CACHE_DURATION,
  };

  return minimumAmountsCache.data;
}

/**
 * Clear the minimum amounts cache
 * Useful for testing or when you need fresh data immediately
 */
function clearMinimumAmountsCache(): void {
  minimumAmountsCache = null;
  console.log("Minimum amounts cache cleared");
}

/**
 * High-value tokens that benefit from multi-route optimization
 * These tokens typically have high liquidity and benefit from route splitting
 * Network-specific token addresses using ChainWrap pattern
 */
const HIGH_VALUE_TOKENS: ChainWrap<string[]> = {
  // Botanix Mainnet (3637)
  3637: [
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH/BTC native
    "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56", // pBTC (Botanix)
    "0x29eE6138DD4C9815f46D34a4A1ed48F46758A402", // USDC.e (Bridged USDC Stargate)
    "0x9BC574a6f1170e90D80826D86a6126d59198A3Ef", // rovBTC (Rover BTC)
    "0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C", // USDC
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
  ],
  // Botanix Testnet (3636)
  3636: [
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH/BTC native
    "0x233631132FD56c8f86D1FC97F0b82420a8d20af3", // WBTC (Botanix Testnet)
    "0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C", // USDC
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
  ],
};

/**
 * Check if a token is considered high-value based on its address and chain
 * @param token - The token to check
 * @param chainId - The chain ID to get network-specific tokens
 * @returns true if the token is high-value, false otherwise
 */
export function isHighValueToken(
  token: Token | undefined | null,
  chainId: number
): boolean {
  if (!token?.address) return false;

  const networkTokens = HIGH_VALUE_TOKENS[chainId];
  if (!networkTokens) return false;

  return networkTokens.some(
    (addr) => addr.toLowerCase() === token.address.toLowerCase()
  );
}

/**
 * Get partCount based on token pair addresses (offline logic)
 * This function uses hardcoded address-based logic to determine optimal partCount
 * Considers both tokens in the pair for better decision making
 *
 * IMPORTANT: This is a simplified approach that doesn't consider actual pair liquidity!
 * For more accurate results, use getPartCountOnline() which checks actual pair liquidity.
 *
 * @param srcToken - The source token
 * @param dstToken - The destination token
 * @param chainId - The chain ID to get network-specific tokens
 * @param defaultPartCount - Default partCount for high-value pairs (default: 5)
 * @returns partCount: 5 for high-value pairs, 1 for others
 *
 * @example
 * ```typescript
 * // High-value pair (BTC-USDC) → returns 5
 * const highValuePartCount = getPartCountOffline(btcToken, usdcToken, 3637, 5);
 *
 * // Low-value pair (BTC-MEME) → returns 1
 * const lowValuePartCount = getPartCountOffline(btcToken, memeToken, 3637, 5);
 * ```
 */
export function getPartCountOffline(
  srcToken: Token | undefined | null,
  dstToken: Token | undefined | null,
  chainId: number,
  defaultPartCount: number = 5
): number {
  // Both tokens must be high-value for multi-route optimization
  const srcIsHighValue = isHighValueToken(srcToken, chainId);
  const dstIsHighValue = isHighValueToken(dstToken, chainId);

  // Use multiple routes only if both tokens are high-value
  return srcIsHighValue && dstIsHighValue ? defaultPartCount : 1;
}

/**
 * Get partCount using online API data (minimum amount-based)
 * Checks if the swap amount meets the minimum threshold for multi-route optimization
 *
 * @param srcToken - Source token
 * @param dstToken - Destination token
 * @param amountIn - Input amount
 * @param chainId - Chain ID
 * @param apiBaseUrl - API base URL
 * @param apiKey - Optional API key
 * @returns Promise<number> - partCount (5 if amount >= minimum for both tokens, otherwise fallback)
 */
export async function getPartCountOnline(
  srcToken: Token,
  dstToken: Token,
  amountIn: string,
  chainId: number,
  apiBaseUrl: string,
  apiKey?: string,
  fallbackPartCount: number = 5
): Promise<number> {
  try {
    console.log("Fetching online partCount data...");

    // Get minimum amounts from API
    const minimumData = await getMinimumAmounts(apiBaseUrl, apiKey);

    // Check if swap amount meets minimum threshold for both tokens
    const srcTokenMin = minimumData.find(
      (item: any) =>
        item.token?.toLowerCase() === srcToken.address.toLowerCase()
    );
    const dstTokenMin = minimumData.find(
      (item: any) =>
        item.token?.toLowerCase() === dstToken.address.toLowerCase()
    );

    const amountInBN = new BigNumber(amountIn);

    // If both tokens have minimum data and amount meets threshold for both
    if (
      srcTokenMin &&
      dstTokenMin &&
      amountInBN.gte(srcTokenMin.minimumAmount) &&
      amountInBN.gte(dstTokenMin.minimumAmount)
    ) {
      console.log(
        "Amount meets minimum threshold for both tokens, using partCount = 5"
      );
      return 5;
    } else {
      console.log(
        "Amount below minimum threshold or missing data, falling back to offline logic"
      );
      return getPartCountOffline(
        srcToken,
        dstToken,
        chainId,
        fallbackPartCount
      );
    }
  } catch (error) {
    console.warn("Failed to fetch online partCount data:", error);
    console.log("Falling back to offline partCount logic");
    return getPartCountOffline(srcToken, dstToken, chainId, fallbackPartCount);
  }
}

/**
 * Get partCount with fallback strategy
 * Tries online API first, falls back to offline logic if API fails
 * Uses sensible defaults: 5% max impact, $10,000 min liquidity
 *
 * @param srcToken - The source token
 * @param dstToken - The destination token
 * @param amountIn - The swap amount
 * @param chainId - The chain ID
 * @param apiBaseUrl - The API base URL
 * @param fallbackPartCount - PartCount to use if API fails (default: 5)
 * @returns Promise<number> - Optimal partCount
 *
 * @example
 * ```typescript
 * // Try online first, fallback to offline
 * const partCount = await getPartCountWithFallback(
 *   srcToken,
 *   dstToken,
 *   amountIn,
 *   chainId,
 *   apiBaseUrl,
 *   5 // fallback partCount
 * );
 * ```
 */
export async function getPartCountWithFallback(
  srcToken: Token,
  dstToken: Token,
  amountIn: string,
  chainId: number,
  apiBaseUrl: string,
  fallbackPartCount: number = 5,
  apiKey?: string
): Promise<number> {
  try {
    return await getPartCountOnline(
      srcToken,
      dstToken,
      amountIn,
      chainId,
      apiBaseUrl,
      apiKey,
      fallbackPartCount
    );
  } catch (error) {
    console.warn("Online partCount failed, using offline fallback:", error);
    // Use the custom fallback partCount instead of intelligent calculation
    return fallbackPartCount;
  }
}

/**
 * Calculate price impact for a given swap
 * @param swapAmount - The swap amount in USD
 * @param pairLiquidity - The pair liquidity in USD
 * @param partCount - The number of parts to split the swap
 * @returns The price impact percentage
 */
export function calculatePriceImpact(
  swapAmount: number,
  pairLiquidity: number,
  partCount: number
): number {
  if (pairLiquidity === 0) return Infinity;

  const impactPerPart = (swapAmount / partCount / pairLiquidity) * 100;
  return impactPerPart;
}

/**
 * Determine optimal partCount based on price impact thresholds
 * @param swapAmount - The swap amount in USD
 * @param pairLiquidity - The pair liquidity in USD
 * @param maxImpactThreshold - Maximum acceptable impact per part (default: 5%)
 * @returns Optimal partCount (1 or 5)
 */
export function getOptimalPartCount(
  swapAmount: number,
  pairLiquidity: number,
  maxImpactThreshold: number = 5
): number {
  const impactWith5Parts = calculatePriceImpact(swapAmount, pairLiquidity, 5);

  if (impactWith5Parts > maxImpactThreshold) {
    return 1; // Use single route to avoid high impact
  }

  return 5; // Use multiple routes for better execution
}

// Export the high-value tokens list and cache utility for external use
export { HIGH_VALUE_TOKENS, clearMinimumAmountsCache };
