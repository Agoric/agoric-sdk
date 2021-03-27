// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '../../../../exported';

import { amountMath } from '@agoric/ertp';

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
    { give: harden({}) },
    harden({}),
  );

  const collateral = amountMath.make(10n, collateralKit.brand);
  const {
    zcfSeat: collateralSeat,
    userSeat: collateralUserSeat,
  } = await makeSeatKit(
    zcf,
    { give: { Collateral: collateral } },
    { Collateral: collateralKit.mint.mintPayment(collateral) },
  );

  const loan1000 = amountMath.make(1000n, loanKit.brand);

  // Setup fake autoswap
  const { zcfSeat: fakePoolSeat } = await makeSeatKit(
    zcf,
    { give: { Central: loan1000 } },
    { Central: loanKit.mint.mintPayment(loan1000) },
  );

  const price = amountMath.make(20n, loanKit.brand);

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

  await doLiquidation(
    zcf,
    collateralSeat,
    autoswapPublicFacetP,
    lenderSeat,
    loanKit.brand,
  );

  // Ensure collateralSeat exited
  t.truthy(collateralSeat.hasExited());

  // Ensure lender got payout
  await checkPayouts(
    t,
    lenderUserSeat,
    { Loan: loanKit, Collateral: collateralKit },
    { Loan: price, Collateral: amountMath.makeEmpty(collateralKit.brand) },
    'lenderSeat',
  );

  // Ensure nothing was left on collateralSeat
  await checkPayouts(
    t,
    collateralUserSeat,
    { Loan: loanKit, Collateral: collateralKit },
    {
      Loan: amountMath.makeEmpty(loanKit.brand),
      Collateral: amountMath.makeEmpty(collateralKit.brand),
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
    { give: harden({}) },
    harden({}),
  );

  const collateral = amountMath.make(10n, collateralKit.brand);
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
    () =>
      doLiquidation(
        zcf,
        collateralSeat,
        autoswapPublicFacetP,
        lenderSeat,
        loanKit.brand,
      ),
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
      Loan: amountMath.makeEmpty(loanKit.brand),
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
      Loan: amountMath.makeEmpty(loanKit.brand),
      Collateral: amountMath.makeEmpty(collateralKit.brand),
    },
    'collateralSeat',
  );

  // Ensure no further offers accepted
  await checkNoNewOffers(t, zcf);
});
