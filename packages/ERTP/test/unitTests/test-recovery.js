import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { getCopySetKeys, keyEQ, makeCopySet } from '@agoric/store';

import { makeIssuerKit, AmountMath } from '../../src/index.js';

const { isEmpty, isEqual } = AmountMath;
const emptySet = makeCopySet([]);

test('payment recovery from purse recovery set', async t => {
  const { issuer, mint, brand } = makeIssuerKit('precious');
  /** @param {bigint} num */
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

test('payment recovery from mint recovery set', async t => {
  const { issuer, mint, mintRecoveryPurse, brand } = makeIssuerKit('precious');
  /** @param {bigint} num */
  const precious = num => AmountMath.make(brand, num);
  const mindyPurse = issuer.makeEmptyPurse();
  const bobPurse = issuer.makeEmptyPurse();

  t.assert(keyEQ(mintRecoveryPurse.getRecoverySet(), emptySet));
  const payment1 = mint.mintPayment(precious(37n));
  const payment2 = mint.mintPayment(precious(41n));
  t.assert(
    keyEQ(
      mintRecoveryPurse.getRecoverySet(),
      makeCopySet([payment1, payment2]),
    ),
  );

  bobPurse.deposit(payment1);
  const mindyRecSet = mintRecoveryPurse.getRecoverySet();
  t.assert(keyEQ(mindyRecSet, makeCopySet([payment2])));
  for (const payment of getCopySetKeys(mindyRecSet)) {
    mindyPurse.deposit(payment);
  }
  t.assert(keyEQ(mintRecoveryPurse.getRecoverySet(), emptySet));
  t.assert(keyEQ(mindyPurse.getCurrentAmount(), precious(41n)));
  t.throws(() => bobPurse.deposit(payment2), {
    message: /was not a live payment for brand/,
  });
});
