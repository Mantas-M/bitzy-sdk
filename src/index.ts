// PRIMARY EXPORTS - Common Function & Hot Hook

// Common function for any environment
export {
  default as fetchSwapRoute,
  fetchSwapRoute as getSwapRoute,
} from "./common/FetchSwapRoute";
export {
  fetchBatchSwapRoutes,
  getSwapQuote,
  fetchSwapRouteSimple,
} from "./common/FetchSwapRoute";

// Hot React Hook
export {
  default as useSwapV3Routes,
  useSwapV3Routes as useSwapRoutes,
} from "./hooks/useSwapV3Routes";

// SUPPORTING EXPORTS

// Services
export { SwapV3Service } from "./services/SwapV3Service";
export type { SwapV3ServiceConfig } from "./services/SwapV3Service";

// API Client
export { APIClient } from "./api/Client";
export type { APIClientConfig } from "./api/Client";

// Types
export type {
  Token,
  SwapRoute,
  SwapResult,
  SwapOptions,
  LiquiditySource,
  NetworkConfig,
  PathV3Response,
  SwapError,
  SDKConfig,
  ChainWrap,
  LiquiditySourcesConfig,
} from "./types";

export type { FetchSwapRouteConfig } from "./common/FetchSwapRoute";

export type {
  UseSwapV3RoutesConfig,
  UseSwapV3RoutesAddressConfig,
} from "./types";

export type { UseSwapV3RoutesReturn } from "./hooks/useSwapV3Routes";

// Constants
export {
  DEX_INTERFACE,
  DEX_ROUTER,
  DEX_ROUTERS,
  USER_TARGET,
  ROUTER_TARGET,
  DEFAULT_PART_COUNT,
  DEFAULT_TIMEOUT,
  DEFAULT_NETWORKS,
  CONTRACT_ADDRESSES,
  API_ENDPOINTS,
  ERROR_CODES,
  LIQUIDITY_SOURCES,
  getLiquiditySources,
  getContractAddresses,
  getDexRouters,
} from "./constants";

// ABIs
export { BITZY_QUERY_ABI } from "./constants/Abis";

// Utilities
export {
  fromTokenAmount,
  toTokenAmount,
  isNativeToken,
  isWrappedToken,
  validateTokens,
  validateAmount,
  calculatePartCount,
  formatError,
  debounce,
} from "./utils";

// PartCount utilities
export {
  getPartCountOffline,
  getPartCountOnline,
  getPartCountWithFallback,
  isHighValueToken,
  calculatePriceImpact,
  getOptimalPartCount,
  HIGH_VALUE_TOKENS,
  clearMinimumAmountsCache,
} from "./utils/PartCount";

// Re-export commonly used dependencies
export type { BigNumber, BN } from "./types";
export { ensureBigNumber, isBigNumber } from "./types";
export type { SwapV3AddressConfig } from "./types";
export type { Address, zeroAddress } from "viem";
