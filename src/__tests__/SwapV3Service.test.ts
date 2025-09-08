import { SwapV3Service } from "../services/SwapV3Service";
import { APIClient } from "../api/Client";
import { Token, SwapOptions } from "../types";

// Mock APIClient
jest.mock("../api/Client");

describe("SwapV3Service", () => {
  let swapService: SwapV3Service;
  let mockApiClient: jest.Mocked<APIClient>;

  const mockToken: Token = {
    address: "0x1234567890123456789012345678901234567890",
    symbol: "TEST",
    name: "Test Token",
    decimals: 18,
    chainId: 1,
  };

  const mockConfig = {
    config: {
      routerAddress: "0xRouter",
      bitzyQueryAddress: "0xQuery",
      wrappedAddress: "0xWrapped",
      nativeAddress: "0xNative",
    },
    defaultPartCount: 5,
    apiClient: {} as APIClient,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient = new APIClient({
      baseUrl: "test",
      timeout: 1000,
    }) as jest.Mocked<APIClient>;
    mockConfig.apiClient = mockApiClient;
    swapService = new SwapV3Service(mockConfig);
  });

  describe("fetchRoute", () => {
    it("should throw error for invalid tokens", async () => {
      const options: SwapOptions = {
        amountIn: "1.0",
        srcToken: mockToken,
        dstToken: mockToken, // Same token
        chainId: 3637,
      };

      await expect(swapService.fetchRoute(options)).rejects.toThrow(
        "Invalid tokens provided"
      );
    });

    it("should throw error for invalid amount", async () => {
      const options: SwapOptions = {
        amountIn: "0",
        srcToken: mockToken,
        dstToken: {
          ...mockToken,
          address: "0x0987654321098765432109876543210987654321",
        },
        chainId: 3637,
      };

      await expect(swapService.fetchRoute(options)).rejects.toThrow(
        "Invalid amount provided"
      );
    });

    it("should handle wrap/unwrap scenarios", async () => {
      const nativeToken = { ...mockToken, address: "0xNative" };
      const wrappedToken = { ...mockToken, address: "0xWrapped" };

      const options: SwapOptions = {
        amountIn: "1.0",
        srcToken: nativeToken,
        dstToken: wrappedToken,
        chainId: 3637,
      };

      const result = await swapService.fetchRoute(options);

      expect(result.isWrap).toBe("wrap");
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0]).toHaveLength(1);
    });

    it("should handle API errors gracefully", async () => {
      mockApiClient.getPathV3 = jest
        .fn()
        .mockRejectedValue(new Error("API Error"));

      const options: SwapOptions = {
        amountIn: "1.0",
        srcToken: mockToken,
        dstToken: {
          ...mockToken,
          address: "0x0987654321098765432109876543210987654321",
        },
        chainId: 3637,
      };

      await expect(swapService.fetchRoute(options)).rejects.toThrow(
        "Failed to fetch swap route"
      );
    });

    it("should process unsupported network without validation", async () => {
      mockApiClient.getPathV3 = jest
        .fn()
        .mockRejectedValue(new Error("Network not supported"));

      const options: SwapOptions = {
        amountIn: "1.0",
        srcToken: mockToken,
        dstToken: {
          ...mockToken,
          address: "0x0987654321098765432109876543210987654321",
        },
        chainId: 999, // Unsupported network
      };

      await expect(swapService.fetchRoute(options)).rejects.toThrow(
        "Failed to fetch swap route"
      );
    });
  });

  describe("getSupportedNetworks", () => {
    it("should return supported network IDs", () => {
      const networks = swapService.getSupportedNetworks();
      expect(networks).toEqual([3636, 3637]);
    });
  });

  describe("getNetworkConfig", () => {
    it("should return config for any network", () => {
      const config = swapService.getNetworkConfig(3637);
      expect(config).toBeDefined();
      expect(config?.routerAddress).toBe("0xRouter");
    });

    it("should return same config for unsupported network", () => {
      const config = swapService.getNetworkConfig(999);
      expect(config).toBeDefined();
      expect(config?.routerAddress).toBe("0xRouter");
    });
  });
});
