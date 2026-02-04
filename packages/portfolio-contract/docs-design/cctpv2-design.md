# CCTPv2 Support Design Document

> **Status:** Draft  
> **Author:** Engineering  
> **Date:** January 2026  
> **Related:** [portfolio-contract](../../packages/portfolio-contract/), [ymax-planner](../../services/ymax-planner/)

## Executive Summary

This document outlines the design for adding CCTPv2 (Cross-Chain Transfer Protocol version 2) support to enable direct EVM-to-EVM USDC transfers without routing through Noble. CCTPv2 introduces significant improvements including faster finality, lower costs, and direct EVM chain connectivity.

---

## Table of Contents

1. [Background](#1-background)
2. [CCTPv1 vs CCTPv2 Differences](#2-cctpv1-vs-cctpv2-differences)
3. [Supported Chains](#3-supported-chains)
4. [Architecture Changes](#4-architecture-changes)
5. [Implementation Plan](#5-implementation-plan)
6. [Migration Strategy](#6-migration-strategy)
7. [Testing Strategy](#7-testing-strategy)
8. [Risks and Mitigations](#8-risks-and-mitigations)

---

## 1. Background

### Current CCTPv1 Architecture

The current system supports CCTP transfers through Noble as an intermediary hub:

```
EVM Chain A → Noble → EVM Chain B
     ↓           ↓           ↓
  CCTP burn   IBC relay   CCTP mint
```

**Current supported chains:**
| Chain | Type | Control Protocol |
|-------|------|------------------|
| Agoric | Cosmos | local |
| Noble | Cosmos | IBC |
| Arbitrum | EVM | Axelar GMP |
| Avalanche | EVM | Axelar GMP |
| Base | EVM | Axelar GMP |
| Ethereum | EVM | Axelar GMP |
| Optimism | EVM | Axelar GMP |

**Current CCTP operations:**
- `cctpSlow`: EVM → Noble (via auto-forward to Agoric) ~18 minutes
- `cctpReturn`: Noble → EVM ~20 seconds

### Limitations of CCTPv1

1. **Noble dependency**: All cross-EVM transfers must route through Noble
2. **Latency**: EVM-to-EVM transfers require 2 hops (~18+ minutes)
3. **Cost**: Double attestation costs
4. **Complexity**: Two-phase burn/mint with IBC relay in between

### CCTPv1 Chain-Specific Finality Times

The current network config uses a blanket `timeSec: 1080` (18 minutes) for all `cctpSlow` routes. However, actual attestation times vary significantly by chain due to different finality requirements:

| Source Chain | Transfer Time | URL |
|--------------|---------------|-----|
| Solana | 50 secs | https://usdc.range.org/status?id=c29sYW5hLzY1MDUzMw |
| Polygon | 21 secs | https://usdc.range.org/status?id=cG9sLzQxMTk2NA |
| Ethereum | 18 mins | https://usdc.range.org/status?id=ZXRoLzQxMzcxOA |
| Arbitrum | 17 mins | https://usdc.range.org/status?id=YXJiMS84NTU3MzM |
| Avalanche | 7 secs | https://usdc.range.org/status?id=YXZheC8zNjc2MDQ |
| Polygon | 37 secs | https://usdc.range.org/status?id=cG9sLzQxMTkzMg |
| Base | 21 mins | https://usdc.range.org/status?id=YmFzZS83NjI2NDg |

**Summary by finality:**
- **Instant finality (~seconds):** Avalanche (7s), Solana (50s), Polygon (21-37s)
- **Slow finality (~15-20 mins):** Ethereum (18m), Arbitrum (17m), Base (21m)

**Action Item:** Update `prod-network.ts` to use chain-specific `timeSec` values:
- Avalanche: `timeSec: 30` (with buffer)
- Polygon: `timeSec: 60` (with buffer)
- Other EVM chains: `timeSec: 1080` (current value is correct)

This matters for the planner's route optimization - Avalanche routes are significantly faster.

---

## 2. CCTPv1 vs CCTPv2 Differences

### Key CCTPv2 Improvements

| Feature | CCTPv1 | CCTPv2 |
|---------|--------|--------|
| EVM-to-EVM direct | ❌ (via Noble) | ✅ Direct |
| Finality options | Single finality | `minFinalityThreshold` parameter |
| Fee model | No on-chain fees | `maxFee` parameter for relayer incentives |
| Hook support | ❌ | ✅ `hookData` for post-mint execution |
| Denylist | ❌ | ✅ Account denylist support |
| Message expiration | ❌ | ✅ `expirationBlock` in message |

### New CCTPv2 Contract Methods

**TokenMessengerV2.depositForBurn()** signature:
```solidity
function depositForBurn(
    uint256 amount,
    uint32 destinationDomain,
    bytes32 mintRecipient,
    address burnToken,
    bytes32 destinationCaller,
    uint256 maxFee,
    uint32 minFinalityThreshold
) external notDenylistedCallers;
```

**TokenMessengerV2.depositForBurnWithHook()** - adds post-mint hook:
```solidity
function depositForBurnWithHook(
    uint256 amount,
    uint32 destinationDomain,
    bytes32 mintRecipient,
    address burnToken,
    bytes32 destinationCaller,
    uint256 maxFee,
    uint32 minFinalityThreshold,
    bytes calldata hookData
) external notDenylistedCallers;
```

### New Parameters in CCTPv2

| Parameter | Type | Description |
|-----------|------|-------------|
| `maxFee` | `uint256` | Maximum fee willing to pay for relaying (in burn token units). Must be < amount. |
| `minFinalityThreshold` | `uint32` | Minimum finality level for attestation (see Finality Thresholds) |
| `hookData` | `bytes` | Optional data for post-mint hook execution on destination |

### Finality Thresholds

CCTPv2 introduces configurable finality thresholds for faster attestation:

| Threshold | Value | Description |
|-----------|-------|-------------|
| `FINALITY_THRESHOLD_CONFIRMED` | Low | Faster but less secure (confirmed blocks) |
| `FINALITY_THRESHOLD_FINALIZED` | High | Slower but fully finalized |
| `TOKEN_MESSENGER_MIN_FINALITY_THRESHOLD` | Minimum | Contract-enforced minimum |

### BurnMessageV2 Format

```
Field                 Bytes      Type       Index
version               4          uint32     0
burnToken             32         bytes32    4
mintRecipient         32         bytes32    36
amount                32         uint256    68
messageSender         32         bytes32    100
maxFee                32         uint256    132
feeExecuted           32         uint256    164
expirationBlock       32         uint256    196
hookData              dynamic    bytes      228
```

### New CCTPv2 Contracts

CCTPv2 introduces upgraded smart contracts on supported EVM chains:

- **MessageTransmitterV2**: Handles v2 message format with finality thresholds
- **TokenMessengerV2**: `depositForBurn()` with fee/finality params, `depositForBurnWithHook()` for hooks
- **TokenMinterV2**: Updated minting with fee deduction support

### CCTPv2 Domain IDs (unchanged from v1)

| Chain | Domain ID |
|-------|-----------|
| Ethereum | 0 |
| Avalanche | 1 |
| Optimism | 2 |
| Arbitrum | 3 |
| Noble | 4 |
| Solana | 5 |
| Base | 6 |

---

## 3. Supported Chains

### CCTPv2 Direct EVM-to-EVM Routes

CCTPv2 provides **full mesh connectivity** - any EVM chain can transfer directly to any other EVM chain in a single hop via the CCTP domain system:

```
                     CCTPv2 Full Mesh (Direct Routes)
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │            Arbitrum ←────────────→ Ethereum             │
    │           ↗    ↑    ↖          ↗    ↑    ↖              │
    │          ↙     │     ↘        ↙     │     ↘             │
    │       Base ←───┼──────────────┼───→ Optimism            │
    │          ↖     │     ↗        ↖     │     ↗             │
    │           ↘    ↓    ↙          ↘    ↓    ↙              │
    │               Avalanche                                 │
    │                                                         │
    │   (Every chain connects directly to every other chain)  │
    └─────────────────────────────────────────────────────────┘
```

**Example:** Arbitrum → Avalanche is a single CCTPv2 `depositForBurn()` call - no intermediate hops required.

### Chain Connectivity Matrix

| From \ To | Arbitrum | Avalanche | Base | Ethereum | Optimism | Noble |
|-----------|----------|-----------|------|----------|----------|-------|
| Arbitrum | - | ✅ v2 | ✅ v2 | ✅ v2 | ✅ v2 | ✅ v1 |
| Avalanche | ✅ v2 | - | ✅ v2 | ✅ v2 | ✅ v2 | ✅ v1 |
| Base | ✅ v2 | ✅ v2 | - | ✅ v2 | ✅ v2 | ✅ v1 |
| Ethereum | ✅ v2 | ✅ v2 | ✅ v2 | - | ✅ v2 | ✅ v1 |
| Optimism | ✅ v2 | ✅ v2 | ✅ v2 | ✅ v2 | - | ✅ v1 |
| Noble | ✅ v1 | ✅ v1 | ✅ v1 | ✅ v1 | ✅ v1 | - |

---

## 4. Architecture Changes

### 4.1 New TransferProtocol Type

**File:** `packages/portfolio-contract/tools/network/network-spec.ts`

```typescript
export type TransferProtocol =
  | 'ibc'
  | 'fastusdc'
  | 'cctpReturn'    // Noble → EVM (v1)
  | 'cctpSlow'      // EVM → Agoric via Noble (v1)
  | 'cctpV2'        // EVM ↔ EVM direct (v2)
  | 'local';
```

### 4.2 New Way Type for stepFlow

**File:** `packages/portfolio-contract/src/portfolio.flows.ts`

Add new `Way` variant for CCTPv2:

```typescript
type Way =
  | { how: 'localTransfer' }
  | { how: 'withdrawToSeat' }
  | { how: 'send' }
  | { how: 'IBC'; src: 'agoric'; dest: 'noble' }
  | { how: 'IBC'; src: 'noble'; dest: 'agoric' }
  | { how: 'CCTP'; dest: AxelarChain }         // Noble → EVM (v1)
  | { how: 'CCTP'; src: AxelarChain }          // EVM → Agoric (v1)
  | { how: 'CCTPv2'; src: AxelarChain; dest: AxelarChain }  // NEW: EVM ↔ EVM
  | { how: 'withdrawToEVM'; dest: AxelarChain }
  | { how: 'CCTPtoUser'; dest: AxelarChain }
  | { how: YieldProtocol; poolKey; src }
  | { how: YieldProtocol; poolKey; dest }
```

### 4.3 New CCTPv2 Transport Operation

**File:** `packages/portfolio-contract/src/pos-gmp.flows.ts`

```typescript
/**
 * CCTPv2 interface - note: same method name as v1, but with additional parameters
 */
type TokenMessengerV2I = {
  depositForBurn: [
    'uint256',   // amount
    'uint32',    // destinationDomain
    'bytes32',   // mintRecipient
    'address',   // burnToken
    'bytes32',   // destinationCaller
    'uint256',   // maxFee
    'uint32',    // minFinalityThreshold
  ];
};

const TokenMessengerV2: TokenMessengerV2I = {
  depositForBurn: ['uint256', 'uint32', 'bytes32', 'address', 'bytes32', 'uint256', 'uint32'],
};

/** Finality threshold constants from Circle contracts */
const FINALITY_THRESHOLD = {
  CONFIRMED: 1,   // Faster, less secure
  FINALIZED: 2000, // Slower, fully finalized
} as const;

/**
 * CCTPv2 direct EVM-to-EVM transfer.
 * Burns USDC on source EVM chain, mints on destination EVM chain.
 * 
 * Key differences from CCTPv1:
 * - Direct EVM-to-EVM without Noble intermediary
 * - maxFee parameter for relayer incentives
 * - minFinalityThreshold for attestation speed/security tradeoff
 */
export const CCTPv2 = {
  how: 'CCTPv2',
  connections: keys(AxelarChain).flatMap((src: AxelarChain) =>
    keys(AxelarChain)
      .filter(dest => dest !== src)
      .map((dest: AxelarChain) => ({ src, dest }))
  ),
  apply: async (ctx, amount, src, dest, ...optsArgs) => {
...
    traceTransfer('transfer complete');
  },
} as const satisfies TransportDetail<'CCTPv2', AxelarChain, AxelarChain, EVMContext>;
harden(CCTPv2);
```

### 4.4 Network Spec Links Update

**File:** `packages/portfolio-contract/tools/network/prod-network.ts`

Add CCTPv2 direct links:

```typescript
links: [
  // ... existing links ...

  // CCTPv2 direct EVM-to-EVM routes
  // Arbitrum ↔ other EVM chains
  {
    src: '@Arbitrum',
    dest: '@Ethereum',
    transfer: 'cctpV2',
    variableFeeBps: 0,
    timeSec: 13,
    min: 100_000n, // 0.1 USDC
    feeMode: 'evmToEvm',
  },
  {
    src: '@Ethereum',
    dest: '@Arbitrum',
    transfer: 'cctpV2',
    variableFeeBps: 0,
    timeSec: 13,
    min: 100_000n,
    feeMode: 'evmToEvm',
  },
  {
    src: '@Arbitrum',
    dest: '@Base',
    transfer: 'cctpV2',
    variableFeeBps: 0,
    timeSec: 13,
    min: 100_000n,
    feeMode: 'evmToEvm',
  },
  // ... add all permutations of EVM chains ...
],
```

### 4.5 FeeMode Extension

**File:** `packages/portfolio-contract/tools/network/network-spec.ts`

```typescript
export type FeeMode =
  | 'toUSDN'
  | 'makeEvmAccount'
  | 'evmToNoble'
  | 'evmToPool'
  | 'poolToEvm'
  | 'evmToEvm';    // NEW: CCTPv2 direct transfer fee mode
```

### 4.6 wayFromSrcToDesc Update

**File:** `packages/portfolio-contract/src/portfolio.flows.ts`

The `wayFromSrcToDesc` function determines the transfer mechanism based on the `MovementDesc`. Since there can be multiple mechanisms for EVM-to-EVM transfers (CCTPv1 via Noble may be cheaper in some circumstances), the planner must explicitly indicate when CCTPv2 should be used.

**Design Decision:** CCTPv2 is only used when the planner explicitly requests it via `detail.cctpVersion = 2n`. Otherwise, existing CCTPv1 routing applies (EVM → Noble → EVM). This allows the planner to make cost/speed tradeoffs:

- **CCTPv2**: Faster (~60s) but may have higher maxFee in some scenarios
- **CCTPv1**: Slower (~18-20 min) but may be cheaper for certain routes

> **Rationale:** `detail.cctpVersion = 2n` keeps the existing `detail: Record<string, bigint>` shape, avoids broader interface changes, and still makes the v1/v2 distinction explicit. More invasive schema changes (explicit `how`/`mechanism` fields or a discriminated union) add design risk and compatibility costs not required for CCTPv2.

```typescript
export const wayFromSrcToDesc = (moveDesc: MovementDesc): Way => {
  const { src, dest } = moveDesc;
  
  // ... existing cases ...

  // Check if planner explicitly requested CCTPv2 (EVM-to-EVM direct)
  // Otherwise, fall through to existing v1 routing which may be cheaper
  const srcIsEVM = isAxelarChain(srcName);
  const destIsEVM = isAxelarChain(destName);
  if (
    srcIsEVM &&
    destIsEVM &&
    moveDesc.detail?.cctpVersion === BigInt(2) // CCTPv2 explicitly requested
  ) {
    return {
      how: 'CCTPv2',
      src: srcName as AxelarChain,
      dest: destName as AxelarChain,
    };
  }

  // Fall through to existing CCTPv1 routing...
};
```

**Planner Integration:** The planner (ymax-planner) should set `detail.cctpVersion = 2n` in the `MovementDesc` when selecting a CCTPv2 link from the network spec. This keeps route selection logic in the planner where cost/time optimization decisions are made.

### 4.7 TxType Note

**Note:** CCTPv2 emits the same transfer-related events that the current CCTP watcher already handles, so no new `TxType` or watcher changes are required for CCTPv2 event tracking.

### 4.8 Planner Updates

**File:** `services/ymax-planner/src/engine.ts`

Add CCTPv2 route scoring in the graph builder:

```typescript
// CCTPv2 links should be preferred for EVM-to-EVM when:
// 1. Both endpoints are on supported CCTPv2 chains
// 2. Amount is above minimum threshold
// 3. Time sensitivity is high

const getCCTPv2Score = (link: LinkSpec): number => {
  if (link.transfer !== 'cctpV2') return Infinity;
  
  // CCTPv2 is fast (13s) and low cost
  return link.timeSec * TIME_WEIGHT + link.variableFeeBps * FEE_WEIGHT;
};
```

**Route Selection Logic:**

The planner should prefer CCTPv2 over CCTPv1 for EVM-to-EVM transfers:

```typescript
/**
 * Determine optimal CCTP version for a transfer.
 * 
 * CCTPv2 is preferred when:
 * - Both source and destination are EVM chains (not Noble)
 * - Transfer amount meets CCTPv2 minimum requirements
 * - CCTPv2 contracts are deployed on both chains
 * 
 * CCTPv1 (via Noble) is required when:
 * - Either endpoint is Noble
 * - CCTPv2 not available on one of the chains
 */
const selectCCTPVersion = (
  src: SupportedChain,
  dest: SupportedChain,
  amount: NatValue,
): 'cctpV1' | 'cctpV2' | null => {
  // Noble routes must use v1
  if (src === 'noble' || dest === 'noble') {
    return 'cctpV1';
  }
  
  // Both EVM - prefer v2 if available
  if (isAxelarChain(src) && isAxelarChain(dest)) {
    if (CCTP_V2_ENABLED[src] && CCTP_V2_ENABLED[dest]) {
      return 'cctpV2';
    }
    // Fallback to v1 via Noble if v2 not available
    return 'cctpV1';
  }
  
  return null; // Not a CCTP route
};
```

**Cost Model for Route Planning:**

| Route Type | Estimated Time | Variable Fee | Notes |
|------------|----------------|--------------|-------|
| CCTPv2 (EVM→EVM) | ~13-60s | 0 bps + maxFee | Direct, fastest |
| CCTPv1 (Noble→EVM) | ~20s | 0 bps | cctpReturn |
| CCTPv1 (EVM→Noble→Agoric) | ~18min | 0 bps | cctpSlow + IBC |
| CCTPv2 (EVM→EVM) + IBC | ~1-2min | 0 bps | For Agoric destination |

### 4.9 Transaction Monitoring

**File:** `services/ymax-planner/src/watchers/cctp-v2-watcher.ts`

```typescript
/**
 * Monitor CCTPv2 MessageReceived events on destination chains.
 * CCTPv2 uses on-chain attestation with faster finality.
 */
export const createCCTPv2Watcher = (config: WatcherConfig) => {
  // Watch for MessageReceivedV2 events
  const MESSAGE_RECEIVED_V2_TOPIC = keccak256(
    toUtf8Bytes('MessageReceivedV2(bytes32,uint32,bytes32,bytes)')
  );
  
  return {
    watch: async (txHash: string, destChain: AxelarChain) => {
      // Poll for attestation and mint completion
      // CCTPv2 attestation is typically ~13 seconds
    },
  };
};
```

---

## 5. Implementation Plan

### Phase 1: Foundation (Week 1-2)

1. **Update type definitions**
   - [x] Add `cctpV2` to `TransferProtocol`
   - [x] Add `evmToEvm` to `FeeMode`
   - [x] Add `CCTPv2` Way type

2. **Contract addresses configuration**
   - [x] Add TokenMessengerV2 addresses per chain
   - [ ] Add MessageTransmitterV2 addresses per chain (for watcher)
   - [x] Update `GmpAddresses` type

### Phase 2: Core Implementation (Week 3-4)

3. **Implement CCTPv2 transport**
   - [x] Create `CCTPv2` transport in `pos-gmp.flows.ts`
   - [x] Implement `depositForBurnV2` call encoding
   - [x] Add domain ID mapping for CCTPv2

4. **Update flow routing**
   - [x] Update `wayFromSrcToDesc` for CCTPv2 routes
   - [x] Add CCTPv2 case to `doStep` switch
   - [x] Update `executeStep` for CCTPv2 handling

### Phase 3: Planner Integration (Week 5-6)

5. **Network topology updates**
   - [x] Add CCTPv2 links to `prod-network.ts`
   - [ ] Add CCTPv2 links to `test-network.ts`
   - [x] Update graph builder for CCTPv2 edges (via `evmToEvm` feeMode)

6. **Planner optimization**
   - [x] Add CCTPv2 route scoring (via `evmToEvm` case in plan-solve.ts)
   - [x] Implement explicit opt-in via `detail.cctpVersion = 2n`
   - [x] Update gas estimation for CCTPv2 (uses DepositForBurn estimate)

### Phase 4: Monitoring & Resolution (Week 7-8)

7. **Transaction monitoring**
   - [x] Implement CCTPv2 watcher (`cctp-v2-watcher.ts`)
   - [x] Add MessageReceived event parsing
   - [x] Update resolver types for CCTPv2 transactions (`PublishedTxShape`)
   - [x] Add `cctpV2Monitor` to pending-tx-manager
   - [x] Add MessageTransmitterV2 addresses to `support.ts`

8. **Error handling**
   - [ ] Add CCTPv2-specific error types
   - [ ] Implement retry logic for failed attestations
   - [ ] Add fallback to CCTPv1 routes

### Phase 5: Testing & Deployment (Week 9-10)

9. **Testing**
   - [ ] Unit tests for CCTPv2 transport
   - [ ] Integration tests for EVM-to-EVM transfers
   - [ ] E2E tests on testnet

10. **Deployment**
    - [ ] Deploy to testnet
    - [ ] Verify CCTPv2 routes work correctly
    - [ ] Deploy to mainnet with feature flag

---

## 6. Migration Strategy

### Backwards Compatibility

- CCTPv1 routes will remain operational
- Planner will prefer CCTPv2 when available and optimal
- Explicit `version` field in movement descriptors allows forcing v1/v2

### Feature Flag Rollout

```typescript
const CCTP_V2_ENABLED = {
  Arbitrum: true,
  Base: true,
  Ethereum: true,
  Optimism: true,
  Avalanche: true,
};

// In route planning
const canUseCCTPv2 = (src: AxelarChain, dest: AxelarChain): boolean => {
  return CCTP_V2_ENABLED[src] && CCTP_V2_ENABLED[dest];
};
```

### Gradual Rollout Plan

1. **Week 1**: Enable on testnet for all chains
2. **Week 2**: Enable on mainnet for Arbitrum ↔ Base
3. **Week 3**: Enable on mainnet for all L2s
4. **Week 4**: Enable Ethereum routes
5. **Week 5**: Full rollout

---

## 7. Testing Strategy

### 7.1 Unit Tests to Add

#### portfolio-contract/test/cctpv2-routing.test.ts

Tests for `wayFromSrcToDesc` routing logic:

```typescript
// CCTPv2 only selected when detail.cctpVersion = 2n
test('wayFromSrcToDesc uses CCTPv2 when detail.cctpVersion is 2n', async t => {
  const movement: MovementDesc = {
    src: '@Arbitrum',
    dest: '@Base',
    amount: { brand: USDC, value: 100_000_000n },
    detail: { cctpVersion: 2n },
  };
  const way = wayFromSrcToDesc(movement, ctx);
  t.is(way?.how, 'CCTPv2');
});

test('wayFromSrcToDesc uses GMP (not CCTPv2) for EVM-to-EVM without explicit opt-in', async t => {
  const movement: MovementDesc = {
    src: '@Arbitrum',
    dest: '@Base',
    amount: { brand: USDC, value: 100_000_000n },
  };
  const way = wayFromSrcToDesc(movement, ctx);
  t.not(way?.how, 'CCTPv2'); // Falls back to GMP or CCTP via Noble
});

test('wayFromSrcToDesc uses CCTP v1 for Noble routes regardless of detail', async t => {
  const movement: MovementDesc = {
    src: '@Arbitrum',
    dest: '@noble',
    amount: { brand: USDC, value: 100_000_000n },
    detail: { cctpVersion: 2n }, // Should be ignored for Noble
  };
  const way = wayFromSrcToDesc(movement, ctx);
  t.is(way?.how, 'CCTP'); // v1 route via Noble
});
```

#### portfolio-contract/test/cctpv2-transport.test.ts

Tests for the CCTPv2 transport in `pos-gmp.flows.ts`:

```typescript
test('CCTPv2.apply generates correct TokenMessengerV2 calldata', async t => {
  // Mock the EVM session and verify:
  // 1. USDC approval to TokenMessengerV2
  // 2. depositForBurn call with correct params:
  //    - amount
  //    - destinationDomain (from CCTP_DOMAIN mapping)
  //    - mintRecipient (32-byte padded address)
  //    - burnToken (USDC address)
  //    - destinationCaller (bytes32(0))
  //    - maxFee (0n for no limit)
  //    - minFinalityThreshold (1000 = CONFIRMED)
});

test('CCTPv2.apply uses correct domain ID for each chain', async t => {
  // Test domain mapping:
  // Ethereum = 0, Avalanche = 1, Optimism = 2, Arbitrum = 3, Base = 6
});

test('evmAddressToBytes32 pads addresses correctly', async t => {
  const addr = '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64';
  const bytes32 = evmAddressToBytes32(addr);
  t.is(bytes32.length, 66); // 0x + 64 hex chars
  t.true(bytes32.endsWith(addr.slice(2).toLowerCase()));
});
```

#### services/ymax-planner/test/cctp-v2-watcher.test.ts

Tests for the CCTPv2 watcher should focus on confirming the existing CCTP watcher behavior remains sufficient for v2 event streams.

#### services/ymax-planner/test/plan-solve-cctpv2.test.ts

Tests for planner CCTPv2 route selection:

```typescript
test('plan-solve selects evmToEvm case for EVM-to-EVM steps', async t => {
  const step = planStep('Base', 'Arbitrum', 100_000_000n);
  t.deepEqual(step.detail, { cctpVersion: 2n });
  t.truthy(step.fee); // Should have fee estimate
});

test('plan-solve does not use evmToEvm for Noble routes', async t => {
  const step = planStep('Base', 'noble', 100_000_000n);
  t.is(step.detail, undefined); // No CCTPv2 detail
});

test('plan-solve includes correct fee for CCTPv2 transfers', async t => {
  // Verify GMP fee estimation is used
});
```

No new `TxType` or `PublishedTxShape` variants are required for CCTPv2.

### 7.2 Integration Tests

#### multichain-testing/test/cctp-v2.test.ts

```typescript
test.serial('CCTPv2 direct transfer: Arbitrum → Base', async t => {
  // 1. Fund Arbitrum account with USDC
  // 2. Execute CCTPv2 transfer to Base
  // 3. Wait for MessageReceived event on Base
  // 4. Verify USDC balance on Base
});

test.serial('CCTPv2 with pool deposit: Ethereum → Arbitrum → Aave', async t => {
  // 1. CCTPv2 transfer Ethereum → Arbitrum
  // 2. Supply to Aave on Arbitrum
  // 3. Verify aToken balance
});

test.serial('Rebalance using CCTPv2 between EVM pools', async t => {
  // 1. Setup positions on multiple EVM chains
  // 2. Change target allocation
  // 3. Verify rebalance uses CCTPv2 for EVM-to-EVM
  // 4. Verify positions match new allocation
});
```

### 7.3 E2E Test Scenarios

| Scenario | Source | Dest | Expected Route |
|----------|--------|------|----------------|
| Direct EVM transfer | Arbitrum | Base | CCTPv2 |
| EVM to Noble | Arbitrum | Noble | CCTP v1 |
| Noble to EVM | Noble | Arbitrum | CCTP v1 |
| Multi-hop deposit | Ethereum | Arbitrum Aave | CCTPv2 + Supply |
| Cross-chain rebalance | Base Compound | Ethereum Aave | CCTPv2 + Withdraw + Supply |

### 7.4 Test Utilities Needed

```typescript
// services/ymax-planner/test/mocks.ts additions

export const createMockMessageReceivedLog = ({
  sourceDomain,
  amount,
  mintRecipient,
  nonce = 1n,
}: {
  sourceDomain: number;
  amount: bigint;
  mintRecipient: string;
  nonce?: bigint;
}) => {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  
  // Encode BurnMessageV2 messageBody
  const messageBody = encodeBurnMessageV2({
    version: 1,
    burnToken: USDC_ADDRESS,
    mintRecipient,
    amount,
    messageSender: '0x...',
  });

  const data = abiCoder.encode(
    ['uint32', 'uint64', 'bytes32', 'bytes'],
    [sourceDomain, nonce, '0x' + '0'.repeat(64), messageBody],
  );

  return {
    address: MESSAGE_TRANSMITTER_V2_ADDRESS,
    topics: [MESSAGE_RECEIVED_SIGNATURE, '0x' + '0'.repeat(64)],
    data,
    transactionHash: '0x' + 'abc'.repeat(21) + '123',
    blockNumber: 18500000,
  };
};
```

### 7.5 Test Coverage Checklist

- [ ] `wayFromSrcToDesc` routing with/without `detail.cctpVersion`
- [ ] CCTPv2 domain ID mapping for all supported chains
- [ ] `evmAddressToBytes32` encoding
- [ ] CCTPv2 transport calldata generation
- [ ] MessageReceived event parsing
- [ ] Source domain validation
- [ ] Amount validation
- [ ] Recipient validation
- [ ] Plan-solve evmToEvm case
- [ ] Fee estimation for CCTPv2 routes
- [ ] Planner route selection (see 7.6)

### 7.6 Planner Route Selection Tests

The planner now has multiple possible paths for EVM-to-EVM transfers. These tests verify
that the optimal route is selected based on cost and time.

#### services/ymax-planner/test/deposit-tools.test.ts (additions)

```typescript
// Test: Base → Avalanche should use CCTPv2 direct, not via Noble
test('planDepositToAllocations prefers CCTPv2 for EVM-to-EVM', async t => {
  const targetAllocation = {
    Aave_Avalanche: 100n, // All funds to Avalanche
  };
  const currentBalances = {
    Aave_Base: makeDeposit(10_000_000n), // Starting on Base
  };

  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation,
    network: PROD_NETWORK,
  });

  // Should have: Base (withdraw) → @Base → @Avalanche (CCTPv2) → Aave_Avalanche (supply)
  // NOT: Base → @Base → @noble → @Avalanche → Aave_Avalanche
  const movements = plan.flow;
  
  // Find the cross-chain transfer step
  const crossChainStep = movements.find(m => 
    m.src === '@Base' && m.dest === '@Avalanche'
  );
  t.truthy(crossChainStep, 'Should have direct Base → Avalanche step');
  t.deepEqual(crossChainStep?.detail, { cctpVersion: 2n }, 'Should use CCTPv2');
});

// Test: Base → Noble must use CCTPv1 (no CCTPv2 for Cosmos)
test('planDepositToAllocations uses CCTPv1 for EVM-to-Noble', async t => {
  const targetAllocation = {
    USDN: 100n, // All funds to Noble's USDN
  };
  const currentBalances = {
    Aave_Base: makeDeposit(10_000_000n),
  };

  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation,
    network: PROD_NETWORK,
  });

  // Should route via Noble: Base → @noble → USDN
  const toNobleStep = plan.flow.find(m => m.dest === '@noble');
  t.truthy(toNobleStep, 'Should route to Noble');
  // CCTPv1 steps don't have detail.cctpVersion = 2n
  t.not(toNobleStep?.detail?.cctpVersion, 2n, 'Should NOT use CCTPv2');
});

// Test: Multi-hop rebalance uses CCTPv2 for EVM legs
test('planRebalanceToAllocations uses CCTPv2 for multi-EVM rebalance', async t => {
  const targetAllocation = {
    Aave_Arbitrum: 25n,
    Aave_Avalanche: 25n,
    Aave_Base: 25n,
    Aave_Ethereum: 25n,
  };
  const currentBalances = {
    Aave_Base: makeDeposit(40_000_000n), // All on Base, need to spread
  };

  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation,
    network: PROD_NETWORK,
  });

  // All EVM-to-EVM transfers should use CCTPv2
  const evmToEvmSteps = plan.flow.filter(m => 
    m.src.startsWith('@') && m.dest.startsWith('@') &&
    !['@agoric', '@noble'].includes(m.src) &&
    !['@agoric', '@noble'].includes(m.dest)
  );
  
  for (const step of evmToEvmSteps) {
    t.deepEqual(step.detail, { cctpVersion: 2n }, 
      `Step ${step.src} → ${step.dest} should use CCTPv2`);
  }
});

// Test: Verify route selection between chains with multiple paths
test('planRebalanceToAllocations selects optimal Base → Avalanche → Noble route', async t => {
  // Starting: Funds on Base
  // Goal: Split between Avalanche Aave and Noble USDN
  // Expected: 
  //   - Base → Avalanche via CCTPv2 (direct, ~60s)
  //   - Base → Noble via CCTPv1 (via @agoric, ~1080s)
  // CCTPv2 should NOT be used for the Noble leg
  
  const targetAllocation = {
    Aave_Avalanche: 50n,
    USDN: 50n,
  };
  const currentBalances = {
    Aave_Base: makeDeposit(20_000_000n),
  };

  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation,
    network: PROD_NETWORK,
  });

  // Check Avalanche route uses CCTPv2
  const toAvalancheStep = plan.flow.find(m => 
    m.src === '@Base' && m.dest === '@Avalanche'
  );
  t.truthy(toAvalancheStep, 'Should have Base → Avalanche step');
  t.deepEqual(toAvalancheStep?.detail, { cctpVersion: 2n });

  // Check Noble route does NOT use CCTPv2
  const nobleSteps = plan.flow.filter(m => 
    m.dest === '@noble' || m.dest === 'USDN'
  );
  t.true(nobleSteps.length > 0, 'Should have steps to Noble/USDN');
  for (const step of nobleSteps) {
    t.not(step.detail?.cctpVersion, 2n, 
      `Noble-bound step ${step.src} → ${step.dest} should not use CCTPv2`);
  }
});

// Test: Verify time vs cost optimization affects route selection
test('planRebalanceToAllocations respects mode for route selection', async t => {
  const allocation = {
    Aave_Ethereum: 100n,
  };
  const balances = {
    Aave_Arbitrum: makeDeposit(10_000_000n),
  };

  // Fastest mode should prefer CCTPv2 (60s) over CCTPv1 via Noble (~1080s)
  const fastPlan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances: balances,
    targetAllocation: allocation,
    network: PROD_NETWORK,
    mode: 'fastest',
  });

  const fastCrossChain = fastPlan.flow.find(m => 
    m.src === '@Arbitrum' && m.dest === '@Ethereum'
  );
  t.deepEqual(fastCrossChain?.detail, { cctpVersion: 2n }, 
    'Fastest mode should use CCTPv2');
});

// Regression: Ensure existing multi-source rebalance still works with CCTPv2
test('planRebalanceToAllocations regression - CCTPv2 with multiple sources', async t => {
  const targetAllocation = {
    Aave_Arbitrum: 25n,
    Aave_Avalanche: 25n,
    Aave_Base: 25n,
    Aave_Ethereum: 25n,
  };
  const currentBalances = {
    Aave_Base: makeDeposit(5_000_000n),
    Aave_Optimism: makeDeposit(5_000_000n),
  };

  const plan = await planRebalanceToAllocations({
    ...plannerContext,
    currentBalances,
    targetAllocation,
    network: PROD_NETWORK,
  });

  t.snapshot(plan, 'CCTPv2 multi-source rebalance');
});
```

#### Expected Route Selection Logic

| From | To | Expected Route | Reason |
|------|----|----------------|--------|
| Base | Avalanche | CCTPv2 direct | Fastest (60s vs 1080s via Noble) |
| Base | Noble | CCTPv1 via @agoric | CCTPv2 doesn't support Cosmos |
| Arbitrum | Ethereum | CCTPv2 direct | Direct EVM-to-EVM |
| Noble | Arbitrum | CCTPv1 | CCTPv2 doesn't support Cosmos source |
| Base | Aave_Avalanche | CCTPv2 + Supply | Cross-chain then pool operation |
| Compound_Base | Aave_Ethereum | Withdraw + CCTPv2 + Supply | Full rebalance path |

#### Route Selection Priority

1. **EVM-to-EVM**: Always prefer CCTPv2 (faster, direct)
2. **EVM-to-Cosmos**: Must use CCTPv1 via Noble/Agoric
3. **Cosmos-to-EVM**: Must use CCTPv1 from Noble
4. **Same-chain**: No cross-chain transfer needed

---

## 8. Risks and Mitigations

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| CCTPv2 attestation delays | Medium | Implement timeout with v1 fallback |
| Contract incompatibility | High | Thorough testnet validation |
| Domain ID changes | Medium | Configurable domain mapping |

### Operational Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Increased gas costs | Low | Gas estimation includes CCTPv2 specifics |
| Monitoring gaps | Medium | Comprehensive event watching |
| User confusion | Low | Clear UI indication of transfer type |

### Security Considerations

1. **Attestation validation**: Verify on-chain attestation signatures
2. **Domain spoofing**: Validate domain IDs match expected chains
3. **Recipient validation**: Ensure mintRecipient encoding is correct
4. **Fee validation**: Ensure `maxFee < amount` to prevent loss of funds
5. **Denylist check**: CCTPv2 has account denylist - handle `notDenylistedCallers` reverts

---

## Appendix A: Fast Transfer Allowance

CCTPv2 introduces a "Fast Transfer Allowance" feature that allows for faster attestations under certain conditions. This is controlled by the `minFinalityThreshold` parameter.

### Finality Threshold Usage

```typescript
// For time-sensitive transfers (rebalancing between pools)
const FAST_FINALITY = 1000; // FINALITY_THRESHOLD_CONFIRMED

// For security-critical transfers (user withdrawals)
const SAFE_FINALITY = 2000; // FINALITY_THRESHOLD_FINALIZED
```

### When to Use Each Threshold

| Use Case | Recommended Threshold | Rationale |
|----------|----------------------|-----------|
| Pool rebalancing | CONFIRMED | Speed matters, internal funds |
| User deposits | CONFIRMED | Speed typically preferred |
| User withdrawals | CONFIRMED | Faster UX, acceptable risk |
| Arbitrage | CONFIRMED | Time-sensitive opportunities |

**Current Implementation:** The portfolio contract uses `CONFIRMED` (1000) for all CCTPv2 transfers to optimize for speed. The `FINALIZED` (2000) threshold can be made configurable in future if needed for specific use cases.

---

## Appendix B: Contract Addresses

### CCTPv2 Contract Addresses

Circle uses **deterministic deployment (CREATE2)** so all CCTPv2 contracts have the **same address across all EVM chains**.

Reference: https://developers.circle.com/cctp/references/contract-addresses

#### Mainnet (same on all chains)

| Contract | Address |
|----------|--------|
| TokenMessengerV2 | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` |
| MessageTransmitterV2 | `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` |
| TokenMinterV2 | `0xfd78EE919681417d192449715b2594ab58f5D002` |
| MessageV2 | `0xec546b6B005471ECf012e5aF77FBeC07e0FD8f78` |

#### Testnet (same on all chains)

| Contract | Address |
|----------|--------|
| TokenMessengerV2 | `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` |
| MessageTransmitterV2 | `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` |
| TokenMinterV2 | `0xb43db544E2c27092c107639Ad201b3dEfAbcF192` |
| MessageV2 | `0xbaC0179bB358A8936169a63408C8481D582390C4` |

> **Note**: Unlike CCTPv1 contracts (which have different addresses per chain), CCTPv2 uses CREATE2 deterministic deployment, meaning the same bytecode deployed with the same salt produces the same address on every chain.

---

## Appendix C: Message Format

### BurnMessageV2 Structure (Solidity)

```solidity
// From circlefin/evm-cctp-contracts/src/messages/v2/BurnMessageV2.sol
library BurnMessageV2 {
    // Field indices (bytes)
    uint8 private constant VERSION_INDEX = 0;        // 4 bytes
    uint8 private constant BURN_TOKEN_INDEX = 4;     // 32 bytes
    uint8 private constant MINT_RECIPIENT_INDEX = 36; // 32 bytes
    uint8 private constant AMOUNT_INDEX = 68;        // 32 bytes
    uint8 private constant MESSAGE_SENDER_INDEX = 100; // 32 bytes
    uint8 private constant MAX_FEE_INDEX = 132;      // 32 bytes
    uint8 private constant FEE_EXECUTED_INDEX = 164; // 32 bytes
    uint8 private constant EXPIRATION_BLOCK_INDEX = 196; // 32 bytes
    uint8 private constant HOOK_DATA_INDEX = 228;    // dynamic
}
```

### DepositForBurn Event (CCTPv2)

```solidity
event DepositForBurn(
    address indexed burnToken,
    uint256 amount,
    address indexed depositor,
    bytes32 mintRecipient,
    uint32 destinationDomain,
    bytes32 destinationTokenMessenger,
    bytes32 destinationCaller,
    uint256 maxFee,
    uint32 indexed minFinalityThreshold,
    bytes hookData
);
```

---

## Appendix D: Related Files

### Files to Modify

| File | Changes |
|------|---------|
| [network-spec.ts](../../packages/portfolio-contract/tools/network/network-spec.ts) | Add `cctpV2` transfer type, `evmToEvm` fee mode |
| [prod-network.ts](../../packages/portfolio-contract/tools/network/prod-network.ts) | Add CCTPv2 links |
| [portfolio.flows.ts](../../packages/portfolio-contract/src/portfolio.flows.ts) | Add CCTPv2 Way type, update routing |
| [pos-gmp.flows.ts](../../packages/portfolio-contract/src/pos-gmp.flows.ts) | Implement CCTPv2 transport |
| [type-guards-steps.ts](../../packages/portfolio-contract/src/type-guards-steps.ts) | Update step shapes |
| [engine.ts](../../services/ymax-planner/src/engine.ts) | Add CCTPv2 route scoring |

### New Files to Create

| File | Purpose |
|------|---------|
| `services/ymax-planner/src/watchers/cctp-v2-watcher.ts` | CCTPv2 transaction monitoring |
| `packages/portfolio-contract/test/cctpv2.test.ts` | CCTPv2 unit tests |
| `multichain-testing/test/cctp-v2.test.ts` | CCTPv2 integration tests |

---

## References

- [Circle CCTP Documentation](https://developers.circle.com/cctp)
- [CCTPv2 Technical Specification](https://developers.circle.com/cctp/docs/cctp-technical-reference)
- [Current CCTP Implementation](../../packages/portfolio-contract/src/pos-gmp.flows.ts)
- [Solver Approach Design](../../packages/portfolio-contract/solver-approach-design.md)
