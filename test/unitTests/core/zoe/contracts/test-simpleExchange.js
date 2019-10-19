import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeZoe } from '../../../../../core/zoe/zoe/zoe';
import { setup } from '../setupBasicMints';

import { simpleExchangeSrcs } from '../../../../../core/zoe/contracts/simpleExchange';

test('zoe - simpleExchange', async t => {
  try {
    const { assays: originalAssays, mints, descOps } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = await makeZoe();
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(3));
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(0));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Alice creates a simpleExchange instance
    const installationId = zoe.install(simpleExchangeSrcs);
    const { instance: aliceExchange, instanceId } = await zoe.makeInstance(
      assays,
      installationId,
    );

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSellOrderConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'wantAtLeast',
          assetDesc: assays[1].makeAssetDesc(4),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payoff: alicePayoffP,
    } = await zoe.escrow(aliceSellOrderConditions, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment. It's
    // unnecessary if she trusts Zoe but we will do it for the tests.
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 4: Alice adds her sell order to the exchange
    const aliceOfferResult = await aliceExchange.addOrder(aliceEscrowReceipt);

    // 5: Alice spreads the instanceId far and wide with instructions
    // on how to use it and Bob decides he wants to join.

    const {
      instance: bobExchange,
      installationId: bobInstallationId,
      assays: bobAssays,
    } = zoe.getInstance(instanceId);

    t.equals(bobInstallationId, installationId);
    t.deepEquals(bobAssays, assays);

    // Bob creates a buy order, saying that he wants exactly 3 moola,
    // and is willing to pay up to 7 simoleans.

    const bobBuyOrderConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: bobAssays[0].makeAssetDesc(3),
        },
        {
          rule: 'offerAtMost',
          assetDesc: bobAssays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // 6: Bob escrows with zoe
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payoff: bobPayoffP,
    } = await zoe.escrow(bobBuyOrderConditions, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment. This is
    // unnecessary but we will do it anyways for the test
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob submits the buy order to the exchange
    const bobOfferResult = await bobExchange.addOrder(bobEscrowReceipt);

    t.equals(
      bobOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );
    t.equals(
      aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );
    const bobPayoff = await bobPayoffP;
    const [aliceMoolaPayoff, aliceSimoleanPayoff] = await alicePayoffP;

    // Alice gets paid at least what she wanted
    t.ok(
      descOps[1].includes(
        aliceSimoleanPayoff.getBalance(),
        aliceSellOrderConditions.offerDesc[1].assetDesc,
      ),
    );

    // Alice sold all of her moola
    t.equals(aliceMoolaPayoff.getBalance().extent, 0);

    // 13: Alice deposits her winnings to ensure she can
    await aliceMoolaPurse.depositAll(aliceMoolaPayoff);
    await aliceSimoleanPurse.depositAll(aliceSimoleanPayoff);

    // 14: Bob deposits his original payments to ensure he can
    await bobMoolaPurse.depositAll(bobPayoff[0]);
    await bobSimoleanPurse.depositAll(bobPayoff[1]);

    // Assert that the correct winnings were received.
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
