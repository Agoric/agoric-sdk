// @ts-check

import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

/**
 * @param {ZoeServiceWChargeAccount} zoe
 * @param {string} path
 * @returns {Promise<Installation>}
 */
export const installationPFromSource = (zoe, path) =>
  bundleSource(path).then(b => E(zoe).install(b));
