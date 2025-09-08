import BigNumber from "bignumber.js";
import { Address } from "viem";
import { Token } from "../types";

/**
 * Convert token amount from human readable format to wei
 * @param amount - Human readable amount (e.g., "1.5")
 * @param decimals - Token decimals
 * @returns BigNumber representation in wei
 */
export function fromTokenAmount(amount: string, decimals: number): BigNumber {
  if (!amount || isNaN(Number(amount))) {
    return new BigNumber(0);
  }
  return new BigNumber(amount).times(new BigNumber(10).pow(decimals));
}

/**
 * Convert token amount from wei to human readable format
 * @param amount - Amount in wei
 * @param decimals - Token decimals
 * @returns Human readable amount string
 */
export function toTokenAmount(
  amount: BigNumber | string,
  decimals: number
): string {
  const bn = new BigNumber(amount);
  return bn.dividedBy(new BigNumber(10).pow(decimals)).toString();
}

/**
 * Check if a token is native (ETH, BNB, etc.)
 * @param token - Token to check
 * @param nativeAddress - Native token address for the network
 * @returns boolean
 */
export function isNativeToken(token: Token, nativeAddress: Address): boolean {
  return token.address.toLowerCase() === nativeAddress.toLowerCase();
}

/**
 * Check if a token is wrapped (WETH, WBNB, etc.)
 * @param token - Token to check
 * @param wrappedAddress - Wrapped token address for the network
 * @returns boolean
 */
export function isWrappedToken(token: Token, wrappedAddress: Address): boolean {
  return token.address.toLowerCase() === wrappedAddress.toLowerCase();
}

/**
 * Validate token addresses
 * @param srcToken - Source token
 * @param dstToken - Destination token
 * @returns boolean
 */
export function validateTokens(srcToken: Token, dstToken: Token): boolean {
  return (
    srcToken &&
    dstToken &&
    srcToken.address &&
    dstToken.address &&
    srcToken.address !== dstToken.address &&
    srcToken.chainId === dstToken.chainId
  );
}

/**
 * Validate amount input
 * @param amount - Amount to validate
 * @returns boolean
 */
export function validateAmount(amount: string): boolean {
  if (!amount || isNaN(Number(amount))) {
    return false;
  }
  const num = new BigNumber(amount);
  return num.gt(0) && num.isFinite();
}

/**
 * Calculate optimal part count of a route based on amount and price
 * @param amount - Input amount
 * @param price - Token price in USD
 * @param partCount - Default part count of a route
 * @returns number
 */
export function calculatePartCount(
  amount: string,
  price: number,
  partCount: number = 10
): number {
  const amountUSD = new BigNumber(amount).times(price);
  return amountUSD.lt(1) ? 1 : partCount;
}

/**
 * Format error message
 * @param error - Error object or string
 * @returns Formatted error string
 */
export function formatError(error: any): string {
  if (typeof error === "string") {
    return error;
  }
  if (error?.message) {
    return error.message;
  }
  if (error?.error) {
    return error.error;
  }
  return "Unknown error occurred";
}

/**
 * Debounce function
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function with cancel method
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: NodeJS.Timeout;

  const debouncedFn = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };

  debouncedFn.cancel = () => {
    clearTimeout(timeout);
  };

  return debouncedFn;
}
