// @ts-check
import { Fail } from '@agoric/assert';
import { makeTracer } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeSubscriptionKit } from '@agoric/notifier';
import { makeNameHubKit } from '@agoric/vats';
import { makeAgoricNamesAccess } from '@agoric/vats/src/core/utils.js';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { makeFakeBankKit } from '@agoric/vats/tools/bank-utils.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const trace = makeTracer('BootWFUpg', false);

export const wfV1BundleName = 'walletFactoryV1';
export const wfV2BundleName = 'walletFactoryV2';

export const buildRootObject = () => {
  const storageKit = makeFakeStorageKit('walletFactoryUpgradeTest');
  const walletPath = 'walletFactoryUpgradeTest.agoric1whatever.current';
  const board = makeBoard();
  const { agoricNames } = makeAgoricNamesAccess();
  const assetPublisher = Far('mockAssetPublisher', {
    getAssetSubscription: () => makeSubscriptionKit().subscription,
  });
  const { nameAdmin: namesByAddressAdmin } = makeNameHubKit();

  let vatAdmin;
  /** @type {ZoeService} */
  let zoe;
  /** @type {AdminFacet} */
  let adminFacet;
  let creatorFacet;
  let bank;
  /** @type {import('../../../src/smartWallet.js').SmartWallet} */
  let wallet;

  // for startInstance
  /** @type {Installation<import('../../../src/walletFactory.js').prepare>} */
  let installation;
  const terms = { agoricNames, board, assetPublisher };
  const privateArgs = {
    storageNode: storageKit.rootNode,
    // omit walletBridgeManager
  };

  return Far('root', {
    bootstrap: async (vats, devices) => {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      ({ zoeService: zoe } = await E(vats.zoe).buildZoe(
        vatAdmin,
        undefined,
        'zcf',
      ));

      ({ bank } = makeFakeBankKit([]));

      const v1BundleId = await E(vatAdmin).getBundleIDByName(wfV1BundleName);
      assert(v1BundleId, 'bundleId must not be empty');
      installation = await E(zoe).installBundleID(v1BundleId);
    },

    buildV1: async () => {
      trace(`BOOT buildV1 start`);
      // build the contract vat from ZCF and the contract bundlecap

      // Complete round-trip without upgrade
      trace(`BOOT buildV1 startInstance`);
      const facets = await E(zoe).startInstance(
        installation,
        {},
        terms,
        privateArgs,
      );
      ({ adminFacet, creatorFacet } = facets);
      const [newWallet, isNew] = await E(creatorFacet).provideSmartWallet(
        'agoric1whatever',
        bank,
        namesByAddressAdmin,
      );
      isNew || Fail`wallet in buildV1 should be new`;
      wallet = newWallet;

      const currentStoragePath = await E.get(
        E.get(E(wallet).getPublicTopics()).current,
      ).storagePath;
      currentStoragePath === walletPath || Fail`bad storage path`;

      return true;
    },

    nullUpgradeV1: async () => {
      trace(`BOOT nullUpgradeV1 start`);

      trace(`BOOT nullUpgradeV1 upgradeContract`);
      const bundleId = await E(vatAdmin).getBundleIDByName(wfV1BundleName);
      const upgradeResult = await E(adminFacet).upgradeContract(
        bundleId,
        privateArgs,
      );
      assert.equal(upgradeResult.incarnationNumber, 2);

      const [wallet2, isNew] = await E(creatorFacet).provideSmartWallet(
        'agoric1whatever',
        bank,
        namesByAddressAdmin,
      );
      !isNew || Fail`wallet in nullUpgradeV1 should not be new`;
      wallet2 === wallet || Fail`must be same wallet obj`;

      const currentStoragePath = await E.get(
        E.get(E(wallet).getPublicTopics()).current,
      ).storagePath;
      currentStoragePath === walletPath || Fail`bad storage path`;

      return true;
    },

    upgradeV2: async () => {
      trace(`BOOT upgradeV2 start`);
      const bundleId = await E(vatAdmin).getBundleIDByName(wfV2BundleName);

      const upgradeResult = await E(adminFacet).upgradeContract(
        bundleId,
        privateArgs,
      );
      assert.equal(upgradeResult.incarnationNumber, 3);
      trace(`BOOT upgradeV2 startInstance`);

      const [wallet2, isNew] = await E(creatorFacet).provideSmartWallet(
        'agoric1whatever',
        bank,
        namesByAddressAdmin,
      );
      !isNew || Fail`wallet in nullUpgradeV1 should not be new`;
      wallet2 === wallet || Fail`must be same wallet obj`;

      const currentStoragePath = await E.get(
        E.get(E(wallet).getPublicTopics()).current,
      ).storagePath;
      currentStoragePath === walletPath || Fail`bad storage path`;

      // verify new method is present
      const result = await E(creatorFacet).sayHelloUpgrade();
      result === 'hello, upgrade' || Fail`bad upgrade`;

      trace('Boot finished test');
      return true;
    },
  });
};
