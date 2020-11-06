// ts-check
import '../../../../exported';

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { E } from '@agoric/eventual-send';

import { setupLoanUnitTest, checkDescription } from './helpers';

import { makeLendInvitation } from '../../../../src/contracts/loan/lend';

test('makeLendInvitation', async t => {
  const { zcf, zoe, loanKit } = await setupLoanUnitTest();

  const config = {};
  const lendInvitation = makeLendInvitation(zcf, config);

  await checkDescription(t, zoe, lendInvitation, 'lend');

  const maxLoan = loanKit.amountMath.make(1000);

  const proposal = harden({
    give: { Loan: maxLoan },
  });

  const payments = harden({
    Loan: loanKit.mint.mintPayment(maxLoan),
  });

  const lenderSeat = await E(zoe).offer(lendInvitation, proposal, payments);

  const borrowInvitation = await E(lenderSeat).getOfferResult();
  await checkDescription(t, zoe, borrowInvitation, 'borrow');
});
