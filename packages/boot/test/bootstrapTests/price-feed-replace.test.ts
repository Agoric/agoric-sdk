/**
 * @file  The goal of this test is  to see that the
 * upgrade scripts re-wire all the contracts so new auctions and
 * price feeds are connected to vaults correctly.
 *
 * - enter a bid
 * - force prices to drop so a vault liquidates
 * - verify that the bidder gets the liquidated assets.
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { ExecutionContext, TestFn } from 'ava';
import type { FakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { makeSwingsetTestKit } from '../../tools/supports.ts';
import { makeWalletFactoryDriver } from '../../tools/drivers.ts';

const makeDefaultTestContext = async (
  t: ExecutionContext,
  { storage = undefined as FakeStorageKit | undefined } = {},
) => {
  const swingsetTestKit = await makeSwingsetTestKit(t.log, undefined, {
    storage,
  });
  const { readLatest, runUtils } = swingsetTestKit;
  ({ storage } = swingsetTestKit);
  const { EV } = runUtils;
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');

  // XXX grumble... .boardId() hack should go away
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );

  return { ...swingsetTestKit, readLatest, walletFactoryDriver };
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;
test.before(async t => (t.context = await makeDefaultTestContext(t)));
test.after.always(t => t.context.shutdown());

const collateralBrandKey = 'ATOM';

const collateralMetricsPath = vaultManagerIndex =>
  `published.vaultFactory.managers.manager${vaultManagerIndex}.metrics`;

test.serial('open vault: mint 5 IST', async t => {
  console.time('open vault');
  const { readLatest, walletFactoryDriver } = t.context;
  const wd = await walletFactoryDriver.provideSmartWallet('agoric1minter');
  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open1',
    collateralBrandKey,
    wantMinted: 5.0,
    giveCollateral: 9.0,
  });

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open1', numWantsSatisfied: 1 },
  });

  t.like(readLatest(collateralMetricsPath(0)), {
    numActiveVaults: 1,
    totalDebt: { value: 5025000n },
  });
  console.timeEnd('open vault');
});

test.serial('open 10% discount bid on ATOM', async t => {
  const { readLatest, walletFactoryDriver } = t.context;
  const wd = await walletFactoryDriver.provideSmartWallet('agoric1minter');
  await wd.sendOfferMaker(Offers.auction.Bid, {
    offerId: 'bid1',
    discount: 0.1,
    give: '0.5IST',
    maxBuy: '10_000ATOM',
  });

  t.like(wd.getLatestUpdateRecord(), {
    status: { result: 'Your bid has been accepted' },
  });
});

test.serial('run replace-price-feeds proposals', async t => {
  const { controller, buildProposal, evalProposal } = t.context;

  const builders = [
    '@agoric/builders/scripts/vats/replaceScaledPriceAuthorities.js',
    '@agoric/builders/scripts/vats/add-auction.js',
    '@agoric/builders/scripts/vats/upgradeVaults.js',
  ];

  await null;
  for (const builder of builders) {
    t.log('building', builder);
    const p = buildProposal(builder);
    await evalProposal(p);
  }

  t.fail('TODO');
});
