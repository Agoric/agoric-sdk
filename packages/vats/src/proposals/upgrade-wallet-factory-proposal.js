import { E } from '@endo/far';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     vatAdminSvc: VatAdminSve;
 *     vatStore: MapStore<string, CreateVatResults>;
 *   };
 * }} powers
 * @param {object} options
 * @param {{ zoeRef: VatSourceRef; zcfRef: VatSourceRef }} options.options
 */
export const upgradeWalletFactory = async (
  { consume: { vatAdminSvc, walletFactoryStartResult, vatStore } },
  options,
) => {
  console.log(`WF Proposal`, options);
  const { zoeRef, zcfRef, walletRef } = options.options;

  // TODO(CTH): don't upgrade Zoe/ZCF here. This is just for testing!

  console.log(`WF Proposal`, vatAdminSvc, zoeRef);
  const vas = await vatAdminSvc;
  console.log(`WF Proposal`, vas);
  const zoeBundleCap = await E(vatAdminSvc).getBundleCap(zoeRef.bundleID);
  console.log(`ZOE BUNDLE ID: `, zoeRef.bundleID);

  // const { adminNode, root: zoeRoot } = await E(vatStore).get('zoe');
  // await E(adminNode).upgrade(zoeBundleCap, {});

  // const zoeConfigFacet = await E(zoeRoot).getZoeConfigFacet();

  // const bCap = await E(zoeConfigFacet).updateZcfBundleId(zcfRef.bundleID);
  // console.log(`ZCF BUNDLE ID: `, zcfRef.bundleID, bCap);

  const { adminFacet } = await walletFactoryStartResult;
  console.log(`upgrade WF F `, adminFacet, walletRef.bundleID);

  // await E(adminFacet).upgradeContract(walletRef.bundleID, {});
  await E(adminFacet).restartContract({});
  console.log(`upgrade WF  AFTER`);
};

export const getManifestForUpgradeWallet = (
  _powers,
  { walletRef, zoeRef, zcfRef },
) => ({
  manifest: {
    [upgradeWalletFactory.name]: {
      consume: {
        vatAdminSvc: 'vatAdminSvc',
        vatStore: 'vatStore',
        walletFactoryStartResult: 'walletFactoryStartResult',
      },
    },
  },
  options: { walletRef, zoeRef, zcfRef },
});
