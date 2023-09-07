// This is a version of bench-vaults-performance.js that has had all intrinsic
// performance measurement code stripped out of it, purely implementing the
// vault benchmark test code in expectation of extrinsic measurement.

import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';
import { makeSwingsetTestKit } from './supports.js';
import { makeWalletFactoryDriver } from './drivers.ts';

// presently all these tests use one collateral manager
const collateralBrandKey = 'ATOM';

const makeDefaultTestContext = async t => {
  const swingsetTestKit = await makeSwingsetTestKit(t);

  const { runUtils, storage: chainStorage } = swingsetTestKit;
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  // E(bootstrap).consumeItem('vaultFactoryKit');
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes =
    makeAgoricNamesRemotesFromFakeStorage(chainStorage);

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    chainStorage,
    agoricNamesRemotes,
  );

  return { ...swingsetTestKit, walletFactoryDriver };
};

/** @type {import('ava').TestFn<Awaited<ReturnType<makeDefaultTestContext>>>} */
const test = unknownTest;

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after.always(t => t.context.shutdown());

test.serial('stress vaults', async t => {
  const { walletFactoryDriver } = t.context;
  await walletFactoryDriver.provideSmartWallet(
    'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
  );
  await walletFactoryDriver.provideSmartWallet(
    'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
  );
  await walletFactoryDriver.provideSmartWallet(
    'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
  );

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1open');

  const openVault = async (i, n) => {
    const offerId = `open-vault-${i}-of-${n}`;
    await wd.executeOfferMaker(Offers.vaults.OpenVault, {
      offerId,
      collateralBrandKey,
      wantMinted: 5,
      giveCollateral: 1.0,
    });

    t.like(wd.getLatestUpdateRecord(), {
      updated: 'offerStatus',
      status: { id: offerId, numWantsSatisfied: 1 },
    });
  };

  const openN = async n => {
    const range = [...Array(n)].map((_, i) => i + 1);
    await Promise.all(range.map(i => openVault(i, n)));
  };

  await openN(1);
  await eventLoopIteration();
  t.pass();
});
