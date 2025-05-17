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
  { consume: { fastUsdcKit } },
  { options = {} } = {},
) => {
  trace('options', options);
  const { fastUsdcCode = assert.fail('missing bundleID') } = options;
  const fuKit = await fastUsdcKit;
  trace('fastUsdcKit.privateArgs keys:', keys(fuKit.privateArgs));
  const { adminFacet, creatorFacet } = fuKit;
  const upgraded = await E(adminFacet).upgradeContract(
    fastUsdcCode.bundleID,
    fuKit.privateArgs,
  );
  trace('fastUsdc upgraded', upgraded);

  await E(creatorFacet).connectToNoble();
  trace('updateSettlerReference done');
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
      },
    },
    options: { ...options, fastUsdcCode: installKeys.fastUsdc },
  };
};
