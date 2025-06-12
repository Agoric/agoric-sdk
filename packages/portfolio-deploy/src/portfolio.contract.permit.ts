import type { BootstrapManifestPermit } from '@agoric/vats/src/core/lib-boot.js';
import { orchPermit } from './orch.start.ts';
// TODO: move meta.name
import { meta } from '@aglocal/portfolio-contract/src/portfolio.contract.meta.ts';

export const permit = {
  produce: { [`${meta.name}Kit` as const]: true },
  consume: { ...orchPermit },
  instance: { produce: { [meta.name]: true } },
  installation: { consume: { [meta.name]: true } },
  brand: {},
  issuer: { consume: { USDC: true } },
} as const satisfies BootstrapManifestPermit;
harden(permit);
