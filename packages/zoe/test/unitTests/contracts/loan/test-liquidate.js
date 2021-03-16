// ts-check

import '../../../../exported';

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { Data } from '@agoric/marshal';
import { doLiquidation } from '../../../../src/contracts/loan/liquidate';

import {
  setupLoanUnitTest,
  makeSeatKit,
  checkNoNewOffers,
  checkPayouts,
} from './helpers';

import { trade } from '../../../../src/contractSupport';

test('test doLiquidation with mocked autoswap', async t => {
  const { zcf, collateralKit, loanKit } = await setupLoanUnitTest();
  // Set up the lender seat. At this point the lender has nothing.
  const { zcfSeat: lenderSeat, userSeat: lenderUserSeat } = await makeSeatKit(
    zcf,
    { give: Data({}) },
    Data({}),
  );

  const collateral = collateralKit.amountMath.make(10);
  const {
    zcfSeat: collateralSeat,
    userSeat: collateralUserSeat,
  } = await makeSeatKit(
    zcf,
    { give: { Collateral: collateral } },
    { Collateral: collateralKit.mint.mintPayment(collateral) },
  );

  const loan1000 = loanKit.amountMath.make(1000);

  // Setup fake autoswap
  const { zcfSeat: fakePoolSeat } = await makeSeatKit(
    zcf,
    { give: { Central: loan1000 } },
    { Central: loanKit.mint.mintPayment(loan1000) },
  );

  const price = loanKit.amountMath.make(20);

  const swapHandler = swapSeat => {
    // swapSeat gains 20 loan tokens from fakePoolSeat, loses all collateral

    trade(
      zcf,
      {
        seat: fakePoolSeat,
        gains: {
          Secondary: collateral,
        },
        losses: {
          Central: price,
        },
      },
      {
        seat: swapSeat,
        gains: { Out: price },
        losses: { In: collateral },
      },
    );

    swapSeat.exit();
    return `Swap successfully completed.`;
  };

  const autoswapPublicFacetP = Promise.resolve({
    makeSwapInInvitation: () => zcf.makeInvitation(swapHandler, 'swap'),
  });

  await doLiquidation(zcf, collateralSeat, autoswapPublicFacetP, lenderSeat);

  // Ensure collateralSeat exited
  t.truthy(collateralSeat.hasExited());

  // Ensure lender got payout
  await checkPayouts(
    t,
    lenderUserSeat,
    { Loan: loanKit, Collateral: collateralKit },
    { Loan: price, Collateral: collateralKit.amountMath.getEmpty() },
    'lenderSeat',
  );

  // Ensure nothing was left on collateralSeat
  await checkPayouts(
    t,
    collateralUserSeat,
    { Loan: loanKit, Collateral: collateralKit },
    {
      Loan: loanKit.amountMath.getEmpty(),
      Collateral: collateralKit.amountMath.getEmpty(),
    },
    'collateralSeat',
  );

  // Ensure no further offers accepted
  await checkNoNewOffers(t, zcf);
});

test('test with malfunctioning autoswap', async t => {
  const { zcf, collateralKit, loanKit } = await setupLoanUnitTest();
  // Set up the lender seat. At this point the lender has nothing.
  const { zcfSeat: lenderSeat, userSeat: lenderUserSeat } = await makeSeatKit(
    zcf,
    { give: Data({}) },
    Data({}),
  );

  const collateral = collateralKit.amountMath.make(10);
  const {
    zcfSeat: collateralSeat,
    userSeat: collateralUserSeat,
  } = await makeSeatKit(
    zcf,
    { give: { Collateral: collateral } },
    { Collateral: collateralKit.mint.mintPayment(collateral) },
  );

  // Create non-functioning autoswap.

  // using the swapInvitation throws with message: 'Pool not
  // initialized'
  const swapHandler = _seat => {
    throw Error('Pool not initialized');
  };

  const autoswapPublicFacetP = Promise.resolve({
    makeSwapInInvitation: () => zcf.makeInvitation(swapHandler, 'swap'),
  });

  await t.throwsAsync(
    () => doLiquidation(zcf, collateralSeat, autoswapPublicFacetP, lenderSeat),
    { message: 'Pool not initialized' },
  );

  // Ensure collateralSeat exited
  t.truthy(collateralSeat.hasExited());

  // Ensure lender got payout of the collateral
  await checkPayouts(
    t,
    lenderUserSeat,
    { Loan: loanKit, Collateral: collateralKit },
    {
      Loan: loanKit.amountMath.getEmpty(),
      Collateral: collateral,
    },
    'lenderSeat',
  );

  // Ensure nothing was left on collateralSeat
  await checkPayouts(
    t,
    collateralUserSeat,
    { Loan: loanKit, Collateral: collateralKit },
    {
      Loan: loanKit.amountMath.getEmpty(),
      Collateral: collateralKit.amountMath.getEmpty(),
    },
    'collateralSeat',
  );

  // Ensure no further offers accepted
  await checkNoNewOffers(t, zcf);
});
