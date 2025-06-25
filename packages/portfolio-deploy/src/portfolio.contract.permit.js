// TODO: move meta.name
import { orchPermit } from './orch.start.js';

export const name = /** @type {const} */ ('ymax0');

/**
 * @import { BootstrapManifestPermit } from '@agoric/vats/src/core/lib-boot.js';
 */

/**
 * @satisfies {BootstrapManifestPermit}
 */
export const permit = /** @type {const} */ ({
  produce: { [/** @type {const} */ (`${name}Kit`)]: true },
  consume: { ...orchPermit },
  instance: { produce: { [name]: true } },
  installation: { consume: { [name]: true } },
  brand: {},
  issuer: { consume: { USDC: true, PoC25: true } },
});
harden(permit);
