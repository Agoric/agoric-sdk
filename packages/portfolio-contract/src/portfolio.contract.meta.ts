import { OrchestrationPowersShape } from '@agoric/orchestration';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';

export const meta = M.splitRecord({
  privateArgsShape: {
    ...(OrchestrationPowersShape as CopyRecord),
    marshaller: M.remotable('marshaller'),
  },
});
harden(meta);
