import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../zoe';
import { setup } from '../setupBasicMints';

const simpleExchangeRoot = `${__dirname}/../../../contracts/simpleExchange`;

test.skip('zoe - simpleExchange', async t => {
  try {
    const { assays: originalAssays, mints, unitOps } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(simpleExchangeRoot);

    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(3));
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(0));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeUnits(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Alice creates a simpleExchange instance
    const aliceInvite = await zoe.makeInstance(installationHandle, {
      assays,
    });
    const { instanceHandle } = aliceInvite.getBalance().extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSellOrderOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: assays[0].makeUnits(3),
        },
        {
          kind: 'wantAtLeast',
          units: assays[1].makeUnits(4),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceSellOrderOfferRules,
      alicePayments,
    );

    // 4: Alice adds her sell order to the exchange
    const aliceOfferResult = await aliceSeat.addOrder();
    const bobInvite = publicAPI.makeInvite();

    // 5: Alice spreads the invite far and wide with instructions
    // on how to use it and Bob decides he wants to join.

    const inviteAssay = zoe.getInviteAssay();
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
        {
          kind: 'wantAtLeast',
          units: bobTerms.assays[0].makeUnits(3),
        },
        {
          kind: 'offerAtMost',
          units: bobTerms.assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
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
