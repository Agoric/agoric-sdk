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
 * @param {{ boardRef: VatSourceRef }} options.options
 */
export const upgradeBoard = async (
  { consume: { vatAdminSvc, vatStore } },
  options,
) => {
  const { boardRef } = options.options;

  assert(boardRef.bundleID);
  const boardBundleCap = await E(vatAdminSvc).getBundleCap(boardRef.bundleID);
  console.log(`Board BUNDLE ID: `, boardRef.bundleID);

  const { adminNode } = await E(vatStore).get('board');

  await E(adminNode).upgrade(boardBundleCap, {});
};

export const getManifestForUpgradingBoard = (_powers, { boardRef }) => ({
  manifest: {
    [upgradeBoard.name]: {
      consume: {
        vatAdminSvc: 'vatAdminSvc',
        vatStore: 'vatStore',
      },
    },
  },
  options: { boardRef },
});
