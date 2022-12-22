import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';

import { makeIssuerKit } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import {
  makeRatioFromAmounts,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/index.js';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import { deeplyFulfilled } from '@endo/marshal';
import { eventLoopIteration } from '@agoric/notifier/tools/testSupports.js';
import { makePriceAuthorityRegistry } from '@agoric/zoe/tools/priceAuthorityRegistry.js';
import { makeManualPriceAuthority } from '@agoric/zoe/tools/manualPriceAuthority.js';
import { assertPayoutAmount } from '@agoric/zoe/test/zoeTestHelpers.js';
import { makeScalarMapStore } from '@agoric/vat-data/src/index.js';
import { makeTracer } from '@agoric/internal';

import {
  makeMockChainStorageRoot,
  setUpZoeForTest,
  withAmountUtils,
} from '../supports.js';
import { makeAuctioneerParams } from '../../src/auction/params.js';
import { getInvitation, setUpInstallations } from './tools.js';

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

  const installs = await deeplyFulfilled(setUpInstallations(zoe));

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
  const priceAuthorities = makeScalarMapStore();

  // Each driver needs its own to avoid state pollution between tests
  const mockChainStorage = makeMockChainStorageRoot();

  const pubsubTerms = harden({
    storageNode: mockChainStorage.makeChildNode('thisPsm'),
    marshaller: makeBoard().getReadonlyMarshaller(),
  });

  /** @type {Awaited<ReturnType<import('../../src/auction/auctioneer.js').start>>} */
  const { creatorFacet: GCF } = await E(zoe).startInstance(
    installs.governor,
    harden({}),
    harden({
      governedContractInstallation: installs.auctioneer,
      governed: {
        issuerKeywordRecord: {
          Currency: currency.issuer,
        },
        terms: { ...terms, ...customTerms, ...pubsubTerms },
      },
    }),
    { governed: { initialPoserInvitation: fakeInvitationPayment } },
  );
  // @ts-expect-error XXX Fix types
  const publicFacet = E(GCF).getPublicFacet();
  // @ts-expect-error XXX Fix types
  const creatorFacet = E(GCF).getCreatorFacet();

  /**
   * @param {Amount<'nat'>} giveCurrency
   * @param {Amount<'nat'>} wantCollateral
   * @param {Ratio} [discount]
   */
  const bidForCollateralSeat = async (
    giveCurrency,
    wantCollateral,
    discount = undefined,
  ) => {
    const bidInvitation = E(publicFacet).getBidInvitation(wantCollateral.brand);
    const proposal = harden({
      give: { Currency: giveCurrency },
      // IF we had multiples, the buyer could express a want.
      // want: { Collateral: wantCollateral },
    });
    const payment = harden({
      Currency: currency.mint.mintPayment(giveCurrency),
    });
    const offerArgs =
      discount && discount.numerator.brand === discount.denominator.brand
        ? { want: wantCollateral, offerDiscount: discount }
        : {
            want: wantCollateral,
            offerPrice:
              discount ||
              harden(makeRatioFromAmounts(giveCurrency, wantCollateral)),
          };
    return E(zoe).offer(bidInvitation, proposal, payment, harden(offerArgs));
  };

  const depositCollateral = async (collateralAmount, issuerKit) => {
    const collateralPayment = E(issuerKit.mint).mintPayment(
      harden(collateralAmount),
    );
    const seat = E(zoe).offer(
      E(creatorFacet).getDepositInvitation(),
      harden({
        give: { Collateral: collateralAmount },
      }),
      harden({ Collateral: collateralPayment }),
    );
    await eventLoopIteration();

    return seat;
  };

  const setupCollateralAuction = async (issuerKit, collateralAmount) => {
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
      collateralBrand,
      collateralBrand.getAllegedName(),
    );
    return depositCollateral(collateralAmount, issuerKit);
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

    async bidForCollateralPayouts(giveCurrency, wantCollateral, discount) {
      const seat = bidForCollateralSeat(giveCurrency, wantCollateral, discount);
      return E(seat).getPayouts();
    },
    async bidForCollateralSeat(giveCurrency, wantCollateral, discount) {
      return bidForCollateralSeat(giveCurrency, wantCollateral, discount);
    },
    setupCollateralAuction,
    advanceTo(time) {
      timerService.advanceTo(time);
    },
    async updatePriceAuthority(newPrice) {
      priceAuthorities.get(newPrice.denominator.brand).setPrice(newPrice);
      await eventLoopIteration();
    },
    depositCollateral,
    getSchedule() {
      return E(creatorFacet).getSchedule();
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

test('priced bid recorded', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));

  const seat = await driver.bidForCollateralSeat(
    currency.make(100n),
    collateral.make(200n),
  );
  t.is(await E(seat).getOfferResult(), 'Your offer has been received');
});

test('discount bid recorded', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));

  const seat = await driver.bidForCollateralSeat(
    currency.make(20n),
    collateral.make(200n),
    makeRatioFromAmounts(currency.make(10n), currency.make(100n)),
  );
  t.is(await E(seat).getOfferResult(), 'Your offer has been received');
});

test('priced bid settled', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );
  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule.startTime.absValue, 170n);

  await driver.advanceTo(170n);

  const seat = await driver.bidForCollateralSeat(
    currency.make(250n),
    collateral.make(200n),
  );
  t.is(await E(seat).getOfferResult(), 'Your offer has been received');

  await assertPayouts(t, seat, currency, collateral, 19n, 200n);
});

test('discount bid settled', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule.startTime.absValue, 170n);
  await driver.advanceTo(170n);

  const seat = await driver.bidForCollateralSeat(
    currency.make(250n),
    collateral.make(200n),
    makeRatioFromAmounts(currency.make(120n), currency.make(100n)),
  );
  t.is(await E(seat).getOfferResult(), 'Your offer has been received');
  await driver.advanceTo(180n);

  // 250 - 200 * (1.1 * 1.05)
  await assertPayouts(t, seat, currency, collateral, 250n - 231n, 200n);
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
  t.is(schedules.nextAuctionSchedule.startTime.absValue, 170n);
  t.is(schedules.nextAuctionSchedule.endTime.absValue, 185n);
  await driver.advanceTo(170n);

  const seat = await driver.bidForCollateralSeat(
    currency.make(240n),
    collateral.make(200n),
  );
  t.is(await E(seat).getOfferResult(), 'Your offer has been received');
  t.false(await E(seat).hasExited());

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
  t.is(await E(seat).getOfferResult(), 'Your offer has been received');

  await driver.advanceTo(170n);
  const schedules = await driver.getSchedule();
  t.is(schedules.liveAuctionSchedule.startTime.absValue, 170n);
  t.is(schedules.liveAuctionSchedule.endTime.absValue, 185n);

  await driver.advanceTo(184n);
  await driver.advanceTo(185n);
  t.true(await E(seat).hasExited());
  await driver.advanceTo(190n);

  await assertPayouts(t, seat, currency, collateral, 0n, 100n);
});

test('priced bid settled auction price below bid', async t => {
  const { collateral, currency } = t.context;
  const driver = await makeAuctionDriver(t);

  await driver.setupCollateralAuction(collateral, collateral.make(1000n));
  await driver.updatePriceAuthority(
    makeRatioFromAmounts(currency.make(11n), collateral.make(10n)),
  );

  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule.startTime.absValue, 170n);
  await driver.advanceTo(170n);

  // overbid for current price
  const seat = await driver.bidForCollateralSeat(
    currency.make(2240n),
    collateral.make(200n),
  );
  t.is(await E(seat).getOfferResult(), 'Your offer has been received');

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

  await driver.advanceTo(170n);
  const seat = await driver.bidForCollateralSeat(
    // 1.1 * 1.05 * 200
    currency.make(231n),
    collateral.make(200n),
  );

  t.is(await E(seat).getOfferResult(), 'Your offer has been received');
  await assertPayouts(t, seat, currency, collateral, 0n, 200n);

  await driver.advanceTo(185n);

  await assertPayouts(t, liqSeat, currency, collateral, 0n, 800n);
});

test('add assets to open auction', async t => {
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

  const bidderSeat1 = await driver.bidForCollateralSeat(
    // 1.1 * 1.05 * 200
    currency.make(231n),
    collateral.make(200n),
  );
  t.is(await E(bidderSeat1).getOfferResult(), 'Your offer has been received');

  await driver.advanceTo(170n);

  const liqSeat2 = driver.depositCollateral(collateral.make(2000n), collateral);
  const resultL2 = await E(liqSeat2).getOfferResult();
  t.is(resultL2, 'deposited');

  const bidderSeat2 = await driver.bidForCollateralSeat(
    // 1.1 * 1.05 * 200
    currency.make(300n),
    collateral.make(500n),
  );
  t.is(await E(bidderSeat2).getOfferResult(), 'Your offer has been received');

  await driver.advanceTo(180n);
  await assertPayouts(t, bidderSeat1, currency, collateral, 0n, 200n);

  await driver.advanceTo(190n);
  await assertPayouts(t, liqSeat, currency, collateral, 231n / 3n, 0n);
  await assertPayouts(t, liqSeat2, currency, collateral, (2n * 231n) / 3n, 0n);
});

// collateral quote is 1.1.  asset quote is .25.  1000 C, and 500 A available.
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
  t.is(await E(bidderSeat1C).getOfferResult(), 'Your offer has been received');

  // offers up to 500 for 2000 at 1.1 * 75%, so will trigger at second discount step
  const bidderSeat2C = await driver.bidForCollateralSeat(
    currency.make(500n),
    collateral.make(2000n),
    makeRatioFromAmounts(currency.make(75n), currency.make(100n)),
  );
  t.is(await E(bidderSeat2C).getOfferResult(), 'Your offer has been received');

  // offers 50 for 200 at .25 * 50% discount, so triggered at third step
  const bidderSeat1A = await driver.bidForCollateralSeat(
    currency.make(23n),
    asset.make(200n),
    makeRatioFromAmounts(currency.make(50n), currency.make(100n)),
  );
  t.is(await E(bidderSeat1A).getOfferResult(), 'Your offer has been received');

  // offers 100 for 300 at .25 * 33%, so triggered at fourth step
  const bidderSeat2A = await driver.bidForCollateralSeat(
    currency.make(19n),
    asset.make(300n),
    makeRatioFromAmounts(currency.make(100n), asset.make(1000n)),
  );
  t.is(await E(bidderSeat2A).getOfferResult(), 'Your offer has been received');

  const schedules = await driver.getSchedule();
  t.is(schedules.nextAuctionSchedule.startTime.absValue, 170n);

  await driver.advanceTo(150n);
  await driver.advanceTo(170n);
  await eventLoopIteration();
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

test.todo('bids that are satisfied over more than one phase');
test.todo('auction runs out of collateral with remaining bids');
