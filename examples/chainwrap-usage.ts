/**
 * Example: Using ChainWrap Pattern in Bitzy SDK
 *
 * This demonstrates how the SDK uses the ChainWrap pattern
 * for network-specific configurations, similar to the original codebase.
 */

import {
  ChainWrap,
  LiquiditySourcesConfig,
  LIQUIDITY_SOURCES,
  CONTRACT_ADDRESSES,
  DEX_ROUTERS,
  DEFAULT_NETWORKS,
  getLiquiditySources,
  getContractAddresses,
  getDexRouters,
  fetchSwapRouteSimple,
  fetchSwapRoute,
  getPartCountOffline,
  getPartCountOnline,
  getPartCountWithFallback,
  isHighValueToken,
  calculatePriceImpact,
  getOptimalPartCount,
  HIGH_VALUE_TOKENS,
} from "../src";

// Example: Creating custom ChainWrap configurations
const CUSTOM_LIQUIDITY_SOURCES: ChainWrap<LiquiditySourcesConfig> = {
  3637: {
    // Botanix Mainnet
    types: [0, 1], // V2, V3
    enabledSources: [0, 1], // BITZY_V2, BITZY_V3
  },
  3636: {
    // Botanix Testnet
    types: [0], // Only V2
    enabledSources: [0], // Only BITZY_V2
  },
};

// Example: Using the helper functions
function getNetworkConfig(chainId: number) {
  const liquidityConfig = getLiquiditySources(chainId);
  const contractConfig = getContractAddresses(chainId);
  const dexRouters = getDexRouters(chainId);

  return {
    chainId,
    liquidity: liquidityConfig,
    contracts: contractConfig,
    dexRouters,
  };
}

// Example: Accessing network-specific contract addresses
function getBotanixContracts() {
  const botanixContracts = CONTRACT_ADDRESSES[3637]; // Botanix Mainnet

  return {
    factory: botanixContracts.factoryAddress,
    v3Factory: botanixContracts.v3FactoryAddress,
    router: botanixContracts.routerAddress,
    bitzyQuery: botanixContracts.bitzyQueryAddress,
    wrappedToken: botanixContracts.wrappedAddress,
    nativeToken: botanixContracts.nativeAddress,
  };
}

// Example: Accessing network-specific DEX routers
function getBotanixDexRouters() {
  const botanixRouters = DEX_ROUTERS[3637]; // Botanix Mainnet

  return {
    bitzyV3: botanixRouters.BITZY_V3,
    bitzyV2: botanixRouters.BITZY_V2,
    avocadoV2: botanixRouters.AVOCADO_V2,
  };
}

// Example: Using intelligent partCount logic
async function exampleIntelligentRouting() {
  // High-value token (BTC) - automatically uses partCount = 5
  const btcResult = await fetchSwapRouteSimple(
    {
      srcToken: {
        address: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56", // pBTC
        symbol: "pBTC",
        name: "Wrapped Bitcoin",
        decimals: 18,
        chainId: 3637,
      },
      dstToken: {
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        symbol: "BTC",
        name: "Bitcoin",
        decimals: 18,
        chainId: 3637,
      },
      amountIn: "1000000000000000000", // 1 pBTC
      chainId: 3637,
    },
    {
      apiBaseUrl: "https://api-public.bitzy.app",
      defaultPartCount: 5, // High-value tokens use 5 routes
    }
  );

  console.log("BTC swap (5 routes):", btcResult);

  // Example: Using fetchSwapRoute with default config
  const defaultConfigResult = await fetchSwapRoute(
    {
      srcToken: {
        address: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56", // pBTC
        symbol: "pBTC",
        name: "Wrapped Bitcoin",
        decimals: 18,
        chainId: 3637,
      },
      dstToken: {
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        symbol: "BTC",
        name: "Bitcoin",
        decimals: 18,
        chainId: 3637,
      },
      amountIn: "1000000000000000000", // 1 pBTC
      chainId: 3637,
    }
    // No config parameter - uses all defaults
  );

  console.log("Default config fetchSwapRoute:", defaultConfigResult);

  // Low-value token (meme) - automatically uses partCount = 1
  const memeResult = await fetchSwapRouteSimple(
    {
      srcToken: {
        address: "0x1234567890abcdef1234567890abcdef12345678", // Meme token
        symbol: "MEME",
        name: "Meme Token",
        decimals: 18,
        chainId: 3637,
      },
      dstToken: {
        address: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56",
        symbol: "pBTC",
        name: "Wrapped Bitcoin",
        decimals: 18,
        chainId: 3637,
      },
      amountIn: "1000000000000000000", // 1 MEME
      chainId: 3637,
    },
    {
      apiBaseUrl: "https://api-public.bitzy.app",
      defaultPartCount: 5, // High-value tokens use 5 routes
    }
  );

  console.log("Meme token swap (1 route):", memeResult);
}

// Example: Force specific partCount
async function exampleForcePartCount() {
  // Force 3 routes for any token
  const result = await fetchSwapRouteSimple(
    {
      srcToken: {
        address: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56",
        symbol: "pBTC",
        name: "Wrapped Bitcoin",
        decimals: 18,
        chainId: 3637,
      },
      dstToken: {
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        symbol: "BTC",
        name: "Bitcoin",
        decimals: 18,
        chainId: 3637,
      },
      amountIn: "1000000000000000000",
      chainId: 3637,
    },
    {
      apiBaseUrl: "https://api-public.bitzy.app",
      forcePartCount: 3, // Always use 3 routes regardless of token
    }
  );

  console.log("Forced 3 routes:", result);
}

// Example: Pair liquidity considerations
async function examplePairLiquidityConcerns() {
  // CRITICAL: Low liquidity pair - force single route
  // BTC-X pair with only $100 liquidity → 5 parts for $1000 = 50% impact per part
  const lowLiquidityResult = await fetchSwapRouteSimple(
    {
      srcToken: {
        address: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56", // pBTC
        symbol: "pBTC",
        name: "Wrapped Bitcoin",
        decimals: 18,
        chainId: 3637,
      },
      dstToken: {
        address: "0x1234567890abcdef1234567890abcdef12345678", // Low liquidity token
        symbol: "LOW",
        name: "Low Liquidity Token",
        decimals: 18,
        chainId: 3637,
      },
      amountIn: "1000000000000000000", // $1000 swap
      chainId: 3637,
    },
    {
      apiBaseUrl: "https://api-public.bitzy.app",
      forcePartCount: 1, // Avoid splitting in low liquidity pairs
    }
  );

  console.log("Low liquidity pair (1 route):", lowLiquidityResult);

  // High liquidity pair - safe to use multiple routes
  // USDC-X pair with $100,000 liquidity → 5 parts for $1000 = 1% impact per part
  const highLiquidityResult = await fetchSwapRouteSimple(
    {
      srcToken: {
        address: "0x29eE6138DD4C9815f46D34a4A1ed48F46758A402", // USDC.e (Bridged USDC Stargate)
        symbol: "USDC.e",
        name: "Bridged USDC (Stargate)",
        decimals: 6,
        chainId: 3637,
      },
      dstToken: {
        address: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56", // pBTC
        symbol: "pBTC",
        name: "Wrapped Bitcoin",
        decimals: 18,
        chainId: 3637,
      },
      amountIn: "1000000", // $1 USDC.e (6 decimals)
      chainId: 3637,
    },
    {
      apiBaseUrl: "https://api-public.bitzy.app",
      forcePartCount: 5, // Safe to split in high liquidity pairs
    }
  );

  console.log("High liquidity pair (5 routes):", highLiquidityResult);

  // Example: Using default config (no config parameter needed)
  const defaultConfigResult = await fetchSwapRouteSimple({
    srcToken: {
      address: "0x29eE6138DD4C9815f46D34a4A1ed48F46758A402", // USDC.e (Bridged USDC Stargate)
      symbol: "USDC.e",
      name: "Bridged USDC (Stargate)",
      decimals: 6,
      chainId: 3637,
    },
    dstToken: {
      address: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56", // pBTC
      symbol: "pBTC",
      name: "Wrapped Bitcoin",
      decimals: 18,
      chainId: 3637,
    },
    amountIn: "1000000", // $1 USDC.e (6 decimals)
    chainId: 3637,
  });
  // Uses default apiBaseUrl, defaultPartCount, etc.

  console.log("Default config result:", defaultConfigResult);
}

// Example: Using partCount utility functions
async function examplePartCountUtilities() {
  const btcToken = {
    address: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56" as `0x${string}`,
    symbol: "pBTC",
    name: "Wrapped Bitcoin",
    decimals: 18,
  };

  const memeToken = {
    address: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
    symbol: "MEME",
    name: "Meme Token",
    decimals: 18,
  };

  const usdcToken = {
    address: "0x29eE6138DD4C9815f46D34a4A1ed48F46758A402" as `0x${string}`,
    symbol: "USDC.e",
    name: "Bridged USDC (Stargate)",
    decimals: 6,
  };

  // Check if tokens are high-value
  console.log("Is BTC high-value?", isHighValueToken(btcToken, 3637)); // true
  console.log("Is MEME high-value?", isHighValueToken(memeToken, 3637)); // false

  // Access the HIGH_VALUE_TOKENS directly
  console.log(
    "High-value tokens for Botanix Mainnet:",
    HIGH_VALUE_TOKENS[3637]
  );

  // Get offline partCount
  const btcUsdcPartCount = getPartCountOffline(btcToken, usdcToken, 3637, 5); // 5 (both high-value)
  const btcMemePartCount = getPartCountOffline(btcToken, memeToken, 3637, 5); // 1 (one low-value)
  console.log("BTC-USDC offline partCount:", btcUsdcPartCount);
  console.log("BTC-MEME offline partCount:", btcMemePartCount);

  // Calculate price impact
  const swapAmount = 1000; // $1000
  const pairLiquidity = 10000; // $10,000
  const impactWith5Parts = calculatePriceImpact(swapAmount, pairLiquidity, 5);
  const impactWith1Part = calculatePriceImpact(swapAmount, pairLiquidity, 1);
  console.log("Impact with 5 parts:", impactWith5Parts, "%");
  console.log("Impact with 1 part:", impactWith1Part, "%");

  // Get optimal partCount based on impact
  const optimalPartCount = getOptimalPartCount(swapAmount, pairLiquidity, 5);
  console.log("Optimal partCount:", optimalPartCount);

  // Get online partCount (with fallback)
  try {
    const onlinePartCount = await getPartCountWithFallback(
      btcToken,
      memeToken,
      "1000000000000000000", // 1 token
      3637, // Botanix Mainnet
      "https://api-public.bitzy.app",
      5 // fallback partCount
    );
    console.log("Online partCount:", onlinePartCount);
  } catch (error) {
    console.log("Online partCount failed, using fallback");
  }
}

// Example: Web app usage with custom liquidity sources
async function exampleCustomSwap() {
  // Override with custom liquidity sources
  const customSources = CUSTOM_LIQUIDITY_SOURCES[3636]; // Botanix Testnet

  const result = await fetchSwapRouteSimple(
    {
      srcToken: {
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        symbol: "BTC",
        name: "Bitcoin",
        decimals: 18,
        chainId: 3636, // Botanix Testnet
      },
      dstToken: {
        address: "0x233631132FD56c8f86D1FC97F0b82420a8d20af3",
        symbol: "WBTC",
        name: "Wrapped Bitcoin",
        decimals: 18,
        chainId: 3636, // Botanix Testnet
      },
      amountIn: "1000000000000000000", // 1 BTC
      chainId: 3636, // Botanix Testnet
    },
    {
      apiBaseUrl: "https://api-public.bitzy.app",
      defaultPartCount: 5,
    }
  );

  console.log("Custom swap result:", result);
}

export {
  CUSTOM_LIQUIDITY_SOURCES,
  getNetworkConfig,
  getBotanixContracts,
  getBotanixDexRouters,
  exampleIntelligentRouting,
  exampleForcePartCount,
  examplePairLiquidityConcerns,
  examplePartCountUtilities,
  exampleCustomSwap,
};
