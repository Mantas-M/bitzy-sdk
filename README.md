# Bitzy Swap V3 - Common Function & Hot Hook

A comprehensive SDK for fetching swap routes and executing swaps on Bitzy's decentralized exchange. Provides both **common functions** for any environment and **React hooks** for frontend applications.

## **What This Package Provides**

- **Common Functions** - Work in Node.js, browser, or any JavaScript environment
- **React Hooks** - Hot reloading with automatic updates and error handling
- **TypeScript Support** - Full type safety throughout
- **Intelligent Routing** - Automatic optimization based on token characteristics
- **Multiple Networks** - Support for Botanix Mainnet and Testnet

## **Quick Start**

### **Installation**

```bash
npm install @bitzy-app/bitzy-sdk
# or
yarn add @bitzy-app/bitzy-sdk
# or
pnpm add @bitzy-app/bitzy-sdk
```

## **1. Using Functions**

### **1.1 `fetchSwapRoute()` - Main Route Finding Function**

```typescript
import { fetchSwapRoute } from '@bitzy-app/bitzy-sdk';

// Basic usage with defaults
const result = await fetchSwapRoute({
  amountIn: '1.5',
  srcToken: { 
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', 
    symbol: 'BTC', 
    name: 'Bitcoin', 
    decimals: 18,
    chainId: 3637
  },
  dstToken: { 
    address: '0x29eE6138DD4C9815f46D34a4A1ed48F46758A402', 
    symbol: 'USDC.e', 
    name: 'Bridged USDC (Stargate)', 
    decimals: 6,
    chainId: 3637
  },
  chainId: 3637
});

console.log('Routes found:', result.routes.length);
console.log('Amount out:', result.amountOutBN.toFixed());
console.log('Distributions:', result.distributions);
```

### **1.2 `fetchBatchSwapRoutes()` - Multiple Routes at Once**

```typescript
import { fetchBatchSwapRoutes } from '@bitzy-app/bitzy-sdk';

// Fetch multiple routes simultaneously
const results = await fetchBatchSwapRoutes([
  {
    options: {
      amountIn: '1.0',
      srcToken: btcToken,
      dstToken: usdcToken,
      chainId: 3637
    },
    config: { apiBaseUrl: 'https://api-public.bitzy.app' }
  },
  {
    options: {
      amountIn: '2.0',
      srcToken: ethToken,
      dstToken: usdtToken,
      chainId: 3637
    },
    config: { apiBaseUrl: 'https://api-public.bitzy.app' }
  }
]);

// Results array with success/error status for each
results.forEach((result, index) => {
  if (result.success) {
    console.log(`Route ${index + 1}:`, result.data.routes.length, 'routes');
  } else {
    console.error(`Route ${index + 1} failed:`, result.error);
  }
});
```

### **1.3 `getSwapQuote()` - Simple Price Quote**

```typescript
import { getSwapQuote } from '@bitzy-app/bitzy-sdk';

// Get a simple quote without full routing details
const quote = await getSwapQuote(
  srcToken,
  dstToken,
  '1.5',
  3637,
  { apiBaseUrl: 'https://api-public.bitzy.app' }
);

console.log('Amount out:', quote.amountOut);
console.log('Route count:', quote.routes);
```

### **1.4 `fetchSwapRouteSimple()` - Minimal Configuration**

```typescript
import { fetchSwapRouteSimple } from '@bitzy-app/bitzy-sdk';

// Simplified function with minimal parameters
const result = await fetchSwapRouteSimple(
  srcToken,
  dstToken,
  '1.0',
  3637
);

// Returns the same SwapResult as fetchSwapRoute
console.log('Best route:', result.routes[0]);
```

## **2. Using React Hooks**

### **2.1 `useSwapV3Routes()` - Main React Hook**

```tsx
import { useSwapV3Routes } from '@bitzy-app/bitzy-sdk';

function SwapComponent() {
  const [srcToken, setSrcToken] = useState(btcToken);
  const [dstToken, setDstToken] = useState(usdcToken);
  const [amountIn, setAmountIn] = useState('1.0');

  // Basic usage with defaults
  const {
    routes,
    distributions,
    amountOutRoutes,
    amountOutBN,
    amountInParts,
    isLoading,
    isAmountOutError,
    isFirstFetch,
    isWrap,
    error,
    fetchRoute,
    clearError
  } = useSwapV3Routes(srcToken, dstToken, amountIn, 3637);

  // Advanced usage with custom configuration
  const swapConfig = {
    apiBaseUrl: 'https://api-public.bitzy.app',
    config: {
      routerAddress: '0xA5E0AE4e5103dc71cA290AA3654830442357A489',
      bitzyQueryAddress: '0x...',
      wrappedAddress: '0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56',
      nativeAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    },
    defaultPartCount: 5,
    timeout: 30000,
    publicClient: publicClient,
    types: [1, 2], // V2 and V3 liquidity sources
    enabledSources: [1], // Bitzy source
    useOnlinePartCount: true, // Enable intelligent routing
  };

  const advancedResult = useSwapV3Routes(
    srcToken, 
    dstToken, 
    amountIn, 
    3637, 
    swapConfig
  );

  return (
    <div>
      {isLoading ? (
        <div>Finding best routes...</div>
      ) : (
        <div>
          {routes.length > 0 ? (
            <div>
              <p>Amount out: {amountOutBN.toString()} {dstToken.symbol}</p>
              <p>Routes found: {routes.length}</p>
              <p>Is wrap: {isWrap || 'No'}</p>
            </div>
          ) : (
            <div>No routes found</div>
          )}
        </div>
      )}
      
      {error && (
        <div className="error">
          {error}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
      
      <button onClick={fetchRoute}>Refresh Routes</button>
    </div>
  );
}
```

## **3. Prepare to Swap Using Response**

Based on the main repository implementation, here's how to use the SDK response to prepare and execute swaps:

### **3.1 Complete Swap Implementation**

Here are generic examples showing how to execute swaps using direct contract calls with the SDK response data:

#### **Example 1: Using Viem with BitzyAggregator Contract**

```tsx
import { useSwapV3Routes } from '@bitzy-app/bitzy-sdk';
import { useWriteContract, useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

function SwapComponent() {
  const [srcToken, setSrcToken] = useState(btcToken);
  const [dstToken, setDstToken] = useState(usdcToken);
  const [amountIn, setAmountIn] = useState('1.0'); // 1 BTC
  const [slippage, setSlippage] = useState(0.005); // 0.05%

  const { address, publicClient } = useAccount();
  const { writeContract } = useWriteContract();

  // Get swap routes using SDK
  const {
    routes,
    distributions,
    amountOutRoutes,
    amountOutBN,
    amountInParts,
    isLoading,
    isAmountOutError,
    isFirstFetch,
    isWrap,
    error,
    fetchRoute
  } = useSwapV3Routes(srcToken, dstToken, amountIn, 3637, {
    apiBaseUrl: 'https://api-public.bitzy.app',
    config: {
      routerAddress: '0xA5E0AE4e5103dc71cA290AA3654830442357A489',
      bitzyQueryAddress: '0x...',
      wrappedAddress: '0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56',
      nativeAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    },
    defaultPartCount: 5,
    timeout: 30000,
    publicClient: publicClient,
    types: [1, 2],
    enabledSources: [1],
    useOnlinePartCount: true,
  });

  // Execute swap using direct contract call
  const handleSwap = useCallback(async () => {
    if (!srcToken || !dstToken || !routes.length || !address) return;

    const amountInBN = parseUnits(amountIn, srcToken.decimals);
    const amountOutBN = BigNumber(amountOutBN.toFixed());
    const slippageBN = BigNumber(slippage);
    const amountOutMin = amountOutBN.times(1 - slippageBN);

    // Handle wrap/unwrap cases
    if (isWrap === 'wrap') {
      // Native to Wrapped (e.g., ETH to WETH)
      await writeContract({
        address: wrappedAddress, // WETH contract
        abi: [
          {
            name: 'deposit',
            type: 'function',
            stateMutability: 'payable',
            inputs: [],
            outputs: []
          }
        ],
        functionName: 'deposit',
        value: amountInBN,
      });
      return;
    }

    if (isWrap === 'unwrap') {
      // Wrapped to Native (e.g., WETH to ETH)
      await writeContract({
        address: wrappedAddress, // WETH contract
        abi: [
          {
            name: 'withdraw',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ name: 'amount', type: 'uint256' }],
            outputs: []
          }
        ],
        functionName: 'withdraw',
        args: [amountInBN],
      });
      return;
    }

    // Regular swap using splitTrade
    const tradeRoutes = routes.map((route, i) => {
      const amountInPart = amountInParts[i];
      const amountOutMinPart = amountOutRoutes[i].times(1 - slippageBN);
      const isRouterSource = route[0].from === '0x0000000000000000000000000000000000000000';

      return {
        srcToken: srcToken.address,
        dstToken: dstToken.address,
        amountIn: amountInPart.toFixed(0),
        amountOutMin: amountOutMinPart.toFixed(0),
        to: address,
        routes: route,
        isRouterSource: isRouterSource,
        isSourceFee: true,
      };
    });

    await writeContract({
      address: '0xA5E0AE4e5103dc71cA290AA3654830442357A489', // BitzyAggregator
      abi: [
        {
          name: 'splitTrade',
          type: 'function',
          stateMutability: 'payable',
          inputs: [
            { name: 'srcToken', type: 'address' },
            { name: 'dstToken', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'amountOutMin', type: 'uint256' },
            { name: 'isSrcNative', type: 'bool' },
            { name: 'tradeRoutes', type: 'tuple[]' },
            { name: 'to', type: 'address' }
          ],
          outputs: []
        }
      ],
      functionName: 'splitTrade',
      args: [
        srcToken.address,
        dstToken.address,
        amountInBN.toFixed(0),
        amountOutMin.toFixed(0),
        srcToken.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // isSrcNative
        tradeRoutes,
        address
      ],
      value: srcToken.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? amountInBN : 0n,
    });
  }, [srcToken, dstToken, amountIn, routes, distributions, amountOutRoutes, amountInParts, slippage, address, writeContract, isWrap]);

  return (
    <div>
      <input
        value={amountIn}
        onChange={(e) => setAmountIn(e.target.value)}
        placeholder="Amount to swap"
      />
      
      {isLoading ? (
        <div>Finding best routes...</div>
      ) : (
        <div>
          {routes.length > 0 ? (
            <div>
              <p>Amount out: {formatUnits(amountOutBN.toFixed(), dstToken.decimals)} {dstToken.symbol}</p>
              <p>Routes found: {routes.length}</p>
              <p>Is wrap: {isWrap || 'No'}</p>
            </div>
          ) : (
            <div>No routes found</div>
          )}
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
      
      <button onClick={handleSwap} disabled={!routes.length}>
        {isWrap ? capitalize(isWrap) : 'Swap'}
      </button>
      
      <button onClick={fetchRoute}>Refresh Routes</button>
    </div>
  );
}
```

#### **Example 2: Using Ethers.js**

```typescript
import { useSwapV3Routes } from '@bitzy-app/bitzy-sdk';
import { ethers } from 'ethers';

function SwapWithEthers() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // Get swap routes using SDK
  const {
    routes,
    distributions,
    amountOutRoutes,
    amountOutBN,
    amountInParts,
    isLoading,
    isWrap,
    error,
    fetchRoute
  } = useSwapV3Routes(srcToken, dstToken, amountIn, 3637);

  // Execute swap using ethers.js
  const executeSwap = async () => {
    if (!signer || !routes.length) return;

    const aggregatorContract = new ethers.Contract(
      '0xA5E0AE4e5103dc71cA290AA3654830442357A489', // BitzyAggregator
      [
        'function splitTrade(address srcToken, address dstToken, uint256 amountIn, uint256 amountOutMin, bool isSrcNative, tuple[] tradeRoutes, address to) payable'
      ],
      signer
    );

    const amountInBN = ethers.parseUnits(amountIn, srcToken.decimals);
    const amountOutMin = amountOutBN.times(1 - slippage)

    const tradeRoutes = routes.map((route, i) => {
      const amountInPart = amountInParts[i];
      const amountOutMinPart = amountOutRoutes[i].times(1 - slippage);
      const isRouterSource = route[0].from === '0x0000000000000000000000000000000000000000';

      return [
        srcToken.address,
        dstToken.address,
        amountInPart.toFixed(0),
        amountOutMinPart.toFixed(0),
        userAddress,
        route,
        isRouterSource,
        true
      ];
    });

    const tx = await aggregatorContract.splitTrade(
      srcToken.address,
      dstToken.address,
      amountInBN.toFixed(0),
      amountOutMin.toFixed(0),
      srcToken.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      tradeRoutes,
      userAddress,
      {
        value: srcToken.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? amountInBN.toFixed() : 0
      }
    );

    const receipt = await tx.wait();
    console.log('Swap completed:', receipt.transactionHash);
  };

  return (
    <div>
      {/* UI components */}
      <button onClick={executeSwap} disabled={!routes.length}>
        Execute Swap
      </button>
    </div>
  );
}
```

#### **Example 3: Using Web3.js**

```typescript
import { useSwapV3Routes } from '@bitzy-app/bitzy-sdk';
import Web3 from 'web3';

function SwapWithWeb3() {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [account, setAccount] = useState<string | null>(null);

  // Get swap routes using SDK
  const {
    routes,
    distributions,
    amountOutRoutes,
    amountInParts,
    isLoading,
    isWrap,
    error,
    fetchRoute
  } = useSwapV3Routes(srcToken, dstToken, amountIn, 3637);

  // Execute swap using web3.js
  const executeSwap = async () => {
    if (!web3 || !account || !routes.length) return;

    const aggregatorContract = new web3.eth.Contract([
      {
        name: 'splitTrade',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          { name: 'srcToken', type: 'address' },
          { name: 'dstToken', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMin', type: 'uint256' },
          { name: 'isSrcNative', type: 'bool' },
          { name: 'tradeRoutes', type: 'tuple[]' },
          { name: 'to', type: 'address' }
        ],
        outputs: []
      }
    ], '0xA5E0AE4e5103dc71cA290AA3654830442357A489');

    const amountInBN = web3.utils.toWei(amountIn, 'ether');
    const amountOutMin = amountOutBN.times(1 - slippage)

    const tradeRoutes = routes.map((route, i) => {
      const amountInPart = amountInParts[i];
      const amountOutMinPart = amountOutRoutes[i].times(1 - slippage);
      const isRouterSource = route[0].from === '0x0000000000000000000000000000000000000000';

      return [
        srcToken.address,
        dstToken.address,
        amountInPart.toString(),
        amountOutMinPart.toString(),
        account,
        route,
        isRouterSource,
        true
      ];
    });

    const tx = await aggregatorContract.methods.splitTrade(
      srcToken.address,
      dstToken.address,
      amountInBN,
      amountOutMin.toFixed(0),
      srcToken.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      tradeRoutes,
      account
    ).send({
      from: account,
      value: srcToken.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? amountInBN : '0'
    });

    console.log('Swap completed:', tx.transactionHash);
  };

  return (
    <div>
      {/* UI components */}
      <button onClick={executeSwap} disabled={!routes.length}>
        Execute Swap
      </button>
    </div>
  );
}
```

### **3.2 Key Data from SDK Response**

The SDK provides all the necessary data for swap execution:

```typescript
interface SwapResult {
  routes: SwapRoute[][];        // Array of route arrays
  distributions: number[];      // Liquidity distribution percentages
  amountOutRoutes: string[];    // Output amounts per route
  amountOutBN: BigNumber;       // Total output amount
  amountInParts: string[];      // Input amounts per part
  isWrap?: "wrap" | "unwrap";   // Wrap/unwrap indicator
}

// Example usage in your swap function:
swap(
  srcToken,
  dstToken,
  amountIn,        // User input
  amountOut,       // Calculated from amountOutBN
  routes,          // From SDK - route details
  distributions,   // From SDK - how to split liquidity
  amountOutRoutes, // From SDK - amounts per route
  amountInParts,   // From SDK - input amounts per part
  slippageNumber   // User setting
);
```

### **3.3 Environment Variables**

```bash
# .env file
NEXT_PUBLIC_BITZY_API_KEY=your-api-key-here
NEXT_PUBLIC_BITZY_API_URL=https://api-public.bitzy.app
```

```typescript
// The SDK will automatically use these environment variables
const result = useSwapV3Routes(srcToken, dstToken, amountIn, chainId);
// Uses process.env.NEXT_PUBLIC_BITZY_API_KEY if available
```

## **Advanced Features**

### **Hot Hook Features**

The `useSwapV3Routes` hook is designed for **hot reloading** and **real-time updates**:

- **Auto-updates** - Fetches fresh routes every 10 seconds
- **Debounced** - Prevents excessive API calls
- **Error handling** - Built-in error state and recovery
- **Hot reload** - Automatically reinitializes when config changes
- **📱 React Native ready** - Works in any React environment

### **Intelligent Routing**

The SDK automatically optimizes swap execution based on token characteristics:

- **High-value pairs** (BTC-USDC, ETH-USDT): Uses `partCount = 5` for optimal execution
- **Mixed pairs** (BTC-MEME, ETH-SHIB): Uses `partCount = 1` for simplicity  
- **Low-value pairs** (MEME-SHIB): Uses `partCount = 1` for simplicity
- **Online mode**: Checks minimum amount thresholds from API to determine if multi-route is beneficial

### **High-Value Tokens (Network-Specific)**

```typescript
// Botanix Mainnet (3637)
const highValueTokens = [
  "0x0D2437F93Fed6EA64Ef01cCde385FB1263910C56", // pBTC (Botanix)
  "0x29eE6138DD4C9815f46D34a4A1ed48F46758A402", // USDC.e (Bridged USDC Stargate)
  "0x9BC574a6f1170e90D80826D86a6126d59198A3Ef", // rovBTC (Rover BTC)
  "0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C", // USDC
  "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
];

// Botanix Testnet (3636)
const highValueTokens = [
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH/BTC native
  "0x233631132FD56c8f86D1FC97F0b82420a8d20af3", // WBTC
  "0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C", // USDC
  "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
];
```

## 📚 **API Reference**

### **Functions**

#### **`fetchSwapRoute(options, config?)`**
Main function for fetching swap routes in any environment.

**Parameters:**
- `options: SwapOptions` - Swap parameters
- `config?: FetchSwapRouteConfig` - Optional configuration

**Returns:** `Promise<SwapResult>`

#### **`fetchBatchSwapRoutes(requests)`**
Fetch multiple routes simultaneously.

**Parameters:**
- `requests: Array<{options: SwapOptions, config?: FetchSwapRouteConfig}>`

**Returns:** `Promise<Array<{success: boolean, data?: SwapResult, error?: string}>>`

#### **`getSwapQuote(srcToken, dstToken, amountIn, chainId, config?)`**
Get a simple price quote without full routing details.

**Returns:** `Promise<{amountOut: string, routes: number}>`

#### **`fetchSwapRouteSimple(srcToken, dstToken, amountIn, chainId)`**
Simplified function with minimal parameters.

**Returns:** `Promise<SwapResult>`

### **React Hooks**

#### **`useSwapV3Routes(srcToken, dstToken, amountIn, chainId, config?)`**

**Parameters:**
- `srcToken: Token | null` - Source token
- `dstToken: Token | null` - Destination token  
- `amountIn: string` - Input amount
- `chainId: number` - Network chain ID
- `config?: UseSwapV3RoutesConfig` - Optional configuration

**Returns:**
```typescript
{
  routes: SwapRoute[][];        // Array of route arrays
  distributions: number[];      // Liquidity distribution percentages
  amountOutRoutes: string[];    // Output amounts per route
  amountOutBN: BigNumber;       // Total output amount
  amountInParts: string[];      // Input amounts per part
  fetchRoute: () => void;       // Manual fetch function
  isLoading: boolean;           // Loading state
  isAmountOutError: boolean;    // Error flag
  isFirstFetch: boolean;        // First fetch completed
  isWrap?: "wrap" | "unwrap";   // Wrap/unwrap indicator
  error: string | null;         // Error message
  clearError: () => void        // Clear error function
}
```

### **Types**

#### **`SwapOptions`**
```typescript
interface SwapOptions {
  amountIn: string;           // Input amount (e.g., "1.5")
  srcToken: Token;            // Source token
  dstToken: Token;            // Destination token
  chainId: number;            // Network chain ID
  partCount?: number;         // Optional: Liquidity parts
}
```

#### **`FetchSwapRouteConfig`**
```typescript
interface FetchSwapRouteConfig {
  apiBaseUrl?: string;         // Optional: API base URL (defaults to https://api-public.bitzy.app)
  networks?: Record<number, any>; // Optional: Custom network configs
  defaultPartCount?: number;  // Optional: Default parts (defaults to 5)
  timeout?: number;           // Optional: Request timeout (defaults to 30000)
  headers?: Record<string, string>; // Optional: Custom HTTP headers (defaults to {})
  forcePartCount?: number;    // Optional: Force specific partCount, overriding intelligent calculation
}
```

#### **`UseSwapV3RoutesConfig`**
```typescript
interface UseSwapV3RoutesConfig {
  apiBaseUrl?: string;         // Base URL for the Bitzy API
  apiKey?: string;             // API key for authentication (optional)
  config?: UseSwapV3RoutesAddressConfig; // Contract addresses configuration
  defaultPartCount?: number;   // Default number of routes to split large swaps into
  timeout?: number;            // Request timeout in milliseconds
  headers?: Record<string, string>; // Additional HTTP headers
  refreshInterval?: number;    // Interval for automatic route refresh
  publicClient?: PublicClient; // Viem PublicClient instance
  types?: number[];            // Array of liquidity source types to include
  enabledSources?: number[];   // Array of enabled liquidity sources
  forcePartCount?: number;     // Override partCount calculation logic
  useOnlinePartCount?: boolean; // Use online API to determine optimal partCount
}
```

#### **`Token`**
```typescript
interface Token {
  address: Address;            // Token contract address
  symbol: string;              // Token symbol (e.g., "BTC", "USDC")
  name: string;                // Token name (e.g., "Bitcoin", "USD Coin")
  decimals: number;            // Token decimals
  chainId: number;             // Network chain ID
  logoURI?: string;            // Optional: Token logo URL
}
```

## 🎨 **Additional Examples**

### **Backend Usage (Node.js)**

```typescript
import { fetchSwapRoute, fetchBatchSwapRoutes } from '@bitzy-app/bitzy-sdk';

// Express.js endpoint
app.post('/api/swap/routes', async (req, res) => {
  try {
    const { amountIn, srcToken, dstToken, chainId } = req.body;
    
    const result = await fetchSwapRoute(
      { amountIn, srcToken, dstToken, chainId }
      // No config needed - uses defaults
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Batch processing
app.post('/api/swap/batch', async (req, res) => {
  const { swaps } = req.body;
  
  const results = await fetchBatchSwapRoutes(
    swaps.map(swap => ({
      options: swap,
      config: { apiBaseUrl: process.env.NEXT_PUBLIC_BITZY_API_URL }
    }))
  );
  
  res.json({ success: true, data: results });
});
```

### **Utility Functions**

```typescript
import { 
  isHighValueToken, 
  getPartCountOffline, 
  getPartCountOnline,
  getPartCountWithFallback,
  clearMinimumAmountsCache,
  APIClient
} from '@bitzy-app/bitzy-sdk';

// Check if token is high-value (requires chainId)
const isHighValue = isHighValueToken(token, 3637);

// Get offline partCount (requires chainId)
const partCount = getPartCountOffline(srcToken, dstToken, 3637, 5);

// Get online partCount with real-time data
const onlinePartCount = await getPartCountOnline(
  srcToken, dstToken, amountIn, 3637, apiBaseUrl
);

// Get partCount with fallback
const partCount = await getPartCountWithFallback(
  srcToken, dstToken, amountIn, 3637, apiBaseUrl, 5
);

// Cache management functions
clearMinimumAmountsCache(); // Clear cached minimum amounts data
APIClient.resetInstance();   // Reset singleton APIClient and cache
```

## **Configuration**

### **Network Configuration**

```typescript
interface NetworkConfig {
  routerAddress: string;      // Router contract address
  bitzyQueryAddress: string;  // Query contract address
  wrappedAddress: string;     // Wrapped token address (WETH, WBNB, etc.)
  nativeAddress: string;      // Native token address
}
```

### **Default Networks**

The package includes default configurations for:
- **Botanix Mainnet** (Chain ID: 3637)
- **Botanix Testnet** (Chain ID: 3636)

### **Default Values**

When no config is provided, the SDK uses these sensible defaults:

- **API URL**: `https://api-public.bitzy.app` (from `DEFAULT_API_BASE_URL`)
- **API Key**: From `NEXT_PUBLIC_BITZY_API_KEY` environment variable or fallback
- **Addresses**: Network-specific defaults from `CONTRACT_ADDRESSES`
- **PartCount**: `5` for high-value pairs, `1` for others
- **Timeout**: `30` seconds
- **Refresh**: `10` seconds
- **Mode**: Offline (fast and reliable)
- **Types**: `[1, 2]` (V2 typeId: 1, V3 typeId: 2)
- **Enabled Sources**: `[1]` (BITZY sourceId: 1)

## **Development**

### **Building**

```bash
cd sdk
npm install
npm run build
```

### **Testing**

```bash
npm test
npm run type-check
```

## 📦 **Package Structure**

```
src/
├── common/
│   └── FetchSwapRoute.ts     # Common functions
├── hooks/
│   └── useSwapV3Routes.ts    # React hook
├── services/
│   └── SwapV3Service.ts      # Core logic
├── types/
│   └── index.ts              # TypeScript interfaces
├── utils/
│   └── PartCount.ts          # Utility functions
└── index.ts                  # Main exports
```

## **Why This Design?**

- **Focused** - Just the essential swap functionality
- **Hot Reload** - Perfect for React development
- **Universal** - Common functions work everywhere
- **Lightweight** - Minimal dependencies
- **Type Safe** - Full TypeScript support

## 📄 **License**

MIT License - see LICENSE file for details.

## 🆘 **Support**

For questions and support:
- Create an issue on GitHub
- Check the examples folder
- Review the TypeScript types for guidance
