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
import {
  LiquidationTestContext,
  likePayouts,
  makeLiquidationTestContext,
  scale6,
  LiquidationSetup,
} from '../../tools/liquidation.ts';

const test = anyTest as TestFn<LiquidationTestContext>;
test.before(async t => (t.context = await makeLiquidationTestContext(t)));
test.after.always(t => t.context.shutdown());

const collateralBrandKey = 'ATOM';
const managerIndex = 0;

// TODO: read from config file? sync with liquidation.ts
const ORACLE_ADDRESSES = [
  'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
  'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
  'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
];

const setup: LiquidationSetup = {
  vaults: [{ atom: 15, ist: 100, debt: 100.5 }],
  bids: [{ give: '20IST', discount: 0.1 }],
  price: {
    starting: 12.34,
    trigger: 9.99,
  },
  auction: {
    start: { collateral: 15, debt: 100.5 },
    end: { collateral: 9.659301, debt: 0 }, // TODO: fix/adjust
  },
};

const outcome = {
  bids: [{ payouts: { Bid: 0, Collateral: 8.897786 } }],
};

test.serial('1. setupVaults; placeBids', async t => {
  const { placeBids, readLatest, setupVaults } = t.context;
  await setupVaults(collateralBrandKey, managerIndex, setup);
  await placeBids(collateralBrandKey, 'agoric1buyer', setup);

  t.like(readLatest('published.wallet.agoric1buyer.current'), {
    liveOffers: [['ATOM-bid1', { id: 'ATOM-bid1' }]],
  });
});

test.serial('run replace-price-feeds proposals', async t => {
  const {
    agoricNamesRemotes,
    buildProposal,
    evalProposal,
    priceFeedDrivers,
    refreshAgoricNamesRemotes,
  } = t.context;

  const instancePre = agoricNamesRemotes.instance['ATOM-USD price feed'];

  const perFeedBuilder = '@agoric/builders/scripts/vats/priceFeedSupport.js';
  t.log('building', perFeedBuilder);
  const brandName = collateralBrandKey;
  const opts = {
    AGORIC_INSTANCE_NAME: `${brandName}-USD price feed`,
    ORACLE_ADDRESSES,
    IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', brandName],
    IN_BRAND_DECIMALS: 6,
    OUT_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'USD'],
    OUT_BRAND_DECIMALS: 4,
  };
  await evalProposal(buildProposal(perFeedBuilder, opts));

  for (const builder of [
    '@agoric/builders/scripts/vats/replaceScaledPriceAuthorities.js',
    '@agoric/builders/scripts/vats/add-auction.js',
    '@agoric/builders/scripts/vats/upgradeVaults.js',
  ]) {
    t.log('building', builder);
    await evalProposal(buildProposal(builder));
  }
  refreshAgoricNamesRemotes();
  const instancePost = agoricNamesRemotes.instance['ATOM-USD price feed'];
  t.not(instancePre, instancePost);

  await priceFeedDrivers[collateralBrandKey].refreshInvitations();
});

test.serial('2. trigger liquidation by changing price', async t => {
  const { priceFeedDrivers, readLatest, refreshAgoricNamesRemotes } = t.context;

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
    collateralAvailable: { value: 9659301n },
  });

  console.log(collateralBrandKey, 'step 7 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log(collateralBrandKey, 'step 8 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log(collateralBrandKey, 'step 9 of 10');
  await advanceTimeBy(3, 'minutes');

  t.like(readLatest('published.wallet.agoric1buyer'), {
    status: {
      id: `${collateralBrandKey}-bid2`,
      payouts: likePayouts(outcome.bids[1].payouts),
    },
  });
});
