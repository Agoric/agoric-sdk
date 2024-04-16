// @ts-check
import { E } from '@endo/far';

const toRecover = [
  // {
  //   address: 'agoric1...',
  //   offerId: 17...,
  // },
];

const exitOffers = async () => {};

/**
 * @param {BootstrapPowers & NonNullChainStorage} powers
 * @typedef {PromiseSpaceOf<{ chainStorage: StorageNode }>} NonNullChainStorage
 * @param {object} options
 * @param {{ walletRef: VatSourceRef, zcfRef: VatSourceRef }} options.options
 */
export const upgradeWalletFactory = async (
  {
    consume: {
      vatStore,
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
  console.log('@@@ upgradeWalletFactory');
  const WALLET_STORAGE_PATH_SEGMENT = 'wallet';

  const { walletRef, zcfRef } = options.options;

  const upgradeZcf = async () => {
    const { root: zoeRoot } = await E(vatStore).get('zoe');

    const zoeConfigFacet = await E(zoeRoot).getZoeConfigFacet();
    await E(zoeConfigFacet).updateZcfBundleId(zcfRef.bundleID);
    console.log(`ZCF BUNDLE ID: `, zcfRef.bundleID);
  };
  await upgradeZcf();

  const upgradeWalletFactory = async () => {
    const [walletBridgeManager, walletStorageNode, ppFacets] =
      await Promise.all([
        walletBridgeManagerP,
        E(chainStorage).makeChildNode(WALLET_STORAGE_PATH_SEGMENT),
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
    console.log('@@@ upgradeWalletFactory', walletRef.bundleID);
    await E(adminFacet).upgradeContract(walletRef.bundleID, privateArgs);

    console.log(`Successfully upgraded WalletFactory`);
  };
  await upgradeWalletFactory();

  const { creatorFacet } = await walletFactoryStartResult;

  const exitOffers = () =>
    Promise.allSettled(
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
  await exitOffers();
};
harden(upgradeWalletFactory);

// main and permit are for use with rollup-plugin-core-eval.js
export const main = upgradeWalletFactory;

export const permit = {
  consume: {
    vatAdminSvc: true,
    vatStore: true,
    walletFactoryStartResult: 'walletFactoryStartResult',
    provisionPoolStartResult: 'provisionPoolStartResult',
    chainStorage: 'chainStorage',
    walletBridgeManager: 'walletBridgeManager',
    bankManager: 'bank',
    namesByAddressAdmin: 'provisioning',
  },
};

export const manifest = {
  [upgradeWalletFactory.name]: permit,
};

export const getManifestForUpgradeWallet = (_powers, options) => ({
  manifest,
  options,
});
