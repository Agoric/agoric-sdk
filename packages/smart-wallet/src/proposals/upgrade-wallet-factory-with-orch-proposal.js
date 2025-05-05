// @ts-check
/// <reference types="@agoric/vats/src/core/types-ambient" />

import { E } from '@endo/far';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { deeplyFulfilledObject } from '@agoric/internal';

/**
 * @param {BootstrapPowers & ChainBootstrapSpace} powers
 * @param {object} options
 * @param {{ walletRef: VatSourceRef }} options.options
 */
export const upgradeWalletFactory = async (
  {
    consume: {
      // agoricNames,
      namesByAddress,
      // bankManager,
      // board,
      chainTimerService: timerService,
      localchain,
      cosmosInterchainService: orchestrationService,
      // startUpgradable,
      // zoe,

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

  const orchPrivateArgs = await deeplyFulfilledObject({
    // agoricNames,
    namesByAddress,
    // bankManager,
    // board,
    // chainStorage,
    timerService,
    localchain,
    orchestrationService,
    // startUpgradable,
    // zoe,
  });

  const { adminFacet } = await walletFactoryStartResult;

  assert(walletRef.bundleID);
  await E(adminFacet).upgradeContract(walletRef.bundleID, {
    ...orchPrivateArgs,
    storageNode: walletStorageNode,
    walletBridgeManager,
    walletReviver,
  });

  console.log(`Successfully upgraded WalletFactory`);
};

export const getManifestForUpgradeWallet = ({ restoreRef }, { walletRef }) => ({
  manifest: {
    [upgradeWalletFactory.name]: {
      consume: {
        walletFactoryStartResult: 'walletFactoryStartResult',
        provisionPoolStartResult: 'provisionPoolStartResult',
        chainStorage: 'chainStorage',
        walletBridgeManager: 'walletBridgeManager',

        // For orchestration
        chainTimerService: true,
        localchain: true,
        cosmosInterchainService: true,

        // // limited distribution durin MN2: contract installation
        // startUpgradable: true,
        // zoe: true, // only getTerms() is needed. XXX should be split?

        // widely shared: name services
        // agoricNames: true,
        namesByAddress: true,
        // board: true,
      },
    },
  },
  installations: { walletFactory: restoreRef(walletRef) },
  options: { walletRef },
});
