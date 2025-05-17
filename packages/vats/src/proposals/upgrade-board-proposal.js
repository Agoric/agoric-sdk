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
  { consume: { board, vatAdminSvc, vatStore } },
  options,
) => {
  const { boardRef } = options.options;

  assert(boardRef.bundleID);
  const boardBundleCap = await E(vatAdminSvc).getBundleCap(boardRef.bundleID);
  console.log(`Board BUNDLE ID: `, boardRef.bundleID);
  const idsBefore = await E(board).ids();

  const { adminNode } = await E(vatStore).get('board');
  await E(adminNode).upgrade(boardBundleCap, {});

  const idsAfter = await E(board).ids();
  const same =
    idsBefore.length === idsAfter.length &&
    idsBefore.every((element, index) => element === idsAfter[index]);
  assert(same, 'keys must stay the same');

  console.log('Board upgrade complete');
};

export const getManifestForUpgradingBoard = (_powers, { boardRef }) => ({
  manifest: {
    [upgradeBoard.name]: {
      consume: {
        board: 'board',
        vatAdminSvc: 'vatAdminSvc',
        vatStore: 'vatStore',
      },
    },
  },
  options: { boardRef },
});
