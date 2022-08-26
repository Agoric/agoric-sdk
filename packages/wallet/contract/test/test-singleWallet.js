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

  const address = 'bogusAddress';
  await reserveAddress(address);

  // #region Installs
  const pathname = new URL(import.meta.url).pathname;
  const dirname = path.dirname(pathname);

  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const bundle = await bundleCache.load(
    `${dirname}/../src/singleWallet.js`,
    'singleWallet',
  );
  /** @type {Promise<Installation<import('../src/singleWallet.js').start>>} */
  const installation = E(zoe).install(bundle);
  // #endregion

  // copied from makeClientBanks()
  const bank = E(consume.bankManager).getBankForAddress(address);
  const myAddressNameAdmin = E(consume.namesByAddressAdmin).lookupAdmin(
    address,
  );

  // copied from makeClientBanks()
  const storageNode = await makeStorageNodeChild(
    consume.chainStorage,
    'wallet',
  );
  const marshaller = E(consume.board).getPublishingMarshaller();

  const singleWallet = E(zoe).startInstance(
    installation,
    {},
    {
      agoricNames,
      bank,
      namesByAddress: consume.namesByAddress,
      myAddressNameAdmin,
      board: consume.board,
    },
    { storageNode, marshaller },
  );

  return {
    singleWallet,
    zoe,
  };
};

test.before(async t => {
  t.context = await makeTestContext(t);
});

test('basic', async t => {
  const { singleWallet, zoe } = t.context;
  const { creatorFacet } = await singleWallet;

  const bridge = await E(creatorFacet).getBridge();
  t.is(await E(bridge).getZoe(), await zoe);

  t.is(
    await subscriptionKey(E(creatorFacet).getSubscription()),
    'mockChainStorageRoot.wallet.bogusAddress',
  );
});
