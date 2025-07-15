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
  consume: { ...orchPermit, chainInfoPublished: true },
  instance: { produce: { [name]: true } },
  installation: { consume: { [name]: true } },
  brand: {},
  issuer: { consume: { BLD: true, USDC: true, PoC26: true } },
});
harden(permit);
