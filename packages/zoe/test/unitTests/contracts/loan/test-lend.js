// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '../../../../exported';

import { E } from '@agoric/eventual-send';
import { amountMath } from '@agoric/ertp';

import { setupLoanUnitTest, checkDescription } from './helpers';

import { makeLendInvitation } from '../../../../src/contracts/loan/lend';
import { makeRatio } from '../../../../src/contractSupport';

test('makeLendInvitation', async t => {
  const { zcf, zoe, loanKit } = await setupLoanUnitTest();

  const config = {
    mmr: makeRatio(150n, loanKit.brand),
  };
  const lendInvitation = makeLendInvitation(zcf, config);

  await checkDescription(t, zoe, lendInvitation, 'lend');

  const maxLoan = amountMath.make(1000n, loanKit.brand);

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
