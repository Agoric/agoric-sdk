// @ts-check
import { E } from '@endo/far';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';

const toRecover = [
  // {
  //   address: 'agoric1...',
  //   offerId: 17...,
  // },
];

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
      bankManager,
      namesByAddressAdmin,
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

  const { creatorFacet } = await walletFactoryStartResult;

  await Promise.allSettled(
    toRecover.map(async ({ address, offerId }) => {
      const bank = await E(bankManager).getBankForAddress(address);
      const [wallet, _x] = await E(creatorFacet).provideSmartWallet(
        address,
        bank,
        namesByAddressAdmin,
      );
      await E(wallet)
        .tryExitOffer(offerId)
        .catch(e => {
          console.log(`Failed to exit offer ${offerId} for ${address}: ${e}`);
        });
    }),
  );
};

export const getManifestForUpgradeWallet = (_powers, { walletRef }) => ({
  manifest: {
    [upgradeWalletFactory.name]: {
      consume: {
        walletFactoryStartResult: 'walletFactoryStartResult',
        provisionPoolStartResult: 'provisionPoolStartResult',
        chainStorage: 'chainStorage',
        walletBridgeManager: 'walletBridgeManager',
        bankManager: 'bank',
        namesByAddressAdmin: 'provisioning',
      },
    },
  },
  options: { walletRef },
});
