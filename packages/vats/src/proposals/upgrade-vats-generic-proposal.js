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
 * @param {{
 *   bundleRefs: { [vatName: string]: VatSourceRef };
 *   vatOptions?: {
 *     [vatName: string]: import('@agoric/swingset-vat').VatUpgradeOptions;
 *   };
 * }} options.options
 */
export const upgradeVatsGeneric = async (
  { consume: { vatAdminSvc, vatStore } },
  options,
) => {
  const { bundleRefs, vatOptions = {} } = options.options;

  for await (const [name, ref] of Object.entries(bundleRefs)) {
    assert(ref.bundleID, `bundleID missing for ${name}`);
    console.log(name, `BUNDLE ID: `, ref.bundleID);
    const bundleCap = await E(vatAdminSvc).getBundleCap(ref.bundleID);

    const { adminNode } = await E(vatStore).get(name);
    await E(adminNode).upgrade(bundleCap, vatOptions[name] || {});
  }
};

export const getManifestForUpgradingVats = (
  _powers,
  { bundleRefs, vatOptions },
) => ({
  manifest: {
    [upgradeVatsGeneric.name]: {
      consume: {
        vatAdminSvc: 'vatAdminSvc',
        vatStore: 'vatStore',
      },
      produce: {},
    },
  },
  options: { bundleRefs, vatOptions },
});
