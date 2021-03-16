// @ts-check

import '../../../../exported';

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { E } from '@agoric/eventual-send';
import { makeNotifierKit } from '@agoric/notifier';

import { makeLocalAmountMath } from '@agoric/ertp';
import {
  setupLoanUnitTest,
  makeSeatKit,
  checkDetails,
  performAddCollateral,
  checkDescription,
  checkNoNewOffers,
  checkPayouts,
  makeAutoswapInstance,
} from './helpers';

import { makeFakePriceAuthority } from '../../../../tools/fakePriceAuthority';
import buildManualTimer from '../../../../tools/manualTimer';

import { makeBorrowInvitation } from '../../../../src/contracts/loan/borrow';
import { makeAddCollateralInvitation } from '../../../../src/contracts/loan/addCollateral';
import { makeCloseLoanInvitation } from '../../../../src/contracts/loan/close';
import { makeRatio } from '../../../../src/contractSupport';

const BASIS_POINTS = 10000;

const setupBorrow = async (
  maxLoanValue = 100,
  timer = buildManualTimer(console.log),
) => {
  const setup = await setupLoanUnitTest();
  const { zcf, loanKit, collateralKit, zoe } = setup;
  // Set up the lender seat
  const maxLoan = loanKit.amountMath.make(maxLoanValue);
  const { zcfSeat: lenderSeat, userSeat: lenderUserSeat } = await makeSeatKit(
    zcf,
    { give: { Loan: maxLoan } },
    { Loan: loanKit.mint.mintPayment(maxLoan) },
  );

  const mmr = makeRatio(150, loanKit.brand);
  const priceList = [2, 1, 1, 1];

  const priceAuthority = await makeFakePriceAuthority({
    mathIn: collateralKit.amountMath,
    mathOut: loanKit.amountMath,
    priceList,
    timer,
  });
  await timer.tick();

  const initialLiquidityKeywordRecord = {
    Central: loanKit.amountMath.make(10000),
    Secondary: collateralKit.amountMath.make(10000),
  };

  const autoswapInstance = await makeAutoswapInstance(
    zoe,
    collateralKit,
    loanKit,
    initialLiquidityKeywordRecord,
  );

  // In the config that the borrow code sees, the periodNotifier has
  // been adapted to a periodAsyncIterable
  const {
    updater: periodUpdater,
    notifier: periodNotifier,
  } = makeNotifierKit();

  const interestRate = makeRatio(5, loanKit.brand, BASIS_POINTS);

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

const setupBorrowFacet = async (collateralValue = 1000, maxLoanValue = 100) => {
  const setup = await setupBorrow(maxLoanValue);
  const { borrowInvitation, zoe, maxLoan, collateralKit } = setup;

  const collateral = collateralKit.amountMath.make(collateralValue);

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
  const {
    borrowInvitation,
    zoe,
    installation,
    instance,
    maxLoan,
  } = await setupBorrow();

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
  const { borrowSeat } = await setupBorrowFacet(0);
  await t.throwsAsync(() => E(borrowSeat).getOfferResult(), {
    message:
      'The required margin is (a bigint)% but collateral only had value of (a bigint)',
  });
});

test('borrow just enough collateral', async t => {
  const { borrowFacet, zoe } = await setupBorrowFacet(75);
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
  t.deepEqual(state.value, maxLoan);
});

test('borrow getRecentCollateralAmount', async t => {
  const { borrowFacet, collateral } = await setupBorrowFacet();
  const collateralAmount = await E(borrowFacet).getRecentCollateralAmount();
  t.deepEqual(collateralAmount, collateral);
});

test('borrow getLiquidationPromise', async t => {
  const {
    borrowFacet,
    collateralKit,
    loanKit,
    priceAuthority,
    timer,
  } = await setupBorrowFacet(100);
  const liquidationPromise = E(borrowFacet).getLiquidationPromise();

  const collateralGiven = collateralKit.amountMath.make(100);

  const quoteIssuer = E(priceAuthority).getQuoteIssuer(
    collateralKit.brand,
    loanKit.brand,
  );
  const quoteAmountMath = await makeLocalAmountMath(quoteIssuer);

  // According to the schedule, the value of the collateral moves from
  // 2x the loan brand to only 1x the loan brand at time 1.
  await timer.tick();

  const { quoteAmount, quotePayment } = await liquidationPromise;
  const quoteAmount2 = await E(quoteIssuer).getAmountOf(quotePayment);

  t.deepEqual(quoteAmount, quoteAmount2);
  t.deepEqual(
    quoteAmount,
    quoteAmountMath.make(
      harden([
        {
          amountIn: collateralGiven,
          amountOut: loanKit.amountMath.make(100),
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
  } = await setupBorrowFacet(100);
  const liquidationPromise = E(borrowFacet).getLiquidationPromise();

  const addCollateralInvitation = await E(
    borrowFacet,
  ).makeAddCollateralInvitation();

  const addedAmount = collateralKit.amountMath.make(3);

  await performAddCollateral(
    t,
    zoe,
    collateralKit,
    loanKit,
    addCollateralInvitation,
    addedAmount,
  );

  const collateralGiven = collateralKit.amountMath.make(103);

  const quoteIssuer = await E(priceAuthority).getQuoteIssuer(
    collateralKit.brand,
    loanKit.brand,
  );
  const quoteAmountMath = await makeLocalAmountMath(quoteIssuer);

  await timer.tick();
  await timer.tick();

  const { quoteAmount, quotePayment } = await liquidationPromise;
  const quoteAmount2 = await E(quoteIssuer).getAmountOf(quotePayment);

  t.deepEqual(quoteAmount, quoteAmount2);
  t.deepEqual(
    quoteAmount,
    quoteAmountMath.make(
      harden([
        {
          amountIn: collateralGiven,
          amountOut: loanKit.amountMath.make(103),
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
      Collateral: collateralKit.amountMath.getEmpty(),
      Loan: loanKit.amountMath.make(101),
    },
  );
  await checkNoNewOffers(t, zcf);
});

test('getDebtNotifier with interest', async t => {
  const {
    borrowFacet,
    maxLoan,
    periodUpdater,
    zoe,
    loanKit,
  } = await setupBorrowFacet(100000, 40000);
  periodUpdater.updateState(0n);

  const debtNotifier = await E(borrowFacet).getDebtNotifier();

  const { value: originalDebt, updateCount } = await E(
    debtNotifier,
  ).getUpdateSince();
  t.deepEqual(originalDebt, maxLoan);

  periodUpdater.updateState(6);

  const { value: debtCompounded1, updateCount: updateCount1 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount);
  t.deepEqual(debtCompounded1, loanKit.amountMath.make(40020));

  periodUpdater.updateState(11);

  const { value: debtCompounded2 } = await E(debtNotifier).getUpdateSince(
    updateCount1,
  );
  t.deepEqual(debtCompounded2, loanKit.amountMath.make(40040));

  const closeLoanInvitation = E(borrowFacet).makeCloseLoanInvitation();
  await checkDescription(t, zoe, closeLoanInvitation, 'repayAndClose');

  const collateral = await E(borrowFacet).getRecentCollateralAmount();

  const proposal = harden({
    give: { Loan: loanKit.amountMath.make(40000) },
    want: { Collateral: collateral },
  });

  const payments = harden({
    Loan: loanKit.mint.mintPayment(loanKit.amountMath.make(40000)),
  });

  const seat = await E(zoe).offer(closeLoanInvitation, proposal, payments);

  await t.throwsAsync(() => seat.getOfferResult(), {
    message:
      'Not enough Loan assets have been repaid.  (an object) is required, but only (an object) was repaid.',
  });
});

test('borrow collateral just too low', async t => {
  const { borrowSeat: borrowSeatGood } = await setupBorrowFacet(75);
  const offerResult = await E(borrowSeatGood).getOfferResult();
  const collateralAmount = await E(offerResult).getRecentCollateralAmount();
  t.is(collateralAmount.value, 75n);

  const { borrowSeat: borrowSeatBad } = await setupBorrowFacet(74);
  await t.throwsAsync(() => E(borrowSeatBad).getOfferResult(), {
    message:
      'The required margin is (a bigint)% but collateral only had value of (a bigint)',
  });
});

test('aperiodic interest', async t => {
  const {
    borrowFacet,
    maxLoan,
    periodUpdater,
    loanKit,
  } = await setupBorrowFacet(100000, 40000);
  periodUpdater.updateState(0);

  const debtNotifier = await E(borrowFacet).getDebtNotifier();

  const { value: originalDebt, updateCount } = await E(
    debtNotifier,
  ).getUpdateSince();
  t.deepEqual(originalDebt, maxLoan);

  periodUpdater.updateState(6);

  const { value: debtCompounded1, updateCount: updateCount1 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount);
  t.deepEqual(debtCompounded1, loanKit.amountMath.make(40020));

  // skip ahead a notification
  periodUpdater.updateState(16);

  // both debt notifications are received
  const { value: debtCompounded2, updateCount: updateCount2 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount1);
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 16n);
  t.deepEqual(debtCompounded2, loanKit.amountMath.make(40060));

  periodUpdater.updateState(21);
  const { value: debtCompounded3 } = await E(debtNotifier).getUpdateSince(
    updateCount2,
  );
  t.deepEqual(debtCompounded3, loanKit.amountMath.make(40080));
});

// Show that interest is charged from the time the loan was created.
// setupBorrow() calls timer.tick(), so the basetime for the loan will be 4.
test('interest starting from non-zero time', async t => {
  const collateralValue = 100000;
  const maxLoanValue = 40000;
  // The fakePriceAuthority pays attention to the fakeTimer
  const timer = buildManualTimer(console.log);
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
  const collateral = collateralKit.amountMath.make(collateralValue);

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
  t.deepEqual(debtCompounded2, loanKit.amountMath.make(40020));
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 9n);
});

// In this test, the updates are expected at multiples of 5, but they show up at
// multiples of 4 instead. The starting time is 1. We should charge interest
// after 9, 13, 17, 21, 29
test('short periods', async t => {
  const {
    borrowFacet,
    maxLoan,
    periodUpdater,
    loanKit,
  } = await setupBorrowFacet(100000, 40000);
  periodUpdater.updateState(0);

  const debtNotifier = await E(borrowFacet).getDebtNotifier();

  const { value: originalDebt, updateCount } = await E(
    debtNotifier,
  ).getUpdateSince();
  t.deepEqual(originalDebt, maxLoan);

  periodUpdater.updateState(5);
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 1n);

  periodUpdater.updateState(9);
  const { value: debtCompounded1, updateCount: updateCount1 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount);
  t.deepEqual(debtCompounded1, loanKit.amountMath.make(40020));
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 6n);

  periodUpdater.updateState(14);
  const { value: debtCompounded2, updateCount: updateCount2 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount1);
  t.deepEqual(debtCompounded2, loanKit.amountMath.make(40040));
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 11n);

  periodUpdater.updateState(17);
  const { value: debtCompounded3, updateCount: updateCount3 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount2);
  t.deepEqual(debtCompounded3, loanKit.amountMath.make(40060));
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 16n);

  periodUpdater.updateState(21);
  const { value: debtCompounded4, updateCount: updateCount4 } = await E(
    debtNotifier,
  ).getUpdateSince(updateCount3);
  t.deepEqual(debtCompounded4, loanKit.amountMath.make(40080));
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 21n);

  periodUpdater.updateState(25);
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 21n);

  periodUpdater.updateState(29);
  const { value: debtCompounded5 } = await E(debtNotifier).getUpdateSince(
    updateCount4,
  );
  t.deepEqual(debtCompounded5, loanKit.amountMath.make(40100));
  t.is(await E(borrowFacet).getLastCalculationTimestamp(), 26n);
});

test.todo('borrow bad proposal');

test.todo('schedule a liquidation that fails, giving collateral to the lender');
