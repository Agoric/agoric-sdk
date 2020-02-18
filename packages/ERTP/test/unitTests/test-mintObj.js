// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import produceIssuer from '../../src/issuer';

test('mint.getIssuer', t => {
  try {
    const { mint, issuer } = produceIssuer('fungible');
    t.equals(mint.getIssuer(), issuer);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('mint.mintPayment default natMathHelper', t => {
  try {
    const { mint, issuer, amountMath } = produceIssuer('fungible');
    const fungible1000 = amountMath.make(1000);
    const payment1 = mint.mintPayment(fungible1000);
    const paymentBalance1 = issuer.getBalance(payment1);
    t.ok(amountMath.isEqual(paymentBalance1, fungible1000));

    const payment2 = mint.mintPayment(1000);
    const paymentBalance2 = issuer.getBalance(payment2);
    t.ok(amountMath.isEqual(paymentBalance2, fungible1000));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('mint.mintPayment strSetMathHelpers', t => {
  try {
    const { mint, issuer, amountMath } = produceIssuer('items', 'strSet');
    const items1and2and4 = amountMath.make(harden(['1', '2', '4']));
    const payment1 = mint.mintPayment(items1and2and4);
    const paymentBalance1 = issuer.getBalance(payment1);
    t.ok(amountMath.isEqual(paymentBalance1, items1and2and4));

    const items5and6 = amountMath.make(harden(['5', '6']));
    const payment2 = mint.mintPayment(items5and6);
    const paymentBalance2 = issuer.getBalance(payment2);
    t.ok(amountMath.isEqual(paymentBalance2, items5and6));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('mint.mintPayment setMathHelpers', t => {
  try {
    const { mint, issuer, amountMath } = produceIssuer('items', 'set');
    const item1handle = {};
    const item2handle = {};
    const item3handle = {};
    const items1and2 = amountMath.make(harden([item1handle, item2handle]));
    const payment1 = mint.mintPayment(items1and2);
    const paymentBalance1 = issuer.getBalance(payment1);
    t.ok(amountMath.isEqual(paymentBalance1, items1and2));

    const item3 = amountMath.make(harden([item3handle]));
    const payment2 = mint.mintPayment(item3);
    const paymentBalance2 = issuer.getBalance(payment2);
    t.ok(amountMath.isEqual(paymentBalance2, item3));

    // TODO: prevent reminting the same non-fungible amounts
    // https://github.com/Agoric/agoric-sdk/issues/552
    const payment3 = mint.mintPayment(item3);
    const paymentBalance3 = issuer.getBalance(payment3);
    t.ok(amountMath.isEqual(paymentBalance3, item3));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('mint.mintPayment setMathHelpers with invites', t => {
  try {
    const { mint, issuer, amountMath } = produceIssuer('items', 'set');
    const instanceHandle1 = {};
    const invite1Extent = { handle: {}, instanceHandle: instanceHandle1 };
    const invite2Extent = { handle: {}, instanceHandle: instanceHandle1 };
    const invite3Extent = { handle: {}, instanceHandle: {} };
    const invites1and2 = amountMath.make(
      harden([invite1Extent, invite2Extent]),
    );
    const payment1 = mint.mintPayment(invites1and2);
    const paymentBalance1 = issuer.getBalance(payment1);
    t.ok(amountMath.isEqual(paymentBalance1, invites1and2));

    const invite3 = amountMath.make(harden([invite3Extent]));
    const payment2 = mint.mintPayment(invite3);
    const paymentBalance2 = issuer.getBalance(payment2);
    t.ok(amountMath.isEqual(paymentBalance2, invite3));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
