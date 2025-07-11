// @ts-check
/**
 * @file Bootstrap test integration vaults with smart-wallet
 *
 *   Forks test-liquidation to test another scenario, but with a clean vault
 *   manager state. TODO is there a way to _reset_ the vaultmanager to make the
 *   two tests run faster?
 */
import type { TestFn } from 'ava';

import {
  type LiquidationSetup,
  type LiquidationTestContext,
  makeLiquidationTestContext,
  scale6,
} from '@aglocal/boot/tools/liquidation.js';
import { NonNullish } from '@agoric/internal';
import { TimeMath } from '@agoric/time';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

const test = anyTest as TestFn<LiquidationTestContext>;

// presently all these tests use one collateral manager
const collateralBrandKey = 'ATOM';

//#region Product spec
const setup: LiquidationSetup = {
  vaults: [
    {
      atom: 15,
      ist: 100,
      debt: 100.5,
    },
    {
      atom: 15,
      ist: 103,
      debt: 103.515,
    },
    {
      atom: 15,
      ist: 105,
      debt: 105.525,
    },
  ],
  bids: [
    {
      give: '75IST',
      discount: 0.22,
    },
    {
      give: '25IST',
      discount: 0.3,
    },
  ],
  price: {
    starting: 12.34,
    trigger: 9.99,
  },
  auction: {
    start: {
      collateral: 45,
      debt: 309.54,
    },
    end: {
      collateral: 31.414987,
      debt: 209.54,
    },
  },
};

const outcome = {
  bids: [
    {
      payouts: {
        Bid: 0,
        Collateral: 8.897786,
      },
    },
    {
      payouts: {
        Bid: 0,
        Collateral: 10.01001,
      },
    },
  ],
  reserve: {
    allocations: {
      // TODO match spec 1.61921
      ATOM: 1.619207,
    },
    shortfall: 5.525,
  },
  vaultsSpec: [
    {
      debt: 100.5,
      locked: 14.899,
    },
    {
      debt: 103.515,
      locked: 14.896,
    },
  ],
  // TODO match spec https://github.com/Agoric/agoric-sdk/issues/7837
  vaultsActual: [
    {
      debt: 100.5,
      locked: 14.998993,
    },
    {
      debt: 103.515,
      locked: 14.998963,
    },
    {
      locked: 0,
    },
  ],
} as const;
//#endregion

test.before(async t => {
  t.context = await makeLiquidationTestContext(
    { configSpecifier: '@agoric/vm-config/decentral-itest-vaults-config.json' },
    t,
  );
});

test.after.always(t => t.context.swingsetTestKit.shutdown());

// Reference: Flow 2b from https://github.com/Agoric/agoric-sdk/issues/7123
test.serial('scenario: Flow 2b', async t => {
  const {
    liquidationTestKit: { check, placeBids, priceFeedDrivers, setupVaults },
    storage,
    swingsetTestKit: { advanceTimeBy, getLastBlockInfo, runUntilQueuesEmpty },
  } = t.context;

  const readPublished = (subPath: string) =>
    storage.readLatest(`published.${subPath}`);

  const managerIndex = 0;
  const publishedMetrics = `vaultFactory.managers.manager${managerIndex}.metrics`;

  await setupVaults(collateralBrandKey, managerIndex, setup);
  await placeBids(collateralBrandKey, 'agoric1buyer', setup);

  // ---------------
  //  Change price to trigger liquidation
  // ---------------

  await priceFeedDrivers.ATOM.setPrice(setup.price.trigger);

  // check nothing liquidating yet
  const liveSchedule = readPublished('auction.schedule');
  t.is(liveSchedule.activeStartTime, null);
  t.like(readPublished(publishedMetrics), {
    numActiveVaults: setup.vaults.length,
    numLiquidatingVaults: 0,
  });

  // advance time to start an auction
  console.log('step 0 of 10');
  await advanceTimeBy(
    Number(TimeMath.absValue(NonNullish(liveSchedule.nextDescendingStepTime))) -
      getLastBlockInfo().blockTime,
    'seconds',
  );
  await runUntilQueuesEmpty();

  t.like(readPublished(publishedMetrics), {
    numActiveVaults: 0,
    numLiquidatingVaults: setup.vaults.length,
    liquidatingCollateral: {
      value: scale6(setup.auction.start.collateral),
    },
    liquidatingDebt: { value: scale6(setup.auction.start.debt) },
  });

  console.log('step 1 of 10');
  await advanceTimeBy(3, 'minutes');
  t.like(readPublished(`auction.book${managerIndex}`), {
    collateralAvailable: { value: scale6(setup.auction.start.collateral) },
    startCollateral: { value: scale6(setup.auction.start.collateral) },
    startProceedsGoal: { value: scale6(setup.auction.start.debt) },
  });

  console.log('step 2 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log('step 3 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log('step 4 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log('step 5 of 10');
  await advanceTimeBy(3, 'minutes');
  t.like(readPublished(`auction.book${managerIndex}`), {
    collateralAvailable: { value: scale6(45) },
  });

  console.log('step 6 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log('step 7 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log('step 8 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log('step 9 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log('step 10 of 10');
  await advanceTimeBy(3, 'minutes');

  console.log('step 11 of 10');
  await advanceTimeBy(3, 'minutes');

  // TODO express spec up top in a way it can be passed in here
  check.vaultNotification(0, 0, {
    debt: undefined,
    vaultState: 'active',
    locked: {
      value: scale6(outcome.vaultsActual[0].locked),
    },
  });
  check.vaultNotification(0, 1, {
    debt: undefined,
    vaultState: 'active',
    locked: {
      value: scale6(outcome.vaultsActual[1].locked),
    },
  });
  check.vaultNotification(0, 2, {
    debt: undefined,
    vaultState: 'liquidated',
    locked: {
      value: scale6(outcome.vaultsActual[2].locked),
    },
  });

  // check reserve balances
  t.like(readPublished('reserve.metrics'), {
    allocations: {
      ATOM: { value: scale6(outcome.reserve.allocations.ATOM) },
    },
    shortfallBalance: { value: scale6(outcome.reserve.shortfall) },
  });

  t.like(readPublished(publishedMetrics), {
    // reconstituted
    numActiveVaults: 2,
    numLiquidationsCompleted: 1,
    numLiquidatingVaults: 0,
    retainedCollateral: { value: 0n },
    totalCollateral: { value: 29795782n },
    totalCollateralSold: { value: 13585013n },
    totalDebt: { value: 204015000n },
    totalOverageReceived: { value: 0n },
    totalProceedsReceived: { value: 100000000n },
    totalShortfallReceived: { value: scale6(outcome.reserve.shortfall) },
  });
});
