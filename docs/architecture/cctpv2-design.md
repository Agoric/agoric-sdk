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
    const traceTransfer = trace.sub('CCTPv2').sub(`${src.chainName}->${dest.chainName}`);
    traceTransfer('transfer', amount);

    const { addresses } = ctx;
    const destDomain = getCCTPDomain(dest.chainName);
    const mintRecipient = addressToBytes32(dest.remoteAddress);

    // Calculate maxFee - set to 0 for no fee limit, or calculate based on gas estimates
    // In practice, this should be estimated based on destination chain gas costs
    const maxFee = 0n; // No fee limit - relayer takes what's needed

    const session = makeEVMSession();
    const usdc = session.makeContract(addresses.usdc, ERC20);
    const tm = session.makeContract(addresses.tokenMessengerV2, TokenMessengerV2);

    usdc.approve(addresses.tokenMessengerV2, amount.value);
    tm.depositForBurn(
      amount.value,
      destDomain,
      mintRecipient,
      addresses.usdc,
      '0x' + '0'.repeat(64), // destinationCaller: bytes32(0) = any caller allowed
      maxFee,
      FINALITY_THRESHOLD.CONFIRMED, // Use confirmed for faster attestation
    );

    const calls = session.finish();

    const { result } = ctx.resolverClient.registerTransaction(
      TxType.CCTP_V2,
      `${dest.chainId}:${dest.remoteAddress}`,
      amount.value,
    );

    await sendGMPContractCall(ctx, src, calls, ...optsArgs);
    await result;

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

**Design Decision:** CCTPv2 is only used when the planner explicitly requests it via `detail.transfer = 2n`. Otherwise, existing CCTPv1 routing applies (EVM → Noble → EVM). This allows the planner to make cost/speed tradeoffs:

- **CCTPv2**: Faster (~60s) but may have higher maxFee in some scenarios
- **CCTPv1**: Slower (~18-20 min) but may be cheaper for certain routes

> **Future Consideration:** The current approach of checking `detail.transfer === BigInt(2)` to indicate CCTPv2 is fragile - it relies on a magic number convention. A cleaner design would extend `MovementDesc` to include an explicit `transferType` or `mechanism` field (e.g., `'cctpV1' | 'cctpV2' | 'ibc' | 'fastusdc'`) that the planner sets based on the selected link. This would make the intent self-documenting and avoid ambiguity. However, changing `MovementDesc` is out of scope for this implementation phase.

```typescript
export const wayFromSrcToDesc = (moveDesc: MovementDesc): Way => {
  const { src, dest } = moveDesc;
  
  // ... existing cases ...

  // Check if planner explicitly requested CCTPv2 (EVM-to-EVM direct)
  // Otherwise, fall through to existing v1 routing which may be cheaper
  const srcIsEVM = keys(AxelarChain).includes(srcName);
  const destIsEVM = keys(AxelarChain).includes(destName);
  if (
    srcIsEVM &&
    destIsEVM &&
    moveDesc.detail?.transfer === BigInt(2) // CCTPv2 explicitly requested
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

**Planner Integration:** The planner (ymax-planner) should set `detail.transfer = 2n` in the `MovementDesc` when selecting a CCTPv2 link from the network spec. This keeps route selection logic in the planner where cost/time optimization decisions are made.

### 4.7 TxType Extension

**File:** `packages/portfolio-api/src/types.ts`

```typescript
export const TxType = {
  MAKE_ACCOUNT: 'MAKE_ACCOUNT',
  CCTP_TO_EVM: 'CCTP_TO_EVM',
  CCTP_TO_AGORIC: 'CCTP_TO_AGORIC',
  CCTP_V2: 'CCTP_V2',           // NEW
  GMP_SUPPLY: 'GMP_SUPPLY',
  GMP_WITHDRAW: 'GMP_WITHDRAW',
  // ...
} as const;
```

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
   - [ ] Add `cctpV2` to `TransferProtocol`
   - [ ] Add `evmToEvm` to `FeeMode`
   - [ ] Add `CCTP_V2` to `TxType`
   - [ ] Add `CCTPv2` Way type

2. **Contract addresses configuration**
   - [ ] Add TokenMessengerV2 addresses per chain
   - [ ] Add MessageTransmitterV2 addresses per chain
   - [ ] Update `GmpAddresses` type

### Phase 2: Core Implementation (Week 3-4)

3. **Implement CCTPv2 transport**
   - [ ] Create `CCTPv2` transport in `pos-gmp.flows.ts`
   - [ ] Implement `depositForBurnV2` call encoding
   - [ ] Add domain ID mapping for CCTPv2

4. **Update flow routing**
   - [ ] Update `wayFromSrcToDesc` for CCTPv2 routes
   - [ ] Add CCTPv2 case to `doStep` switch
   - [ ] Update `executeStep` for CCTPv2 handling

### Phase 3: Planner Integration (Week 5-6)

5. **Network topology updates**
   - [ ] Add CCTPv2 links to `prod-network.ts`
   - [ ] Add CCTPv2 links to `test-network.ts`
   - [ ] Update graph builder for CCTPv2 edges

6. **Planner optimization**
   - [ ] Add CCTPv2 route scoring
   - [ ] Implement fallback logic (v2 → v1)
   - [ ] Update gas estimation for CCTPv2

### Phase 4: Monitoring & Resolution (Week 7-8)

7. **Transaction monitoring**
   - [ ] Implement CCTPv2 watcher
   - [ ] Add MessageReceivedV2 event parsing
   - [ ] Update resolver for CCTPv2 transactions

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

### Unit Tests

```typescript
// packages/portfolio-contract/test/cctpv2.test.ts

test('CCTPv2 routes EVM-to-EVM direct', async t => {
  const movement = {
    src: '@Arbitrum',
    dest: '@Base',
    amount: AmountMath.make(USDC, 100_000_000n),
  };
  
  const way = wayFromSrcToDesc(movement);
  t.deepEqual(way, { how: 'CCTPv2', src: 'Arbitrum', dest: 'Base' });
});

test('CCTPv2 falls back to v1 for Noble routes', async t => {
  const movement = {
    src: '@Arbitrum',
    dest: '@noble',
    amount: AmountMath.make(USDC, 100_000_000n),
  };
  
  const way = wayFromSrcToDesc(movement);
  t.deepEqual(way, { how: 'CCTP', src: 'Arbitrum' }); // v1 route
});
```

### Integration Tests

- Test CCTPv2 with Starship multichain setup
- Verify attestation and mint on destination chain
- Test error scenarios (attestation timeout, invalid recipient)

### E2E Test Scenarios

1. **Happy path**: Arbitrum → Base direct transfer
2. **Multi-hop**: Arbitrum → Base → Pool supply
3. **Fallback**: CCTPv2 failure → CCTPv1 retry
4. **Rebalance**: Pool on Arbitrum → Pool on Ethereum via CCTPv2

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

### CCTPv2 Contract Addresses (Mainnet)

CCTPv2 uses CREATE2 for deterministic deployment - addresses are the same across all chains.

| Chain | TokenMessengerV2 | MessageTransmitterV2 | TokenMinterV2 |
|-------|------------------|---------------------|---------------|
| Ethereum | `0x...` | `0x...` | `0x...` |
| Arbitrum | `0x...` | `0x...` | `0x...` |
| Base | `0x...` | `0x...` | `0x...` |
| Optimism | `0x...` | `0x...` | `0x...` |
| Avalanche | `0x...` | `0x...` | `0x...` |

> Note: Addresses to be filled in when CCTPv2 contracts are deployed. Use the `PredictCreate2Deployments.s.sol` script from Circle's repository to compute expected addresses.

### Address Prediction Commands

```bash
# Predict MessageTransmitterV2 Implementation
forge script scripts/v2/PredictCreate2Deployments.s.sol \
  --sig "messageTransmitterV2Impl(address,uint32,uint32)" \
  <create2FactoryAddress> <domain> <messageVersion>

# Predict TokenMessengerV2 Proxy
forge script scripts/v2/PredictCreate2Deployments.s.sol \
  --sig "tokenMessengerV2Proxy(address)" \
  <create2FactoryAddress>
```

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
