/**
 * Status values for the StatusManager. Listed in order:
 *
 * - 'OBSERVED': TX is observed via EventFeed
 * - 'ADVANCED': advance funds are available and IBC transfer is initiated (but
 *   not necessarily settled)
 * - 'SETTLED': settlement for matching advance received and funds dispersed
 *
 * @enum {(typeof TxStatus)[keyof typeof TxStatus]}
 */
export const TxStatus = /** @type {const} */ ({
  /** when TX is observed via EventFeed */
  OBSERVED: 'OBSERVED',
  /** advance funds are available and IBC transfer is initiated */
  ADVANCED: 'ADVANCED',
  /** settlement for matching advance received and funds dispersed */
  SETTLED: 'SETTLED',
});
