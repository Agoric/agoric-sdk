/**
 * @file  The goal of this test is  to see that the
 * upgrade scripts re-wire all the contracts so new auctions and
 * price feeds are connected to vaults correctly.
 *
 * 1. enter a bid
 * 2. force prices to drop so a vault liquidates
 * 3. verify that the bidder gets the liquidated assets.
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';
import { ScheduleNotification } from '@agoric/inter-protocol/src/auction/scheduler.js';
import { NonNullish } from '@agoric/internal';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { Fail } from '@endo/errors';

import {
  LiquidationTestContext,
  likePayouts,
  makeLiquidationTestContext,
  scale6,
  LiquidationSetup,
} from '../../tools/liquidation.js';
import {
  updateVaultDirectorParams,
  updateVaultManagerParams,
} from '../tools/changeVaultParams.js';

const test = anyTest as TestFn<LiquidationTestContext>;
test.before(
  async t =>
    (t.context = await makeLiquidationTestContext(t, { env: process.env })),
);
test.after.always(t => t.context.shutdown());

const collateralBrandKey = 'ATOM';
const managerIndex = 0;

const setup: LiquidationSetup = {
  vaults: [{ atom: 15, ist: 100, debt: 100.5 }],
  bids: [{ give: '20IST', discount: 0.1 }],
  price: {
    starting: 12.34,
    trigger: 9.99,
  },
  auction: {
    start: { collateral: 15, debt: 100.5 },
    end: { collateral: 9.659301, debt: 0 },
  },
};

const outcome = {
  bids: [{ payouts: { Bid: 0, Collateral: 2.224446 } }],
};

test.serial('setupVaults; run updatePriceFeeds proposals', async t => {
  const {
    agoricNamesRemotes,
    buildProposal,
    evalProposal,
    priceFeedDrivers,
    refreshAgoricNamesRemotes,
    setupVaults,
    governanceDriver: gd,
  } = t.context;

  await setupVaults(collateralBrandKey, managerIndex, setup);

  const instancePre = agoricNamesRemotes.instance['ATOM-USD price feed'];

  const priceFeedBuilder =
    '@agoric/builders/scripts/inter-protocol/updatePriceFeeds.js';
  t.log('building', priceFeedBuilder);
  const brandName = collateralBrandKey;

  const { ATOM } = agoricNamesRemotes.brand;
  ATOM || Fail`ATOM missing from agoricNames`;
  await updateVaultManagerParams(t, gd, ATOM, 50_000_000n);

  const SOME_GUI = 'someGUIHASH';
  await updateVaultDirectorParams(t, gd, SOME_GUI);

  const { EV } = t.context.runUtils;
  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  const oldVaultInstallation = await EV(agoricNames).lookup(
    'installation',
    'VaultFactory',
  );

  t.log('building all relevant CoreEvals');
  const coreEvals = await Promise.all([
    buildProposal(priceFeedBuilder, ['main']),
    buildProposal('@agoric/builders/scripts/vats/upgradeVaults.js'),
    buildProposal('@agoric/builders/scripts/vats/add-auction.js'),
  ]);
  const combined = {
    evals: coreEvals.flatMap(e => e.evals),
    bundles: coreEvals.flatMap(e => e.bundles),
  };
  t.log('evaluating', coreEvals.length, 'scripts');
  await evalProposal(combined);

  refreshAgoricNamesRemotes();
  const instancePost = agoricNamesRemotes.instance['ATOM-USD price feed'];
  t.not(instancePre, instancePost);

  await priceFeedDrivers[collateralBrandKey].refreshInvitations();

  const newVaultInstallation = await EV(agoricNames).lookup(
    'installation',
    'VaultFactory',
  );

  t.notDeepEqual(
    newVaultInstallation.getKref(),
    oldVaultInstallation.getKref(),
  );
});

test.serial('1. place bid', async t => {
  const { placeBids, readLatest } = t.context;
  await placeBids(collateralBrandKey, 'agoric1buyer', setup, 0);

  t.like(readLatest('published.wallet.agoric1buyer.current'), {
    liveOffers: [['ATOM-bid1', { id: 'ATOM-bid1' }]],
  });
});

test.serial('2. trigger liquidation by changing price', async t => {
  const { priceFeedDrivers, readLatest } = t.context;

  await priceFeedDrivers[collateralBrandKey].setPrice(9.99);

  t.log(readLatest('published.priceFeed.ATOM-USD_price_feed'), {
    // aka 9.99
    amountIn: { value: 1000000n },
    amountOut: { value: 9990000n },
  });

  // check nothing liquidating yet
  const liveSchedule: ScheduleNotification = readLatest(
    'published.auction.schedule',
  );
  t.is(liveSchedule.activeStartTime, null);
  const metricsPath = `published.vaultFactory.managers.manager${managerIndex}.metrics`;

  t.like(readLatest(metricsPath), {
    numActiveVaults: setup.vaults.length,
    numLiquidatingVaults: 0,
  });
});

test.serial('3. verify liquidation', async t => {
  const { advanceTimeBy, advanceTimeTo, readLatest } = t.context;

  const liveSchedule: ScheduleNotification = readLatest(
    'published.auction.schedule',
  );
  const metricsPath = `published.vaultFactory.managers.manager${managerIndex}.metrics`;

  // advance time to start an auction
  console.log(collateralBrandKey, 'step 1 of 10');
  await advanceTimeTo(NonNullish(liveSchedule.nextDescendingStepTime));
  await eventLoopIteration(); // let promises to update vstorage settle

  // vaultFactory sent collateral for liquidation
  t.like(readLatest(metricsPath), {
    numActiveVaults: 0,
    numLiquidatingVaults: setup.vaults.length,
    liquidatingCollateral: {
      value: scale6(setup.auction.start.collateral),
    },
    liquidatingDebt: { value: scale6(setup.auction.start.debt) },
    lockedQuote: null,
  });

  console.log(collateralBrandKey, 'step 2 of 10');
  await advanceTimeBy(3, 'minutes');
  t.like(readLatest(`published.auction.book${managerIndex}`), {
    collateralAvailable: { value: scale6(setup.auction.start.collateral) },
    startCollateral: { value: scale6(setup.auction.start.collateral) },
    startProceedsGoal: { value: scale6(setup.auction.start.debt) },
  });

  console.log(collateralBrandKey, 'step 3 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log(collateralBrandKey, 'step 4 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log(collateralBrandKey, 'step 5 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log(collateralBrandKey, 'step 6 of 10');
  await advanceTimeBy(3, 'minutes');
  t.like(readLatest(`published.auction.book${managerIndex}`), {
    // 15_000_000 - ( 20_000_000 / 8.991 )
    collateralAvailable: { value: 12775554n },
  });

  console.log(collateralBrandKey, 'step 7 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log(collateralBrandKey, 'step 8 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log(collateralBrandKey, 'step 9 of 10');
  await advanceTimeBy(3, 'minutes');

  t.like(readLatest('published.wallet.agoric1buyer'), {
    status: {
      id: `${collateralBrandKey}-bid1`,
      payouts: likePayouts(outcome.bids[0].payouts),
    },
  });
});
