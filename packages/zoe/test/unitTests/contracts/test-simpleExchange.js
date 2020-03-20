// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const simpleExchange = `${__dirname}/../../../src/contracts/simpleExchange`;

function makeRule(kind, amount) {
  return { kind, amount };
}

function offerRule(amount) {
  return makeRule('offerAtMost', amount);
}

function wantRule(amount) {
  return makeRule('wantAtLeast', amount);
}

function exitRule(kind) {
  return { kind };
}

test('simpleExchange with valid offers', async t => {
  t.plan(10);

  const { issuers, mints, amountMaths, moola, simoleans } = setup();
  const [moolaIssuer, simoleanIssuer] = issuers;
  const [moolaMint, simoleanMint] = mints;
  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();
  // Pack the contract.
  const { source, moduleFormat } = await bundleSource(simpleExchange);

  const installationHandle = zoe.install(source, moduleFormat);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
  const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7));
  const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
  const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // 1: Simon creates a simpleExchange instance and spreads the invite far and
  // wide with instructions on how to use it.
  const { invite: simonInvite } = await zoe.makeInstance(installationHandle, {
    issuers: [moolaIssuer, simoleanIssuer],
  });
  inviteIssuer.getAmountOf(simonInvite).then(async simonInviteAmount => {
    const { instanceHandle } = simonInviteAmount.extent[0];
    const { publicAPI } = zoe.getInstance(instanceHandle);

    const { invite: aliceInvite } = publicAPI.makeInvite();

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSellOrderOfferRules = harden({
      payoutRules: [offerRule(moola(3)), wantRule(simoleans(4))],
      exitRule: exitRule('onDemand'),
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceSellOrderOfferRules,
      alicePayments,
    );

    // 4: Alice adds her sell order to the exchange
    const aliceOfferResult = await aliceSeat.addOrder();
    const { invite: bobInvite } = publicAPI.makeInvite();

    // 5: Bob decides to join.
    const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);

    const {
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(instanceHandle);

    t.equals(bobInstallationId, installationHandle);
    t.deepEquals(bobTerms.issuers, [moolaIssuer, simoleanIssuer]);

    // Bob creates a buy order, saying that he wants exactly 3 moola,
    // and is willing to pay up to 7 simoleans.

    const bobBuyOrderOfferRules = harden({
      payoutRules: [wantRule(moola(3)), offerRule(simoleans(7))],
      exitRule: exitRule('onDemand'),
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // 6: Bob escrows with zoe
    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclusiveInvite,
      bobBuyOrderOfferRules,
      bobPayments,
    );

    // 8: Bob submits the buy order to the exchange
    const bobOfferResult = await bobSeat.addOrder();

    t.equals(
      bobOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );
    t.equals(
      aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );
    const bobPayout = await bobPayoutP;
    const alicePayout = await alicePayoutP;

    const [bobMoolaPayout, bobSimoleanPayout] = await Promise.all(bobPayout);
    const [aliceMoolaPayout, aliceSimoleanPayout] = await Promise.all(
      alicePayout,
    );

    // Alice gets paid at least what she wanted
    const aliceSimoleanAmount = await simoleanIssuer.getAmountOf(
      aliceSimoleanPayout,
    );
    t.ok(
      amountMaths[1].isGTE(
        aliceSimoleanAmount,
        aliceSellOrderOfferRules.payoutRules[1].amount,
      ),
    );

    // Alice sold all of her moola
    const aliceMoolaAmount = await moolaIssuer.getAmountOf(aliceMoolaPayout);
    t.deepEquals(aliceMoolaAmount, moola(0));

    // 13: Alice deposits her payout to ensure she can
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // 14: Bob deposits his original payments to ensure he can
    await bobMoolaPurse.deposit(bobMoolaPayout);
    await bobSimoleanPurse.deposit(bobSimoleanPayout);

    // Assert that the correct payout were received.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    t.equals(aliceMoolaPurse.getCurrentAmount().extent, 0);
    t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 7);
    t.equals(bobMoolaPurse.getCurrentAmount().extent, 3);
    t.equals(bobSimoleanPurse.getCurrentAmount().extent, 0);
  });
});

test('simpleExchange with multiple sell offers', async t => {
  try {
    const { issuers, mints, moola, simoleans } = setup();
    const [moolaIssuer, simoleanIssuer] = issuers;
    const [moolaMint, simoleanMint] = mints;
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(simpleExchange);

    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPayment = moolaMint.mintPayment(moola(30));
    const aliceSimoleanPayment = simoleanMint.mintPayment(simoleans(30));
    const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();
    await aliceMoolaPurse.deposit(aliceMoolaPayment);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayment);

    // 1: Simon creates a simpleExchange instance and spreads the invite far and
    // wide with instructions on how to use it.
    const { invite: simonInvite } = await zoe.makeInstance(installationHandle, {
      issuers: [moolaIssuer, simoleanIssuer],
    });
    const simonInviteAmount = await inviteIssuer.getAmountOf(simonInvite);
    const { instanceHandle } = simonInviteAmount.extent[0];
    const { publicAPI } = zoe.getInstance(instanceHandle);

    const { invite: aliceInvite1 } = publicAPI.makeInvite();

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSale1OrderOfferRules = harden({
      payoutRules: [offerRule(moola(3)), wantRule(simoleans(4))],
      exitRule: exitRule('onDemand'),
    });

    const alicePayments = [aliceMoolaPurse.withdraw(moola(3)), undefined];
    const { seat: aliceSeat1 } = await zoe.redeem(
      aliceInvite1,
      aliceSale1OrderOfferRules,
      alicePayments,
    );

    // 4: Alice adds her sell order to the exchange
    const aliceOfferResult1 = aliceSeat1.addOrder();

    // 5: Alice adds another sell order to the exchange
    const aliceInvite2 = await inviteIssuer.claim(
      publicAPI.makeInvite().invite,
    );
    const aliceSale2OrderOfferRules = harden({
      payoutRules: [offerRule(moola(5)), wantRule(simoleans(8))],
      exitRule: exitRule('onDemand'),
    });
    const { seat: aliceSeat2 } = await zoe.redeem(
      aliceInvite2,
      aliceSale2OrderOfferRules,
      [aliceMoolaPurse.withdraw(moola(5)), undefined],
    );
    const aliceOfferResult2 = aliceSeat2.addOrder();

    // 5: Alice adds a buy order to the exchange
    const aliceInvite3 = await inviteIssuer.claim(
      publicAPI.makeInvite().invite,
    );
    const aliceBuyOrderOfferRules = harden({
      payoutRules: [wantRule(moola(29)), offerRule(simoleans(18))],
      exitRule: exitRule('onDemand'),
    });
    const { seat: aliceSeat3 } = await zoe.redeem(
      aliceInvite3,
      aliceBuyOrderOfferRules,
      [undefined, aliceSimoleanPurse.withdraw(simoleans(18))],
    );
    const aliceOfferResult3 = aliceSeat3.addOrder();

    Promise.all(aliceOfferResult1, aliceOfferResult2, aliceOfferResult3).then(
      () => {
        const expectedBook = {
          changed: {},
          buys: [[{ want: moola(29) }, { offer: simoleans(18) }]],
          sells: [
            [{ offer: moola(3) }, { want: simoleans(4) }],
            [{ offer: moola(5) }, { want: simoleans(8) }],
          ],
        };
        t.deepEquals(publicAPI.getBookOrders(), expectedBook);
      },
    );
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('simpleExchange showPayoutRules', async t => {
  t.plan(1);

  const { issuers, mints, moola, simoleans } = setup();
  const [moolaIssuer, simoleanIssuer] = issuers;
  const [moolaMint] = mints;
  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();
  // Pack the contract.
  const { source, moduleFormat } = await bundleSource(simpleExchange);

  const installationHandle = zoe.install(source, moduleFormat);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
  // 1: Simon creates a simpleExchange instance and spreads the invite far and
  // wide with instructions on how to use it.
  const { invite: simonInvite } = await zoe.makeInstance(installationHandle, {
    issuers: [moolaIssuer, simoleanIssuer],
  });
  inviteIssuer.getAmountOf(simonInvite).then(simonInviteAmout => {
    const { instanceHandle } = simonInviteAmout.extent[0];
    const { publicAPI } = zoe.getInstance(instanceHandle);

    const { invite: aliceInvite1, inviteHandle } = publicAPI.makeInvite();

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSale1OrderOfferRules = harden({
      payoutRules: [offerRule(moola(3)), wantRule(simoleans(4))],
      exitRule: exitRule('onDemand'),
    });

    const alicePayments = [aliceMoolaPayment, undefined];
    zoe
      .redeem(aliceInvite1, aliceSale1OrderOfferRules, alicePayments)
      .then(aliceSeat1P => {
        const { seat: aliceSeat1 } = aliceSeat1P;

        // 4: Alice adds her sell order to the exchange
        aliceSeat1.addOrder();

        const expected = [{ offer: moola(3) }, { want: simoleans(4) }];

        t.deepEquals(publicAPI.getOffer(inviteHandle), expected);
      });
  });
});
