// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env-ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava'; // TODO ses-ava doesn't yet have test.todo
import '../../../../exported';

import { E } from '@agoric/eventual-send';
import { amountMath } from '@agoric/ertp';

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

  const collateral = amountMath.make(10n, collateralKit.brand);

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

  const borrowedAmount = amountMath.make(20n, loanKit.brand);
  const interest = amountMath.make(3n, loanKit.brand);
  const required = amountMath.add(borrowedAmount, interest);
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
    want: { Collateral: amountMath.make(10n, collateralKit.brand) },
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
      Loan: amountMath.makeEmpty(loanKit.brand),
      Collateral: amountMath.make(10n, collateralKit.brand),
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
      Collateral: amountMath.makeEmpty(collateralKit.brand),
    },
    'lenderSeat',
  );

  // Ensure all seats have exited
  t.truthy(collateralSeat.hasExited());

  // Ensure no new offers can be made
  await checkNoNewOffers(t, zcf);
});
