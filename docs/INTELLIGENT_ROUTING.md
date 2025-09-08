# Intelligent Routing System

The Bitzy SDK features an intelligent routing system that automatically optimizes swap execution based on token characteristics.

## How It Works

### Automatic partCount Calculation

The SDK automatically determines the optimal number of routes (`partCount`) based on the token pair:

- **High-value pairs** (BTC-USDC, ETH-USDT): Uses `partCount = 5` for optimal execution
- **Mixed pairs** (BTC-MEME, ETH-SHIB): Uses `partCount = 1` for simplicity
- **Low-value pairs** (MEME-SHIB): Uses `partCount = 1` for simplicity

### High-Value Pairs (partCount = 5)

Both tokens must be high-value for multi-route optimization. The SDK uses network-specific token addresses:

```typescript
const HIGH_VALUE_TOKENS: ChainWrap<string[]> = {
  // Botanix Mainnet (3637)
  3637: [
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH/BTC native
    "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56", // pBTC (Botanix)
    "0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C", // USDC
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
  ],
  // Botanix Testnet (3636)
  3636: [
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH/BTC native
    "0x233631132FD56c8f86D1FC97F0b82420a8d20af3", // WBTC (Botanix Testnet)
    "0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C", // USDC
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
  ],
};
```

**Examples:**
- BTC-USDC → Both high-value → `partCount = 5`
- ETH-USDT → Both high-value → `partCount = 5`
- BTC-MEME → One low-value → `partCount = 1`
- MEME-SHIB → Both low-value → `partCount = 1`

## Benefits

### BTC/ETH Swaps
- **Use 5 routes** for optimal execution and better pricing (when paired with high-value tokens)
- **Better price discovery** across multiple liquidity pools
- **Reduced slippage** through route optimization

### Meme Token Swaps
- **Use 1 route** for simplicity and lower gas costs
- **Faster execution** with minimal complexity
- **Lower transaction fees** due to simpler routing

### Stablecoin Swaps
- **Use 5 routes** for better price discovery (when paired with high-value tokens)
- **Optimal execution** for high-volume trades
- **Better liquidity utilization**

### Easy Extension
- **Just add more addresses** to the high-value list
- **No code changes** required for new tokens
- **Automatic classification** based on token address

## CRITICAL EXCEPTIONS & CONCERNS

### Pair Liquidity Impact
**Pair liquidity matters more than token value!**

Even high-value tokens can cause issues in low-liquidity pairs:

#### Problem Examples:
- **BTC-X pair** with only $100 liquidity → Using 5 parts for $1000 swap = **50% impact per part**
- **USDC-X pair** with $100,000 liquidity → Using 5 parts for $1000 swap = **1% impact per part**

#### Impact Calculation:
```
Price Impact per Part = (Swap Amount / Number of Parts) / Pair Liquidity
```

#### When to Override:
- **Low liquidity pairs** → Use `forcePartCount: 1`
- **High liquidity pairs** → Use `forcePartCount: 5`
- **Always check pair liquidity** before deciding partCount

#### Concerns to Consider:
- **Slippage**: Too many parts in low liquidity = higher slippage
- **Gas costs**: More routes = higher transaction costs
- **Execution time**: More routes = longer execution
- **Price impact**: Each part affects price, compounding impact

#### Recommended Approach:
1. **Check pair liquidity** before deciding partCount
2. **Use forcePartCount: 1** for low liquidity pairs
3. **Use forcePartCount: 5** for high liquidity pairs
4. **Monitor slippage** and adjust accordingly

## Usage Examples

### Automatic Intelligent Routing

```typescript
import { useSwapV3Routes } from '@bitzy/sdk';

// High-value token (BTC) - automatically uses partCount = 5
const btcResult = useSwapV3Routes(
  btcToken,    // High-value token
  dstToken, 
  amountIn, 
  chainId, 
  {
    apiBaseUrl: "https://api-public.bitzy.app",
    config: addressConfig,
    // Automatically detects BTC and uses 5 routes
  }
);

// Low-value token (meme) - automatically uses partCount = 1
const memeResult = useSwapV3Routes(
  memeToken,  // Low-value token
  dstToken, 
  amountIn, 
  chainId, 
  {
    apiBaseUrl: "https://api-public.bitzy.app",
    config: addressConfig,
    // Automatically detects meme token and uses 1 route
  }
);
```

### Force Specific partCount

```typescript
// Force 3 routes for any token
const result = useSwapV3Routes(
  srcToken, 
  dstToken, 
  amountIn, 
  chainId, 
  {
    apiBaseUrl: "https://api-public.bitzy.app",
    config: addressConfig,
    forcePartCount: 3, // Always use 3 routes regardless of token
  }
);
```

### Custom Default for High-Value Tokens

```typescript
// High-value tokens use 7 routes instead of 5
const result = useSwapV3Routes(
  srcToken, 
  dstToken, 
  amountIn, 
  chainId, 
  {
    apiBaseUrl: "https://api-public.bitzy.app",
    config: addressConfig,
    defaultPartCount: 7, // High-value tokens use 7 routes instead of 5
  }
);
```

### CRITICAL: Pair Liquidity Considerations

```typescript
// Low liquidity pair - force single route
const lowLiquidityResult = useSwapV3Routes(
  srcToken, 
  dstToken, 
  amountIn, 
  chainId, 
  {
    apiBaseUrl: "https://api-public.bitzy.app",
    config: addressConfig,
    forcePartCount: 1, // Avoid splitting in low liquidity pairs
  }
);

// High liquidity pair - safe to use multiple routes
const highLiquidityResult = useSwapV3Routes(
  srcToken, 
  dstToken, 
  amountIn, 
  chainId, 
  {
    apiBaseUrl: "https://api-public.bitzy.app",
    config: addressConfig,
    forcePartCount: 5, // Safe to split in high liquidity pairs
  }
);
```

### Using Common Functions

```typescript
import { fetchSwapRouteSimple } from '@bitzy/sdk';

// Automatic intelligent routing
const result = await fetchSwapRouteSimple(
  {
    srcToken: btcToken,    // High-value token
    dstToken: dstToken,
    amountIn: "1000000000000000000",
    chainId: 3637,
  },
  {
    apiBaseUrl: "https://api-public.bitzy.app",
    defaultPartCount: 5, // High-value tokens use 5 routes
  }
);

// Force specific partCount
const forcedResult = await fetchSwapRouteSimple(
  {
    srcToken: srcToken,
    dstToken: dstToken,
    amountIn: "1000000000000000000",
    chainId: 3637,
  },
  {
    apiBaseUrl: "https://api-public.bitzy.app",
    forcePartCount: 3, // Always use 3 routes
  }
);

// CRITICAL: Check pair liquidity first!
// Low liquidity pair - force single route
const lowLiquidityResult = await fetchSwapRouteSimple(
  {
    srcToken: btcToken,    // High-value token
    dstToken: lowLiquidityToken, // Low liquidity pair
    amountIn: "1000000000000000000",
    chainId: 3637,
  },
  {
    apiBaseUrl: "https://api-public.bitzy.app",
    forcePartCount: 1, // Avoid splitting in low liquidity
  }
);
```

## Configuration Options

### Hook Configuration

```typescript
interface UseSwapV3RoutesConfig {
  // ... other options
  defaultPartCount?: number;    // Default for high-value tokens (default: 5)
  forcePartCount?: number;       // Override automatic calculation
}
```

### Service Configuration

```typescript
interface SwapOptions {
  // ... other options
  partCount?: number;           // Direct partCount override
  forcePartCount?: number;       // Force specific partCount
}
```

## When to Use Each Approach

### Use Automatic (Recommended)
- **Most use cases** - Let the SDK decide
- **New tokens** - Automatically classified
- **Optimal performance** - Best routing for each token type
- **BUT**: Always check pair liquidity first!

### Use forcePartCount
- **Low liquidity pairs** - Force single route to avoid high slippage
- **High liquidity pairs** - Allow multiple routes for better execution
- **Specific requirements** - Need exact route count
- **Testing** - Compare different route counts
- **Custom logic** - Your own token classification

### Use defaultPartCount
- **Fine-tuning** - Adjust high-value token behavior
- **Performance optimization** - Balance between routes and gas costs
- **Custom defaults** - Different defaults for different environments
- **STILL**: Check pair liquidity for each specific swap

## Performance Impact

| Token Type | Routes | Gas Cost | Execution Speed | Price Optimization | Pair Liquidity Risk |
|------------|--------|----------|-----------------|-------------------|-------------------|
| High-value | 5 | Higher | Slower | Better | High in low liquidity |
| Low-value  | 1 | Lower  | Faster | Good enough | Low risk |

### Critical Pair Liquidity Considerations:

| Pair Liquidity | Swap Amount | 5 Parts Impact | 1 Part Impact | Recommendation |
|----------------|-------------|----------------|---------------|----------------|
| $100 | $1000 | 50% per part | 10% total | Use 1 part |
| $1,000 | $1000 | 5% per part | 1% total | Use 5 parts |
| $10,000 | $1000 | 0.5% per part | 0.1% total | Use 5 parts |
| $100,000 | $1000 | 0.05% per part | 0.01% total | Use 5 parts |

## 🔍 Debugging

To see which partCount is being used:

```typescript
const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId, config);

// Check the distributions array length
console.log('Routes used:', result.distributions.length);
console.log('Part count:', result.distributions.reduce((a, b) => a + b, 0));
```

## Utility Functions

The SDK provides utility functions for advanced partCount management:

### Offline Functions (Fast & Reliable)

```typescript
import { getPartCountOffline, isHighValueToken } from '@bitzy/sdk';

// Check if tokens are high-value
const isSrcHighValue = isHighValueToken(btcToken, 3637); // true
const isDstHighValue = isHighValueToken(memeToken, 3637); // false

// Get offline partCount based on token pair
const highValuePairCount = getPartCountOffline(btcToken, usdcToken, 3637, 5); // 5 (both high-value)
const mixedPairCount = getPartCountOffline(btcToken, memeToken, 3637, 5); // 1 (one low-value)
```

### Online Functions (Real-time Data)

```typescript
import { getPartCountOnline, getPartCountWithFallback } from '@bitzy/sdk';

// Get online partCount based on real pair liquidity
const partCount = await getPartCountOnline(
  srcToken,
  dstToken,
  amountIn,
  chainId,
  apiBaseUrl,
  {
    maxImpactThreshold: 5, // 5% max impact per part
    minLiquidityThreshold: 10000, // $10,000 minimum liquidity
  }
);

// With fallback to offline logic
const partCount = await getPartCountWithFallback(
  srcToken,
  dstToken,
  amountIn,
  chainId,
  apiBaseUrl,
  {
    fallbackPartCount: 5, // Use this if API fails
  }
);
```

### Impact Calculation Functions

```typescript
import { calculatePriceImpact, getOptimalPartCount } from '@bitzy/sdk';

// Calculate price impact
const impact = calculatePriceImpact(swapAmount, pairLiquidity, partCount);

// Get optimal partCount based on impact thresholds
const optimalPartCount = getOptimalPartCount(swapAmount, pairLiquidity, 5);
```

## Extending the System

To add new high-value tokens:

1. **Add to the list** in the SDK source code
2. **Deploy updated SDK** 
3. **Automatic classification** for new tokens

```typescript
import { HIGH_VALUE_TOKENS } from '@bitzy/sdk';

// Add new high-value token
HIGH_VALUE_TOKENS.push("0xNewHighValueTokenAddress");
```

This intelligent routing system ensures optimal swap execution while maintaining simplicity for developers!
