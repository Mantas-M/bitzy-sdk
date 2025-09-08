import {
  isHighValueToken,
  getPartCountOffline,
  getPartCountOnline,
  getPartCountWithFallback,
  calculatePriceImpact,
  getOptimalPartCount,
  HIGH_VALUE_TOKENS,
} from "../utils/PartCount";
import { Token } from "../types";

// Mock fetch for getPartCountOnline tests
global.fetch = jest.fn();

describe("partCount utilities", () => {
  const mockToken: Token = {
    address: "0x1234567890123456789012345678901234567890",
    symbol: "TEST",
    name: "Test Token",
    decimals: 18,
    chainId: 3637,
  };

  const highValueToken: Token = {
    address: "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56", // pBTC
    symbol: "pBTC",
    name: "Wrapped Bitcoin",
    decimals: 18,
    chainId: 3637,
  };

  const usdcToken: Token = {
    address: "0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C", // USDC
    symbol: "USDC",
    name: "USD Coin",
    decimals: 18,
    chainId: 3637,
  };

  describe("isHighValueToken", () => {
    it("should return true for high-value tokens on supported networks", () => {
      expect(isHighValueToken(highValueToken, 3637)).toBe(true);
      expect(isHighValueToken(usdcToken, 3637)).toBe(true);
    });

    it("should return false for low-value tokens", () => {
      expect(isHighValueToken(mockToken, 3637)).toBe(false);
    });

    it("should return false for unsupported networks", () => {
      expect(isHighValueToken(highValueToken, 999)).toBe(false);
    });

    it("should return false for null/undefined tokens", () => {
      expect(isHighValueToken(null, 3637)).toBe(false);
      expect(isHighValueToken(undefined, 3637)).toBe(false);
    });

    it("should handle case-insensitive address comparison", () => {
      const upperCaseToken = {
        ...highValueToken,
        address: "0X0D2437F93FED6EA64EF01CCDE385FB1263910C56" as `0x${string}`,
      };
      expect(isHighValueToken(upperCaseToken, 3637)).toBe(true);
    });
  });

  describe("getPartCountOffline", () => {
    it("should return defaultPartCount for high-value pairs", () => {
      const result = getPartCountOffline(highValueToken, usdcToken, 3637, 5);
      expect(result).toBe(5);
    });

    it("should return 1 for mixed pairs (one high-value, one low-value)", () => {
      const result1 = getPartCountOffline(highValueToken, mockToken, 3637, 5);
      const result2 = getPartCountOffline(mockToken, usdcToken, 3637, 5);
      expect(result1).toBe(1);
      expect(result2).toBe(1);
    });

    it("should return 1 for low-value pairs", () => {
      const lowValueToken2 = {
        ...mockToken,
        address: "0x0987654321098765432109876543210987654321" as `0x${string}`,
      };
      const result = getPartCountOffline(mockToken, lowValueToken2, 3637, 5);
      expect(result).toBe(1);
    });

    it("should handle null/undefined tokens", () => {
      expect(getPartCountOffline(null, usdcToken, 3637, 5)).toBe(1);
      expect(getPartCountOffline(highValueToken, null, 3637, 5)).toBe(1);
      expect(getPartCountOffline(null, null, 3637, 5)).toBe(1);
    });

    it("should use custom defaultPartCount", () => {
      const result = getPartCountOffline(highValueToken, usdcToken, 3637, 10);
      expect(result).toBe(10);
    });
  });

  describe("calculatePriceImpact", () => {
    it("should calculate correct price impact", () => {
      const impact = calculatePriceImpact(1000, 10000, 5);
      expect(impact).toBeCloseTo(2.0, 2); // 2% impact
    });

    it("should return 0 for zero swap amount", () => {
      const impact = calculatePriceImpact(0, 10000, 5);
      expect(impact).toBe(0);
    });

    it("should handle high impact scenarios", () => {
      const impact = calculatePriceImpact(5000, 10000, 1);
      expect(impact).toBeCloseTo(50.0, 2); // 50% impact
    });
  });

  describe("getOptimalPartCount", () => {
    it("should return 1 for large swaps", () => {
      const result = getOptimalPartCount(10000, 10000, 5);
      expect(result).toBe(1);
    });

    it("should return 5 for small swaps", () => {
      const result = getOptimalPartCount(100, 10000, 5);
      expect(result).toBe(5);
    });

    it("should return 1 regardless of maxImpactThreshold", () => {
      const result = getOptimalPartCount(1000, 10000, 1); // 1% max impact
      expect(result).toBe(1);
    });
  });

  describe("getPartCountOnline", () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockClear();
    });

    it("should fetch online partCount successfully", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ liquidity: 50000 }),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getPartCountOnline(
        highValueToken,
        usdcToken,
        "1000000000000000000",
        3637,
        "https://api-public.bitzy.app"
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/sdk/asset/minimum"),
        expect.any(Object)
      );
      expect(result).toBeGreaterThan(0);
    });

    it("should handle API errors gracefully by falling back", async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error("API Error"));

      const result = await getPartCountOnline(
        highValueToken,
        usdcToken,
        "1000000000000000000",
        3637,
        "https://api-public.bitzy.app"
      );

      expect(result).toBe(5); // Should fallback to offline logic
    });

    it("should handle timeout by falling back", async () => {
      (fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 100)
          )
      );

      const result = await getPartCountOnline(
        highValueToken,
        usdcToken,
        "1000000000000000000",
        3637,
        "https://api-public.bitzy.app"
      );

      expect(result).toBe(5); // Should fallback to offline logic
    });
  });

  describe("getPartCountWithFallback", () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockClear();
    });

    it("should use online result when successful", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ liquidity: 50000 }),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getPartCountWithFallback(
        highValueToken,
        usdcToken,
        "1000000000000000000",
        3637,
        "https://api-public.bitzy.app",
        5
      );

      expect(result).toBeGreaterThan(0);
    });

    it("should fallback to offline when online fails", async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error("API Error"));

      const result = await getPartCountWithFallback(
        highValueToken,
        usdcToken,
        "1000000000000000000",
        3637,
        "https://api-public.bitzy.app",
        5
      );

      expect(result).toBe(5); // Should use offline fallback
    });

    it("should use custom fallback partCount", async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error("API Error"));

      const result = await getPartCountWithFallback(
        highValueToken,
        usdcToken,
        "1000000000000000000",
        3637,
        "https://api-public.bitzy.app",
        10
      );

      expect(result).toBe(10); // Should use custom fallback
    });
  });

  describe("HIGH_VALUE_TOKENS", () => {
    it("should contain expected tokens for Botanix Mainnet", () => {
      expect(HIGH_VALUE_TOKENS[3637]).toContain(
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
      );
      expect(HIGH_VALUE_TOKENS[3637]).toContain(
        "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56"
      );
      expect(HIGH_VALUE_TOKENS[3637]).toContain(
        "0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C"
      );
    });

    it("should contain expected tokens for Botanix Testnet", () => {
      expect(HIGH_VALUE_TOKENS[3636]).toContain(
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
      );
      expect(HIGH_VALUE_TOKENS[3636]).toContain(
        "0x233631132FD56c8f86D1FC97F0b82420a8d20af3"
      );
      expect(HIGH_VALUE_TOKENS[3636]).toContain(
        "0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C"
      );
    });

    it("should have different tokens for different networks", () => {
      expect(HIGH_VALUE_TOKENS[3637]).not.toEqual(HIGH_VALUE_TOKENS[3636]);
    });
  });
});
