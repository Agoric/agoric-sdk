import {
  ChainInfoShape,
  DenomDetailShape,
  DenomShape,
  OrchestrationPowersShape,
} from '@agoric/orchestration';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';

export const meta = {
  // TODO: having the contract announce its name here is backwards.
  // move this to the core eval powers type
  name: 'ymax0',
  privateArgsShape: {
    ...(OrchestrationPowersShape as CopyRecord),
    marshaller: M.remotable('marshaller'),
    assetInfo: M.arrayOf([DenomShape, DenomDetailShape]),
    chainInfo: M.recordOf(M.string(), ChainInfoShape),
  },
} as const;
harden(meta);
