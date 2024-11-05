import { M } from '@endo/patterns';
import { TxStatus } from './constants.js';

export const EvmHashShape = M.string({
  stringLengthLimit: 66,
});
harden(EvmHashShape);

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

export const StatusManagerEntryShape = {
  ...CctpTxEvidenceShape,
  status: M.or(...Object.values(TxStatus)),
};
harden(StatusManagerEntryShape);
