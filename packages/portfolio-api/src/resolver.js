/**
 * @import {AccountId} from '@agoric/orchestration';
 */

/**
 * Represents a published transaction with its type, optional amount, destination, and status.
 *
 * @typedef {object} PublishedTx
 * @property {TxType} type - The type of transaction (CCTP_TO_EVM, GMP, CCTP_TO_AGORIC, or MAKE_ACCOUNT)
 * @property {bigint} [amount] - Optional transaction amount as a bigint
 * @property {AccountId} destinationAddress - The destination account identifier for the transaction (CCTP/GMP destination, or MAKE_ACCOUNT factory address in CAIP format)
 * @property {string} [expectedAddr] - The expected smart wallet hex address to be created (for MAKE_ACCOUNT only, format: 0x...)
 * @property {TxStatus} status - Current status of the transaction (pending, success, or failed)
 * @property {string} [rejectionReason] - Optional reason for failure (only present when status is 'failed')
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
  MAKE_ACCOUNT: 'MAKE_ACCOUNT',
});
harden(TxType);
