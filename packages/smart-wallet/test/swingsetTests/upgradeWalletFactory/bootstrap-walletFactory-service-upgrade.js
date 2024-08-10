// @ts-check
import { Fail } from '@endo/errors';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeNameHubKit } from '@agoric/vats';
import { makeAgoricNamesAccess } from '@agoric/vats/src/core/utils.js';
import { makeFakeBankManagerKit } from '@agoric/vats/tools/bank-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

const trace = makeTracer('BootWFUpg', false);

export const wfV1BundleName = 'walletFactoryV1';
export const wfV2BundleName = 'walletFactoryV2';
const walletAddr = 'agoric1whatever';

const moolaKit = makeIssuerKit('moola');

export const buildRootObject = async () => {
  const { bankManager } = await makeFakeBankManagerKit();
  const storageKit = makeFakeStorageKit('walletFactoryUpgradeTest');
  const statusPath = `walletFactoryUpgradeTest.${walletAddr}`;
  const currentPath = `${statusPath}.current`;
  const board = makeFakeBoard();
  const { agoricNames } = await makeAgoricNamesAccess();
  const { nameAdmin: namesByAddressAdmin } = makeNameHubKit();

  /** @type {PromiseKit<ZoeService>} */
  const { promise: zoe, ...zoePK } = makePromiseKit();
  /** @type {PromiseKit<Instance>} */
  const { promise: automaticRefundInstance, ...arPK } = makePromiseKit();

  let vatAdmin;
  /** @type {AdminFacet} */
  let adminFacet;
  let creatorFacet;
  /** @type {import('../../../src/smartWallet.js').SmartWallet} */
  let wallet;

  const bank = await E(bankManager).getBankForAddress(walletAddr);

  // for startInstance
  /** @type {Installation<import('../../../src/walletFactory.js').start>} */
  let installation;
  const terms = {
    agoricNames,
    board,
    assetPublisher: bank,
  };
  const privateArgs = {
    storageNode: storageKit.rootNode,
    // omit walletBridgeManager
  };

  return Far('root', {
    bootstrap: async (vats, devices) => {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      const { zoeService } = await E(vats.zoe).buildZoe(
        vatAdmin,
        undefined,
        'zcf',
      );
      zoePK.resolve(zoeService);

      const v1BundleId = await E(vatAdmin).getBundleIDByName(wfV1BundleName);
      v1BundleId || Fail`bundleId must not be empty`;
      installation = await E(zoe).installBundleID(v1BundleId);

      const autoRefundBundleId =
        await E(vatAdmin).getBundleIDByName('automaticRefund');
      const autoRefundInstallation =
        await E(zoe).installBundleID(autoRefundBundleId);
      const { instance } = await E(zoe).startInstance(autoRefundInstallation, {
        Moola: moolaKit.issuer,
      });
      arPK.resolve(instance);
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
      trace('BOOT buildV1 started instance');
      ({ adminFacet, creatorFacet } = facets);
      const [newWallet, isNew] = await E(creatorFacet).provideSmartWallet(
        walletAddr,
        bank,
        namesByAddressAdmin,
      );
      isNew || Fail`wallet in buildV1 should be new`;
      wallet = newWallet;

      const currentStoragePath = await E.get(
        E.get(E(wallet).getPublicTopics()).current,
      ).storagePath;
      currentStoragePath === currentPath || Fail`bad storage path`;

      await E(bankManager).addAsset('umoola', 'moola', 'moola', moolaKit);
      const depositFacet = E(wallet).getDepositFacet();
      const payment = moolaKit.mint.mintPayment(
        AmountMath.make(moolaKit.brand, 100n),
      );
      await E(depositFacet).receive(payment);

      return true;
    },

    testOfferV1: async () => {
      // If this doesn't throw, the offer succeeded.
      // I tried to also check vstorage but it doesn't always update in time.
      await E(E(wallet).getOffersFacet()).executeOffer({
        id: 'firstOffer',
        invitationSpec: {
          source: 'contract',
          instance: await automaticRefundInstance,
          publicInvitationMaker: 'makeInvitation',
        },
        proposal: {
          give: { Moola: AmountMath.make(moolaKit.brand, 100n) },
        },
      });
    },

    nullUpgradeV1: async () => {
      trace(`BOOT nullUpgradeV1 start`);

      trace(`BOOT nullUpgradeV1 upgradeContract`);
      const bundleId = await E(vatAdmin).getBundleIDByName(wfV1BundleName);
      const upgradeResult = await E(adminFacet).upgradeContract(
        bundleId,
        privateArgs,
      );
      assert.equal(upgradeResult.incarnationNumber, 1);

      const [wallet2, isNew] = await E(creatorFacet).provideSmartWallet(
        walletAddr,
        bank,
        namesByAddressAdmin,
      );
      !isNew || Fail`wallet in nullUpgradeV1 should not be new`;
      wallet2 === wallet || Fail`must be same wallet obj`;

      const currentStoragePath = await E.get(
        E.get(E(wallet).getPublicTopics()).current,
      ).storagePath;
      currentStoragePath === currentPath || Fail`bad storage path`;

      return true;
    },

    upgradeV2: async () => {
      trace(`BOOT upgradeV2 start`);
      const bundleId = await E(vatAdmin).getBundleIDByName(wfV2BundleName);

      const upgradeResult = await E(adminFacet).upgradeContract(
        bundleId,
        privateArgs,
      );
      assert.equal(upgradeResult.incarnationNumber, 2);
      trace(`BOOT upgradeV2 startInstance`);

      const [wallet2, isNew] = await E(creatorFacet).provideSmartWallet(
        walletAddr,
        bank,
        namesByAddressAdmin,
      );
      !isNew || Fail`wallet in nullUpgradeV1 should not be new`;
      wallet2 === wallet || Fail`must be same wallet obj`;

      const currentStoragePath = await E.get(
        E.get(E(wallet).getPublicTopics()).current,
      ).storagePath;
      currentStoragePath === currentPath || Fail`bad storage path`;

      // verify new method is present
      const result = await E(creatorFacet).sayHelloUpgrade();
      result === 'hello, upgrade' || Fail`bad upgrade`;

      return true;
    },

    testOfferV2: async () => {
      // If this doesn't throw, the offer succeeded.
      // I tried to also check vstorage but it doesn't always update in time.
      await E(E(wallet).getOffersFacet()).executeOffer({
        id: 'secondOffer',
        invitationSpec: {
          source: 'contract',
          instance: await automaticRefundInstance,
          publicInvitationMaker: 'makeInvitation',
        },
        proposal: {
          give: { Moola: AmountMath.make(moolaKit.brand, 100n) },
        },
      });
    },
  });
};
