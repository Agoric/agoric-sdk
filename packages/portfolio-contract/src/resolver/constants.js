// .js because the @enum idiom doesn't work in erasable typescript

/// <reference types="ses" />

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
  CCTP_TO_NOBLE: 'CCTP_TO_NOBLE',
});
harden(TxType);
