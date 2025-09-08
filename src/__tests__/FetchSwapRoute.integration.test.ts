/**
 * Integration tests for the 4 main SDK functions
 * These tests make real API calls to verify the functions work correctly
 * Run with: npm test -- --testPathPattern=fetchSwapRoute.integration.test.ts
 */

import {
  fetchSwapRoute,
  fetchBatchSwapRoutes,
  getSwapQuote,
  fetchSwapRouteSimple,
} from "../common/FetchSwapRoute";

describe("SDK Functions Integration Tests", () => {
  const srcToken = {
    address: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56" as `0x${string}`,
    symbol: "pBTC",
    name: "Wrapped Bitcoin",
    decimals: 18,
    chainId: 3637,
  };

  const dstToken = {
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as `0x${string}`,
    symbol: "BTC",
    name: "Bitcoin",
    decimals: 18,
    chainId: 3637,
  };

  const amountIn = "1000000000000000000"; // 1 pBTC

  // Increase timeout for integration tests that make real API calls
  jest.setTimeout(30000);

  it("should fetch swap route with fetchSwapRoute", async () => {
    const result = await fetchSwapRoute({
      amountIn,
      srcToken,
      dstToken,
      chainId: 3637,
    });

    expect(result).toBeDefined();
    expect(result.routes).toBeDefined();
    expect(result.routes.length).toBeGreaterThan(0);
    expect(result.amountOutBN).toBeDefined();
    expect(result.distributions).toBeDefined();
    expect(result.isAmountOutError).toBe(false);
  });

  it("should fetch swap route with fetchSwapRouteSimple", async () => {
    const result = await fetchSwapRouteSimple({
      amountIn,
      srcToken,
      dstToken,
      chainId: 3637,
    });

    expect(result).toBeDefined();
    expect(result.routes).toBeDefined();
    expect(result.routes.length).toBeGreaterThan(0);
    expect(result.amountOutBN).toBeDefined();
    expect(result.distributions).toBeDefined();
    expect(result.isAmountOutError).toBe(false);
  });

  it("should get swap quote with getSwapQuote", async () => {
    const quote = await getSwapQuote(srcToken, dstToken, amountIn, 3637);

    expect(quote).toBeDefined();
    expect(quote.amountOut).toBeDefined();
    expect(quote.routes).toBeGreaterThan(0);
    expect(typeof quote.amountOut).toBe("string");
  });

  it("should fetch batch swap routes with fetchBatchSwapRoutes", async () => {
    const batchResults = await fetchBatchSwapRoutes([
      {
        options: {
          amountIn,
          srcToken,
          dstToken,
          chainId: 3637,
        },
        config: {},
      },
      {
        options: {
          amountIn: "2000000000000000000", // 2 pBTC
          srcToken,
          dstToken,
          chainId: 3637,
        },
        config: {},
      },
    ]);

    expect(batchResults).toBeDefined();
    expect(batchResults.length).toBe(2);
    
    batchResults.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.routes.length).toBeGreaterThan(0);
    });
  });

  it("should handle forcePartCount in fetchSwapRouteSimple", async () => {
    const result = await fetchSwapRouteSimple(
      {
        amountIn,
        srcToken,
        dstToken,
        chainId: 3637,
      },
      {
        forcePartCount: 3,
      }
    );

    expect(result).toBeDefined();
    expect(result.routes).toBeDefined();
    expect(result.routes.length).toBeGreaterThan(0);
    expect(result.amountOutBN).toBeDefined();
    expect(result.distributions).toBeDefined();
    expect(result.isAmountOutError).toBe(false);
  });

  it("should throw error for unsupported network", async () => {
    await expect(
      fetchSwapRoute({
        amountIn,
        srcToken,
        dstToken,
        chainId: 9999, // Unsupported network
      })
    ).rejects.toThrow("Unsupported network: 9999");
  });

  it("should handle errors gracefully in fetchBatchSwapRoutes", async () => {
    const batchResults = await fetchBatchSwapRoutes([
      {
        options: {
          amountIn,
          srcToken,
          dstToken,
          chainId: 9999, // This will fail
        },
        config: {},
      },
      {
        options: {
          amountIn,
          srcToken,
          dstToken,
          chainId: 3637, // This will succeed
        },
        config: {},
      },
    ]);

    expect(batchResults).toBeDefined();
    expect(batchResults.length).toBe(2);
    expect(batchResults[0].success).toBe(false);
    expect(batchResults[0].error).toContain("Unsupported network");
    expect(batchResults[1].success).toBe(true);
    expect(batchResults[1].data).toBeDefined();
  });
});