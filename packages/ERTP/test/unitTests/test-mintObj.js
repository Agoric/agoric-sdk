import test from 'ava';

import { Far } from '@agoric/marshal';
// eslint-disable-next-line import/no-extraneous-dependencies
import { makeIssuerKit, MathKind } from '../../src';

test('mint.getIssuer', t => {
  const { mint, issuer } = makeIssuerKit('fungible');
  t.is(mint.getIssuer(), issuer);
});

test('mint.mintPayment default nat MathKind', async t => {
  const { mint, issuer, amountMath } = makeIssuerKit('fungible');
  const fungible1000 = amountMath.make(1000);
  const payment1 = mint.mintPayment(fungible1000);
  const paymentBalance1 = await issuer.getAmountOf(payment1);
  t.assert(amountMath.isEqual(paymentBalance1, fungible1000));

  const payment2 = mint.mintPayment(amountMath.make(1000));
  const paymentBalance2 = await issuer.getAmountOf(payment2);
  t.assert(amountMath.isEqual(paymentBalance2, fungible1000));
});

test('mint.mintPayment strSet MathKind', async t => {
  const { mint, issuer, amountMath } = makeIssuerKit(
    'items',
    MathKind.STRING_SET,
  );
  const items1and2and4 = amountMath.make(harden(['1', '2', '4']));
  const payment1 = mint.mintPayment(items1and2and4);
  const paymentBalance1 = await issuer.getAmountOf(payment1);
  t.assert(amountMath.isEqual(paymentBalance1, items1and2and4));

  const items5and6 = amountMath.make(harden(['5', '6']));
  const payment2 = mint.mintPayment(items5and6);
  const paymentBalance2 = await issuer.getAmountOf(payment2);
  t.assert(amountMath.isEqual(paymentBalance2, items5and6));
});

test('mint.mintPayment set MathKind', async t => {
  const { mint, issuer, amountMath } = makeIssuerKit('items', MathKind.SET);
  const item1handle = Far('iface', {});
  const item2handle = Far('iface', {});
  const item3handle = Far('iface', {});
  const items1and2 = amountMath.make(harden([item1handle, item2handle]));
  const payment1 = mint.mintPayment(items1and2);
  const paymentBalance1 = await issuer.getAmountOf(payment1);
  t.assert(amountMath.isEqual(paymentBalance1, items1and2));

  const item3 = amountMath.make(harden([item3handle]));
  const payment2 = mint.mintPayment(item3);
  const paymentBalance2 = await issuer.getAmountOf(payment2);
  t.assert(amountMath.isEqual(paymentBalance2, item3));

  // TODO: prevent reminting the same non-fungible amounts
  // https://github.com/Agoric/agoric-sdk/issues/552
  const payment3 = mint.mintPayment(item3);
  const paymentBalance3 = await issuer.getAmountOf(payment3);
  t.assert(amountMath.isEqual(paymentBalance3, item3));
});

test('mint.mintPayment set MathKind with invites', async t => {
  const { mint, issuer, amountMath } = makeIssuerKit('items', MathKind.SET);
  const instanceHandle1 = Far('iface', {});
  const invite1Value = {
    handle: Far('iface', {}),
    instanceHandle: instanceHandle1,
  };
  const invite2Value = {
    handle: Far('iface', {}),
    instanceHandle: instanceHandle1,
  };
  const invite3Value = {
    handle: Far('iface', {}),
    instanceHandle: Far('iface', {}),
  };
  const invites1and2 = amountMath.make(harden([invite1Value, invite2Value]));
  const payment1 = mint.mintPayment(invites1and2);
  const paymentBalance1 = await issuer.getAmountOf(payment1);
  t.assert(amountMath.isEqual(paymentBalance1, invites1and2));

  const invite3 = amountMath.make(harden([invite3Value]));
  const payment2 = mint.mintPayment(invite3);
  const paymentBalance2 = await issuer.getAmountOf(payment2);
  t.assert(amountMath.isEqual(paymentBalance2, invite3));
});

// Tests related to non-fungible tokens
// This test models ballet tickets
test('non-fungible tokens example', async t => {
  t.plan(11);
  const {
    mint: balletTicketMint,
    issuer: balletTicketIssuer,
    amountMath,
  } = makeIssuerKit('Agoric Ballet Opera tickets', MathKind.SET);

  const startDateString = new Date(2020, 1, 17, 20, 30).toISOString();

  const ticketDescriptionObjects = Array(5)
    .fill()
    .map((_, i) => ({
      seat: i + 1,
      show: 'The Sofa',
      start: startDateString,
    }));

  const balletTicketPayments = ticketDescriptionObjects.map(
    ticketDescription => {
      return balletTicketMint.mintPayment(
        amountMath.make(harden([ticketDescription])),
      );
    },
  );

  // Alice will buy ticket 1
  const paymentForAlice = balletTicketPayments[0];
  // Bob will buy tickets 3 and 4
  const paymentForBob = balletTicketIssuer.combine([
    balletTicketPayments[2],
    balletTicketPayments[3],
  ]);

  // ALICE SIDE
  // Alice bought ticket 1 and has access to the balletTicketIssuer, because it's public
  const myTicketPaymentAlice = await balletTicketIssuer.claim(paymentForAlice);
  // the call to claim() hasn't thrown, so Alice knows myTicketPaymentAlice
  // is a genuine 'Agoric Ballet Opera tickets' payment and she has exclusive access
  // to its handle
  const paymentAmountAlice = await balletTicketIssuer.getAmountOf(
    myTicketPaymentAlice,
  );
  t.is(paymentAmountAlice.value.length, 1);
  t.is(paymentAmountAlice.value[0].seat, 1);
  t.is(paymentAmountAlice.value[0].show, 'The Sofa');
  t.is(paymentAmountAlice.value[0].start, startDateString);

  // BOB SIDE
  // Bob bought ticket 3 and 4 and has access to the balletTicketIssuer, because it's public
  const bobTicketPayment = await balletTicketIssuer.claim(paymentForBob);
  const paymentAmountBob = await balletTicketIssuer.getAmountOf(
    bobTicketPayment,
  );
  t.is(paymentAmountBob.value.length, 2);
  t.is(paymentAmountBob.value[0].seat, 3);
  t.is(paymentAmountBob.value[1].seat, 4);
  t.is(paymentAmountBob.value[0].show, 'The Sofa');
  t.is(paymentAmountBob.value[1].show, 'The Sofa');
  t.is(paymentAmountBob.value[0].start, startDateString);
  t.is(paymentAmountBob.value[1].start, startDateString);
});
