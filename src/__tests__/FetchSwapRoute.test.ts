import {
  fetchSwapRoute,
  fetchBatchSwapRoutes,
  getSwapQuote,
  fetchSwapRouteSimple,
} from "../common/FetchSwapRoute";
import { BigNumber } from "bignumber.js";

// Mock the SwapV3Service
jest.mock("../services/SwapV3Service");
jest.mock("../api/Client");

describe("FetchSwapRoute Functions", () => {
  const mockSrcToken = {
    address: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56" as `0x${string}`,
    symbol: "pBTC",
    name: "Wrapped Bitcoin",
    decimals: 18,
    chainId: 3637,
  };

  const mockDstToken = {
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as `0x${string}`,
    symbol: "BTC",
    name: "Bitcoin",
    decimals: 18,
    chainId: 3637,
  };

  const mockSwapResult = {
    routes: [
      [
        {
          routerAddress: "0xA5E0AE4e5103dc71cA290AA3654830442357A489",
          lpAddress: "0x9c157b5cb0205d184bd0108eebd64aaa363637fb",
          fromToken: "0x0d2437f93fed6ea64ef01ccde385fb1263910c56",
          toToken: "0x29ee6138dd4c9815f46d34a4a1ed48f46758a402",
          from: "0x0000000000000000000000000000000000000000",
          to: "0x0000000000000000000000000000000000000001",
          part: "100000000",
          amountAfterFee: "9970",
          dexInterface: 1,
        },
      ],
    ],
    distributions: [5],
    amountOutRoutes: [new BigNumber("96093446470")],
    amountOutBN: new BigNumber("96093446470"),
    amountInParts: [new BigNumber("1000000000000000000")],
    isLoading: false,
    isAmountOutError: false,
    isFirstFetch: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock APIClient.getInstance to return a mock instance
    const { APIClient } = require("../api/Client");
    APIClient.getInstance = jest.fn().mockReturnValue({
      request: jest.fn(),
    });
  });

  describe("fetchSwapRoute", () => {
    it("should fetch swap route with valid options", async () => {
      const { SwapV3Service } = require("../services/SwapV3Service");
      const mockFetchRoute = jest.fn().mockResolvedValue(mockSwapResult);
      SwapV3Service.mockImplementation(() => ({
        fetchRoute: mockFetchRoute,
      }));

      const result = await fetchSwapRoute({
        amountIn: "1000000000000000000",
        srcToken: mockSrcToken,
        dstToken: mockDstToken,
        chainId: 3637,
      });

      expect(result).toEqual(mockSwapResult);
      expect(mockFetchRoute).toHaveBeenCalledWith({
        amountIn: "1000000000000000000",
        srcToken: mockSrcToken,
        dstToken: mockDstToken,
        chainId: 3637,
      });
    });

    it("should throw error for unsupported network", async () => {
      await expect(
        fetchSwapRoute({
          amountIn: "1000000000000000000",
          srcToken: mockSrcToken,
          dstToken: mockDstToken,
          chainId: 9999, // Unsupported network
        })
      ).rejects.toThrow("Unsupported network: 9999");
    });

    it("should use custom config", async () => {
      const { SwapV3Service } = require("../services/SwapV3Service");
      const mockFetchRoute = jest.fn().mockResolvedValue(mockSwapResult);
      SwapV3Service.mockImplementation(() => ({
        fetchRoute: mockFetchRoute,
      }));

      await fetchSwapRoute(
        {
          amountIn: "1000000000000000000",
          srcToken: mockSrcToken,
          dstToken: mockDstToken,
          chainId: 3637,
        },
        {
          apiBaseUrl: "https://custom-api.example.com",
          defaultPartCount: 3,
          timeout: 15000,
        }
      );

      expect(SwapV3Service).toHaveBeenCalledWith({
        config: expect.objectContaining({
          routerAddress: expect.any(String),
          bitzyQueryAddress: expect.any(String),
          wrappedAddress: expect.any(String),
          nativeAddress: expect.any(String),
        }),
        defaultPartCount: 3,
        apiClient: expect.anything(),
      });
    });
  });

  describe("fetchBatchSwapRoutes", () => {
    it("should fetch multiple routes successfully", async () => {
      const { SwapV3Service } = require("../services/SwapV3Service");
      const mockFetchRoute = jest.fn().mockResolvedValue(mockSwapResult);
      SwapV3Service.mockImplementation(() => ({
        fetchRoute: mockFetchRoute,
      }));

      const swaps = [
        {
          options: {
            amountIn: "1000000000000000000",
            srcToken: mockSrcToken,
            dstToken: mockDstToken,
            chainId: 3637,
          },
          config: {},
        },
        {
          options: {
            amountIn: "2000000000000000000",
            srcToken: mockSrcToken,
            dstToken: mockDstToken,
            chainId: 3637,
          },
          config: {},
        },
      ];

      const results = await fetchBatchSwapRoutes(swaps);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ success: true, data: mockSwapResult });
      expect(results[1]).toEqual({ success: true, data: mockSwapResult });
    });

    it("should handle errors gracefully", async () => {
      const swaps = [
        {
          options: {
            amountIn: "1000000000000000000",
            srcToken: mockSrcToken,
            dstToken: mockDstToken,
            chainId: 9999, // This will fail
          },
          config: {},
        },
        {
          options: {
            amountIn: "2000000000000000000",
            srcToken: mockSrcToken,
            dstToken: mockDstToken,
            chainId: 3637,
          },
          config: {},
        },
      ];

      const results = await fetchBatchSwapRoutes(swaps);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        success: false,
        error: "Unsupported network: 9999",
      });
      expect(results[1]).toEqual({ success: true, data: mockSwapResult });
    });
  });

  describe("getSwapQuote", () => {
    it("should return simplified quote", async () => {
      const { SwapV3Service } = require("../services/SwapV3Service");
      const mockFetchRoute = jest.fn().mockResolvedValue(mockSwapResult);
      SwapV3Service.mockImplementation(() => ({
        fetchRoute: mockFetchRoute,
      }));

      const quote = await getSwapQuote(
        mockSrcToken,
        mockDstToken,
        "1000000000000000000",
        3637
      );

      expect(quote).toEqual({
        amountOut: "96093446470",
        routes: 1,
      });
    });
  });

  describe("fetchSwapRouteSimple", () => {
    it("should fetch route with automatic liquidity sources", async () => {
      const { SwapV3Service } = require("../services/SwapV3Service");
      const mockFetchRoute = jest.fn().mockResolvedValue(mockSwapResult);
      SwapV3Service.mockImplementation(() => ({
        fetchRoute: mockFetchRoute,
      }));

      const result = await fetchSwapRouteSimple({
        amountIn: "1000000000000000000",
        srcToken: mockSrcToken,
        dstToken: mockDstToken,
        chainId: 3637,
      });

      expect(result).toEqual(mockSwapResult);
      expect(mockFetchRoute).toHaveBeenCalledWith({
        amountIn: "1000000000000000000",
        srcToken: mockSrcToken,
        dstToken: mockDstToken,
        chainId: 3637,
        types: expect.any(Array),
        enabledSources: expect.any(Array),
      });
    });

    it("should handle forcePartCount correctly", async () => {
      const { SwapV3Service } = require("../services/SwapV3Service");
      const mockFetchRoute = jest.fn().mockResolvedValue(mockSwapResult);
      SwapV3Service.mockImplementation(() => ({
        fetchRoute: mockFetchRoute,
      }));

      await fetchSwapRouteSimple(
        {
          amountIn: "1000000000000000000",
          srcToken: mockSrcToken,
          dstToken: mockDstToken,
          chainId: 3637,
        },
        {
          forcePartCount: 3,
        }
      );

      expect(mockFetchRoute).toHaveBeenCalledWith({
        amountIn: "1000000000000000000",
        srcToken: mockSrcToken,
        dstToken: mockDstToken,
        chainId: 3637,
        types: expect.any(Array),
        enabledSources: expect.any(Array),
      });
    });
  });
});
