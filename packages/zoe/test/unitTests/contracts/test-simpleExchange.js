// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { assert, details } from '@agoric/assert';
import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const simpleExchange = `${__dirname}/../../../src/contracts/simpleExchange`;

test('simpleExchange with valid offers', async t => {
  try {
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
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    const { instanceHandle } = inviteIssuer.getAmountOf(simonInvite).extent[0];
    const { publicAPI } = zoe.getInstance(instanceHandle);

    const { invite: aliceInvite } = publicAPI.makeInvite();

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSellOrderOfferRules = harden({
      offer: { Asset: moola(3) },
      want: { Price: simoleans(4) },
      exitRule: { kind: 'onDemand' },
    });
    const alicePayments = { Asset: aliceMoolaPayment };
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceSellOrderOfferRules,
      alicePayments,
    );

    // 4: Alice adds her sell order to the exchange
    const aliceOfferResult = await aliceSeat.makeOffer();
    const { invite: bobInvite } = publicAPI.makeInvite();

    // 5: Bob decides to join.
    const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);

    const {
      installationHandle: bobInstallationId,
      roles: bobRoles,
    } = zoe.getInstance(instanceHandle);

    t.equals(bobInstallationId, installationHandle);

    assert(
      bobRoles.Asset === moolaIssuer,
      details`The Asset issuer should be the moola issuer`,
    );
    assert(
      bobRoles.Price === simoleanIssuer,
      details`The Price issuer should be the simolean issuer`,
    );

    // Bob creates a buy order, saying that he wants exactly 3 moola,
    // and is willing to pay up to 7 simoleans.
    const bobBuyOrderOfferRules = harden({
      offer: { Price: simoleans(7) },
      want: { Asset: moola(3) },
      exitRule: { kind: 'onDemand' },
    });
    const bobPayments = { Price: bobSimoleanPayment };

    // 6: Bob escrows with zoe
    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclusiveInvite,
      bobBuyOrderOfferRules,
      bobPayments,
    );

    // 8: Bob submits the buy order to the exchange
    const bobOfferResult = await bobSeat.makeOffer();

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

    const bobMoolaPayout = await bobPayout.Asset;
    const bobSimoleanPayout = await bobPayout.Price;
    const aliceMoolaPayout = await alicePayout.Asset;
    const aliceSimoleanPayout = await alicePayout.Price;

    // Alice gets paid at least what she wanted
    t.ok(
      amountMaths[1].isGTE(
        simoleanIssuer.getAmountOf(aliceSimoleanPayout),
        aliceSellOrderOfferRules.want.Price,
      ),
    );

    // Alice sold all of her moola
    t.deepEquals(moolaIssuer.getAmountOf(aliceMoolaPayout), moola(0));

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
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
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
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    const { instanceHandle } = inviteIssuer.getAmountOf(simonInvite).extent[0];
    const { publicAPI } = zoe.getInstance(instanceHandle);

    const { invite: aliceInvite1 } = publicAPI.makeInvite();

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSale1OrderOfferRules = harden({
      offer: { Asset: moola(3) },
      want: { Price: simoleans(4) },
      exitRule: { kind: 'onDemand' },
    });

    const alicePayments = { Asset: aliceMoolaPurse.withdraw(moola(3)) };
    const { seat: aliceSeat1 } = await zoe.redeem(
      aliceInvite1,
      aliceSale1OrderOfferRules,
      alicePayments,
    );

    // 4: Alice adds her sell order to the exchange
    const aliceOfferResult1 = aliceSeat1.makeOffer();

    // 5: Alice adds another sell order to the exchange
    const aliceInvite2 = await inviteIssuer.claim(
      publicAPI.makeInvite().invite,
    );
    const aliceSale2OrderOfferRules = harden({
      offer: { Asset: moola(5) },
      want: { Price: simoleans(8) },
      exitRule: { kind: 'onDemand' },
    });
    const { seat: aliceSeat2 } = await zoe.redeem(
      aliceInvite2,
      aliceSale2OrderOfferRules,
      { Asset: aliceMoolaPurse.withdraw(moola(5)) },
    );
    const aliceOfferResult2 = aliceSeat2.makeOffer();

    // 5: Alice adds a buy order to the exchange
    const aliceInvite3 = await inviteIssuer.claim(
      publicAPI.makeInvite().invite,
    );
    const aliceBuyOrderOfferRules = harden({
      offer: { Price: simoleans(18) },
      want: { Asset: moola(29) },
      exitRule: { kind: 'onDemand' },
    });
    const { seat: aliceSeat3 } = await zoe.redeem(
      aliceInvite3,
      aliceBuyOrderOfferRules,
      { Price: aliceSimoleanPurse.withdraw(simoleans(18)) },
    );
    const aliceOfferResult3 = aliceSeat3.makeOffer();

    Promise.all(aliceOfferResult1, aliceOfferResult2, aliceOfferResult3).then(
      () => {
        const expectedBook = {
          changed: {},
          buys: [[{ Asset: 29 }, { Price: 18 }]],
          sells: [
            [{ Price: 4 }, { Asset: 3 }],
            [{ Price: 8 }, { Asset: 5 }],
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
  try {
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
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    const { instanceHandle } = inviteIssuer.getAmountOf(simonInvite).extent[0];
    const { publicAPI } = zoe.getInstance(instanceHandle);

    const { invite: aliceInvite, inviteHandle } = publicAPI.makeInvite();

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSale1OrderOfferRules = harden({
      offer: { Asset: moola(3) },
      want: { Price: simoleans(4) },
      exitRule: { kind: 'onDemand' },
    });

    const alicePayments = { Asset: aliceMoolaPayment };
    const { seat: aliceSeat1 } = await zoe.redeem(
      aliceInvite,
      aliceSale1OrderOfferRules,
      alicePayments,
    );

    // 4: Alice adds her sell order to the exchange
    aliceSeat1.makeOffer();

    const expected = [{ Price: 4 }, { Asset: 3 }];

    t.deepEquals(publicAPI.getOffer(inviteHandle), expected);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
