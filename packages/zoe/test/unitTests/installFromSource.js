// @ts-check

import bundleSource from '@agoric/bundle-source';

/**
 * @param {ZoeService} zoe
 * @param {string} path
 * @returns {Promise<Installation>}
 */
export const installationPFromSource = (zoe, path) =>
  bundleSource(path).then(b => zoe.install(b));
