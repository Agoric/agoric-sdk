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
 * @param {{ zoeRef: VatSourceRef }} options.options
 */
export const upgradeZoe = async (
  { consume: { vatAdminSvc, vatStore } },
  options,
) => {
  const { zoeRef } = options.options;

  assert(zoeRef.bundleID);
  const zoeBundleCap = await E(vatAdminSvc).getBundleCap(zoeRef.bundleID);
  console.log(`ZOE BUNDLE ID: `, zoeRef.bundleID);

  const { adminNode } = await E(vatStore).get('zoe');

  await E(adminNode).upgrade(zoeBundleCap, {});
};

export const getManifestForUpgradingZoe = (_powers, { zoeRef }) => ({
  manifest: {
    [upgradeZoe.name]: {
      consume: {
        vatAdminSvc: 'vatAdminSvc',
        vatStore: 'vatStore',
      },
      produce: {},
    },
  },
  options: { zoeRef },
});
