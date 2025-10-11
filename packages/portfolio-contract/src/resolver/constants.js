// .js because the @enum idiom doesn't work in erasable typescript

/// <reference types="ses" />

import { keyMirror } from '@agoric/internal';

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
export const TxType = keyMirror({
  CCTP_TO_EVM: null,
  GMP: null,
  CCTP_TO_AGORIC: null,
  /** @deprecated - only supports 20 byte addresses */
  CCTP_TO_NOBLE: null,
});
harden(TxType);
