import { E } from '@endo/far';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     vatAdminSvc: VatAdminSvc;
 *     vatStore: MapStore<
 *       string,
 *       import('@agoric/swingset-vat').CreateVatResults
 *     >;
 *   };
 * }} powers
 * @param {object} options
 * @param {{ bundleRefs: { [vatName: string]: VatSourceRef } }} options.options
 */
export const upgradeOrchCore = async (
  { consume: { vatAdminSvc, vatStore } },
  options,
) => {
  const { bundleRefs } = options.options;

  for await (const [name, ref] of Object.entries(bundleRefs)) {
    assert(ref.bundleID, `bundleID missing for ${name}`);
    console.log(name, `BUNDLE ID: `, ref.bundleID);
    const bundleCap = await E(vatAdminSvc).getBundleCap(ref.bundleID);

    const { adminNode } = await E(vatStore).get(name);
    await E(adminNode).upgrade(bundleCap, {});
  }
};

export const getManifestForUpgradingOrchCore = (_powers, { bundleRefs }) => ({
  manifest: {
    [upgradeOrchCore.name]: {
      consume: {
        vatAdminSvc: 'vatAdminSvc',
        vatStore: 'vatStore',
      },
      produce: {},
    },
  },
  options: { bundleRefs },
});
