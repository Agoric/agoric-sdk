/**
 * @import {AccountId, MetaTrafficEntry} from '@agoric/orchestration';
 */

/**
 * Represents a published transaction with its type, optional amount, destination, and status.
 *
 * @typedef {object} PublishedTxCommon
 * @property {bigint} [amount] - Optional transaction amount as a bigint
 * @property {TxStatus} status - Current status of the transaction (pending, success, or failed)
 */

/**
 * Destination details for non-TRAFFIC transactions.
 *
 * @typedef {object} PublishedTxDestination
 * @property {Exclude<TxType, typeof TxType.TRAFFIC>} type - The type of transaction (CCTP_TO_EVM, GMP, or CCTP_TO_AGORIC)
 * @property {AccountId} destinationAddress - The destination account identifier for the transaction
 */

/**
 * Details for TRAFFIC transactions.
 *
 * @typedef {{ type: typeof TxType.TRAFFIC } & MetaTrafficEntry} PublishedTxTraffic
 */

/**
 * All the possible shapes of a PublishedTx.
 *
 * @typedef {PublishedTxCommon & (PublishedTxDestination | PublishedTxTraffic)} PublishedTx
 */

/**
 * Tx statuses for published transactions. Exhaustive state machine flows:
 *   - pending -> success (when cross-chain operation completes successfully)
 *   - pending -> failed (when operation fails or times out)
 *
 * @enum {(typeof TxStatus)[keyof typeof TxStatus]}
 */
export const TxStatus = /** @type {const} */ ({
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
});
harden(TxStatus);

/**
 * Tx types for published transactions
 *
 * @enum {(typeof TxType)[keyof typeof TxType]}
 */
export const TxType = /** @type {const} */ ({
  CCTP_TO_EVM: 'CCTP_TO_EVM',
  GMP: 'GMP',
  CCTP_TO_AGORIC: 'CCTP_TO_AGORIC',
  TRAFFIC: 'TRAFFIC',
});
harden(TxType);
