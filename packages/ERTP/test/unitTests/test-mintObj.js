// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { Far } from '@endo/marshal';
import { M } from '@agoric/store';

import { makeIssuerKit, AssetKind, AmountMath } from '../../src/index.js';

test('mint.getIssuer', t => {
  const { mint, issuer } = makeIssuerKit('fungible');
  t.is(mint.getIssuer(), issuer);
});

test('mint.mintPayment default nat AssetKind', async t => {
  const { mint, issuer, brand } = makeIssuerKit('fungible');
  const fungible1000 = AmountMath.make(brand, 1000n);
  const payment1 = mint.mintPayment(fungible1000);
  const paymentBalance1 = await issuer.getAmountOf(payment1);
  t.assert(AmountMath.isEqual(paymentBalance1, fungible1000));

  const payment2 = mint.mintPayment(AmountMath.make(brand, 1000n));
  const paymentBalance2 = await issuer.getAmountOf(payment2);
  t.assert(AmountMath.isEqual(paymentBalance2, fungible1000));
});

test('mint.mintPayment set w strings AssetKind', async t => {
  const { mint, issuer, brand } = makeIssuerKit(
    'items',
    AssetKind.SET,
    undefined,
    undefined,
    { elementSchema: M.string() },
  );
  const items1and2and4 = AmountMath.make(brand, harden(['1', '2', '4']));
  const payment1 = mint.mintPayment(items1and2and4);
  const paymentBalance1 = await issuer.getAmountOf(payment1);
  t.assert(AmountMath.isEqual(paymentBalance1, items1and2and4));

  const items5and6 = AmountMath.make(brand, harden(['5', '6']));
  const payment2 = mint.mintPayment(items5and6);
  const paymentBalance2 = await issuer.getAmountOf(payment2);
  t.assert(AmountMath.isEqual(paymentBalance2, items5and6));

  const badAmount = AmountMath.make(brand, harden([['badElement']]));
  t.throws(() => mint.mintPayment(badAmount), {
    message: / - Must have passStyle or tag "string"/,
  });
});

test('mint.mintPayment set AssetKind', async t => {
  const { mint, issuer, brand } = makeIssuerKit('items', AssetKind.SET);
  const item1handle = Far('iface', {});
  const item2handle = Far('iface', {});
  const item3handle = Far('iface', {});
  const items1and2 = AmountMath.make(brand, harden([item1handle, item2handle]));
  const payment1 = mint.mintPayment(items1and2);
  const paymentBalance1 = await issuer.getAmountOf(payment1);
  t.assert(AmountMath.isEqual(paymentBalance1, items1and2));

  const item3 = AmountMath.make(brand, harden([item3handle]));
  const payment2 = mint.mintPayment(item3);
  const paymentBalance2 = await issuer.getAmountOf(payment2);
  t.assert(AmountMath.isEqual(paymentBalance2, item3));

  // TODO: prevent reminting the same non-fungible amounts
  // https://github.com/Agoric/agoric-sdk/issues/552
  const payment3 = mint.mintPayment(item3);
  const paymentBalance3 = await issuer.getAmountOf(payment3);
  t.assert(AmountMath.isEqual(paymentBalance3, item3));
});

test('mint.mintPayment set AssetKind with invites', async t => {
  const { mint, issuer, brand } = makeIssuerKit('items', AssetKind.SET);
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
  const invites1and2 = AmountMath.make(
    brand,
    harden([invite1Value, invite2Value]),
  );
  const payment1 = mint.mintPayment(invites1and2);
  const paymentBalance1 = await issuer.getAmountOf(payment1);
  t.assert(AmountMath.isEqual(paymentBalance1, invites1and2));

  const invite3 = AmountMath.make(brand, harden([invite3Value]));
  const payment2 = mint.mintPayment(invite3);
  const paymentBalance2 = await issuer.getAmountOf(payment2);
  t.assert(AmountMath.isEqual(paymentBalance2, invite3));
});

// Tests related to non-fungible tokens
// This test models ballet tickets
test('non-fungible tokens example', async t => {
  t.plan(11);
  const {
    mint: balletTicketMint,
    issuer: balletTicketIssuer,
    brand,
  } = makeIssuerKit('Agoric Ballet Opera tickets', AssetKind.SET);

  const startDateString = new Date(2020, 1, 17, 20, 30).toISOString();

  const ticketDescriptionObjects = Array(5)
    .fill('')
    .map((_, i) =>
      harden({
        seat: i + 1,
        show: 'The Sofa',
        start: startDateString,
      }),
    );

  const balletTicketPayments = ticketDescriptionObjects.map(
    ticketDescription => {
      return balletTicketMint.mintPayment(
        AmountMath.make(brand, harden([ticketDescription])),
      );
    },
  );

  // Alice will buy ticket 1
  const paymentForAlice = balletTicketPayments[0];
  // Bob will buy tickets 3 and 4
  const paymentForBob = balletTicketIssuer.combine(
    harden([balletTicketPayments[2], balletTicketPayments[3]]),
  );

  // ALICE SIDE
  // Alice bought ticket 1 and has access to the balletTicketIssuer, because
  // it's public
  const myTicketPaymentAlice = await balletTicketIssuer.claim(paymentForAlice);
  // the call to claim() hasn't thrown, so Alice knows myTicketPaymentAlice
  // is a genuine 'Agoric Ballet Opera tickets' payment and she has exclusive
  // access to its handle
  const paymentAmountAlice = await balletTicketIssuer.getAmountOf(
    myTicketPaymentAlice,
  );
  assert(Array.isArray(paymentAmountAlice.value));
  t.is(paymentAmountAlice.value.length, 1);
  t.is(paymentAmountAlice.value[0].seat, 1);
  t.is(paymentAmountAlice.value[0].show, 'The Sofa');
  t.is(paymentAmountAlice.value[0].start, startDateString);

  // BOB SIDE
  // Bob bought ticket 3 and 4 and has access to the balletTicketIssuer, because
  // it's public
  const bobTicketPayment = await balletTicketIssuer.claim(paymentForBob);
  const paymentAmountBob = await balletTicketIssuer.getAmountOf(
    bobTicketPayment,
  );
  assert(Array.isArray(paymentAmountBob.value));
  t.is(paymentAmountBob.value.length, 2);
  t.is(paymentAmountBob.value[0].seat, 4);
  t.is(paymentAmountBob.value[1].seat, 3);
  t.is(paymentAmountBob.value[0].show, 'The Sofa');
  t.is(paymentAmountBob.value[1].show, 'The Sofa');
  t.is(paymentAmountBob.value[0].start, startDateString);
  t.is(paymentAmountBob.value[1].start, startDateString);
});
