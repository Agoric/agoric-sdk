import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { subscribeEach } from '@agoric/notifier';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import { makeScalarMapStore } from '@agoric/vat-data/src/index.js';
import {
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers.js';
import { makeManualPriceAuthority } from '@agoric/zoe/tools/manualPriceAuthority.js';
import { providePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry.js';
import { E } from '@endo/eventual-send';
import { NonNullish } from '@agoric/assert';

import {
  setupReserve,
  startAuctioneer,
} from '../../src/proposals/econ-behaviors.js';
import { startEconomicCommittee } from '../../src/proposals/startEconCommittee.js';
import { subscriptionTracker } from '../metrics.js';
import {
  installPuppetGovernance,
  produceInstallations,
  setupBootstrap,
  setUpZoeForTest,
  withAmountUtils,
} from '../supports.js';
import { setUpInstallations } from './tools.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

/**
 * @typedef {Record<string, any> & {
 *   bid: IssuerKit & import('../supports.js').AmountUtils;
 *   collateral: IssuerKit & import('../supports.js').AmountUtils;
 *   zoe: ZoeService;
 * }} Context
 */

/**
 * @typedef {Awaited<
 *   ReturnType<
 *     subscriptionTracker<
 *       import('../../src/auction/auctionBook.js').BookDataNotification
 *     >
 *   >
 * >} BookDataTracker
 */

const trace = makeTracer('Test AuctContract', false);

const defaultParams = {
  StartFrequency: 40n,
  ClockStep: 5n,
  StartingRate: 10500n,
  LowestRate: 4500n,
  DiscountStep: 2000n,
  AuctionStartDelay: 10n,
  PriceLockPeriod: 3n,
};

const makeTestContext = async () => {
  const { zoe, feeMintAccessP } = await setUpZoeForTest();

  const bid = withAmountUtils(makeIssuerKit('Bid'));
  const collateral = withAmountUtils(makeIssuerKit('Collateral'));

  const installs = await deeplyFulfilledObject(setUpInstallations(zoe));
  const feeMintAccess = await feeMintAccessP;

  trace('makeContext');
  return {
    zoe: await zoe,
    installs,
    run: bid,
    bid,
    feeMintAccess,
    collateral,
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

/**
 * @param {import('ava').ExecutionContext<
 *   Awaited<ReturnType<makeTestContext>>
 * >} t
 * @param {any} params
 */
export const setupServices = async (t, params = defaultParams) => {
  const {
    zoe,
    electorateTerms = { committeeName: 'The Cabal', committeeSize: 1 },
    collateral,
  } = t.context;

  const timer = buildManualTimer();

  await timer.advanceTo(140n);

  const space = await setupBootstrap(t, timer);
  installPuppetGovernance(zoe, space.installation.produce);

  t.context.puppetGovernors = {
    auctioneer: E.get(space.consume.auctioneerKit).governorCreatorFacet,
    vaultFactory: E.get(space.consume.vaultFactoryKit).governorCreatorFacet,
  };

  // @ts-expect-error not all installs are needed for auctioneer.
  produceInstallations(space, t.context.installs);

  await startEconomicCommittee(space, electorateTerms);

  await setupReserve(space);
  const { creatorFacet: reserveCF } = await space.consume.reserveKit;

  void E(reserveCF).addIssuer(collateral.issuer, 'Collateral');

  const paBaggage = makeScalarMapStore();
  const { priceAuthority, adminFacet: registry } =
    providePriceAuthorityRegistry(paBaggage);
  space.produce.priceAuthority.resolve(priceAuthority);

  await startAuctioneer(space, { auctionParams: params });
  return { space, timer, registry };
};

/**
 * @param {import('ava').ExecutionContext<
 *   Awaited<ReturnType<makeTestContext>>
 * >} t
 * @param {any} [params]
 */
const makeAuctionDriver = async (t, params = defaultParams) => {
  const { zoe, bid } = t.context;
  /** @type {MapStore<Brand, { setPrice: (r: Ratio) => void }>} */
  const priceAuthorities = makeScalarMapStore();

  const { space, timer, registry } = await setupServices(t, params);
  // Each driver needs its own mockChainStorage to avoid state pollution between tests
  const mockChainStorage =
    /** @type {import('@agoric/internal/src/storage-test-utils.js').MockChainStorageRoot} */ (
      await space.consume.chainStorage
    );
  const { auctioneerKit: auctioneerKitP, reserveKit } = space.consume;
  const auctioneerKit = await auctioneerKitP;

  const { publicFacet, creatorFacet } = auctioneerKit;

  /**
   * @param {Amount<'nat'>} giveBid
   * @param {Amount<'nat'>} wantCollateral
   * @param {Ratio} [discount]
   * @param {ExitRule | { onBuy: true }} [exitRule]
   * @param {Amount<'nat'>} [proposalWant]
   */
  const bidForCollateralSeat = async (
    giveBid,
    wantCollateral,
    discount = undefined,
    exitRule = undefined,
    proposalWant = undefined,
  ) => {
    // await so any rejection is in this async function instead of Zoe's offer() wrapper
    const bidInvitation = await E(publicFacet).makeBidInvitation(
      wantCollateral.brand,
    );
    const rawProposal = {
      give: { Bid: giveBid },
      // IF we had multiples, the buyer could express an offer-safe want.
      // want: { Collateral: wantCollateral },
    };
    if (proposalWant) {
      rawProposal.want = { Collateral: proposalWant };
    }

    if (exitRule && !('onBuy' in exitRule)) {
      rawProposal.exit = exitRule;
    }
    const proposal = harden(rawProposal);

    const payment = harden({
      Bid: bid.mint.mintPayment(giveBid),
    });
    const offerArgs =
      discount && discount.numerator.brand === discount.denominator.brand
        ? { maxBuy: wantCollateral, offerBidScaling: discount }
        : {
            maxBuy: wantCollateral,
            offerPrice:
              discount || harden(makeRatioFromAmounts(giveBid, wantCollateral)),
          };
    if (exitRule && 'onBuy' in exitRule) {
      offerArgs.exitAfterBuy = true;
    }

    return E(zoe).offer(bidInvitation, proposal, payment, harden(offerArgs));
  };

  const depositCollateral = async (collateralAmount, issuerKit, offerArgs) => {
    const collateralPayment = E(issuerKit.mint).mintPayment(
      harden(collateralAmount),
    );
    const seat = E(zoe).offer(
      E(publicFacet).makeDepositInvitation(),
      harden({
        give: { Collateral: collateralAmount },
      }),
      harden({ Collateral: collateralPayment }),
      offerArgs,
    );
    await eventLoopIteration();

    return seat;
  };

  /** @type {MapStore<Brand, BookDataTracker>} */
  const bookDataTrackers = makeScalarMapStore('trackers');

  /**
   * @param {Brand} brand
   * @returns {Promise<BookDataTracker>}
   */
  const getBookDataTracker = async brand => {
    if (bookDataTrackers.has(brand)) {
      return bookDataTrackers.get(brand);
    }

    /** @type {Promise<BookDataTracker>} */
    const tracker = E.when(
      E(publicFacet).getBookDataUpdates(brand),
      subscription => subscriptionTracker(t, subscribeEach(subscription)),
    );
    // @ts-expect-error I don't know what it wants.
    bookDataTrackers.init(brand, tracker);
    return tracker;
  };

  /**
   * @param {Pick<IssuerKit<'nat'>, 'brand' | 'issuer' | 'mint'>} issuerKit
   * @param {Amount<'nat'>} collateralAmount
   * @param {{ goal: Amount<'nat'> }} [limit]
   */
  const setupCollateralAuction = async (issuerKit, collateralAmount, limit) => {
    const collateralBrand = collateralAmount.brand;

    const pa = makeManualPriceAuthority({
      actualBrandIn: collateralBrand,
      actualBrandOut: bid.brand,
      timer,
      initialPrice: makeRatio(100n, bid.brand, 100n, collateralBrand),
    });
    priceAuthorities.init(collateralBrand, pa);
    await registry.registerPriceAuthority(pa, collateralBrand, bid.brand, true);

    await E(creatorFacet).addBrand(
      issuerKit.issuer,
      collateralBrand.getAllegedName(),
    );

    /** @type {BookDataTracker} */
    const tracker = await getBookDataTracker(collateralBrand);
    await tracker.assertInitial({
      collateralAvailable: AmountMath.makeEmpty(collateralBrand),
      currentPriceLevel: null,
      proceedsRaised: undefined,
      remainingProceedsGoal: null,
      startCollateral: AmountMath.makeEmpty(collateralBrand),
      startPrice: null,
      startProceedsGoal: null,
    });

    return depositCollateral(collateralAmount, issuerKit, limit);
  };

  return {
    mockChainStorage,
    publicFacet,
    creatorFacet,

    /** @type {(subpath: string) => object} */
    getStorageChildBody(subpath) {
      return mockChainStorage.getBody(
        `mockChainStorageRoot.thisPsm.${subpath}`,
      );
    },

    bidForCollateralPayouts(giveBid, wantCollateral, discount) {
      const seat = bidForCollateralSeat(giveBid, wantCollateral, discount);
      return E(seat).getPayouts();
    },
    bidForCollateralSeat(giveBid, wantCollateral, discount, exit, pWant) {
      return bidForCollateralSeat(
        giveBid,
        wantCollateral,
        discount,
        exit,
        pWant,
      );
    },
    setupCollateralAuction,
    async advanceTo(time, wait) {
      await timer.advanceTo(time);
      if (wait) {
        await eventLoopIteration();
      }
    },

    setGovernedParam: (name, newValue) => {
      trace(t, 'setGovernedParam', name);
      const auctionGov = NonNullish(t.context.puppetGovernors.auctioneer);
      return E(auctionGov).changeParams(
        harden({ changes: { [name]: newValue } }),
      );
    },

    async updatePriceAuthority(newPrice) {
      priceAuthorities.get(newPrice.denominator.brand).setPrice(newPrice);
      await eventLoopIteration();
    },
    depositCollateral,
    getSchedule() {
      return E(publicFacet).getSchedules();
    },
    getTimerService() {
      return timer;
    },
    getScheduleTracker() {
      return E.when(E(publicFacet).getScheduleUpdates(), subscription =>
        subscriptionTracker(t, subscribeEach(subscription)),
      );
    },
    getBookDataTracker,
    getReserveBalance(keyword) {
      const reserveCF = E.get(reserveKit).creatorFacet;
      return E.get(E(reserveCF).getAllocations())[keyword];
    },
  };
};

const assertPayouts = async (
  t,
  seat,
  bid,
  collateral,
  bidValue,
  collateralValue,
) => {
  const { Collateral: collateralPayout, Bid: bidPayout } =
    await E(seat).getPayouts();

  if (!bidPayout) {
    bidValue === 0n ||
      t.fail(
        `bidValue must be zero when no bid is paid out ${collateralValue}`,
      );
  } else {
    await assertPayoutAmount(
      t,
      bid.issuer,
      bidPayout,
      bid.make(bidValue),
      'bid payout',
    );
  }

  if (!collateralPayout) {
    collateralValue === 0n ||
      t.fail(
        `collateralValue must be zero when no collateral is paid out ${collateralValue}`,
      );
  } else {
    await assertPayoutAmount(
      t,
      collateral.issuer,
      collateralPayout,
      collateral.make(collateralValue),
      'collateral payout',
    );
  }
};

test.serial('priced bid settled auction price below bid', async t => {
  const { collateral, bid } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(bid.make(11n), collateral.make(10n)),
  );

  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule?.startTime.absValue, 170n);

  await driver.advanceTo(170n);

  // overbid for current price
  const seat = await driver.bidForCollateralSeat(
    bid.make(2240n),
    collateral.make(200n),
  );
  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');

  t.true(await E(seat).hasExited());
  await driver.advanceTo(185n);

  await assertPayouts(t, seat, bid, collateral, 2009n, 200n);
});
