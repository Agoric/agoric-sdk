// @ts-check
/**
 * @file Bootstrap stress test of vaults
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { E } from '@endo/captp';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeSwingsetTestKit, makeWalletFactoryDriver } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeDefaultTestContext>>>}
 */
const test = anyTest;

// presently all these tests use one collateral manager
const collateralBrandKey = 'IbcATOM';

const likePayouts = (collateral, minted) => ({
  Collateral: {
    value: {
      digits: String(collateral * 1_000_000),
    },
  },
  Minted: {
    value: {
      digits: String(minted * 1_000_000),
    },
  },
});

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t);

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for IbcATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.brand.IbcATOM || Fail`IbcATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  console.timeEnd('DefaultTestContext');

  return { ...swingsetTestKit, agoricNamesRemotes, walletFactoryDriver };
};

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after(async t => {
  // not strictly necessary but conveys that we keep the controller around for the whole test file
  await E(t.context.controller).shutdown();
});

test('stress vaults', async t => {
  console.time('stress vaults');
  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1open');

  /** @param {number} i */
  const openVault = async i => {
    assert.typeof(i, 'number');
    console.time(`openVault ${i}`);

    const offerId = `open-vault-${i}-at-${Date.now()}`;
    await wd.executeOfferMaker(Offers.vaults.OpenVault, {
      offerId,
      collateralBrandKey,
      wantMinted: 5.0,
      giveCollateral: 9.0,
    });
    console.timeLog(`openVault ${i}`, 'executed offer');

    t.like(wd.getLatestUpdateRecord(), {
      updated: 'offerStatus',
      status: { id: offerId, numWantsSatisfied: 1 },
    });
    console.timeEnd(`openVault ${i}`);
  };

  /** @param {number} n */
  const openN = async n => {
    console.time(`open ${n} vaults`);
    const range = [...Array(n)].map((_, i) => i);
    await Promise.all(range.map(i => openVault(i)));
    console.timeEnd(`open ${n} vaults`);
  };

  await openN(10);
  await openN(100);
  await openN(1000);
});
