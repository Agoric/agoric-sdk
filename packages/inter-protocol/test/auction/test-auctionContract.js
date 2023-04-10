import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { documentStorageSchema } from '@agoric/governance/tools/storageDoc.js';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { eventLoopIteration } from '@agoric/notifier/tools/testSupports.js';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import { makeScalarMapStore } from '@agoric/vat-data/src/index.js';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import {
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers.js';
import { makeManualPriceAuthority } from '@agoric/zoe/tools/manualPriceAuthority.js';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry.js';
import { E } from '@endo/eventual-send';
import { subscribeEach } from '@agoric/notifier';
import { TimeMath } from '@agoric/time';

import { makeAuctioneerParams } from '../../src/auction/params.js';
import {
  makeMockChainStorageRoot,
  setUpZoeForTest,
  withAmountUtils,
} from '../supports.js';
import { getInvitation, setUpInstallations } from './tools.js';
import { subscriptionTracker } from '../metrics.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const trace = makeTracer('Test AuctContract', false);

const defaultParams = {
  startFreq: 40n,
  clockStep: 5n,
  startingRate: 10500n,
  lowestRate: 4500n,
  discountStep: 2000n,
  auctionStartDelay: 10n,
  priceLockPeriod: 3n,
};

const makeTestContext = async () => {
  const { zoe } = await setUpZoeForTest();

  const currency = withAmountUtils(makeIssuerKit('Currency'));
  const collateral = withAmountUtils(makeIssuerKit('Collateral'));

  const installs = await deeplyFulfilledObject(setUpInstallations(zoe));

  trace('makeContext');
  return {
    zoe: await zoe,
    installs,
    currency,
    collateral,
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

const dynamicConfig = async (t, params) => {
  const { zoe, installs } = t.context;

  const { fakeInvitationAmount, fakeInvitationPayment } = await getInvitation(
    zoe,
    installs,
  );
  const manualTimer = buildManualTimer();
  await manualTimer.advanceTo(140n);
  const timerBrand = await manualTimer.getTimerBrand();

  const { priceAuthority, adminFacet: registry } = makePriceAuthorityRegistry();

  const governedParams = makeAuctioneerParams({
    electorateInvitationAmount: fakeInvitationAmount,
    ...params,
    timerBrand,
  });

  const terms = {
    timerService: manualTimer,
    governedParams,
    priceAuthority,
  };

  return { terms, governedParams, fakeInvitationPayment, registry };
};

/**
 * @param {import('ava').ExecutionContext<Awaited<ReturnType<makeTestContext>>>} t
 * @param {{}} [customTerms]
 * @param {any} [params]
 */
const makeAuctionDriver = async (t, customTerms, params = defaultParams) => {
  const { zoe, installs, currency } = t.context;
  const { terms, fakeInvitationPayment, registry } = await dynamicConfig(
    t,
    params,
  );
  const { timerService } = terms;
  /** @type {MapStore<Brand, { setPrice: (r: Ratio) => void }>} */
  const priceAuthorities = makeScalarMapStore();

  // Each driver needs its own to avoid state pollution between tests
  const mockChainStorage = makeMockChainStorageRoot();

  const board = makeBoard();
  const pubsubTerms = harden({
    storageNode: mockChainStorage.makeChildNode('thisAuction'),
    marshaller: board.getReadonlyMarshaller(),
  });

  const { creatorFacet: GCF } = await E(zoe).startInstance(
    installs.governor,
    harden({}),
    harden({
      timer: timerService,
      governedContractInstallation: installs.auctioneer,
      governed: {
        issuerKeywordRecord: {
          Currency: currency.issuer,
        },
        terms: { ...terms, ...customTerms },
        pubsubTerms,
      },
    }),
    {
      governed: {
        initialPoserInvitation: fakeInvitationPayment,
        ...pubsubTerms,
      },
    },
  );

  /** @type {Promise<import('../../src/auction/auctioneer.js').AuctioneerPublicFacet>} */
  // @ts-expect-error xxx cast
  const publicFacet = E(GCF).getPublicFacet();
  /** @type {import('../../src/auction/auctioneer.js').AuctioneerLimitedCreatorFacet} */
  const creatorFacet = E(GCF).getCreatorFacet();

  /**
   * @param {Amount<'nat'>} giveCurrency
   * @param {Amount<'nat'>} wantCollateral
   * @param {Ratio} [discount]
   * @param {ExitRule | { onBuy: true }} [exitRule]
   * @param {Amount<'nat'>} [proposalWant]
   */
  const bidForCollateralSeat = async (
    giveCurrency,
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
      give: { Currency: giveCurrency },
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
      Currency: currency.mint.mintPayment(giveCurrency),
    });
    const offerArgs =
      discount && discount.numerator.brand === discount.denominator.brand
        ? { want: wantCollateral, offerBidScaling: discount }
        : {
            want: wantCollateral,
            offerPrice:
              discount ||
              harden(makeRatioFromAmounts(giveCurrency, wantCollateral)),
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
      E(publicFacet).getDepositInvitation(),
      harden({
        give: { Collateral: collateralAmount },
      }),
      harden({ Collateral: collateralPayment }),
      offerArgs,
    );
    await eventLoopIteration();

    return seat;
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
      actualBrandOut: currency.brand,
      timer: timerService,
      initialPrice: makeRatio(100n, currency.brand, 100n, collateralBrand),
    });
    priceAuthorities.init(collateralBrand, pa);
    registry.registerPriceAuthority(pa, collateralBrand, currency.brand);

    await E(creatorFacet).addBrand(
      issuerKit.issuer,
      collateralBrand.getAllegedName(),
    );
    return depositCollateral(collateralAmount, issuerKit, limit);
  };

  return {
    mockChainStorage,
    board,
    publicFacet,
    creatorFacet,

    /** @type {(subpath: string) => object} */
    getStorageChildBody(subpath) {
      return mockChainStorage.getBody(
        `mockChainStorageRoot.thisPsm.${subpath}`,
      );
    },

    bidForCollateralPayouts(giveCurrency, wantCollateral, discount) {
      const seat = bidForCollateralSeat(giveCurrency, wantCollateral, discount);
      return E(seat).getPayouts();
    },
    bidForCollateralSeat(giveCurrency, wantCollateral, discount, exit, pWant) {
      return bidForCollateralSeat(
        giveCurrency,
        wantCollateral,
        discount,
        exit,
        pWant,
      );
    },
    setupCollateralAuction,
    async advanceTo(time, wait) {
      await timerService.advanceTo(time);
      if (wait) {
        await eventLoopIteration();
      }
    },
    async updatePriceAuthority(newPrice) {
      priceAuthorities.get(newPrice.denominator.brand).setPrice(newPrice);
      await eventLoopIteration();
    },
    depositCollateral,
    getLockPeriod() {
      return E(publicFacet).getPriceLockPeriod();
    },
    getSchedule() {
      return E(creatorFacet).getSchedule();
    },
    getTimerService() {
      return timerService;
    },
    getScheduleTracker() {
      return E.when(E(publicFacet).getScheduleUpdates(), subscription =>
        subscriptionTracker(t, subscribeEach(subscription)),
      );
    },
    getBookDataTracker(brand) {
      return E.when(E(publicFacet).getBookDataUpdates(brand), subscription =>
        subscriptionTracker(t, subscribeEach(subscription)),
      );
    },
  };
};

const assertPayouts = async (
  t,
  seat,
  currency,
  collateral,
  currencyValue,
  collateralValue,
) => {
  const { Collateral: collateralPayout, Currency: currencyPayout } = await E(
    seat,
  ).getPayouts();

  if (!currencyPayout) {
    currencyValue === 0n ||
      t.fail(
        `currencyValue must be zero when no currency is paid out ${collateralValue}`,
      );
  } else {
    await assertPayoutAmount(
      t,
      currency.issuer,
      currencyPayout,
      currency.make(currencyValue),
      'currency payout',
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

test.serial('priced bid recorded', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));

  const seat = await driver.bidForCollateralSeat(
    currency.make(100n),
    collateral.make(200n),
  );
  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');
});

test.serial('discount bid recorded', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));

  const seat = await driver.bidForCollateralSeat(
    currency.make(20n),
    collateral.make(200n),
    makeRatioFromAmounts(currency.make(10n), currency.make(100n)),
  );
  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');
});

test.serial('priced bid settled', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );
  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule?.startTime.absValue, 170n);

  await driver.advanceTo(170n);

  const seat = await driver.bidForCollateralSeat(
    currency.make(250n),
    collateral.make(200n),
  );
  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');

  await assertPayouts(t, seat, currency, collateral, 19n, 200n);
});

test.serial('discount bid settled', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule?.startTime.absValue, 170n);
  await driver.advanceTo(170n);

  const seat = await driver.bidForCollateralSeat(
    currency.make(250n),
    collateral.make(200n),
    makeRatioFromAmounts(currency.make(120n), currency.make(100n)),
  );
  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');
  await driver.advanceTo(180n);

  // 250 - 200 * (1.1 * 1.05)
  await assertPayouts(t, seat, currency, collateral, 250n - 231n, 200n);
});

test.serial('Excessive want in proposal', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule?.startTime.absValue, 170n);
  await driver.advanceTo(170n);

  const seat = await driver.bidForCollateralSeat(
    currency.make(250n),
    collateral.make(5000n),
    makeRatioFromAmounts(currency.make(120n), currency.make(100n)),
    undefined,
    collateral.make(5000n),
  );
  await t.throwsAsync(() => E(seat).getOfferResult(), {
    message: 'seat has been exited',
  });

  const update = await E(E(seat).getExitSubscriber()).getUpdateSince();
  t.is(update.value, 'unable to satisfy want');
  await assertPayouts(t, seat, currency, collateral, 250n, 0n);
});

test.serial('discount bid exit onBuy', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule?.startTime.absValue, 170n);
  await driver.advanceTo(170n);

  const seat = await driver.bidForCollateralSeat(
    currency.make(2000n),
    collateral.make(200n),
    makeRatioFromAmounts(currency.make(120n), currency.make(100n)),
    { onBuy: true },
  );
  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');
  await driver.advanceTo(180n);

  // 250 - 200 * (1.1 * 1.05)
  await assertPayouts(t, seat, currency, collateral, 2000n - 231n, 200n);
});

// serial because dynamicConfig is shared across tests
test.serial('priced bid insufficient collateral added', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(20n));
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule?.startTime.absValue, 170n);
  t.is(schedules.nextAuctionSchedule?.endTime.absValue, 185n);
  await driver.advanceTo(167n);

  const seat = await driver.bidForCollateralSeat(
    currency.make(240n),
    collateral.make(200n),
    undefined,
    { afterDeadline: { timer: driver.getTimerService(), deadline: 185n } },
  );
  await driver.advanceTo(170n);
  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');
  t.false(await E(seat).hasExited());

  await driver.advanceTo(175n);
  await driver.advanceTo(180n);
  await driver.advanceTo(185n);

  t.true(await E(seat).hasExited());

  //  240n - 20n * (115n / 100n)
  await assertPayouts(t, seat, currency, collateral, 216n, 20n);
});

// serial because dynamicConfig is shared across tests
test.serial('priced bid recorded then settled with price drop', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const seat = await driver.bidForCollateralSeat(
    currency.make(116n),
    collateral.make(100n),
  );
  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');

  await driver.advanceTo(170n);
  const schedules = await driver.getSchedule();
  assert(schedules.liveAuctionSchedule);
  t.is(schedules.liveAuctionSchedule.startTime.absValue, 170n);
  t.is(schedules.liveAuctionSchedule.endTime.absValue, 185n);

  await driver.advanceTo(184n);
  await driver.advanceTo(185n);
  t.true(await E(seat).hasExited());
  await driver.advanceTo(190n);

  await assertPayouts(t, seat, currency, collateral, 0n, 100n);
});

test.serial('priced bid settled auction price below bid', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule?.startTime.absValue, 170n);
  await driver.advanceTo(170n);

  // overbid for current price
  const seat = await driver.bidForCollateralSeat(
    currency.make(2240n),
    collateral.make(200n),
  );
  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');

  t.true(await E(seat).hasExited());
  await driver.advanceTo(185n);

  await assertPayouts(t, seat, currency, collateral, 2009n, 200n);
});

// serial because dynamicConfig is shared across tests
test.serial('complete auction liquidator gets proceeds', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  const liqSeat = await driver.setupCollateralAuction(
    collateral,
    collateral.make(1000n),
  );
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const result = await E(liqSeat).getOfferResult();
  t.is(result, 'deposited');

  await driver.advanceTo(167n);
  const seat = await driver.bidForCollateralSeat(
    // 1.1 * 1.05 * 200
    currency.make(231n),
    collateral.make(200n),
  );
  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');
  t.false(await E(seat).hasExited());

  await driver.advanceTo(170n, 'wait');
  await driver.advanceTo(175n, 'wait');
  await driver.advanceTo(180n, 'wait');
  await driver.advanceTo(185n, 'wait');

  t.true(await E(seat).hasExited());

  await assertPayouts(t, seat, currency, collateral, 0n, 200n);

  await assertPayouts(t, liqSeat, currency, collateral, 231n, 800n);
});

// serial because dynamicConfig is shared across tests
test.serial('complete auction limit on amountRaised', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  const liqSeat = await driver.setupCollateralAuction(
    collateral,
    collateral.make(500n),
    { goal: AmountMath.make(currency.brand, 200n) },
  );
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const result = await E(liqSeat).getOfferResult();
  t.is(result, 'deposited');

  await driver.advanceTo(167n);
  const seat = await driver.bidForCollateralSeat(
    currency.make(200n),
    collateral.make(173n),
    makeRatioFromAmounts(currency.make(150n), currency.make(100n)),
  );
  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');
  t.false(await E(seat).hasExited());

  await driver.advanceTo(170n, 'wait');
  await driver.advanceTo(175n, 'wait');
  await driver.advanceTo(180n, 'wait');
  await driver.advanceTo(185n, 'wait');

  t.true(await E(seat).hasExited());

  await assertPayouts(t, seat, currency, collateral, 0n, 173n);

  await assertPayouts(t, liqSeat, currency, collateral, 200n, 327n);
});

// serial because dynamicConfig is shared across tests
test.serial('multiple Depositors, not all assets are sold', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  const liqSeatA = await driver.setupCollateralAuction(
    collateral,
    collateral.make(1000n),
  );
  const liqSeatB = await driver.depositCollateral(
    collateral.make(500n),
    collateral,
  );
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const result = await E(liqSeatA).getOfferResult();
  t.is(result, 'deposited');

  await driver.advanceTo(167n);
  const seat = await driver.bidForCollateralSeat(
    currency.make(1200n),
    collateral.make(1000n),
  );

  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');
  t.false(await E(seat).hasExited());

  await driver.advanceTo(170n, 'wait');
  await driver.advanceTo(175n, 'wait');
  await driver.advanceTo(180n, 'wait');
  await driver.advanceTo(185n, 'wait');

  t.true(await E(seat).hasExited());

  // 1500 Collateral was put up for auction by  two bidders (1000 and 500). One
  // bidder offered 1200 currency for 1000 collateral. So one seller gets 66% of
  // the proceeds, and the other 33%. The price authority quote was 110, and the
  // goods were sold in the first auction round at 105%. So the proceeds were
  // 1155. The bidder gets 45 currency back. The two sellers split 1155 and the
  // 500 returned collateral. The auctioneer sets the remainder aside.
  await assertPayouts(t, seat, currency, collateral, 45n, 1000n);
  await assertPayouts(t, liqSeatA, currency, collateral, 770n, 333n);
  await assertPayouts(t, liqSeatB, currency, collateral, 385n, 166n);
});

// serial because dynamicConfig is shared across tests
test.serial('multiple Depositors, with goal', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  const liqSeatA = await driver.setupCollateralAuction(
    collateral,
    collateral.make(1000n),
  );
  const liqSeatB = await driver.depositCollateral(
    collateral.make(500n),
    collateral,
    { goal: currency.make(300n) },
  );
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const result = await E(liqSeatA).getOfferResult();
  t.is(result, 'deposited');

  await driver.advanceTo(167n);
  const seat = await driver.bidForCollateralSeat(
    currency.make(1500n),
    collateral.make(1000n),
  );

  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');
  t.false(await E(seat).hasExited());

  await driver.advanceTo(170n, 'wait');
  await driver.advanceTo(175n, 'wait');
  await driver.advanceTo(180n, 'wait');
  await driver.advanceTo(185n, 'wait');

  await E(seat).tryExit();
  t.true(await E(seat).hasExited());

  // 1500 Collateral was put up for auction by two depositors (1000 and 500), so
  // one seller gets 66% of the proceeds, and the other 33%. The price authority
  // quote was 1.1, and the goods were sold in the first auction round at 105%.
  // At those rates, 900 pays for 799 collateral. The sellers pro-rate 900 and
  // the returned collateral. The auctioneer sets the remainder aside.
  await assertPayouts(t, seat, currency, collateral, 600n, 779n);
  await assertPayouts(t, liqSeatA, currency, collateral, 600n, 480n);
  await assertPayouts(t, liqSeatB, currency, collateral, 300n, 239n);
});

// serial because dynamicConfig is shared across tests
test.serial('multiple Depositors, exit onBuy', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  const liqSeatA = await driver.setupCollateralAuction(
    collateral,
    collateral.make(1000n),
  );
  const liqSeatB = await driver.depositCollateral(
    collateral.make(500n),
    collateral,
    { goal: currency.make(300n) },
  );
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const result = await E(liqSeatA).getOfferResult();
  t.is(result, 'deposited');

  await driver.advanceTo(167n);
  const seat = await driver.bidForCollateralSeat(
    currency.make(1500n),
    collateral.make(1000n),
    undefined,
    { onBuy: true },
  );

  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');
  t.false(await E(seat).hasExited());

  await driver.advanceTo(170n);
  await eventLoopIteration();
  await driver.advanceTo(175n);
  await eventLoopIteration();
  await driver.advanceTo(180n);
  await eventLoopIteration();
  await driver.advanceTo(185n);
  await eventLoopIteration();

  t.true(await E(seat).hasExited());

  // 1500 Collateral was put up for auction by two depositors (1000 and 500), so
  // one seller gets 66% of the proceeds, and the other 33%. The price authority
  // quote was 1.1, and the goods were sold in the first auction round at 105%.
  // At those rates, 900 pays for 799 collateral. The sellers pro-rate 900 and
  // the returned collateral. The auctioneer sets the remainder aside.
  await assertPayouts(t, seat, currency, collateral, 600n, 779n);
  await assertPayouts(t, liqSeatA, currency, collateral, 600n, 480n);
  await assertPayouts(t, liqSeatB, currency, collateral, 300n, 239n);
});

// serial because dynamicConfig is shared across tests
test.serial('multiple Depositors, all assets are sold', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  const liqSeatA = await driver.setupCollateralAuction(
    collateral,
    collateral.make(1000n),
  );
  const liqSeatB = await driver.depositCollateral(
    collateral.make(500n),
    collateral,
  );
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const result = await E(liqSeatA).getOfferResult();
  t.is(result, 'deposited');

  await driver.advanceTo(167n);
  const seat = await driver.bidForCollateralSeat(
    currency.make(1800n),
    collateral.make(1500n),
  );

  t.is(await E(seat).getOfferResult(), 'Your bid has been accepted');
  t.false(await E(seat).hasExited());

  await driver.advanceTo(170n, 'wait');
  await driver.advanceTo(175n, 'wait');
  await driver.advanceTo(180n, 'wait');
  await driver.advanceTo(185n, 'wait');

  t.true(await E(seat).hasExited());

  // 1500 Collateral was put up for auction by  two bidders (1000 and 500). One
  // bidder offered 1800 currency for all the collateral. The sellers get 66%
  // and 33% of the proceeds. The price authority quote was 110, and the goods
  // were sold in the first auction round at 105%. So the proceeds were
  // 1733 The bidder gets 67 currency back. The two sellers split 1733. The
  // auctioneer sets the remainder aside.
  await assertPayouts(t, seat, currency, collateral, 67n, 1500n);
  await assertPayouts(t, liqSeatA, currency, collateral, 1155n, 0n);
  await assertPayouts(t, liqSeatB, currency, collateral, 577n, 0n);
});

// serial because dynamicConfig is shared across tests
test.serial('onDemand exit', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  const liqSeat = await driver.setupCollateralAuction(
    collateral,
    collateral.make(100n),
  );
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const result = await E(liqSeat).getOfferResult();
  t.is(result, 'deposited');

  await driver.advanceTo(167n);
  const exitingSeat = await driver.bidForCollateralSeat(
    currency.make(250n),
    collateral.make(200n),
    undefined,
    { onDemand: null },
  );

  t.is(await E(exitingSeat).getOfferResult(), 'Your bid has been accepted');
  t.false(await E(exitingSeat).hasExited());

  await driver.advanceTo(170n, 'wait');
  await driver.advanceTo(175n, 'wait');
  await driver.advanceTo(180n, 'wait');
  await driver.advanceTo(185n, 'wait');

  t.false(await E(exitingSeat).hasExited());

  await E(exitingSeat).tryExit();
  t.true(await E(exitingSeat).hasExited());

  await assertPayouts(t, exitingSeat, currency, collateral, 134n, 100n);
  await assertPayouts(t, liqSeat, currency, collateral, 116n, 0n);
});

// serial because dynamicConfig is shared across tests
test.serial('onDeadline exit, with chainStorage RPC snapshot', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);
  const timerBrand = await E(driver.getTimerService()).getTimerBrand();

  const liqSeat = await driver.setupCollateralAuction(
    collateral,
    collateral.make(100n),
  );
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const bookTracker = await driver.getBookDataTracker(collateral.brand);
  await bookTracker.assertInitial({
    collateralAvailable: collateral.make(100n),
    currentPriceLevel: null,
    proceedsRaised: undefined,
    remainingProceedsGoal: null,
    startCollateral: collateral.make(100n),
    startPrice: null,
    startProceedsGoal: null,
  });
  const scheduleTracker = await driver.getScheduleTracker();
  await scheduleTracker.assertInitial({
    activeStartTime: undefined,
    nextDescendingStepTime: TimeMath.toAbs(170n, timerBrand),
    nextStartTime: TimeMath.toAbs(170n, timerBrand),
  });

  const result = await E(liqSeat).getOfferResult();
  t.is(result, 'deposited');

  await driver.advanceTo(167n);
  await scheduleTracker.assertChange({
    activeStartTime: TimeMath.toAbs(170n, timerBrand),
    nextStartTime: { absValue: 210n },
  });

  const exitingSeat = await driver.bidForCollateralSeat(
    currency.make(250n),
    collateral.make(200n),
    undefined,
    { afterDeadline: { timer: driver.getTimerService(), deadline: 185n } },
  );

  t.is(await E(exitingSeat).getOfferResult(), 'Your bid has been accepted');
  t.false(await E(exitingSeat).hasExited());

  await bookTracker.assertChange({
    collateralAvailable: { value: 0n },
  });

  await driver.advanceTo(170n, 'wait');
  await scheduleTracker.assertChange({
    nextDescendingStepTime: { absValue: 175n },
  });
  await bookTracker.assertChange({
    collateralAvailable: { value: 100n },
    currentPriceLevel: makeRatioFromAmounts(
      currency.make(11_550_000_000_000n),
      collateral.make(10_000_000_000_000n),
    ),
    startPrice: makeRatioFromAmounts(
      currency.make(1_100_000_000n),
      collateral.make(1_000_000_000n),
    ),
  });

  await driver.advanceTo(175n, 'wait');
  await scheduleTracker.assertChange({
    nextDescendingStepTime: { absValue: 180n },
  });
  await bookTracker.assertChange({
    currentPriceLevel: { numerator: { value: 9_350_000_000_000n } },
  });

  const doc = {
    node: 'auction',
    owner: 'the auctioneer contract',
    pattern: 'mockChainStorageRoot.thisAuction',
    replacement: 'published.auction',
  };
  await documentStorageSchema(t, driver.mockChainStorage, doc);

  await driver.advanceTo(180n, 'wait');
  await bookTracker.assertChange({
    currentPriceLevel: { numerator: { value: 7_150_000_000_000n } },
  });
  await scheduleTracker.assertChange({
    nextDescendingStepTime: { absValue: 185n },
  });

  await driver.advanceTo(185n, 'wait');
  await scheduleTracker.assertChange({
    activeStartTime: undefined,
    nextDescendingStepTime: { absValue: 210n },
  });
  await bookTracker.assertChange({
    currentPriceLevel: { numerator: { value: 4_950_000_000_000n } },
  });

  t.true(await E(exitingSeat).hasExited());

  await assertPayouts(t, exitingSeat, currency, collateral, 134n, 100n);
  await assertPayouts(t, liqSeat, currency, collateral, 116n, 0n);

  await driver.advanceTo(186n, 'wait');
  scheduleTracker.assertNoUpdate();
  bookTracker.assertNoUpdate();

  await driver.advanceTo(210n, 'wait');
  await scheduleTracker.assertChange({
    activeStartTime: TimeMath.toAbs(210n, timerBrand),
    nextDescendingStepTime: { absValue: 215n },
    nextStartTime: { absValue: 250n },
  });
  await bookTracker.assertChange({
    collateralAvailable: { value: 0n },
    startCollateral: { value: 0n },
    currentPriceLevel: { numerator: { value: 11_550_000_000_000n } },
  });
});

test.serial('add assets to open auction', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);
  const timerBrand = await E(driver.getTimerService()).getTimerBrand();

  // One seller deposits 1000 collateral
  const liqSeat = await driver.setupCollateralAuction(
    collateral,
    collateral.make(1000n),
  );
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const bookTracker = await driver.getBookDataTracker(collateral.brand);
  await bookTracker.assertInitial({
    collateralAvailable: collateral.make(1000n),
    currentPriceLevel: null,
    proceedsRaised: undefined,
    remainingProceedsGoal: null,
    startCollateral: collateral.make(1000n),
    startPrice: null,
    startProceedsGoal: null,
  });
  const scheduleTracker = await driver.getScheduleTracker();
  await scheduleTracker.assertInitial({
    activeStartTime: undefined,
    nextDescendingStepTime: TimeMath.toAbs(170n, timerBrand),
    nextStartTime: TimeMath.toAbs(170n, timerBrand),
  });

  const result = await E(liqSeat).getOfferResult();
  t.is(result, 'deposited');

  // bids for half of 1000 + 2000 collateral.
  const bidderSeat1 = await driver.bidForCollateralSeat(
    // 1.1 * 1.05 * 1500
    currency.make(1733n),
    collateral.make(1500n),
  );
  t.is(await E(bidderSeat1).getOfferResult(), 'Your bid has been accepted');

  // price lock period before auction start
  await driver.advanceTo(167n);
  await bookTracker.assertChange({
    collateralAvailable: { value: 0n },
  });

  await scheduleTracker.assertChange({
    activeStartTime: TimeMath.toAbs(170n, timerBrand),
    nextStartTime: { absValue: 210n },
  });

  // another seller deposits 2000
  const liqSeat2 = await driver.depositCollateral(
    collateral.make(2000n),
    collateral,
  );
  const resultL2 = await E(liqSeat2).getOfferResult();
  t.is(resultL2, 'deposited');
  await bookTracker.assertChange({
    collateralAvailable: { value: 2000n },
    startCollateral: { value: 3000n },
  });

  await driver.advanceTo(180n);
  await bookTracker.assertChange({
    collateralAvailable: { value: 1500n },
    currentPriceLevel: makeRatioFromAmounts(
      currency.make(11_550_000_000_000n),
      collateral.make(10_000_000_000_000n),
    ),
    startPrice: makeRatioFromAmounts(
      currency.make(1_100_000_000n),
      collateral.make(1_000_000_000n),
    ),
  });
  await scheduleTracker.assertChange({
    nextDescendingStepTime: { absValue: 185n },
  });

  // bidder gets collateral
  await assertPayouts(t, bidderSeat1, currency, collateral, 0n, 1500n);

  await driver.advanceTo(190n);
  await bookTracker.assertChange({
    currentPriceLevel: { numerator: { value: 9_350_000_000_000n } },
  });
  await scheduleTracker.assertChange({
    activeStartTime: undefined,
    nextDescendingStepTime: { absValue: 210n },
  });

  // sellers split proceeds and refund 2:1
  await assertPayouts(t, liqSeat, currency, collateral, 1733n / 3n, 500n);
  await assertPayouts(
    t,
    liqSeat2,
    currency,
    collateral,
    (2n * 1733n) / 3n,
    1000n,
  );
});

// Collateral quote is 1.1.  Asset quote is .25.  1000 C, and 500 A available.
// Prices will start with a 1.05 multiplier, and fall by .2 at each of 4 steps,
// so prices will be 1.05, .85, .65, .45, and .25.
//
// serial because dynamicConfig is shared across tests
test.serial('multiple collaterals', async t => {
  const { collateral, currency } = t.context;

  const params = defaultParams;
  params.lowestRate = 2500n;

  const driver = await makeAuctionDriver(t, {}, params);
  const asset = withAmountUtils(makeIssuerKit('Asset'));

  const collatLiqSeat = await driver.setupCollateralAuction(
    collateral,
    collateral.make(1000n),
  );
  const assetLiqSeat = await driver.setupCollateralAuction(
    asset,
    asset.make(500n),
  );

  t.is(await E(collatLiqSeat).getOfferResult(), 'deposited');
  t.is(await E(assetLiqSeat).getOfferResult(), 'deposited');

  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(25n), asset.make(100n)),
  );

  // offers 290 for up to 300 at 1.1 * .875, so will trigger at the first discount
  const bidderSeat1C = await driver.bidForCollateralSeat(
    currency.make(265n),
    collateral.make(300n),
    makeRatioFromAmounts(currency.make(950n), collateral.make(1000n)),
  );
  t.is(await E(bidderSeat1C).getOfferResult(), 'Your bid has been accepted');

  // offers up to 500 for 2000 at 1.1 * 75%, so will trigger at second discount step
  const bidderSeat2C = await driver.bidForCollateralSeat(
    currency.make(500n),
    collateral.make(2000n),
    makeRatioFromAmounts(currency.make(75n), currency.make(100n)),
  );
  t.is(await E(bidderSeat2C).getOfferResult(), 'Your bid has been accepted');

  // offers 50 for 200 at .25 * 50% discount, so triggered at third step
  const bidderSeat1A = await driver.bidForCollateralSeat(
    currency.make(23n),
    asset.make(200n),
    makeRatioFromAmounts(currency.make(50n), currency.make(100n)),
  );
  t.is(await E(bidderSeat1A).getOfferResult(), 'Your bid has been accepted');

  // offers 100 for 300 at .25 * 33%, so triggered at fourth step
  const bidderSeat2A = await driver.bidForCollateralSeat(
    currency.make(19n),
    asset.make(300n),
    makeRatioFromAmounts(currency.make(100n), asset.make(1000n)),
  );
  t.is(await E(bidderSeat2A).getOfferResult(), 'Your bid has been accepted');

  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule?.startTime.absValue, 170n);

  await driver.advanceTo(150n);
  await driver.advanceTo(170n, 'wait');
  await driver.advanceTo(175n);

  t.true(await E(bidderSeat1C).hasExited());

  await assertPayouts(t, bidderSeat1C, currency, collateral, 0n, 283n);
  t.false(await E(bidderSeat2C).hasExited());

  await driver.advanceTo(180n);
  t.true(await E(bidderSeat2C).hasExited());
  await assertPayouts(t, bidderSeat2C, currency, collateral, 0n, 699n);
  t.false(await E(bidderSeat1A).hasExited());

  await driver.advanceTo(185n);
  t.true(await E(bidderSeat1A).hasExited());
  await assertPayouts(t, bidderSeat1A, currency, asset, 0n, 200n);
  t.false(await E(bidderSeat2A).hasExited());

  await driver.advanceTo(190n);
  t.true(await E(bidderSeat2A).hasExited());
  await assertPayouts(t, bidderSeat2A, currency, asset, 0n, 300n);
});

// serial because dynamicConfig is shared across tests
test.serial('multiple bidders at one auction step', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  const { nextAuctionSchedule } = await driver.getSchedule();

  const liqSeat = await driver.setupCollateralAuction(
    collateral,
    collateral.make(300n),
  );
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const result = await E(liqSeat).getOfferResult();
  t.is(result, 'deposited');

  assert(nextAuctionSchedule?.startTime.absValue);
  let now = nextAuctionSchedule.startTime.absValue - 3n;
  await driver.advanceTo(now);
  const seat1 = await driver.bidForCollateralSeat(
    // 1.1 * 1.05 * 200
    currency.make(231n),
    collateral.make(200n),
  );
  t.is(await E(seat1).getOfferResult(), 'Your bid has been accepted');
  t.false(await E(seat1).hasExited());

  // higher bid, later
  const seat2 = await driver.bidForCollateralSeat(
    // 1.1 * 1.05 * 200
    currency.make(232n),
    collateral.make(200n),
  );

  // regression test for getCurrentAllocation() bug
  await driver.bidForCollateralSeat(currency.make(210n), collateral.make(200n));

  assert(nextAuctionSchedule.startTime.absValue);
  now = nextAuctionSchedule.startTime.absValue;
  await driver.advanceTo(now, 'wait');

  now += 5n;
  await driver.advanceTo(now, 'wait');

  now += 5n;
  await driver.advanceTo(now, 'wait');

  now += 5n;
  await driver.advanceTo(now, 'wait');

  now += 5n;
  await driver.advanceTo(now, 'wait');

  t.true(await E(seat1).hasExited());
  t.false(await E(seat2).hasExited());
  await E(seat2).tryExit();

  t.true(await E(seat2).hasExited());

  await assertPayouts(t, seat1, currency, collateral, 0n, 200n);
  await assertPayouts(t, seat2, currency, collateral, 116n, 100n);

  t.true(await E(liqSeat).hasExited());
  await assertPayouts(t, liqSeat, currency, collateral, 347n, 0n);
});

test('deposit unregistered collateral', async t => {
  const asset = withAmountUtils(makeIssuerKit('Asset'));
  const driver = await makeAuctionDriver(t);

  await t.throwsAsync(() => driver.depositCollateral(asset.make(500n), asset), {
    message:
      /key "\[Alleged: Asset brand\]" not found in collection "brandToIssuerRecord"/,
  });
});

test('bid on unregistered collateral', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await t.throwsAsync(
    driver.bidForCollateralSeat(
      currency.make(100n),
      collateral.make(200n), // re-use this brand, which isn't collateral
    ),
    { message: 'No book for brand "[Alleged: Collateral brand]"' },
  );
});

test('bid zero', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(300n));

  await t.throwsAsync(
    driver.bidForCollateralSeat(
      currency.make(0n),
      collateral.make(200n), // re-use this brand, which isn't collateral
    ),
    {
      message:
        '"new bid" proposal: give: Currency: value: "[0n]" - Must be >= "[1n]"',
    },
  );
});
