import { M } from '@endo/patterns';
import { PendingTxStatus } from './constants.js';

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import {CctpTxEvidence, PendingTx} from './types.js';
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

export const EudParamShape = {
  EUD: M.string(),
};
harden(EudParamShape);
