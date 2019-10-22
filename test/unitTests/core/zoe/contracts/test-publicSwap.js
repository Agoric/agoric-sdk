import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../../../core/zoe/zoe/zoe';
import { setup } from '../setupBasicMints';

const publicSwapRoot = `${__dirname}/../../../../../core/zoe/contracts/publicSwap`;

test('zoe - publicSwap', async t => {
  try {
    const { assays: originalAssays, mints } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = await makeZoe({ require });
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();
    const payoffAssay = zoe.getPayoffAssay();
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(publicSwapRoot);

    const installationId = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // SetupCarol
    const carolMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const carolSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(0));

    // 1: Alice creates a publicSwap instance

    const { instance: aliceSwap, instanceId } = await zoe.makeInstance(
      installationId,
      { assays },
    );

    // 2: Alice escrows with zoe
    const aliceConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'wantExactly',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      makePayoffPaymentObj,
    } = await zoe.escrow(aliceConditions, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment. It's
    // unnecessary if she trusts Zoe but we will do it for the tests.
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 4: Alice initializes the swap with her escrow receipt
    const aliceOfferResult = await aliceSwap.makeOffer(aliceEscrowReceipt);

    // Alice gives Carol her payoff by creating a payoff payment.
    // Carol is able to inspect the payoff payment to see what she can
    // expect.

    const alicePayoffPayment = makePayoffPaymentObj.makePayoffPayment();

    const carolPayoffPayment = await payoffAssay.claimAll(alicePayoffPayment);
    const payoffPaymentExtent = carolPayoffPayment.getBalance().extent;
    t.deepEquals(payoffPaymentExtent.instanceId, instanceId);
    t.deepEquals(payoffPaymentExtent.conditions, aliceConditions);
    const carolPayoffObj = await carolPayoffPayment.unwrap();
    const carolPayoffP = carolPayoffObj.getPayoff();

    // 5: Alice spreads the instanceId far and wide with instructions
    // on how to use it and Bob decides he wants to be the
    // counter-party.

    const {
      instance: bobSwap,
      installationId: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(instanceId);

    t.equals(bobInstallationId, installationId);
    t.deepEquals(bobTerms.assays, assays);

    const bobConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: bobTerms.assays[0].makeAssetDesc(3),
        },
        {
          rule: 'offerExactly',
          assetDesc: bobTerms.assays[1].makeAssetDesc(7),
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
    } = await zoe.escrow(bobConditions, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment. This is
    // unnecessary but we will do it anyways for the test
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob makes an offer with his escrow receipt
    const bobOfferResult = await bobSwap.makeOffer(bobEscrowReceipt);

    t.equals(
      bobOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );
    t.equals(
      aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );
    const bobPayoff = await bobPayoffP;
    const carolPayoff = await carolPayoffP;

    // Carol gets what Alice wanted
    t.deepEquals(
      carolPayoff[1].getBalance(),
      aliceConditions.offerDesc[1].assetDesc,
    );

    // Carol didn't get any of what Alice put in
    t.equals(carolPayoff[0].getBalance().extent, 0);

    // 13: Carol deposits her winnings to ensure she can
    await carolMoolaPurse.depositAll(carolPayoff[0]);
    await carolSimoleanPurse.depositAll(carolPayoff[1]);

    // 14: Bob deposits his original payments to ensure he can
    await bobMoolaPurse.depositAll(bobPayoff[0]);
    await bobSimoleanPurse.depositAll(bobPayoff[1]);

    // Assert that the correct winnings were received.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    t.equals(carolMoolaPurse.getBalance().extent, 0);
    t.equals(carolSimoleanPurse.getBalance().extent, 7);
    t.equals(bobMoolaPurse.getBalance().extent, 3);
    t.equals(bobSimoleanPurse.getBalance().extent, 0);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
