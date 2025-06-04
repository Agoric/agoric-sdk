import {
  ChainInfoShape,
  DenomDetailShape,
  DenomShape,
  OrchestrationPowersShape,
} from '@agoric/orchestration';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';

export const meta = {
  name: 'ymax0',
  privateArgsShape: {
    ...(OrchestrationPowersShape as CopyRecord),
    marshaller: M.remotable('marshaller'),
    assetInfo: M.arrayOf([DenomShape, DenomDetailShape]),
    chainInfo: M.recordOf(M.string(), ChainInfoShape),
  },
};
harden(meta);
