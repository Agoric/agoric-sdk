// ts-check
import '../../../../exported';

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { E } from '@agoric/eventual-send';

import {
  setupLoanUnitTest,
  checkDescription,
  makeSeatKit,
  checkPayouts,
  checkNoNewOffers,
} from './helpers';

import { makeCloseLoanInvitation } from '../../../../src/contracts/loan/close';

test.todo('makeCloseLoanInvitation repay partial fails');
test.todo(`makeCloseLoanInvitation repay but don't repay interest`);
test.todo(`repay but wrong proposal type`);
test.todo(`repay - request too much collateral`);

test('makeCloseLoanInvitation repay all', async t => {
  const { zcf, zoe, collateralKit, loanKit } = await setupLoanUnitTest();

  const collateral = collateralKit.amountMath.make(10);

  // Set up the collateral seat
  const { zcfSeat: collateralSeat } = await makeSeatKit(
    zcf,
    { give: { Collateral: collateral } },
    {
      Collateral: collateralKit.mint.mintPayment(collateral),
    },
  );

  // Set up the lender seat
  const {
    zcfSeat: lenderSeat,
    userSeat: lenderUserSeatP,
  } = zcf.makeEmptySeatKit();

  const borrowedAmount = loanKit.amountMath.make(20);
  const interest = loanKit.amountMath.make(3);
  const required = loanKit.amountMath.add(borrowedAmount, interest);
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
    want: { Collateral: collateralKit.amountMath.make(10) },
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
      Loan: loanKit.amountMath.getEmpty(),
      Collateral: collateralKit.amountMath.make(10),
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
      Collateral: collateralKit.amountMath.getEmpty(),
    },
    'lenderSeat',
  );

  // Ensure all seats have exited
  t.truthy(collateralSeat.hasExited());

  // Ensure no new offers can be made
  await checkNoNewOffers(t, zcf);
});
