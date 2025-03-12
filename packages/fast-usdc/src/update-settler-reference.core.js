/** @file core-eval to update Advancer's reference to Settler */

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('FUSD-3', true);

/**
 * @import {CopyRecord} from '@endo/pass-style';
 * @import {ManifestBundleRef} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {BundleID} from '@agoric/swingset-vat';
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js';
 * @import {FastUSDCCorePowers} from './start-fast-usdc.core.js';
 */

const { keys } = Object;

/**
 * @typedef {object} UpdateOpts
 * @property {{bundleID: BundleID}} [fastUsdcCode]
 */

/**
 * @param {BootstrapPowers & FastUSDCCorePowers} powers
 * @param {object} [config]
 * @param {UpdateOpts} [config.options]
 */
export const updateSettlerReference = async (
  { consume: { fastUsdcKit }, produce },
  { options = {} } = {},
) => {
  trace('options', options);
  const { fastUsdcCode = assert.fail('missing bundleID') } = options;
  const kitPre = await fastUsdcKit;
  trace('fastUsdcKit.privateArgs keys:', keys(kitPre.privateArgs));
  const { adminFacet, creatorFacet } = kitPre;
  const upgraded = await E(adminFacet).upgradeContract(
    fastUsdcCode.bundleID,
    kitPre.privateArgs,
  );
  trace('fastUsdc upgraded', upgraded);
  // XXX - no need to produce a new kit, since it won't have changed?
  // produce.fastUsdcKit.reset();
  // produce.fastUsdcKit.resolve(kitPre);

  await E(creatorFacet).setIntermediateRecipient();
  trace('setIntermediateRecipient done');
};

/**
 * @param {unknown} _utils
 * @param {{
 *   installKeys: { fastUsdc: ERef<ManifestBundleRef> };
 *   options: Omit<UpdateOpts, 'fastUsdcCode'> & CopyRecord;
 * }} opts
 */
export const getManifestForUpdateSettlerReference = (
  _utils,
  { installKeys, options },
) => {
  return {
    /** @type {BootstrapManifest} */
    manifest: {
      [updateSettlerReference.name]: {
        consume: { fastUsdcKit: true },
        produce: { fastUsdcKit: true },
      },
    },
    options: { ...options, fastUsdcCode: installKeys.fastUsdc },
  };
};
