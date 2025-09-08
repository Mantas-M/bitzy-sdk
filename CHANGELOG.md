## [0.0.5](https://github.com/bitzy-app/bitzy-sdk/compare/v0.0.4...v0.0.5) (2025-09-08)


### Features

* bundle all dependencies for zero conflicts ([1d45278](https://github.com/bitzy-app/bitzy-sdk/commit/1d452785f61c071cc0779e88aa61e0e7de4d73d4))



# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.4] - 2024-09-08

### Added
- **Core Functions:**
  - `fetchSwapRoute()` - Main route finding function with intelligent routing
  - `fetchBatchSwapRoutes()` - Multiple routes fetching simultaneously
  - `getSwapQuote()` - Simple price quote without full routing details
  - `fetchSwapRouteSimple()` - Minimal configuration route fetching
- **React Hooks:**
  - `useSwapV3Routes()` - Main React hook with hot reloading and auto-updates
- **Utility Functions:**
  - `isHighValueToken()` - Check if token is high-value for optimal routing
  - `getPartCountOffline()` - Offline part count calculation
  - `getPartCountOnline()` - Online part count with real-time data
  - `getPartCountWithFallback()` - Part count with fallback logic
  - `clearMinimumAmountsCache()` - Cache management
  - `APIClient.resetInstance()` - Reset singleton APIClient
- **Network Support:**
  - Botanix Mainnet (Chain ID: 3637)
  - Botanix Testnet (Chain ID: 3636)
- **Features:**
  - Intelligent routing optimization based on token characteristics
  - Automatic wrap/unwrap detection
  - Multiple liquidity sources (V2 and V3)
  - TypeScript support with full type definitions
  - Source maps for debugging
  - Comprehensive error handling

### Fixed
- Dependency conflicts with Privy.io packages
- Peer dependency resolution issues
- Bundle all dependencies (viem, bignumber.js, lodash) for zero conflicts
- Eliminated need for `--legacy-peer-deps` or `--force` flags

### Changed
- Moved all dependencies to devDependencies for complete isolation
- Bundle size increased to ~65KB (includes all dependencies)
- Only React remains as optional peer dependency

## [0.0.3] - 2024-09-08

### Fixed
- Moved viem from peerDependencies to regular dependencies
- Removed conflicting overrides
- Improved dependency resolution

### Changed
- Bundle size increased to ~65KB (includes viem)
- More reliable installation process

## [0.0.2] - 2024-09-08

### Fixed
- Added overrides to resolve Privy.io dependency conflicts
- Made peer dependencies optional
- Improved compatibility with existing projects

### Added
- `peerDependenciesMeta` configuration
- Override support for dependency conflicts

## [0.0.1] - 2024-09-08

### Added
- Initial package setup with proper npm configuration
- Basic build configuration with Rollup
- TypeScript support with declaration files
- MIT license
- Comprehensive README with usage examples
- `.npmignore` for proper package distribution
- Git repository initialization
- Basic project structure:
  - `src/common/` - Common functions
  - `src/hooks/` - React hooks
  - `src/services/` - Core logic
  - `src/types/` - TypeScript interfaces
  - `src/utils/` - Utility functions
  - `src/constants/` - Constants and ABIs
