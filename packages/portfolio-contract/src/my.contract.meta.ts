import { OrchestrationPowersShape } from '@agoric/orchestration';
import { M } from '@endo/patterns';
import { orchPermit } from './orch.start.ts';
import type { BootstrapManifestPermit } from '@agoric/vats/src/core/lib-boot.js';

export const meta = {
  name: 'my',
  abbr: 'My', // for tracer(s)
  customTermsShape: {},
  privateArgsShape: {
    ...(OrchestrationPowersShape as Record<string, any>),
    marshaller: M.remotable('marshaller'),
  },
  deployConfigShape: {}, // TODO
} as const;
harden(meta);

export const permit = /** @type {const} */ {
  produce: { [`${meta.name}Kit`]: true },
  consume: { ...orchPermit },
  instance: { produce: { [meta.name]: true } },
  installation: { consume: { [meta.name]: true } },
  brand: {},
  issuer: {},
} as const satisfies BootstrapManifestPermit;
harden(permit);
