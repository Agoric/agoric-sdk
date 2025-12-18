# Resolver Service

## Overview

The resolver service monitors and resolves transactions between Agoric and remote EVM chains. It uses WebSocket connections to listen for specific events on EVM chains and automatically marks transactions as resolved when the expected events are detected.

## How It Works

The resolver:
- Maintains active WebSocket connections to EVM chains
- Listens for specific contract events based on transaction type
- Automatically resolves transactions when expected events are detected
- Sends alerts when transactions cannot be resolved automatically
- Never gives up on a transaction unless manually resolved

## Supported Transaction Types

### 1. MAKE_ACCOUNT

**Purpose:** Creates a remote EVM wallet for a user.

**How it resolves:**
- Listens for `SmartWalletCreated` events from the [Factory contract](https://github.com/agoric-labs/agoric-to-axelar-local/blob/c5b5b2892fe4fe3f822ba460dc9b35239a3fdc2e/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol#L155)
- Uses WebSocket connection to the EVM chain where the Factory contract is deployed
- Automatically marks transaction as resolved when the event is detected

**Limitations:**
- Cannot detect failures automatically
- Failures require manual resolution

---

### 2. CCTP_TO_EVM

**Purpose:** Transfers USDC from Agoric to a remote EVM wallet via CCTP (Cross-Chain Transfer Protocol).

**How it resolves:**
- Listens for ERC20 transfer events to the remote EVM account
- Automatically resolves when a transfer with expected values is detected

**Limitations:**
- Cannot detect CCTP failures automatically
- Failures require manual resolution

---

### 3. GMP (General Message Passing)

**Purpose:** Deploys or withdraws funds from the remote EVM wallet to/from an EVM protocol.

**How it resolves:**
- Listens for `MulticallStatus` events from the [remote EVM wallet](https://github.com/agoric-labs/agoric-to-axelar-local/blob/c5b5b2892fe4fe3f822ba460dc9b35239a3fdc2e/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol#L82)
- Uses WebSocket connection to monitor events on the remote EVM wallet contract
- Automatically marks transaction as resolved when the event confirms successful deployment or withdrawal

**Failure detection:**
- After 30 minutes without resolution, checks [AxelarScan](https://axelarscan.io/) for transaction status
- If AxelarScan confirms failure, automatically marks transaction as "failed"
- If AxelarScan has no record, proceeds to alerting (see below)

---

## Alert System

### When Alerts Are Triggered

Alerts are sent to the `#ops-ymax-resolver` Slack channel when:
- **MAKE_ACCOUNT / CCTP_TO_EVM:** No expected event after 30 minutes
- **GMP:** No expected event after 30 minutes AND no status found on AxelarScan

### Alert Behavior

- Alerts are sent every 30 minutes until the transaction is resolved
- The resolver **continues processing** the transaction even after alerting
- WebSocket listeners remain active
- For GMP transactions, AxelarScan checks continue periodically
- The resolver never abandons a transaction

---

## Summary Matrix

| Transaction Type | Listens For | Contract Monitored | Auto-Resolve Success | Auto-Detect Failure |
|-----------------|-------------|-------------------|---------------------|---------------------|
| MAKE_ACCOUNT | `SmartWalletCreated` | Factory | ✅ | ❌ |
| CCTP_TO_EVM | ERC20 `Transfer` | USDC Token | ✅ | ❌ |
| GMP | `MulticallStatus` | Remote EVM Wallet | ✅ | ✅ (via AxelarScan) |

---

## Key Takeaways

- ✅ The resolver automatically handles successful transactions
- ⚠️ Most failure scenarios require manual intervention
- 🔔 Alerts are sent every 30 minutes for unresolved transactions
- 🔄 The resolver never stops processing a transaction
- 🛠️ Manual resolution is always available as a fallback
