// .js because the @enum idiom doesn't work in erasable typescript

/// <reference types="ses" />

/**
 * Tx statuses for published transactions
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
  CCTP: 'cctp',
});
harden(TxType);
