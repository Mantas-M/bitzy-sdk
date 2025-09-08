import BigNumber from "bignumber.js";
import {
  Address,
  encodeAbiParameters,
  zeroAddress,
  PublicClient,
  encodeFunctionData,
  decodeFunctionResult,
} from "viem";
import { Token, SwapResult, SwapOptions, SwapError } from "../types";
import { getPartCountOffline } from "../utils/PartCount";
import {
  DEX_INTERFACE,
  DEX_ROUTER,
  USER_TARGET,
  ROUTER_TARGET,
  ERROR_CODES,
  DEFAULT_NETWORKS,
} from "../constants";
import {
  fromTokenAmount,
  isNativeToken,
  isWrappedToken,
  validateTokens,
  validateAmount,
} from "../utils";
import { APIClient } from "../api/Client";
import { SwapV3AddressConfig } from "../types";

export interface SwapV3ServiceConfig {
  config: SwapV3AddressConfig;
  defaultPartCount: number;
  apiClient: APIClient;
  publicClient?: PublicClient;
}

// BitzyQuery ABI for splitQuery function
import { BITZY_QUERY_ABI } from "../constants/Abis";

export class SwapV3Service {
  private config: SwapV3ServiceConfig;

  constructor(config: SwapV3ServiceConfig) {
    this.config = config;
  }

  /**
   * Fetch swap routes for V3 swaps
   * This is the core function extracted from the React hook
   *
   * ## Intelligent Routing:
   * - **High-value tokens** (BTC, ETH, USDC, USDT): Uses `partCount = 5` for optimal execution
   * - **Low-value tokens** (meme tokens, small caps): Uses `partCount = 1` for simplicity
   *
   * ## Benefits:
   * - **BTC/ETH swaps**: Use 5 routes for optimal execution and better pricing
   * - **Meme token swaps**: Use 1 route for simplicity and lower gas costs
   * - **Stablecoin swaps**: Use 5 routes for better price discovery
   * - **Easy to extend**: Just add more addresses to the high-value list
   *
   * ## CRITICAL EXCEPTION - Pair Liquidity Impact:
   * **Pair liquidity matters more than token value!**
   *
   * ### Problem Examples:
   * - **BTC-X pair** with only $100 liquidity → Using 5 parts for $1000 swap = 50% impact per part
   * - **USDC-X pair** with $100,000 liquidity → Using 5 parts for $1000 swap = 1% impact per part
   *
   * ### When to Override:
   * - Use `forcePartCount: 1` for low liquidity pairs
   * - Use `forcePartCount: 5` for high liquidity pairs
   * - Always check pair liquidity before deciding partCount
   *
   * ### Concerns:
   * - **Slippage**: Too many parts in low liquidity = higher slippage
   * - **Gas costs**: More routes = higher transaction costs
   * - **Price impact**: Each part affects price, compounding impact
   */
  async fetchRoute(options: SwapOptions): Promise<SwapResult> {
    const {
      amountIn,
      srcToken,
      dstToken,
      chainId,
      partCount: providedPartCount,
      forcePartCount,
    } = options;

    // Use forcePartCount if provided, otherwise use provided partCount or calculate based on token pair
    const partCount =
      forcePartCount ||
      providedPartCount ||
      this.getPartCount(
        srcToken,
        dstToken,
        chainId,
        this.config.defaultPartCount
      );

    // Validate inputs
    if (!validateTokens(srcToken, dstToken)) {
      throw new SwapError({
        message: "Invalid tokens provided",
        code: ERROR_CODES.INVALID_TOKENS,
        details: { srcToken, dstToken },
      });
    }

    if (!validateAmount(amountIn)) {
      throw new SwapError({
        message: "Invalid amount provided",
        code: ERROR_CODES.INVALID_AMOUNT,
        details: { amountIn },
      });
    }

    const amountInBN = fromTokenAmount(amountIn, srcToken.decimals);
    const { routerAddress, bitzyQueryAddress, wrappedAddress, nativeAddress } =
      this.config.config;

    const isSrcNative = isNativeToken(srcToken, nativeAddress);
    const isDstNative = isNativeToken(dstToken, nativeAddress);

    // Handle wrap/unwrap scenarios
    if (
      (isSrcNative && isWrappedToken(dstToken, wrappedAddress)) ||
      (isDstNative && isWrappedToken(srcToken, wrappedAddress))
    ) {
      const isWrap = isSrcNative ? "wrap" : "unwrap";
      const amountOutBN = amountInBN;

      return {
        routes: [
          [
            {
              routerAddress,
              lpAddress: zeroAddress,
              fromToken: srcToken.address,
              toToken: dstToken.address,
              from: srcToken.address,
              to: dstToken.address,
              part: "100000000",
              amountAfterFee: "10000",
              dexInterface: 0,
            },
          ],
        ],
        distributions: [partCount],
        amountOutRoutes: [amountOutBN],
        amountOutBN,
        amountInParts: [amountInBN],
        isAmountOutError: false,
        isWrap,
      };
    }

    // Use wrapped tokens for routing
    const usingSrcToken = isSrcNative
      ? { ...srcToken, address: wrappedAddress }
      : srcToken;
    const usingDstToken = isDstNative
      ? { ...dstToken, address: wrappedAddress }
      : dstToken;

    try {
      // Get path from API
      const pathData = await this.config.apiClient.getPathV3(
        usingSrcToken,
        usingDstToken,
        amountInBN.toFixed(0),
        options.types || [1, 2], // Use provided types or default to V2/V3
        options.enabledSources || [1] // Use provided sources or default to BITZY
      );

      const { hops, validPath } = pathData.data;

      if (hops.length === 0) {
        console.log("SDK: No hops found");
        return {
          routes: [],
          distributions: [],
          amountOutRoutes: [],
          amountOutBN: new BigNumber(0),
          amountInParts: [],
          isAmountOutError: true,
        };
      }

      console.log("SDK: hops.length =", hops.length);
      console.log("SDK: validPath.length =", validPath.length);
      console.log("SDK: partCount =", partCount);

      // Encode routes for contract call
      const encodedRoutes = encodeAbiParameters(
        [
          {
            type: "tuple[][]",
            components: [
              { type: "address", name: "src" },
              { type: "address", name: "dest" },
              { type: "uint8", name: "typeId" },
              { type: "uint8", name: "sourceId" },
              { type: "bytes", name: "path" },
            ],
          },
        ],
        [hops]
      );

      // Use the same approach as v1: call splitQuery and process results
      let amountOutBN = new BigNumber(0);
      let distributions: number[] = [];
      let routes: any[] = [];

      if (this.config.publicClient) {
        try {
          console.log("SDK: Calling splitQuery with:", {
            bitzyQueryAddress,
            amountIn: amountInBN.toFixed(0),
            partCount,
            encodedRoutesLength: encodedRoutes.length,
          });

          const data = encodeFunctionData({
            abi: BITZY_QUERY_ABI,
            functionName: "splitQuery",
            args: [
              amountInBN.toFixed(0) as any, // Same as v1: string, cast to satisfy TypeScript
              encodedRoutes,
              partCount as any, // Same as v1: number, cast to satisfy TypeScript
            ],
          });

          const result = await this.config.publicClient.call({
            to: bitzyQueryAddress,
            data: data,
            gas: 50_000_000_000n, // Same as v1: wrapReadContract2
            gasPrice: undefined, // Same as v1: wrapReadContract2
          });

          console.log("SDK: Contract call result:", result);

          if (result.data) {
            const decoded = decodeFunctionResult({
              abi: BITZY_QUERY_ABI,
              functionName: "splitQuery",
              data: result.data,
            });

            const splitRouteData = decoded[1]; // Get the SplitRoute result
            if (splitRouteData && splitRouteData.amountOut) {
              amountOutBN = new BigNumber(splitRouteData.amountOut.toString());
              let distributionsRaw = splitRouteData.distribution.map(
                (d: bigint) => new BigNumber(d.toString()).toNumber()
              );

              // Build routes BEFORE filtering distributions (same as v1)
              routes = validPath.reduce(
                (acc: any[], path: any[], k: number) => {
                  if (distributionsRaw[k] > 0) {
                    acc.push(
                      path.map((value: any, i: number, values: any[]) => ({
                        routerAddress:
                          DEX_ROUTER[value.source + "_" + value.type] ||
                          zeroAddress,
                        lpAddress: value.pool || zeroAddress,
                        fromToken: value.src,
                        toToken: value.dest,
                        from:
                          i > 0 ||
                          value.type === "V3" ||
                          value.src === wrappedAddress.toLowerCase()
                            ? ROUTER_TARGET
                            : USER_TARGET,
                        to:
                          i < values.length - 1 ||
                          (i === values.length - 1 &&
                            value.dest === wrappedAddress.toLowerCase())
                            ? ROUTER_TARGET
                            : USER_TARGET,
                        part: "100000000",
                        amountAfterFee: new BigNumber(10000)
                          .minus(new BigNumber(value.fee || 0).dividedBy(100))
                          .toFixed(),
                        dexInterface:
                          DEX_INTERFACE[
                            value.type as keyof typeof DEX_INTERFACE
                          ] || 0,
                      }))
                    );
                  }
                  return acc;
                },
                []
              );

              // Filter out zero distributions AFTER building routes (same as v1)
              distributions = distributionsRaw.filter((d: number) => d > 0);
            }
          }
        } catch (contractError) {
          console.error("SDK: splitQuery contract call failed:", contractError);
          // Return empty results when contract fails
          amountOutBN = new BigNumber(0);
          distributions = [];
          routes = [];
        }
      } else {
        // No publicClient available
        console.error("SDK: No publicClient available - this is the problem!");
        amountOutBN = new BigNumber(0);
        distributions = [];
        routes = [];
      }

      // Calculate amountOutRoutes and amountInParts (same as v1)
      const amountOutRoutes = distributions.map((am: number) =>
        amountOutBN.times(am).dividedBy(partCount).dp(0, BigNumber.ROUND_DOWN)
      );

      const amountInParts = distributions.map((distribution: number) =>
        amountInBN
          .times(distribution)
          .dividedBy(partCount)
          .dp(0, BigNumber.ROUND_DOWN)
      );

      // Build routes based on the distributions returned by splitQuery
      // The contract has already selected the optimal routes and distributions
      return {
        routes,
        distributions,
        amountOutRoutes,
        amountOutBN,
        amountInParts,
        isAmountOutError: false,
      };
    } catch (error) {
      throw new SwapError({
        message: "Failed to fetch swap route",
        code: ERROR_CODES.API_ERROR,
        details: { originalError: error, options },
      });
    }
  }

  /**
   * Get supported networks
   */
  getSupportedNetworks(): number[] {
    // Return the chain IDs that are configured in DEFAULT_NETWORKS
    return Object.keys(DEFAULT_NETWORKS).map(Number);
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(chainId: number): SwapV3AddressConfig | undefined {
    // Since we're using a single config object, return the config if chainId matches
    return this.config.config;
  }

  /**
   * Get partCount based on token pair addresses using utility function
   * @param srcToken - The source token
   * @param dstToken - The destination token
   * @param chainId - The chain ID to get network-specific tokens
   * @param defaultPartCount - Default partCount for high-value pairs
   * @returns partCount: 5 for high-value pairs, 1 for others
   */
  private getPartCount(
    srcToken: Token,
    dstToken: Token,
    chainId: number,
    defaultPartCount: number
  ): number {
    return getPartCountOffline(srcToken, dstToken, chainId, defaultPartCount);
  }
}
