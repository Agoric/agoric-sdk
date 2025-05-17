/** @file core-eval to update feeConfig. feeConfig is supplied via privateArgs and requires a contract upgrade to change */

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('FUSD-UpdateFees', true);

// avoid importing all of @agoric/ertp
/** @type {typeof import('@agoric/ertp').AmountMath.make} */
// @ts-expect-error AssetKind conditionals aren't captured
const make = (brand, value) => harden({ brand, value });

/**
 * @typedef {object} UpdateOpts
 * @property {{bundleID: BundleID}} [fastUsdcCode]
 */

/**
 * @import {CopyRecord} from '@endo/pass-style';
 * @import {Brand} from '@agoric/ertp';
 * @import {ManifestBundleRef} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {BundleID} from '@agoric/swingset-vat';
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js';
 * @import {FastUSDCCorePowers} from './start-fast-usdc.core.js';
 * @import {FeeConfig} from '@agoric/fast-usdc';
 */

/**
 * Update feeConfig.flat to 0n (no flat fee)
 *
 * @param {FeeConfig} feeConfigPre
 * @param {Brand<'nat'>} usdcBrand
 * @param {Amount<'nat'>} flat
 * @returns {FeeConfig}
 */
const updateFlatFee = (feeConfigPre, usdcBrand, flat = make(usdcBrand, 0n)) =>
  harden({ ...feeConfigPre, flat });

const { keys } = Object;

/**
 * @param {BootstrapPowers & FastUSDCCorePowers} powers
 * @param {object} [config]
 * @param {UpdateOpts} [config.options]
 */
export const updateFeeConfig = async (
  { consume: { fastUsdcKit }, produce },
  { options = {} } = {},
) => {
  trace('options', options);
  const { fastUsdcCode = assert.fail('missing bundleID') } = options;
  const kitPre = await fastUsdcKit;
  trace('fastUsdcKit.privateArgs keys:', keys(kitPre.privateArgs));
  const { adminFacet, creatorFacet } = kitPre;

  const { brand: usdcBrand } = kitPre.privateArgs.feeConfig.flat;
  const kitPost = harden({
    ...kitPre,
    privateArgs: {
      ...kitPre.privateArgs,
      feeConfig: updateFlatFee(kitPre.privateArgs.feeConfig, usdcBrand),
    },
  });
  trace('updated fee config', kitPost.privateArgs.feeConfig);
  const upgraded = await E(adminFacet).upgradeContract(
    fastUsdcCode.bundleID,
    kitPost.privateArgs,
  );
  trace('fastUsdc upgraded', upgraded);
  produce.fastUsdcKit.reset();
  produce.fastUsdcKit.resolve(kitPost);

  // ensure Advancer has intermediateRecipient
  await E(creatorFacet).connectToNoble();
  trace('updateFeeConfig done');
};

/**
 * @param {unknown} _utils
 * @param {{
 *   installKeys: { fastUsdc: ERef<ManifestBundleRef> };
 *   options: Omit<UpdateOpts, 'fastUsdcCode'> & CopyRecord;
 * }} opts
 */
export const getManifestForUpdateFeeConfig = (
  _utils,
  { installKeys, options },
) => {
  return {
    /** @type {BootstrapManifest} */
    manifest: {
      [updateFeeConfig.name]: {
        consume: { fastUsdcKit: true },
        produce: { fastUsdcKit: true },
      },
    },
    options: { ...options, fastUsdcCode: installKeys.fastUsdc },
  };
};
