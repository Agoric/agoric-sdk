// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '../../../../exported.js';

import { AmountMath } from '@agoric/ertp';

import { doLiquidation } from '../../../../src/contracts/loan/liquidate.js';

import {
  setupLoanUnitTest,
  makeSeatKit,
  checkNoNewOffers,
  checkPayouts,
} from './helpers.js';

test('test doLiquidation with mocked autoswap', async t => {
  const { zcf, collateralKit, loanKit } = await setupLoanUnitTest();
  // Set up the lender seat. At this point the lender has nothing.
  const { zcfSeat: lenderSeat, userSeat: lenderUserSeat } = await makeSeatKit(
    zcf,
    { give: harden({}) },
    harden({}),
  );

  const collateral = AmountMath.make(collateralKit.brand, 10n);
  const { zcfSeat: collateralSeat, userSeat: collateralUserSeat } =
    await makeSeatKit(
      zcf,
      { give: { Collateral: collateral } },
      { Collateral: collateralKit.mint.mintPayment(collateral) },
    );

  const loan1000 = AmountMath.make(loanKit.brand, 1000n);

  // Setup fake autoswap
  const { zcfSeat: fakePoolSeat } = await makeSeatKit(
    zcf,
    { give: { Central: loan1000 } },
    { Central: loanKit.mint.mintPayment(loan1000) },
  );

  const price = AmountMath.make(loanKit.brand, 20n);

  const swapHandler = swapSeat => {
    // swapSeat gains 20 loan tokens from fakePoolSeat, loses all collateral

    swapSeat.decrementBy(harden({ In: collateral }));
    fakePoolSeat.incrementBy(harden({ Secondary: collateral }));

    fakePoolSeat.decrementBy(harden({ Central: price }));
    swapSeat.incrementBy(harden({ Out: price }));

    zcf.reallocate(swapSeat, fakePoolSeat);

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
    { Loan: price, Collateral: AmountMath.makeEmpty(collateralKit.brand) },
    'lenderSeat',
  );

  // Ensure nothing was left on collateralSeat
  await checkPayouts(
    t,
    collateralUserSeat,
    { Loan: loanKit, Collateral: collateralKit },
    {
      Loan: AmountMath.makeEmpty(loanKit.brand),
      Collateral: AmountMath.makeEmpty(collateralKit.brand),
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

  const collateral = AmountMath.make(collateralKit.brand, 10n);
  const { zcfSeat: collateralSeat, userSeat: collateralUserSeat } =
    await makeSeatKit(
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
      Loan: AmountMath.makeEmpty(loanKit.brand),
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
      Loan: AmountMath.makeEmpty(loanKit.brand),
      Collateral: AmountMath.makeEmpty(collateralKit.brand),
    },
    'collateralSeat',
  );

  // Ensure no further offers accepted
  await checkNoNewOffers(t, zcf);
});
