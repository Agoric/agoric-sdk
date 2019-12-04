import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../zoe';
import { setup } from '../setupBasicMints';

const simpleExchangeRoot = `${__dirname}/../../../contracts/simpleExchange`;

test('zoe - simpleExchange', async t => {
  try {
    const { assays: originalAssays, mints, unitOps } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = await makeZoe({ require });
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();
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
    const {
      instance: aliceExchange,
      instanceHandle,
    } = await zoe.makeInstance(installationHandle, { assays });

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSellOrderOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
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
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payout: alicePayoutP,
    } = await zoe.escrow(aliceSellOrderOfferRules, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment. It's
    // unnecessary if she trusts Zoe but we will do it for the tests.
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 4: Alice adds her sell order to the exchange
    const aliceOfferResult = await aliceExchange.addOrder(aliceEscrowReceipt);

    // 5: Alice spreads the instanceHandle far and wide with instructions
    // on how to use it and Bob decides he wants to join.

    const {
      instance: bobExchange,
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(instanceHandle);

    t.equals(bobInstallationId, installationHandle);
    t.deepEquals(bobTerms.assays, assays);

    // Bob creates a buy order, saying that he wants exactly 3 moola,
    // and is willing to pay up to 7 simoleans.

    const bobBuyOrderOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantExactly',
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
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payout: bobPayoutP,
    } = await zoe.escrow(bobBuyOrderOfferRules, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment. This is
    // unnecessary but we will do it anyways for the test
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob submits the buy order to the exchange
    const bobOfferResult = await bobExchange.addOrder(bobEscrowReceipt);

    t.equals(
      bobOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );
    t.equals(
      aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );
    const bobPayout = await bobPayoutP;
    const [aliceMoolaPayout, aliceSimoleanPayout] = await alicePayoutP;

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
    await bobMoolaPurse.depositAll(bobPayout[0]);
    await bobSimoleanPurse.depositAll(bobPayout[1]);

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
