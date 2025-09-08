import { Address } from "viem";
import { ChainWrap, LiquiditySourcesConfig } from "../types";

// DEX Interface constants (global - same across all networks)
export const DEX_INTERFACE = {
  V2: 0,
  V3: 1,
} as const;

// Target addresses (global - same across all networks)
export const USER_TARGET: Address =
  "0x0000000000000000000000000000000000000001";
export const ROUTER_TARGET: Address =
  "0x0000000000000000000000000000000000000000";

// Default configuration (global - same across all networks)
export const DEFAULT_PART_COUNT = 5; // Changed from 10 to match PART_COUNT
export const DEFAULT_TIMEOUT = 30000; // 30 seconds

// API Configuration
export const DEFAULT_API_BASE_URL = "https://api-public.bitzy.app";

// Network-specific DEX Router addresses
export const DEX_ROUTERS: ChainWrap<Record<string, Address>> = {
  3637: {
    // Botanix Mainnet
    BITZY_V3: "0xA5E0AE4e5103dc71cA290AA3654830442357A489",
    BITZY_V2: "0x07c49Ade88b40f1Ac05707f236d7706f834F6BDB",
    AVOCADO_V2: "0xA4B4cDeC4fE2839d3D3a49Ad5E20c21c01A31091",
  },
  3636: {
    // Botanix Testnet
    BITZY_V3: "0xA5E0AE4e5103dc71cA290AA3654830442357A489",
    BITZY_V2: "0x07c49Ade88b40f1Ac05707f236d7706f834F6BDB",
    AVOCADO_V2: "0xA4B4cDeC4fE2839d3D3a49Ad5E20c21c01A31091",
  },
};

// Network-specific contract addresses
export const CONTRACT_ADDRESSES: ChainWrap<{
  factoryAddress: Address;
  v3FactoryAddress: Address;
  v3PositionManagerAddress: Address;
  v3WalletHelperAddress: Address;
  routerAddress: Address;
  aggregatorAddress: Address;
  otcAddress: Address;
  memeTokenGenerator: Address;
  bitzyQueryAddress: Address;
  wrappedAddress: Address;
  nativeAddress: Address;
  gasLimit: bigint;
}> = {
  3637: {
    // Botanix Mainnet
    factoryAddress: "0xDF2CA43f59fd92874e6C1ef887f7E14cb1f354dD",
    v3FactoryAddress: "0xa8C00286d8d37131c1d033dEeE2F754148932800",
    v3PositionManagerAddress: "0x76F3e7e326479Ef559996Cf5ab0aCB79Be4626FD",
    v3WalletHelperAddress: "0xd9Db96Aa882Da764feFff3eE427701B0337e8Ae7",
    routerAddress: "0x41207Eadf1932966Ff75bdc35e55D2C6734E47D4",
    aggregatorAddress: "0x5a0690AC82AAAA2e25bC130E900CD31eE9B67DB8",
    otcAddress: "0xe97ED77EB36A09c37B57D69A5000d8831167A854",
    memeTokenGenerator: "0x1cb880329265c7A5deDaD6301b1fbd2684CDd200",
    bitzyQueryAddress: "0x5b5079587501Bd85d3CDf5bFDf299f4eaAe98c23",
    wrappedAddress: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56", // pBTC
    nativeAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // BTC
    gasLimit: BigInt(50_000_000_000),
  },
  3636: {
    // Botanix Testnet
    factoryAddress: "0x472F9A40F47e0e0F770b224AeC2DD093cf5783aC",
    v3FactoryAddress: "0xc89e6aD4aD42Eeb82dfBA4c301CDaEDfd794A778",
    v3PositionManagerAddress: "0xA05E35Fa8997852E6a4A073461E36db1AA725D39",
    v3WalletHelperAddress: "0x232182B50E1d3c037b3E0bdbd89226d7730cFe0e",
    routerAddress: "0x07c49Ade88b40f1Ac05707f236d7706f834F6BDB",
    aggregatorAddress: "0x33B1Ed34c11910F767B15eBAbAB782D61FB2C5Ea",
    otcAddress: "0xB582f4B568f13F29Bba7696Fc352E293952D4b7E",
    memeTokenGenerator: "0xc76b4a09BecA8b34D94dE8BA27AeeF652FA3D2fC",
    bitzyQueryAddress: "0x2ad4b8912fb4Fe93f79BbCb3Aa6B8C39025FdfCC",
    wrappedAddress: "0x233631132FD56c8f86D1FC97F0b82420a8d20af3", // WBTC
    nativeAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // BTC
    gasLimit: BigInt(50_000_000_000),
  },
};

// Network-specific liquidity sources configuration
export const LIQUIDITY_SOURCES: ChainWrap<LiquiditySourcesConfig> = {
  3637: {
    // Botanix Mainnet
    types: [1, 2], // V2 (typeId: 1), V3 (typeId: 2)
    enabledSources: [1], // BITZY (sourceId: 1)
  },
  3636: {
    // Botanix Testnet
    types: [1, 2], // V2 (typeId: 1), V3 (typeId: 2)
    enabledSources: [1], // BITZY (sourceId: 1)
  },
};

// Helper functions to get network-specific configurations
export const getLiquiditySources = (
  chainId: number
): LiquiditySourcesConfig => {
  return LIQUIDITY_SOURCES[chainId] || { types: [1, 2], enabledSources: [1] };
};

export const getContractAddresses = (chainId: number) => {
  return CONTRACT_ADDRESSES[chainId];
};

export const getDexRouters = (chainId: number) => {
  return DEX_ROUTERS[chainId] || {};
};

// Legacy exports for backward compatibility
export const DEFAULT_NETWORKS = CONTRACT_ADDRESSES;
export const DEX_ROUTER = DEX_ROUTERS[3637] || {}; // Default to Botanix Mainnet

// API endpoints
export const API_ENDPOINTS = {
  PATH_V3: "/api/sdk/bestpath/split",
  ASSET_MINIMUM: "/api/sdk/asset/minimum",
} as const;

// Error codes
export const ERROR_CODES = {
  INVALID_TOKENS: "INVALID_TOKENS",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  NETWORK_NOT_SUPPORTED: "NETWORK_NOT_SUPPORTED",
  API_ERROR: "API_ERROR",
  QUERY_ERROR: "QUERY_ERROR",
  INSUFFICIENT_LIQUIDITY: "INSUFFICIENT_LIQUIDITY",
} as const;
