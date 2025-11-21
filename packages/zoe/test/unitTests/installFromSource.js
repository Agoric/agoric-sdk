import bundleSource from '@endo/bundle-source';
import { E } from '@endo/eventual-send';

/**
 * @import {FeeIssuerConfig, ZoeService} from '@agoric/zoe';
 * @import {Installation} from '../../src/zoeService/utils.js';
 */

/**
 * @param {ZoeService} zoe
 * @param {*} vatAdminState
 * @param {string} path
 * @returns {Promise<Installation<any>>}
 */
export const installationPFromSource = async (zoe, vatAdminState, path) => {
  const bundle = await bundleSource(path);
  const id = `b1-${path}`;
  vatAdminState.installBundle(id, bundle);
  return E(zoe).installBundleID(id);
};
