// @ts-nocheck
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';

import {
  setupLoanUnitTest,
  checkDescription,
  makeSeatKit,
  checkPayouts,
  checkNoNewOffers,
} from './helpers.js';

import { makeCloseLoanInvitation } from '../../../../src/contracts/loan/close.js';

test.todo('makeCloseLoanInvitation repay partial fails');
test.todo(`makeCloseLoanInvitation repay but don't repay interest`);
test.todo(`repay but wrong proposal type`);
test.todo(`repay - request too much collateral`);

test('makeCloseLoanInvitation repay all', async t => {
  const { zcf, zoe, collateralKit, loanKit } = await setupLoanUnitTest();

  const collateral = AmountMath.make(collateralKit.brand, 10n);

  // Set up the collateral seat
  const { zcfSeat: collateralSeat } = await makeSeatKit(
    zcf,
    { give: { Collateral: collateral } },
    {
      Collateral: collateralKit.mint.mintPayment(collateral),
    },
  );

  // Set up the lender seat
  const { zcfSeat: lenderSeat, userSeat: lenderUserSeatP } =
    zcf.makeEmptySeatKit();

  const borrowedAmount = AmountMath.make(loanKit.brand, 20n);
  const interest = AmountMath.make(loanKit.brand, 3n);
  const required = AmountMath.add(borrowedAmount, interest);
  const getDebt = () => required;

  const config = {
    collateralSeat,
    lenderSeat,
    getDebt,
  };

  const closeLoanInvitation = makeCloseLoanInvitation(zcf, config);

  await checkDescription(t, zoe, closeLoanInvitation, 'repayAndClose');

  const proposal = harden({
    give: { Loan: required },
    want: { Collateral: AmountMath.make(collateralKit.brand, 10n) },
  });

  const payments = harden({
    Loan: loanKit.mint.mintPayment(required),
  });

  const seat = await E(zoe).offer(closeLoanInvitation, proposal, payments);

  t.is(
    await seat.getOfferResult(),
    'your loan is closed, thank you for your business',
  );

  await checkPayouts(
    t,
    seat,
    { Loan: loanKit, Collateral: collateralKit },
    {
      Loan: AmountMath.makeEmpty(loanKit.brand),
      Collateral: AmountMath.make(collateralKit.brand, 10n),
    },
    'repaySeat',
  );

  // Ensure the lender gets the entire loan repayment and none of the
  // collateral

  const lenderUserSeat = await lenderUserSeatP;

  await checkPayouts(
    t,
    lenderUserSeat,
    { Loan: loanKit, Collateral: collateralKit },
    {
      Loan: required,
      Collateral: AmountMath.makeEmpty(collateralKit.brand),
    },
    'lenderSeat',
  );

  // Ensure all seats have exited
  t.truthy(collateralSeat.hasExited());

  // Ensure no new offers can be made
  await checkNoNewOffers(t, zcf);
});
