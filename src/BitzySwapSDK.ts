import { SwapV3Service, SwapV3ServiceConfig } from "./services/SwapV3Service";
import { APIClient, APIClientConfig } from "./api/Client";
import {
  DEFAULT_PART_COUNT,
  DEFAULT_TIMEOUT,
  getContractAddresses,
} from "./constants";
import {
  SwapOptions,
  SwapResult,
  Token,
  LiquiditySource,
  SwapV3AddressConfig,
} from "./types";

export interface BitzySwapSDKConfig {
  apiBaseUrl: string;
  networks?: Record<number, any>;
  defaultPartCount?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export class BitzySwapSDK {
  private swapService: SwapV3Service;
  private apiClient: APIClient;

  constructor(config: BitzySwapSDKConfig) {
    // Initialize API client
    this.apiClient = APIClient.getInstance({
      baseUrl: config.apiBaseUrl,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      headers: config.headers,
    });

    // Get default network config (Botanix Mainnet)
    const defaultNetworkConfig = getContractAddresses(3637);

    // Initialize swap service with proper network configuration
    const swapServiceConfig: SwapV3ServiceConfig = {
      config: {
        routerAddress:
          defaultNetworkConfig?.routerAddress ||
          "0xA5E0AE4e5103dc71cA290AA3654830442357A489",
        bitzyQueryAddress:
          defaultNetworkConfig?.bitzyQueryAddress ||
          "0x5b5079587501Bd85d3CDf5bFDf299f4eaAe98c23",
        wrappedAddress:
          defaultNetworkConfig?.wrappedAddress ||
          "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56",
        nativeAddress:
          defaultNetworkConfig?.nativeAddress ||
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      } as SwapV3AddressConfig,
      defaultPartCount: config.defaultPartCount || DEFAULT_PART_COUNT,
      apiClient: this.apiClient,
    };

    this.swapService = new SwapV3Service(swapServiceConfig);
  }

  /**
   * Fetch swap routes for V3 swaps
   * This is the main function that other applications will use
   */
  async fetchRoute(options: SwapOptions): Promise<SwapResult> {
    return this.swapService.fetchRoute(options);
  }

  /**
   * Get supported networks
   */
  getSupportedNetworks(): number[] {
    return this.swapService.getSupportedNetworks();
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(chainId: number) {
    return this.swapService.getNetworkConfig(chainId);
  }

  /**
   * Create a new instance with custom configuration
   */
  static create(config: BitzySwapSDKConfig): BitzySwapSDK {
    return new BitzySwapSDK(config);
  }
}

// Export the main class as default
export default BitzySwapSDK;
