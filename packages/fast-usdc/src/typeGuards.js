import { M } from '@endo/patterns';
import { AmountShape, RatioShape } from '@agoric/ertp';
import { PendingTxStatus } from './constants.js';

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import {CctpTxEvidence, PendingTx, PoolMetrics} from './types.js';
 */

/** @type {TypedPattern<string>} */
export const EvmHashShape = M.string({
  stringLengthLimit: 66,
});
harden(EvmHashShape);

/** @type {TypedPattern<CctpTxEvidence>} */
export const CctpTxEvidenceShape = {
  aux: {
    forwardingChannel: M.string(),
    recipientAddress: M.string(),
  },
  blockHash: EvmHashShape,
  blockNumber: M.bigint(),
  blockTimestamp: M.bigint(),
  chainId: M.number(),
  tx: {
    amount: M.bigint(),
    forwardingAddress: M.string(),
  },
  txHash: EvmHashShape,
};
harden(CctpTxEvidenceShape);

/** @type {TypedPattern<PendingTx>} */
// @ts-expect-error TypedPattern can't handle spreading?
export const PendingTxShape = {
  ...CctpTxEvidenceShape,
  status: M.or(...Object.values(PendingTxStatus)),
};
harden(PendingTxShape);

/** @type {TypedPattern<PoolMetrics>} */
export const PoolMetricsShape = {
  availableBalance: AmountShape,
  shareWorth: RatioShape,
  totalFees: AmountShape,
  totalBorrows: AmountShape,
  totalReturns: AmountShape,
};
harden(PoolMetricsShape);
