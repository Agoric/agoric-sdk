// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';

import { setupMakeFeePurse } from '../../../src/zoeService/feePurse.js';

const setup = () => {
  const runIssuerKit = makeIssuerKit('RUN', AssetKind.NAT, {
    decimalPlaces: 6,
  });
  const { makeFeePurse, isFeePurse } = setupMakeFeePurse(runIssuerKit.issuer);
  return { makeFeePurse, isFeePurse, runIssuerKit };
};

test('feePurse starts empty', async t => {
  const { makeFeePurse } = setup();
  const feePurse = makeFeePurse();

  t.true(AmountMath.isEmpty(feePurse.getCurrentAmount()));
});

test('depositing into and withdrawing from feePurse', async t => {
  const { makeFeePurse, runIssuerKit } = setup();
  const feePurse = makeFeePurse();

  const run1000 = AmountMath.make(runIssuerKit.brand, 1000n);
  const payment = runIssuerKit.mint.mintPayment(run1000);
  feePurse.deposit(payment);

  t.true(AmountMath.isEqual(feePurse.getCurrentAmount(), run1000));

  feePurse.withdraw(run1000);

  t.true(AmountMath.isEmpty(feePurse.getCurrentAmount()));
});

test('isFeePurse', async t => {
  const { makeFeePurse, isFeePurse } = setup();
  const feePurse = makeFeePurse();

  t.true(isFeePurse(feePurse));
});
