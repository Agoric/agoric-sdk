// @ts-check

import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/vats/src/core/types.js';
import '@agoric/zoe/exported.js';

import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeStorageNodeChild } from '@agoric/vats/src/lib-chainStorage.js';
import { makeNameHubKit } from '@agoric/vats/src/nameHub.js';
import { E, Far } from '@endo/far';
import path from 'path';
import { makeTestSpace, subscriptionKey } from './supports.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const mockAddress1 = 'mockAddress1';
const mockAddress2 = 'mockAddress2';
const mockAddress3 = 'mockAddress3';

const makeTestContext = async t => {
  const { consume } = await makeTestSpace(t.log);
  const { agoricNames, zoe } = consume;

  // Adapted from perAddress in makeAddressNameHubs()
  const reserveAddress = address => {
    // Create a name hub for this address.
    const { nameHub: myAddressNameHub, nameAdmin: rawMyAddressNameAdmin } =
      makeNameHubKit();

    /** @type {MyAddressNameAdmin} */
    const myAddressNameAdmin = Far('myAddressNameAdmin', {
      ...rawMyAddressNameAdmin,
      getMyAddress: () => address,
    });
    // reserve space for deposit facet
    myAddressNameAdmin.reserve('depositFacet');
    // Register it with the namesByAddress hub.
    return E(consume.namesByAddressAdmin).update(
      address,
      myAddressNameHub,
      myAddressNameAdmin,
    );
  };

  // #region Installs
  const pathname = new URL(import.meta.url).pathname;
  const dirname = path.dirname(pathname);

  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const bundle = await bundleCache.load(
    `${dirname}/../src/walletFactory.js`,
    'walletFactory',
  );
  /** @type {Promise<Installation<import('../src/walletFactory.js').start>>} */
  // @ts-expect-error case
  const installation = E(zoe).install(bundle);
  // #endregion

  // copied from makeClientBanks()
  const storageNode = await makeStorageNodeChild(
    consume.chainStorage,
    'wallet',
  );
  const marshaller = E(consume.board).getPublishingMarshaller();

  const walletFactory = E(zoe).startInstance(
    installation,
    {},
    {
      agoricNames,
      namesByAddress: consume.namesByAddress,
      board: consume.board,
    },
    { storageNode, marshaller },
  );

  return {
    bankManager: consume.bankManager,
    namesByAddressAdmin: consume.namesByAddressAdmin,
    reserveAddress,
    walletFactory,
    zoe,
  };
};

test.before(async t => {
  t.context = await makeTestContext(t);
});

test('basic', async t => {
  const {
    bankManager,
    namesByAddressAdmin,
    reserveAddress,
    walletFactory,
    zoe,
  } = t.context;
  const { creatorFacet } = await walletFactory;

  await reserveAddress(mockAddress1);

  // copied from makeClientBanks()
  const bank = E(bankManager).getBankForAddress(mockAddress1);
  const myAddressNameAdmin = E(namesByAddressAdmin).lookupAdmin(mockAddress1);

  const smartWallet = await E(creatorFacet).provideSmartWallet(
    mockAddress1,
    bank,
    myAddressNameAdmin,
  );

  const bridge = await E(smartWallet).getBridge();
  t.is(await E(bridge).getZoe(), await zoe);
});

test('notifiers', async t => {
  const { bankManager, namesByAddressAdmin, reserveAddress, walletFactory } =
    t.context;
  const { creatorFacet } = await walletFactory;

  async function checkAddress(address) {
    await reserveAddress(address);

    const bank = E(bankManager).getBankForAddress(address);
    const myAddressNameAdmin = E(namesByAddressAdmin).lookupAdmin(address);

    const smartWallet = await E(creatorFacet).provideSmartWallet(
      address,
      bank,
      myAddressNameAdmin,
    );

    t.is(
      await subscriptionKey(E(smartWallet).getSubscriber()),
      `mockChainStorageRoot.wallet.${address}`,
    );
  }

  await Promise.all(
    [mockAddress1, mockAddress2, mockAddress3].map(checkAddress),
  );
});
