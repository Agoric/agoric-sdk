import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import { makeZoe } from '../../../../../core/zoe/zoe/zoe';
import { setup } from '../setupBasicMints';
import { automaticRefundSrcs } from '../../../../../core/zoe/contracts/automaticRefund';

test('zoe.makeInstance with automaticRefund', async t => {
  try {
    // Setup zoe and mints
    const { assays: defaultAssays, mints } = setup();
    const assays = defaultAssays.slice(0, 2);
    const zoe = await makeZoe();
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(17));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Alice creates an automatic refund instance
    const installationId = zoe.install(automaticRefundSrcs);
    const {
      instance: aliceAutomaticRefund,
      instanceId,
      assays: contractAssays,
    } = await zoe.makeInstance(assays, installationId);
    t.deepEquals(contractAssays, assays);

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

    // Alice gets two kinds of things back: an 'escrowReceipt' that
    // represents what she escrowed and which she can use interact
    // safely with untrusted contracts, and a payoff promise that resolves to
    // the array of payments
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payoff: alicePayoffP,
      makePayoffPaymentObj,
    } = await zoe.escrow(aliceConditions, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment. (This is
    // unnecessary if she trusts zoe, but we will do it in the tests.)
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 4: Alice makes an offer with her escrow receipt

    // In the 'automaticRefund' trivial contract, you just get your
    // offerDesc back when you make an offer. The effect of calling
    // makeOffer will vary widely depending on the governing contract.
    const aliceOfferMadeDesc = await aliceAutomaticRefund.makeOffer(
      aliceEscrowReceipt,
    );

    // 5: Imagine that Alice has shared the instanceId with Bob.
    // He will do a lookup on Zoe to get the automaticRefund instance
    // and make sure the installation that he wants is installed.

    const {
      instance: bobAutomaticRefund,
      installationId: bobInstallationId,
      assays: bobAssays,
    } = zoe.getInstance(instanceId);
    t.equals(bobInstallationId, installationId);

    // bob wants to know what assays this contract is about and in
    // what order. Is it what he expects?
    t.deepEquals(bobAssays, assays);

    // 6: Bob also wants to get an automaticRefund (why? we don't
    // know) so he escrows his offer and his offer payments.

    const bobConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: bobAssays[0].makeAssetDesc(15),
        },
        {
          rule: 'offerExactly',
          assetDesc: bobAssays[1].makeAssetDesc(17),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // Bob also gets two things back: an escrowReceipt and a
    // payoff
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payoff: bobPayoffP,
    } = await zoe.escrow(bobConditions, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob makes an offer with his escrow receipt
    const bobOfferMadeDesc = await bobAutomaticRefund.makeOffer(
      bobEscrowReceipt,
    );

    t.equals(bobOfferMadeDesc, bobConditions);
    t.equals(aliceOfferMadeDesc, aliceConditions);

    const alicePayoff = await alicePayoffP;
    t.throws(
      () => makePayoffPaymentObj.makePayoffPayment(),
      /offer has already completed/,
    );
    const bobPayoff = await bobPayoffP;

    // Alice got back what she put in
    t.deepEquals(
      alicePayoff[0].getBalance(),
      aliceConditions.offerDesc[0].assetDesc,
    );

    // Alice didn't get any of what she wanted
    t.equals(alicePayoff[1].getBalance().extent, 0);

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.depositAll(alicePayoff[0]);
    await aliceSimoleanPurse.depositAll(alicePayoff[1]);

    // 10: Bob deposits his refund to ensure he can
    await bobMoolaPurse.depositAll(bobPayoff[0]);
    await bobSimoleanPurse.depositAll(bobPayoff[1]);

    // Assert that the correct refund was achieved.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    t.equals(aliceMoolaPurse.getBalance().extent, 3);
    t.equals(aliceSimoleanPurse.getBalance().extent, 0);
    t.equals(bobMoolaPurse.getBalance().extent, 0);
    t.equals(bobSimoleanPurse.getBalance().extent, 17);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('multiple instances of automaticRefund for the same Zoe', async t => {
  try {
    // Setup zoe and mints
    const { assays: originalAssays, mints } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = await makeZoe();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(30));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const moola10 = assays[0].makeAssetDesc(10);
    const aliceMoolaPayments = assays[0].split(aliceMoolaPayment, [
      moola10,
      moola10,
      moola10,
    ]);

    // 1: Alice creates 3 automatic refund instances
    const installationId = zoe.install(automaticRefundSrcs);
    const { instance: automaticRefund1 } = await zoe.makeInstance(
      assays,
      installationId,
    );

    const { instance: automaticRefund2 } = await zoe.makeInstance(
      assays,
      installationId,
    );

    const { instance: automaticRefund3 } = await zoe.makeInstance(
      assays,
      installationId,
    );

    // 2: Alice escrows with zoe
    const aliceConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: assays[0].makeAssetDesc(10),
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
    const {
      escrowReceipt: aliceEscrowReceipt1,
      payoff: payoffP1,
    } = await zoe.escrow(aliceConditions, [aliceMoolaPayments[0], undefined]);

    // 3: Alice escrows with zoe
    const {
      escrowReceipt: aliceEscrowReceipt2,
      payoff: payoffP2,
    } = await zoe.escrow(aliceConditions, [aliceMoolaPayments[1], undefined]);

    // 4: Alice escrows with zoe
    const {
      escrowReceipt: aliceEscrowReceipt3,
      payoff: payoffP3,
    } = await zoe.escrow(aliceConditions, [aliceMoolaPayments[2], undefined]);

    // 5: Alice makes an offer with each of her escrow receipts
    await automaticRefund1.makeOffer(aliceEscrowReceipt1);
    await automaticRefund2.makeOffer(aliceEscrowReceipt2);
    await automaticRefund3.makeOffer(aliceEscrowReceipt3);

    const payoff1 = await payoffP1;
    const payoff2 = await payoffP2;
    const payoff3 = await payoffP3;

    // Ensure that she got what she put in for each
    t.deepEquals(
      payoff1[0].getBalance(),
      aliceConditions.offerDesc[0].assetDesc,
    );
    t.deepEquals(
      payoff2[0].getBalance(),
      aliceConditions.offerDesc[0].assetDesc,
    );
    t.deepEquals(
      payoff3[0].getBalance(),
      aliceConditions.offerDesc[0].assetDesc,
    );

    // Ensure that the number of offers received by each instance is one
    t.equals(automaticRefund1.getOffersCount(), 1);
    t.equals(automaticRefund2.getOffersCount(), 1);
    t.equals(automaticRefund3.getOffersCount(), 1);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('zoe - alice cancels before entering a contract', async t => {
  try {
    // Setup zoe and mints
    const { assays: defaultAssays, mints } = setup();
    const assays = defaultAssays.slice(0, 2);
    const zoe = await makeZoe();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(0));

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
      escrowReceipt: aliceEscrowReceipt,
      cancelObj,
      payoff: payoffP,
    } = await zoe.escrow(aliceConditions, alicePayments);

    cancelObj.cancel();

    const alicePayoff = await payoffP;

    const installationId = zoe.install(automaticRefundSrcs);
    const { instance: aliceAutomaticRefund } = await zoe.makeInstance(
      assays,
      installationId,
    );

    t.rejects(
      aliceAutomaticRefund.makeOffer(aliceEscrowReceipt),
      /Error: offer was cancelled/,
    );

    // Alice got back what she put in
    t.deepEquals(
      alicePayoff[0].getBalance(),
      aliceConditions.offerDesc[0].assetDesc,
    );

    // Alice didn't get any of what she wanted
    t.equals(alicePayoff[1].getBalance().extent, 0);

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.depositAll(alicePayoff[0]);
    await aliceSimoleanPurse.depositAll(alicePayoff[1]);

    // Assert that the correct refund was achieved.
    // Alice had 3 moola and 0 simoleans.
    t.equals(aliceMoolaPurse.getBalance().extent, 3);
    t.equals(aliceSimoleanPurse.getBalance().extent, 0);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('zoe - alice cancels after completion', async t => {
  try {
    // Setup zoe and mints
    const { assays: defaultAssays, mints } = setup();
    const assays = defaultAssays.slice(0, 2);
    const zoe = await makeZoe();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(0));

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
      escrowReceipt: aliceEscrowReceipt,
      cancelObj,
      payoff: payoffP,
    } = await zoe.escrow(aliceConditions, alicePayments);

    const installationId = zoe.install(automaticRefundSrcs);
    const { instance: aliceAutomaticRefund } = await zoe.makeInstance(
      assays,
      installationId,
    );

    await aliceAutomaticRefund.makeOffer(aliceEscrowReceipt);

    t.rejects(() => cancelObj.cancel(), /Error: offer has already completed/);

    const alicePayoff = await payoffP;

    // Alice got back what she put in
    t.deepEquals(
      alicePayoff[0].getBalance(),
      aliceConditions.offerDesc[0].assetDesc,
    );

    // Alice didn't get any of what she wanted
    t.equals(alicePayoff[1].getBalance().extent, 0);

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.depositAll(alicePayoff[0]);
    await aliceSimoleanPurse.depositAll(alicePayoff[1]);

    // Assert that the correct refund was achieved.
    // Alice had 3 moola and 0 simoleans.
    t.equals(aliceMoolaPurse.getBalance().extent, 3);
    t.equals(aliceSimoleanPurse.getBalance().extent, 0);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
