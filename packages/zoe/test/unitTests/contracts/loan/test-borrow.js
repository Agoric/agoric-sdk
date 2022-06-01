// @ts-nocheck
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava'; // TODO ses-ava doesn't yet have test.todo
import '../../../../exported.js';

import { AmountMath } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { makeNotifierKit } from '@agoric/notifier';

import {
  setupLoanUnitTest,
  makeSeatKit,
  checkDetails,
  performAddCollateral,
  checkDescription,
  checkNoNewOffers,
  checkPayouts,
  makeAutoswapInstance,
} from './helpers.js';

import { makeFakePriceAuthority } from '../../../../tools/fakePriceAuthority.js';
import buildManualTimer from '../../../../tools/manualTimer.js';

import { makeBorrowInvitation } from '../../../../src/contracts/loan/borrow.js';
import { makeAddCollateralInvitation } from '../../../../src/contracts/loan/addCollateral.js';
import { makeCloseLoanInvitation } from '../../../../src/contracts/loan/close.js';
import { makeRatio } from '../../../../src/contractSupport/index.js';
import { assertAmountsEqual } from '../../../zoeTestHelpers.js';

const BASIS_POINTS = 10000n;

const setupBorrow = async (
  maxLoanValue = 100n,
  timer = buildManualTimer(console.log),
) => {
  const setup = await setupLoanUnitTest();
  const { zcf, loanKit, collateralKit, zoe, vatAdminState } = setup;
  // Set up the lender seat
  const maxLoan = AmountMath.make(loanKit.brand, maxLoanValue);
  const { zcfSeat: lenderSeat, userSeat: lenderUserSeat } = await makeSeatKit(
    zcf,
    { give: { Loan: maxLoan } },
    { Loan: loanKit.mint.mintPayment(maxLoan) },
  );

  const mmr = makeRatio(150n, loanKit.brand);
  const priceList = [2, 1, 1, 1];

  const priceAuthority = await makeFakePriceAuthority({
    actualBrandIn: collateralKit.brand,
    actualBrandOut: loanKit.brand,
    priceList,
    timer,
  });
  await timer.tick();

  const initialLiquidityKeywordRecord = {
    Central: AmountMath.make(loanKit.brand, 10000n),
    Secondary: AmountMath.make(collateralKit.brand, 10000n),
  };

  const autoswapInstance = await makeAutoswapInstance(
    zoe,
    collateralKit,
    loanKit,
    initialLiquidityKeywordRecord,
    vatAdminState,
  );

  // In the config that the borrow code sees, the periodNotifier has
  // been adapted to a periodAsyncIterable
  const { updater: periodUpdater, notifier: periodNotifier } =
    makeNotifierKit();

  const interestRate = makeRatio(5n, loanKit.brand, BASIS_POINTS);

  const config = {
    lenderSeat,
    mmr,
    autoswapInstance,
    priceAuthority,
    makeCloseLoanInvitation,
    makeAddCollateralInvitation,
    periodNotifier,
    interestRate,
    interestPeriod: 5n,
    loanBrand: loanKit.brand,
    collateralBrand: collateralKit.brand,
  };
  const borrowInvitation = makeBorrowInvitation(zcf, config);
  return {
    ...setup,
    borrowInvitation,
    maxLoan,
    lenderUserSeat,
    periodUpdater,
    periodNotifier,
    timer,
    priceAuthority,
  };
};

const setupBorrowFacet = async (
  collateralValue = 1000n,
  maxLoanValue = 100n,
) => {
  const setup = await setupBorrow(maxLoanValue);
  const { borrowInvitation, zoe, maxLoan, collateralKit } = setup;

  const collateral = AmountMath.make(collateralKit.brand, collateralValue);

  const proposal = harden({
    want: { Loan: maxLoan },
    give: { Collateral: collateral },
  });

  const payments = { Collateral: collateralKit.mint.mintPayment(collateral) };
  const borrowSeat = await E(zoe).offer(borrowInvitation, proposal, payments);
  /** @type {ERef<BorrowFacet>} */
  const borrowFacet = E(borrowSeat).getOfferResult();

  return {
    ...setup,
    collateral,
    borrowSeat,
    borrowFacet,
  };
};

test('borrow assert customProps', async t => {
  const { borrowInvitation, zoe, installation, instance, maxLoan } =
    await setupBorrow();

  await checkDetails(t, zoe, borrowInvitation, {
    description: 'borrow',
    handle: null,
    installation,
    instance,
    maxLoan,
  });
});

test('borrow not enough collateral', async t => {
  // collateral is 0
  const { borrowSeat } = await setupBorrowFacet(0n);
  await t.throwsAsync(() => E(borrowSeat).getOfferResult(), {
    message: /The required margin is .*% but collateral only had value of .*/,
  });
});

test('borrow just enough collateral', async t => {
  const { borrowFacet, zoe } = await setupBorrowFacet(75n);
  const closeLoanInvitation = await E(borrowFacet).makeCloseLoanInvitation();
  await checkDescription(t, zoe, closeLoanInvitation, 'repayAndClose');
});

test('borrow makeCloseLoanInvitation', async t => {
  const { borrowFacet, zoe } = await setupBorrowFacet();
  const closeLoanInvitation = await E(borrowFacet).makeCloseLoanInvitation();
  await checkDescription(t, zoe, closeLoanInvitation, 'repayAndClose');
});

test('borrow makeAddCollateralInvitation', async t => {
  const { borrowFacet, zoe } = await setupBorrowFacet();
  const addCollateralInvitation = await E(
    borrowFacet,
  ).makeAddCollateralInvitation();
  await checkDescription(t, zoe, addCollateralInvitation, 'addCollateral');
});

test('borrow getDebtNotifier', async t => {
  const { borrowFacet, maxLoan } = await setupBorrowFacet();
  const debtNotifier = await E(borrowFacet).getDebtNotifier();
  const state = await debtNotifier.getUpdateSince();
  assertAmountsEqual(t, state.value, maxLoan);
});

test('borrow getRecentCollateralAmount', async t => {
  const { borrowFacet, collateral } = await setupBorrowFacet();
  const collateralAmount = await E(borrowFacet).getRecentCollateralAmount();
  assertAmountsEqual(t, collateralAmount, collateral);
});

test('borrow getLiquidationPromise', async t => {
  const { borrowFacet, collateralKit, loanKit, priceAuthority, timer } =
    await setupBorrowFacet(100n);
  const liquidationPromise = E(borrowFacet).getLiquidationPromise();

  const collateralGiven = AmountMath.make(collateralKit.brand, 100n);

  const quoteIssuer = E(priceAuthority).getQuoteIssuer(
    collateralKit.brand,
    loanKit.brand,
  );
  const quoteBrand = await E(quoteIssuer).getBrand();

  // According to the schedule, the value of the collateral moves from
  // 2x the loan brand to only 1x the loan brand at time 1.
  await timer.tick();

  const { quoteAmount, quotePayment } = await liquidationPromise;
  const quoteAmount2 = await E(quoteIssuer).getAmountOf(quotePayment);

  assertAmountsEqual(t, quoteAmount, quoteAmount2);
  assertAmountsEqual(
    t,
    quoteAmount,
    AmountMath.make(
      quoteBrand,
      harden([
        {
          amountIn: collateralGiven,
          amountOut: AmountMath.make(loanKit.brand, 100n),
          timer,
          timestamp: 2n,
        },
      ]),
    ),
  );
});

// Liquidation should not happen at the old assetAmount, but should
// happen at the new assetAmount
test('borrow, then addCollateral, then getLiquidationPromise', async t => {
  const {
    borrowFacet,
    lenderUserSeat,
    collateralKit,
    loanKit,
    zoe,
    priceAuthority,
    timer,
    zcf,
  } = await setupBorrowFacet(100n);
  const liquidationPromise = E(borrowFacet).getLiquidationPromise();

  const addCollateralInvitation = await E(
    borrowFacet,
  ).makeAddCollateralInvitation();

  const addedAmount = AmountMath.make(collateralKit.brand, 3n);

  await performAddCollateral(
    t,
    zoe,
    collateralKit,
    loanKit,
    addCollateralInvitation,
    addedAmount,
  );

  const collateralGiven = AmountMath.make(collateralKit.brand, 103n);

  const quoteIssuer = await E(priceAuthority).getQuoteIssuer(
    collateralKit.brand,
    loanKit.brand,
  );

  await timer.tick();
  await timer.tick();

  const { quoteAmount, quotePayment } = await liquidationPromise;

  const quoteAmount2 = await E(quoteIssuer).getAmountOf(quotePayment);

  const quoteBrand = await E(quoteIssuer).getBrand();

  assertAmountsEqual(t, quoteAmount, quoteAmount2);
  assertAmountsEqual(
    t,
    quoteAmount,
    AmountMath.make(
      quoteBrand,
      harden([
        {
          amountIn: collateralGiven,
          amountOut: AmountMath.make(loanKit.brand, 103n),
          timer,
          timestamp: 3n,
        },
      ]),
    ),
  );

  await checkPayouts(
    t,
    lenderUserSeat,
    { Collateral: collateralKit, Loan: loanKit },
    {
      Collateral: AmountMath.makeEmpty(
        collateralKit.brand,
        collateralKit.assetKind,
      ),
      Loan: AmountMath.make(loanKit.brand, 101n),
    },
  );

  await checkNoNewOffers(t, zcf);
});

test('getDebtNotifier with interest', async t => {
  const { borrowFacet, maxLoan, periodUpdater, zoe, loanKit } =
    await setupBorrowFacet(100000n, 40000n);
  periodUpdater.updateState(0n);

  const debtNotifier = await E(borrowFacet).getDebtNotifier();

  const { value: originalDebt, updateCount } = await E(
    debtNotifier,
  ).getUpdateSince();
  assertAmountsEqual(t, originalDebt, maxLoan);

  periodUpdater.updateState(6);

  const { value: debtCompounded1, updateCount: updateCount1 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount);
  assertAmountsEqual(
    t,
    debtCompounded1,
    AmountMath.make(loanKit.brand, 40020n),
  );

  periodUpdater.updateState(11);

  const { value: debtCompounded2 } = await E(debtNotifier).getUpdateSince(
    updateCount1,
  );
  assertAmountsEqual(
    t,
    debtCompounded2,
    AmountMath.make(loanKit.brand, 40041n),
  );

  const closeLoanInvitation = E(borrowFacet).makeCloseLoanInvitation();
  await checkDescription(t, zoe, closeLoanInvitation, 'repayAndClose');

  const collateral = await E(borrowFacet).getRecentCollateralAmount();

  const proposal = harden({
    give: { Loan: AmountMath.make(loanKit.brand, 40000n) },
    want: { Collateral: collateral },
  });

  const payments = harden({
    Loan: loanKit.mint.mintPayment(AmountMath.make(loanKit.brand, 40000n)),
  });

  const seat = await E(zoe).offer(closeLoanInvitation, proposal, payments);

  await t.throwsAsync(() => seat.getOfferResult(), {
    message:
      /Not enough Loan assets have been repaid. {2}.* is required, but only .* was repaid./,
  });
});

test('borrow collateral just too low', async t => {
  const { borrowSeat: borrowSeatGood } = await setupBorrowFacet(75n);
  const offerResult = await E(borrowSeatGood).getOfferResult();
  const collateralAmount = await E(offerResult).getRecentCollateralAmount();
  t.is(collateralAmount.value, 75n);

  const { borrowSeat: borrowSeatBad } = await setupBorrowFacet(74n);
  await t.throwsAsync(() => E(borrowSeatBad).getOfferResult(), {
    message: /The required margin is .*% but collateral only had value of .*/,
  });
});

test('aperiodic interest', async t => {
  const { borrowFacet, maxLoan, periodUpdater, loanKit } =
    await setupBorrowFacet(100000n, 40000n);
  periodUpdater.updateState(0);

  const debtNotifier = await E(borrowFacet).getDebtNotifier();

  const { value: originalDebt, updateCount } = await E(
    debtNotifier,
  ).getUpdateSince();
  assertAmountsEqual(t, originalDebt, maxLoan);

  periodUpdater.updateState(6);

  const { value: debtCompounded1, updateCount: updateCount1 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount);
  assertAmountsEqual(
    t,
    debtCompounded1,
    AmountMath.make(loanKit.brand, 40020n),
  );

  // skip ahead a notification
  periodUpdater.updateState(16);

  // both debt notifications are received
  const { value: debtCompounded2, updateCount: updateCount2 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount1);
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 16n);
  assertAmountsEqual(
    t,
    debtCompounded2,
    AmountMath.make(loanKit.brand, 40062n),
  );

  periodUpdater.updateState(21);
  const { value: debtCompounded3 } = await E(debtNotifier).getUpdateSince(
    updateCount2,
  );
  assertAmountsEqual(
    t,
    debtCompounded3,
    AmountMath.make(loanKit.brand, 40083n),
  );
});

// Show that interest is charged from the time the loan was created.
// setupBorrow() calls timer.tick(), so the basetime for the loan will be 4.
test('interest starting from non-zero time', async t => {
  const collateralValue = 100000n;
  const maxLoanValue = 40000n;
  // The fakePriceAuthority pays attention to the fakeTimer
  const timer = buildManualTimer(t.log);
  timer.tick();
  timer.tick();
  timer.tick();
  const setup = await setupBorrow(maxLoanValue, timer);
  const {
    borrowInvitation,
    zoe,
    maxLoan,
    collateralKit,
    periodUpdater,
    loanKit,
  } = setup;
  const collateral = AmountMath.make(collateralKit.brand, collateralValue);

  const proposal = harden({
    want: { Loan: maxLoan },
    give: { Collateral: collateral },
  });

  const payments = { Collateral: collateralKit.mint.mintPayment(collateral) };
  const borrowSeat = await E(zoe).offer(borrowInvitation, proposal, payments);
  /** @type {ERef<BorrowFacet>} */
  const borrowFacet = E(borrowSeat).getOfferResult();

  // The loan gets notifications from the updater
  periodUpdater.updateState(6);

  const debtNotifier = await E(borrowFacet).getDebtNotifier();

  const { value: originalDebt, updateCount } = await E(
    debtNotifier,
  ).getUpdateSince();
  t.deepEqual(originalDebt, maxLoan);

  periodUpdater.updateState(9);
  const { value: debtCompounded2 } = await E(debtNotifier).getUpdateSince(
    updateCount,
  );
  t.deepEqual(debtCompounded2, AmountMath.make(loanKit.brand, 40020n));
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 9n);
});

// In this test, the updates are expected at multiples of 5, but they show up at
// multiples of 4 instead. The starting time is 1. We should charge interest
// after 9, 13, 17, 21, 29
test('short periods', async t => {
  const { borrowFacet, maxLoan, periodUpdater, loanKit } =
    await setupBorrowFacet(100000n, 40000n);
  periodUpdater.updateState(0);

  const debtNotifier = await E(borrowFacet).getDebtNotifier();

  const { value: originalDebt, updateCount } = await E(
    debtNotifier,
  ).getUpdateSince();
  assertAmountsEqual(t, originalDebt, maxLoan);

  periodUpdater.updateState(5);
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 1n);

  periodUpdater.updateState(9);
  const { value: debtCompounded1, updateCount: updateCount1 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount);
  assertAmountsEqual(
    t,
    debtCompounded1,
    AmountMath.make(loanKit.brand, 40020n),
  );
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 6n);

  periodUpdater.updateState(14);
  const { value: debtCompounded2, updateCount: updateCount2 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount1);
  assertAmountsEqual(
    t,
    debtCompounded2,
    AmountMath.make(loanKit.brand, 40041n),
  );
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 11n);

  periodUpdater.updateState(17);
  const { value: debtCompounded3, updateCount: updateCount3 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount2);
  assertAmountsEqual(
    t,
    debtCompounded3,
    AmountMath.make(loanKit.brand, 40062n),
  );
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 16n);

  periodUpdater.updateState(21);
  const { value: debtCompounded4, updateCount: updateCount4 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount3);
  assertAmountsEqual(
    t,
    debtCompounded4,
    AmountMath.make(loanKit.brand, 40083n),
  );
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 21n);

  periodUpdater.updateState(25);
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 21n);

  periodUpdater.updateState(29);
  const { value: debtCompounded5 } = await E(debtNotifier).getUpdateSince(
    updateCount4,
  );
  assertAmountsEqual(
    t,
    debtCompounded5,
    AmountMath.make(loanKit.brand, 40104n),
  );
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 26n);
});

test.todo('borrow bad proposal');

test.todo('schedule a liquidation that fails, giving collateral to the lender');
