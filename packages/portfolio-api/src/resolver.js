import { keyMirror } from '@agoric/internal';

/**
 * @import {AccountId} from '@agoric/orchestration';
 * @import {TxId} from './types.js';
 */

/**
 * Represents a published transaction with its type, optional amount, destination, and status.
 *
 * @typedef {object} PublishedTx
 * @property {TxType} type - The type of transaction (CCTP_TO_EVM, GMP, CCTP_TO_AGORIC, or MAKE_ACCOUNT)
 * @property {bigint} [amount] - Optional transaction amount as a bigint
 * @property {AccountId} [destinationAddress] - The destination account identifier for the transaction
 * @property {AccountId} [sourceAddress] - The source LCA address initiating the transaction (required for GMP and MAKE_ACCOUNT transactions)
 * @property {string} [expectedAddr] - The expected smart wallet hex address to be created (for MAKE_ACCOUNT only, format: 0x...)
 * @property {string} [factoryAddr] - The smart wallet factory address (for MAKE_ACCOUNT only, format: 0x...)
 * @property {TxStatus} status - Current status of the transaction (pending, success, or failed)
 * @property {string} [rejectionReason] - Optional reason for failure (only present when status is 'failed')
 * @property {TxId} [nextTxId] - Optional ID of the next transaction in operation
 */

/**
 * Tx statuses for published transactions. Exhaustive state machine flows:
 *   - pending -> success (when cross-chain operation completes successfully)
 *   - pending -> failed (when operation fails or times out)
 *
 * @enum {(typeof TxStatus)[keyof typeof TxStatus]}
 */
export const TxStatus = /** @type {const} */ ({
  SETUP: 'setup',
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
});
harden(TxStatus);

/**
 * Tx types for published transactions
 *
 * @enum {Readonly<(typeof TxType)[keyof typeof TxType]>}
 */

export const TxType = keyMirror({
  CCTP_TO_EVM: null,
  CCTP_V2: null,
  GMP: null,
  CCTP_TO_AGORIC: null,
  IBC_FROM_AGORIC: null,
  IBC_FROM_REMOTE: null,
  MAKE_ACCOUNT: null,
  /**
   * Placeholder for ProgressTracker protocols not yet recognized by the
   * resolver, just so they can be published to vstorage, but not processed any
   * further.  If these appear, it means the resolver source code needs to be
   * updated.
   */
  UNKNOWN: null,
});
harden(TxType);
