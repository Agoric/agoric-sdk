// @ts-check
/** @file Bootstrap test of liquidation across multiple collaterals */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { NonNullish } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import process from 'process';
import {
  likePayouts,
  makeLiquidationTestContext,
  scale6,
} from './liquidation.js';

/**
 * @type {import('ava').TestFn<
 *   Awaited<ReturnType<typeof makeLiquidationTestContext>>
 * >}
 */
const test = anyTest;

//#region Product spec
const setup = /** @type {const} */ ({
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
      give: '80IST',
      discount: 0.1,
    },
    {
      give: '90IST',
      price: 9.0,
    },
    {
      give: '150IST',
      discount: 0.15,
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
  },
});

const outcome = /** @type {const} */ ({
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
    {
      payouts: {
        Bid: 10.46,
        Collateral: 16.432903,
      },
    },
  ],
  reserve: {
    allocations: {
      ATOM: 0.309852,
      STARS: 0.309852,
    },
    shortfall: 0,
  },
  vaultsSpec: [
    {
      locked: 3.373,
    },
    {
      locked: 3.024,
    },
    {
      locked: 2.792,
    },
  ],
  // TODO match spec https://github.com/Agoric/agoric-sdk/issues/7837
  vaultsActual: [
    {
      locked: 3.525747,
    },
    {
      locked: 3.181519,
    },
    {
      locked: 2.642185,
    },
  ],
});
//#endregion

test.before(async t => {
  t.context = await makeLiquidationTestContext(t);
});
test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

// Reference: Flow 1 from https://github.com/Agoric/agoric-sdk/issues/7123
/**
 * @param {import('ava').ExecutionContext<
 *   Awaited<ReturnType<typeof makeLiquidationTestContext>>
 * >} t
 * @param {{ collateralBrandKey: string; managerIndex: number }} case
 * @param {any} _expected
 */
const checkFlow1 = async (
  t,
  { collateralBrandKey, managerIndex },
  _expected,
) => {
  // fail if there are any unhandled rejections
  process.on('unhandledRejection', error => {
    t.fail(/** @type {Error} */ (error).message);
  });

  const {
    advanceTimeBy,
    advanceTimeTo,
    agoricNamesRemotes,
    check,
    setupStartingState,
    priceFeedDrivers,
    readLatest,
    walletFactoryDriver,
  } = t.context;

  const metricsPath = `published.vaultFactory.managers.manager${managerIndex}.metrics`;

  await setupStartingState({
    collateralBrandKey,
    managerIndex,
  });

  const minter = await walletFactoryDriver.provideSmartWallet('agoric1minter');

  for (let i = 0; i < setup.vaults.length; i += 1) {
    const offerId = `open-${collateralBrandKey}-vault${i}`;
    await minter.executeOfferMaker(Offers.vaults.OpenVault, {
      offerId,
      collateralBrandKey,
      wantMinted: setup.vaults[i].ist,
      giveCollateral: setup.vaults[i].atom,
    });
    t.like(minter.getLatestUpdateRecord(), {
      updated: 'offerStatus',
      status: { id: offerId, numWantsSatisfied: 1 },
    });
  }

  // Verify starting balances
  for (let i = 0; i < setup.vaults.length; i += 1) {
    check.vaultNotification(managerIndex, i, {
      debtSnapshot: { debt: { value: scale6(setup.vaults[i].debt) } },
      locked: { value: scale6(setup.vaults[i].atom) },
      vaultState: 'active',
    });
  }

  const buyer = await walletFactoryDriver.provideSmartWallet('agoric1buyer');
  {
    // ---------------
    //  Place bids
    // ---------------

    await buyer.sendOffer(
      Offers.psm.swap(
        agoricNamesRemotes,
        agoricNamesRemotes.instance['psm-IST-USDC_axl'],
        {
          offerId: `print-${collateralBrandKey}-ist`,
          wantMinted: 1_000,
          pair: ['IST', 'USDC_axl'],
        },
      ),
    );

    const maxBuy = `10000${collateralBrandKey}`;

    // bids are long-lasting offers so we can't wait here for completion
    await buyer.sendOfferMaker(Offers.auction.Bid, {
      offerId: `${collateralBrandKey}-bid1`,
      ...setup.bids[0],
      maxBuy,
    });

    t.like(readLatest('published.wallet.agoric1buyer'), {
      status: {
        id: `${collateralBrandKey}-bid1`,
        result: 'Your bid has been accepted',
        payouts: undefined,
      },
    });
    await buyer.sendOfferMaker(Offers.auction.Bid, {
      offerId: `${collateralBrandKey}-bid2`,
      ...setup.bids[1],
      maxBuy,
    });
    t.like(readLatest('published.wallet.agoric1buyer'), {
      status: {
        id: `${collateralBrandKey}-bid2`,
        result: 'Your bid has been accepted',
        payouts: undefined,
      },
    });
    await buyer.sendOfferMaker(Offers.auction.Bid, {
      offerId: `${collateralBrandKey}-bid3`,
      ...setup.bids[2],
      maxBuy,
    });
    t.like(readLatest('published.wallet.agoric1buyer'), {
      status: {
        id: `${collateralBrandKey}-bid3`,
        result: 'Your bid has been accepted',
        payouts: undefined,
      },
    });
  }

  {
    // ---------------
    //  Change price to trigger liquidation
    // ---------------

    await priceFeedDrivers[collateralBrandKey].setPrice(9.99);

    // check nothing liquidating yet
    /** @type {import('@agoric/inter-protocol/src/auction/scheduler.js').ScheduleNotification} */
    const liveSchedule = readLatest('published.auction.schedule');
    t.is(liveSchedule.activeStartTime, null);
    t.like(readLatest(metricsPath), {
      numActiveVaults: setup.vaults.length,
      numLiquidatingVaults: 0,
    });

    // advance time to start an auction
    console.log(collateralBrandKey, 'step 1 of 10');
    await advanceTimeTo(NonNullish(liveSchedule.nextDescendingStepTime));
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
    // XXX updates for bid1 and bid2 are appended in the same turn so readLatest gives bid2
    // NB: console output shows 8897786n payout which matches spec 8.897ATOM
    // t.like(readLatest('published.wallet.agoric1buyer'), {
    //   status: {
    //     id: `${collateralBrandKey}-bid1`,
    //     payouts: {
    //       Bid: { value: 0n },
    //       Collateral: { value: scale6(outcome.bids[0].payouts.Collateral) },
    //     },
    //   },
    // });

    t.like(readLatest('published.wallet.agoric1buyer'), {
      status: {
        id: `${collateralBrandKey}-bid2`,
        payouts: likePayouts(outcome.bids[1].payouts),
      },
    });

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
    // Not part of product spec
    t.like(readLatest(metricsPath), {
      numActiveVaults: 0,
      numLiquidationsCompleted: setup.vaults.length,
      numLiquidatingVaults: 0,
      retainedCollateral: { value: 0n },
      totalCollateral: { value: 0n },
      totalCollateralSold: { value: 35340699n },
      totalDebt: { value: 0n },
      totalOverageReceived: { value: 0n },
      totalProceedsReceived: { value: 309540000n },
      totalShortfallReceived: { value: 0n },
    });

    console.log(collateralBrandKey, 'step 10 of 10');
    // continuing after now would start a new auction
    {
      /**
       * @type {Record<
       *   string,
       *   import('@agoric/time/src/types.js').TimestampRecord
       * >}
       */
      const { nextDescendingStepTime, nextStartTime } = readLatest(
        'published.auction.schedule',
      );
      t.is(nextDescendingStepTime.absValue, nextStartTime.absValue);
    }

    // bid3 still live because it's not fully satisfied
    const { liveOffers } = readLatest('published.wallet.agoric1buyer.current');
    t.is(liveOffers[0][1].id, `${collateralBrandKey}-bid3`);
    // exit to get payouts
    await buyer.tryExitOffer(`${collateralBrandKey}-bid3`);
    t.like(readLatest('published.wallet.agoric1buyer'), {
      status: {
        id: `${collateralBrandKey}-bid3`,
        payouts: likePayouts(outcome.bids[2].payouts),
      },
    });

    // TODO express spec up top in a way it can be passed in here
    check.vaultNotification(managerIndex, 0, {
      debt: undefined,
      vaultState: 'liquidated',
      locked: {
        value: scale6(outcome.vaultsActual[0].locked),
      },
    });
    check.vaultNotification(managerIndex, 1, {
      debt: undefined,
      vaultState: 'liquidated',
      locked: {
        value: scale6(outcome.vaultsActual[1].locked),
      },
    });
  }

  // check reserve balances
  t.like(readLatest('published.reserve.metrics'), {
    allocations: {
      [collateralBrandKey]: {
        value: scale6(outcome.reserve.allocations[collateralBrandKey]),
      },
    },
    shortfallBalance: { value: scale6(outcome.reserve.shortfall) },
  });
};

test.serial(
  'liquidate ATOM',
  checkFlow1,
  { collateralBrandKey: 'ATOM', managerIndex: 0 },
  {},
);

test.serial('add STARS collateral', async t => {
  const { controller, buildProposal } = t.context;

  t.log('building proposal');
  const proposal = await buildProposal({
    package: 'builders',
    packageScriptName: 'build:add-STARS-proposal',
  });

  for await (const bundle of proposal.bundles) {
    await controller.validateAndInstallBundle(bundle);
  }
  t.log('installed', proposal.bundles.length, 'bundles');

  t.log('launching proposal');
  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: proposal.evals,
  };
  t.log({ bridgeMessage });

  const { EV } = t.context.runUtils;
  /** @type {ERef<import('@agoric/vats/src/types.js').BridgeHandler>} */
  const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );
  await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);

  t.context.refreshAgoricNamesRemotes();

  t.log('add-STARS proposal executed');
  t.pass(); // reached here without throws
});

test.serial(
  'liquidate STARS',
  checkFlow1,
  { collateralBrandKey: 'STARS', managerIndex: 1 },
  {},
);
