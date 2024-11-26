/**
 * Status values for FastUSDC.
 *
 * @enum {(typeof TxStatus)[keyof typeof TxStatus]}
 */
export const TxStatus = /** @type {const} */ ({
  /** tx was observed but not advanced */
  Observed: 'OBSERVED',
  /** IBC transfer is initiated */
  Advancing: 'ADVANCING',
  /** IBC transfer is complete */
  Advanced: 'ADVANCED',
  /** IBC transfer failed (timed out) */
  AdvanceFailed: 'ADVANCE_FAILED',
  /** settlement for matching advance received and funds disbursed */
  Disbursed: 'DISBURSED',
  /** fallback: do not collect fees */
  Forwarded: 'FORWARDED',
  /** failed to forward to EUD */
  ForwardFailed: 'FORWARD_FAILED',
});
harden(TxStatus);

// TODO: define valid state transitions

/**
 * Status values for the StatusManager.
 *
 * @enum {(typeof PendingTxStatus)[keyof typeof PendingTxStatus]}
 */
export const PendingTxStatus = /** @type {const} */ ({
  /** tx was observed but not advanced */
  Observed: 'OBSERVED',
  /** IBC transfer is initiated */
  Advancing: 'ADVANCING',
  /** IBC transfer failed (timed out) */
  AdvanceFailed: 'ADVANCE_FAILED',
  /** IBC transfer is complete */
  Advanced: 'ADVANCED',
});
harden(PendingTxStatus);
