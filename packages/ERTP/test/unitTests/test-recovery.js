// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { keyEQ, makeCopySet } from '@agoric/store';

import { makeIssuerKit, AmountMath } from '../../src/index.js';

const { isEmpty, isEqual } = AmountMath;
const emptySet = makeCopySet([]);

test('payment recovery', async t => {
  const { issuer, mint, brand } = makeIssuerKit('precious');
  const precious = num => AmountMath.make(brand, num);
  const payment1 = mint.mintPayment(precious(37n));
  const payment2 = mint.mintPayment(precious(41n));
  const alicePurse = issuer.makeEmptyPurse();
  const bobPurse = issuer.makeEmptyPurse();

  t.assert(keyEQ(alicePurse.getRecoverySet(), emptySet));
  t.assert(keyEQ(bobPurse.getRecoverySet(), emptySet));
  alicePurse.deposit(payment1);
  bobPurse.deposit(payment2);
  t.assert(keyEQ(alicePurse.getRecoverySet(), emptySet));
  t.assert(keyEQ(bobPurse.getRecoverySet(), emptySet));

  const payment3 = alicePurse.withdraw(precious(5n));
  t.assert(issuer.isLive(payment3));
  t.assert(keyEQ(alicePurse.getRecoverySet(), makeCopySet([payment3])));
  t.assert(issuer.isLive(payment3));

  bobPurse.deposit(payment3);
  t.assert(keyEQ(alicePurse.getRecoverySet(), emptySet));

  const aliceRecovered = alicePurse.recoverAll();
  t.assert(isEmpty(aliceRecovered));
  t.assert(isEqual(alicePurse.getCurrentAmount(), precious(32n)));

  t.assert(isEqual(bobPurse.getCurrentAmount(), precious(46n)));
  const bobRecovered = bobPurse.recoverAll();
  t.assert(isEqual(bobRecovered, precious(0n)));
  t.assert(isEqual(bobPurse.getCurrentAmount(), precious(46n)));
  t.assert(keyEQ(bobPurse.getRecoverySet(), emptySet));
});
