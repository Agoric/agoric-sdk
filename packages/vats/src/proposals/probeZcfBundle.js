import { E } from '@endo/far';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';

// verify that Zoe remembers the zcfBundleCap across upgrades
export const probeZcfBundleCap = async (
  {
    consume: {
      vatAdminSvc,
      walletFactoryStartResult,
      provisionPoolStartResult,
      chainStorage,
      walletBridgeManager: walletBridgeManagerP,
      vatStore,
    },
  },
  options,
) => {
  const { zoeRef, zcfRef, walletRef } = options.options;

  const { adminNode, root: zoeRoot } = await E(vatStore).get('zoe');
  const zoeConfigFacet = await E(zoeRoot).getZoeConfigFacet();

  // STEP 1: restart WF; it'll use the newest ZCF known to Zoe ////////////////

  const WALLET_STORAGE_PATH_SEGMENT = 'wallet';
  const [walletBridgeManager, walletStorageNode, ppFacets] = await Promise.all([
    walletBridgeManagerP,
    makeStorageNodeChild(chainStorage, WALLET_STORAGE_PATH_SEGMENT),
    provisionPoolStartResult,
  ]);
  const walletReviver = await E(ppFacets.creatorFacet).getWalletReviver();
  const privateArgs = {
    storageNode: walletStorageNode,
    walletBridgeManager,
    walletReviver,
  };

  const { adminFacet: walletAdminFacet } = await walletFactoryStartResult;
  await E(walletAdminFacet).upgradeContract(walletRef.bundleID, privateArgs);

  // STEP 2: Set the ZCF bundle ////////////////////////
  await E(zoeConfigFacet).updateZcfBundleId(zcfRef.bundleID);

  // STEP 3: Upgrade Zoe again ////////////////////////
  // //////  See if Zoe forgets ZcfBundleCap //////////

  const zoeBundleCap = await E(vatAdminSvc).getBundleCap(zoeRef.bundleID);
  await E(adminNode).upgrade(zoeBundleCap, {});

  // STEP 4: restart WF ////////////////////////
  await E(walletAdminFacet).restartContract(privateArgs);

  // //////  See which zcf bundle was used //////////
};
harden(probeZcfBundleCap);

export const getManifestForProbeZcfBundleCap = (_powers, options) => ({
  manifest: {
    [probeZcfBundleCap.name]: {
      consume: {
        vatAdminSvc: true,
        vatStore: true,
        walletBridgeManager: true,
        walletFactoryStartResult: true,
        provisionPoolStartResult: true,
        chainStorage: true,
      },
    },
  },
  options,
});
harden(getManifestForProbeZcfBundleCap);
