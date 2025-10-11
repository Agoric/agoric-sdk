// @jessie-check

import { keyMirror } from './keyMirror.js';

/**
 * Types of messages used for communication between a cosmos-sdk blockchain node
 * and its paired swingset VM, especially for the ABCI lifecycle. See:
 *
 * - https://github.com/tendermint/tendermint/blob/v0.34.x/spec/abci/abci.md#block-execution
 * - ../../../golang/cosmos/vm/action.go
 * - ../../../golang/cosmos/app/app.go
 * - ../../../golang/cosmos/x/swingset/abci.go
 * - ../../../golang/cosmos/x/swingset/keeper/swing_store_exports_handler.go
 * - ../../cosmic-swingset/src/chain-main.js
 * - ../../cosmic-swingset/src/launch-chain.js
 *
 * @enum {(typeof SwingsetMessageType)[keyof typeof SwingsetMessageType]}
 */
export const SwingsetMessageType = keyMirror({
  AG_COSMOS_INIT: null, // used to synchronize at process launch
  BEGIN_BLOCK: null,
  END_BLOCK: null,
  COMMIT_BLOCK: null,
  AFTER_COMMIT_BLOCK: null,
  SWING_STORE_EXPORT: null, // used to synchronize data export
});
harden(SwingsetMessageType);

// TODO: Update all imports to use SwingsetMessageType. But until then...
export const {
  AG_COSMOS_INIT,
  BEGIN_BLOCK,
  END_BLOCK,
  COMMIT_BLOCK,
  AFTER_COMMIT_BLOCK,
  SWING_STORE_EXPORT,
} = SwingsetMessageType;

/**
 * Types of "action" messages consumed by the swingset VM from actionQueue or
 * highPriorityQueue during END_BLOCK. See:
 *
 * - ../../../golang/cosmos/x/swingset/keeper/msg_server.go
 * - ../../../golang/cosmos/x/swingset/keeper/proposal.go
 * - ../../../golang/cosmos/x/vbank/vbank.go
 * - ../../../golang/cosmos/x/vibc/handler.go
 * - ../../../golang/cosmos/x/vibc/keeper/triggers.go
 * - ../../../golang/cosmos/x/vibc/types/ibc_module.go
 *
 * @enum {(typeof QueuedActionType)[keyof typeof QueuedActionType]}
 */
export const QueuedActionType = keyMirror({
  CORE_EVAL: null,
  DELIVER_INBOUND: null,
  IBC_EVENT: null,
  INSTALL_BUNDLE: null,
  PLEASE_PROVISION: null,
  VBANK_BALANCE_UPDATE: null,
  WALLET_ACTION: null,
  WALLET_SPEND_ACTION: null,
  VTRANSFER_IBC_EVENT: null,
  KERNEL_UPGRADE_EVENTS: null,
});
harden(QueuedActionType);

// TODO: Update all imports to use QueuedActionType. But until then...
export const {
  CORE_EVAL,
  DELIVER_INBOUND,
  IBC_EVENT,
  INSTALL_BUNDLE,
  PLEASE_PROVISION,
  VBANK_BALANCE_UPDATE,
  WALLET_ACTION,
  WALLET_SPEND_ACTION,
  VTRANSFER_IBC_EVENT,
  KERNEL_UPGRADE_EVENTS,
} = QueuedActionType;
