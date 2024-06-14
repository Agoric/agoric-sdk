// @ts-check
/// <reference types="@agoric/vats/src/core/types-ambient" />

import { E } from '@endo/far';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';

/**
 * @param {BootstrapPowers & ChainBootstrapSpace} powers
 * @param {object} options
 * @param {{ walletRef: VatSourceRef }} options.options
 */
export const upgradeWalletFactory = async (
  {
    consume: {
      walletFactoryStartResult,
      provisionPoolStartResult,
      chainStorage,
      walletBridgeManager: walletBridgeManagerP,
    },
  },
  options,
) => {
  const WALLET_STORAGE_PATH_SEGMENT = 'wallet';

  const { walletRef } = options.options;

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

  const { adminFacet } = await walletFactoryStartResult;

  assert(walletRef.bundleID);
  await E(adminFacet).upgradeContract(walletRef.bundleID, privateArgs);

  console.log(`Successfully upgraded WalletFactory`);
};

export const getManifestForUpgradeWallet = (_powers, { walletRef }) => ({
  manifest: {
    [upgradeWalletFactory.name]: {
      consume: {
        walletFactoryStartResult: 'walletFactoryStartResult',
        provisionPoolStartResult: 'provisionPoolStartResult',
        chainStorage: 'chainStorage',
        walletBridgeManager: 'walletBridgeManager',
      },
    },
  },
  options: { walletRef },
});
