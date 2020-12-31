// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { makeIssuerKit, MathKind, eventualWithdraw } from '../../src';

test('eventualWithdraw NAT', async t => {
  const { mint, issuer, amountMath } = makeIssuerKit('fungible');
  const purse = issuer.makeEmptyPurse();

  const searchAmount = amountMath.make(5);
  const firstDeposit = amountMath.make(2);
  const secondDeposit = amountMath.make(10);
  const paymentP = eventualWithdraw(purse, amountMath, searchAmount);
  purse.deposit(mint.mintPayment(firstDeposit));
  purse.deposit(mint.mintPayment(secondDeposit));
  const payment = await paymentP;
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
  const paymentP = eventualWithdraw(purse, amountMath, searchAmount);
  purse.deposit(mint.mintPayment(firstDeposit));
  purse.deposit(mint.mintPayment(secondDeposit));
  const payment = await paymentP;
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
  const paymentP = eventualWithdraw(purse, amountMath, searchAmount);
  purse.deposit(mint.mintPayment(firstDeposit));
  purse.deposit(mint.mintPayment(secondDeposit));
  const payment = await paymentP;
  t.deepEqual(await issuer.getAmountOf(payment), secondDeposit);
});

test('eventualWithdraw SET never found with deposits', async t => {
  const { mint, issuer, amountMath } = makeIssuerKit('set', MathKind.SET);
  const purse = issuer.makeEmptyPurse();

  const instance = {};
  const searchAmount = amountMath.make(
    harden([{ instance, description: 'myInvitation' }]),
  );
  await t.throwsAsync(() => eventualWithdraw(purse, amountMath, searchAmount), {
    message: 'searchAmount could not be withdrawn',
  });
  purse.deposit(mint.mintPayment(amountMath.getEmpty()));
});

test('eventualWithdraw SET never found without deposits', async t => {
  const { issuer, amountMath } = makeIssuerKit('set', MathKind.SET);
  const purse = issuer.makeEmptyPurse();

  const instance = {};
  const searchAmount = amountMath.make(
    harden([{ instance, description: 'myInvitation' }]),
  );
  await t.throwsAsync(() => eventualWithdraw(purse, amountMath, searchAmount), {
    message: 'searchAmount could not be withdrawn',
  });
});
