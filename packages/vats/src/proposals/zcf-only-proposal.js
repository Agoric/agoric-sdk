// @ts-check
import { E } from '@endo/far';

/**
 * @param {BootstrapPowers} powers
 * @param {object} options
 * @param {{ zcfRef: VatSourceRef }} options.options
 */
export const upgradeZcfOnly = async ({ consume: { vatStore } }, options) => {
  const { zcfRef } = options.options;

  const { root: zoeRoot } = await E(vatStore).get('zoe');

  const zoeConfigFacet = await E(zoeRoot).getZoeConfigFacet();
  await E(zoeConfigFacet).updateZcfBundleId(zcfRef.bundleID);
  console.log(`ZCF BUNDLE ID: `, zcfRef.bundleID);
};
harden(upgradeZcfOnly);

// main and permit are for use with rollup-plugin-core-eval.js
export const main = upgradeZcfOnly;

export const permit = {
  consume: {
    vatStore: true,
  },
};

export const manifest = {
  [upgradeZcfOnly.name]: permit,
};

export const getManifestForUpgradingZcf = (_powers, options) => ({
  manifest,
  options,
});
