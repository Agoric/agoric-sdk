// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeIssuerKit, MathKind } from '@agoric/ertp';

import '../../exported';

import { makeOfferAndFindInvitationAmount } from '../../src/offer';

test('findInvitationAmount', async t => {
  const { mint, issuer, amountMath: invitationMath } = makeIssuerKit(
    'invitations',
    MathKind.SET,
  );
  const zoeInvitationPurse = issuer.makeEmptyPurse();

  const walletAdmin = {};
  const zoe = {};
  const getLocalAmountMath = {};

  const paymentAmount = invitationMath.make(
    harden([{ description: 'found', instance: {} }]),
  );
  const payment = mint.mintPayment(paymentAmount);
  zoeInvitationPurse.deposit(payment);

  const { findInvitationAmount } = makeOfferAndFindInvitationAmount(
    walletAdmin,
    zoe,
    zoeInvitationPurse,
    getLocalAmountMath,
    invitationMath,
  );

  const notFoundResult = await findInvitationAmount({
    description: 'not found',
  });
  t.deepEqual(notFoundResult, invitationMath.make(harden([])));

  const foundResult = await findInvitationAmount({ description: 'found' });
  t.deepEqual(foundResult, paymentAmount);
});
