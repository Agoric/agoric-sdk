import { M } from '@endo/patterns';
import { IBCChannelIDShape } from '@agoric/orchestration';

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import {CCTPTxEvidence} from './client-types.js';
 */

/** @type {TypedPattern<CCTPTxEvidence>} */
export const CCTPTxEvidenceShape = harden({
  txHash: M.string(),
  tx: {
    amount: M.nat(),
    forwardingAddress: M.string(),
  },
  blockHash: M.string(),
  blockNumber: M.nat(),
  blockTimestamp: M.nat(),
  /** from Noble RPC */
  aux: {
    forwardingChannel: IBCChannelIDShape,
    recipientAddress: M.string(),
  },
});
