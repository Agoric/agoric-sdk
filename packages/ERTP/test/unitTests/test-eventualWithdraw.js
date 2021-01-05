// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { E } from '@agoric/eventual-send';

import { makeIssuerKit, MathKind } from '../../src';

test('eventualWithdraw NAT', async t => {
  const { mint, issuer, amountMath } = makeIssuerKit('fungible');
  const purse = issuer.makeEmptyPurse();

  const searchAmount = amountMath.make(5);
  const firstDeposit = amountMath.make(2);
  const secondDeposit = amountMath.make(10);
  const result = purse.eventualWithdraw(searchAmount);
  purse.deposit(mint.mintPayment(firstDeposit));
  purse.deposit(mint.mintPayment(secondDeposit));
  const payment = await E(result).getPayment();
  t.deepEqual(await issuer.getAmountOf(payment), searchAmount);
});

test('eventualWithdraw STRING_SET', async t => {
  const { mint, issuer, amountMath } = makeIssuerKit(
    'str',
    MathKind.STRING_SET,
  );
  const purse = issuer.makeEmptyPurse();

  const searchAmount = amountMath.make(harden(['a']));
  const firstDeposit = amountMath.make(harden(['b']));
  const secondDeposit = amountMath.make(harden(['ab']));
  const result = purse.eventualWithdraw(searchAmount);
  purse.deposit(mint.mintPayment(firstDeposit));
  purse.deposit(mint.mintPayment(secondDeposit));
  const payment = await E(result).getPayment();
  t.deepEqual(await issuer.getAmountOf(payment), secondDeposit);
});

test('eventualWithdraw SET', async t => {
  const { mint, issuer, amountMath } = makeIssuerKit('set', MathKind.SET);
  const purse = issuer.makeEmptyPurse();

  const instance = {};
  const searchAmount = amountMath.make(
    harden([{ instance, description: 'myInvitation' }]),
  );
  const firstDeposit = amountMath.make(
    harden([{ description: 'otherInvitation' }]),
  );
  const secondDeposit = amountMath.make(
    harden([{ instance, description: 'myInvitation', installation: {} }]),
  );
  const result = purse.eventualWithdraw(searchAmount);
  purse.deposit(mint.mintPayment(firstDeposit));
  purse.deposit(mint.mintPayment(secondDeposit));
  const payment = await E(result).getPayment();
  t.deepEqual(await issuer.getAmountOf(payment), secondDeposit);
});

test('eventualWithdraw SET cancelled', async t => {
  const { issuer, amountMath } = makeIssuerKit('set', MathKind.SET);
  const purse = issuer.makeEmptyPurse();

  const searchAmount = amountMath.make(
    harden([{ instance: {}, description: 'myInvitation' }]),
  );
  const result = purse.eventualWithdraw(searchAmount);
  await E(result).cancel();
  await t.throwsAsync(() => E(result).getPayment(), {
    message: 'searchAmount could not be withdrawn',
  });
});
