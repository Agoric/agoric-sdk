// @ts-nocheck
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';

import { setupLoanUnitTest, checkDescription } from './helpers.js';

import { makeLendInvitation } from '../../../../src/contracts/loan/lend.js';
import { makeRatio } from '../../../../src/contractSupport/index.js';

test('makeLendInvitation', async t => {
  const { zcf, zoe, loanKit } = await setupLoanUnitTest();

  const config = {
    mmr: makeRatio(150n, loanKit.brand),
  };
  const lendInvitation = makeLendInvitation(zcf, config);

  await checkDescription(t, zoe, lendInvitation, 'lend');

  const maxLoan = AmountMath.make(loanKit.brand, 1000n);

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
