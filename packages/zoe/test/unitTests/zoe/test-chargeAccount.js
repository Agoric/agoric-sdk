// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';

import { makeMakeChargeAccount } from '../../../src/zoeService/chargeAccount';

const setup = () => {
  const feeIssuerKit = makeIssuerKit('RUN', AssetKind.NAT, {
    decimalPlaces: 6,
  });
  const { makeChargeAccount, hasChargeAccount } = makeMakeChargeAccount(
    feeIssuerKit.issuer,
  );
  return { makeChargeAccount, hasChargeAccount, feeIssuerKit };
};

test('chargeAccount starts empty', async t => {
  const { makeChargeAccount } = setup();
  const chargeAccount = makeChargeAccount();

  t.true(AmountMath.isEmpty(chargeAccount.getCurrentAmount()));
});

test('depositing into and withdrawing from chargeAccount', async t => {
  const { makeChargeAccount, feeIssuerKit } = setup();
  const chargeAccount = makeChargeAccount();

  const run1000 = AmountMath.make(feeIssuerKit.brand, 1000n);
  const payment = feeIssuerKit.mint.mintPayment(run1000);
  chargeAccount.deposit(payment);

  t.true(AmountMath.isEqual(chargeAccount.getCurrentAmount(), run1000));

  chargeAccount.withdraw(run1000);

  t.true(AmountMath.isEmpty(chargeAccount.getCurrentAmount()));
});

test('hasChargeAccount', async t => {
  const { makeChargeAccount, hasChargeAccount } = setup();
  const chargeAccount = makeChargeAccount();

  t.true(await hasChargeAccount(chargeAccount));
  t.true(await hasChargeAccount(Promise.resolve(chargeAccount)));
});
