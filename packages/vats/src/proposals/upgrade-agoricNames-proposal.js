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
 * @param {{ agoricNamesRef: VatSourceRef }} options.options
 */
export const upgradeAgoricNames = async (
  { consume: { vatAdminSvc, vatStore } },
  options,
) => {
  const { agoricNamesRef } = options.options;

  assert(agoricNamesRef.bundleID);
  const agoricNamesBundleCap = await E(vatAdminSvc).getBundleCap(
    agoricNamesRef.bundleID,
  );
  console.log(`BANK BUNDLE ID: `, agoricNamesRef.bundleID);

  const { adminNode } = await E(vatStore).get('agoricNames');

  await E(adminNode).upgrade(agoricNamesBundleCap, {});
};

export const getManifestForUpgradingAgoricNames = (
  _powers,
  { agoricNamesRef },
) => ({
  manifest: {
    [upgradeAgoricNames.name]: {
      consume: {
        vatAdminSvc: 'vatAdminSvc',
        vatStore: 'vatStore',
      },
      produce: {},
    },
  },
  options: { agoricNamesRef },
});
