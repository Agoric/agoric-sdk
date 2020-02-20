import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const myFirstDappRoot = `${__dirname}/../../../src/contracts/myFirstDapp`;

function makeRule(kind, units) {
  return { kind, units };
}

function offerRule(units) {
  return makeRule('offerAtMost', units);
}

function wantRule(units) {
  return makeRule('wantAtLeast', units);
}

function exitRule(kind) {
  return { kind };
}

test('myFirstDapp with valid offers', async t => {
  try {
    const { assays: originalAssays, mints, unitOps } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(myFirstDappRoot);

    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(3));
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(0));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeUnits(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Simon creates a simpleExchange instance and spreads the invite far and
    // wide with instructions on how to use it.
    const { invite: simonInvite } = await zoe.makeInstance(installationHandle, {
      assays,
    });
    const { instanceHandle } = simonInvite.getBalance().extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);
    const inviteAssay = zoe.getInviteAssay();

    const { invite: aliceInvite } = publicAPI.makeInvite();

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSellOrderOfferRules = harden({
      payoutRules: [
        offerRule(assays[0].makeUnits(3)),
        wantRule(assays[1].makeUnits(4)),
      ],
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
    const bobExclusiveInvite = await inviteAssay.claimAll(bobInvite);

    const {
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(bobExclusiveInvite.getBalance().extent.instanceHandle);

    t.equals(bobInstallationId, installationHandle);
    t.deepEquals(bobTerms.assays, assays);

    // Bob creates a buy order, saying that he wants exactly 3 moola,
    // and is willing to pay up to 7 simoleans.

    const bobBuyOrderOfferRules = harden({
      payoutRules: [
        wantRule(assays[0].makeUnits(3)),
        offerRule(assays[1].makeUnits(7)),
      ],
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
    t.ok(
      unitOps[1].includes(
        aliceSimoleanPayout.getBalance(),
        aliceSellOrderOfferRules.payoutRules[1].units,
      ),
    );

    // Alice sold all of her moola
    t.equals(aliceMoolaPayout.getBalance().extent, 0);

    // 13: Alice deposits her payout to ensure she can
    await aliceMoolaPurse.depositAll(aliceMoolaPayout);
    await aliceSimoleanPurse.depositAll(aliceSimoleanPayout);

    // 14: Bob deposits his original payments to ensure he can
    await bobMoolaPurse.depositAll(bobMoolaPayout);
    await bobSimoleanPurse.depositAll(bobSimoleanPayout);

    // Assert that the correct payout were received.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    t.equals(aliceMoolaPurse.getBalance().extent, 0);
    t.equals(aliceSimoleanPurse.getBalance().extent, 7);
    t.equals(bobMoolaPurse.getBalance().extent, 3);
    t.equals(bobSimoleanPurse.getBalance().extent, 0);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('myFirstDapp with multiple sell offers', async t => {
  try {
    const { assays: originalAssays, mints } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(myFirstDappRoot);

    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(30));
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(30));
    // 1: Simon creates a simpleExchange instance and spreads the invite far and
    // wide with instructions on how to use it.
    const { invite: simonInvite } = await zoe.makeInstance(installationHandle, {
      assays,
    });
    const { instanceHandle } = simonInvite.getBalance().extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);
    const inviteAssay = zoe.getInviteAssay();

    const { invite: aliceInvite1 } = publicAPI.makeInvite();

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSale1OrderOfferRules = harden({
      payoutRules: [
        offerRule(assays[0].makeUnits(3)),
        wantRule(assays[1].makeUnits(4)),
      ],
      exitRule: exitRule('onDemand'),
    });

    const alicePayments = [aliceMoolaPurse.withdraw(3), undefined];
    const { seat: aliceSeat1 } = await zoe.redeem(
      aliceInvite1,
      aliceSale1OrderOfferRules,
      alicePayments,
    );

    // 4: Alice adds her sell order to the exchange
    const aliceOfferResult1 = aliceSeat1.addOrder();

    // 5: Alice adds another sell order to the exchange
    const aliceInvite2 = await inviteAssay.claimAll(
      publicAPI.makeInvite().invite,
    );
    const aliceSale2OrderOfferRules = harden({
      payoutRules: [
        offerRule(assays[0].makeUnits(5)),
        wantRule(assays[1].makeUnits(8)),
      ],
      exitRule: exitRule('onDemand'),
    });
    const { seat: aliceSeat2 } = await zoe.redeem(
      aliceInvite2,
      aliceSale2OrderOfferRules,
      [aliceMoolaPurse.withdraw(5), undefined],
    );
    const aliceOfferResult2 = aliceSeat2.addOrder();

    // 5: Alice adds a buy order to the exchange
    const aliceInvite3 = await inviteAssay.claimAll(
      publicAPI.makeInvite().invite,
    );
    const aliceBuyOrderOfferRules = harden({
      payoutRules: [
        wantRule(assays[0].makeUnits(29)),
        offerRule(assays[1].makeUnits(18)),
      ],
      exitRule: exitRule('onDemand'),
    });
    const { seat: aliceSeat3 } = await zoe.redeem(
      aliceInvite3,
      aliceBuyOrderOfferRules,
      [undefined, aliceSimoleanPurse.withdraw(18)],
    );
    const aliceOfferResult3 = aliceSeat3.addOrder();

    Promise.all(aliceOfferResult1, aliceOfferResult2, aliceOfferResult3).then(
      () => {
        const expectedBook = {
          buys: [
            {
              want: assays[0].makeUnits(29),
              offer: assays[1].makeUnits(18),
            },
          ],
          sells: [
            {
              offer: assays[0].makeUnits(3),
              want: assays[1].makeUnits(4),
            },
            {
              offer: assays[0].makeUnits(5),
              want: assays[1].makeUnits(8),
            },
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

test('myFirstDapp showPayoutRules', async t => {
  try {
    const { assays: originalAssays, mints } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(myFirstDappRoot);

    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(30));
    // 1: Simon creates a simpleExchange instance and spreads the invite far and
    // wide with instructions on how to use it.
    const { invite: simonInvite } = await zoe.makeInstance(installationHandle, {
      assays,
    });
    const { instanceHandle } = simonInvite.getBalance().extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);

    const { invite: aliceInvite1, inviteHandle } = publicAPI.makeInvite();

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSale1OrderOfferRules = harden({
      payoutRules: [
        offerRule(assays[0].makeUnits(3)),
        wantRule(assays[1].makeUnits(4)),
      ],
      exitRule: exitRule('onDemand'),
    });

    const alicePayments = [aliceMoolaPurse.withdraw(3), undefined];
    const { seat: aliceSeat1 } = await zoe.redeem(
      aliceInvite1,
      aliceSale1OrderOfferRules,
      alicePayments,
    );

    // 4: Alice adds her sell order to the exchange
    aliceSeat1.addOrder();

    const expected = {
      offer: assays[0].makeUnits(3),
      want: assays[1].makeUnits(4),
    };

    t.deepEquals(publicAPI.getOffer(inviteHandle), expected);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test.only('myFirstDapp showPayoutRules', async t => {
  try {
    const { assays: originalAssays } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(myFirstDappRoot);

    const installationHandle = zoe.install(source, moduleFormat);

    const { invite: simonInvite } = await zoe.makeInstance(installationHandle, {
      assays,
    });
    const { instanceHandle } = simonInvite.getBalance().extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);

    const assayStructure = publicAPI.getAssays();

    t.deepEquals(assayStructure, assays);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
