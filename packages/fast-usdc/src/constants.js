/**
 * Status values for FastUSDC.
 *
 * @enum {(typeof TxStatus)[keyof typeof TxStatus]}
 */
export const TxStatus = /** @type {const} */ ({
  /** tx was observed but not advanced */
  Observed: 'OBSERVED',
  /** IBC transfer is initiated */
  Advanced: 'ADVANCED',
  /** settlement for matching advance received and funds dispersed */
  Settled: 'SETTLED',
});
harden(TxStatus);

/**
 * Status values for the StatusManager.
 *
 * @enum {(typeof PendingTxStatus)[keyof typeof PendingTxStatus]}
 */
export const PendingTxStatus = /** @type {const} */ ({
  /** tx was observed but not advanced */
  Observed: 'OBSERVED',
  /** IBC transfer is initiated */
  Advanced: 'ADVANCED',
});
harden(PendingTxStatus);
