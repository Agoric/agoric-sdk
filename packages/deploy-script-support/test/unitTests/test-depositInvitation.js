// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';

import '../../exported';

import { makeDepositInvitation } from '../../src/depositInvitation.js';

test('depositInvitation', async t => {
  const { mint, issuer, brand } = makeIssuerKit('invitations', AssetKind.SET);
  const purse = issuer.makeEmptyPurse();
  const paymentAmount = AmountMath.make(brand, [{ instance: {} }]);
  const payment = mint.mintPayment(paymentAmount);
  const depositInvitation = makeDepositInvitation(purse);
  const result = await depositInvitation(payment);
  t.deepEqual(result, paymentAmount.value[0]);

  const balance = purse.getCurrentAmount();
  t.deepEqual(balance, paymentAmount);
});
