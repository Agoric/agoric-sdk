import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../zoe';
import { setup } from '../setupBasicMints';

const automaticRefundRoot = `${__dirname}/../../../contracts/automaticRefund`;

test('zoe - simplest automaticRefund', async t => {
  try {
    // Setup zoe and mints
    const { assays, mints } = setup();
    const [moolaAssay] = assays;
    const [moolaMint] = mints;
    const zoe = await makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPurse = moolaMint.mint(moolaAssay.makeUnits(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();

    // 1: Alice creates an automatic refund instance
    const { instance: automaticRefund } = await zoe.makeInstance(
      installationHandle,
      {
        assays: harden([moolaAssay]),
      },
    );
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          units: moolaAssay.makeUnits(3),
        },
      ],
    });
    const alicePayments = [aliceMoolaPayment];

    const { escrowReceipt, payout: payoutP } = await zoe.escrow(
      aliceOfferRules,
      alicePayments,
    );

    automaticRefund.makeOffer(escrowReceipt);
    const alicePayout = await payoutP;

    // Alice got back what she put in
    t.deepEquals(
      alicePayout[0].getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('zoe - automaticRefund same assay', async t => {
  try {
    // Setup zoe and mints
    const { assays } = setup();
    const [moolaAssay] = assays;
    const zoe = await makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);

    // 1: Alice creates an automatic refund instance
    const { instance: automaticRefund } = await zoe.makeInstance(
      installationHandle,
      {
        assays: harden([moolaAssay, moolaAssay]),
      },
    );
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: moolaAssay.makeUnits(0),
        },
        {
          kind: 'wantAtLeast',
          units: moolaAssay.makeUnits(0),
        },
      ],
    });
    const alicePayments = [undefined, undefined];

    const { escrowReceipt, payout: payoutP } = await zoe.escrow(
      aliceOfferRules,
      alicePayments,
    );

    automaticRefund.makeOffer(escrowReceipt);
    const alicePayout = await payoutP;

    // Alice got back what she put in
    t.deepEquals(
      alicePayout[0].getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('zoe with automaticRefund', async t => {
  try {
    // Setup zoe and mints
    const { assays: defaultAssays, mints } = setup();
    const assays = defaultAssays.slice(0, 2);
    const zoe = await makeZoe({ require });
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeUnits(17));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);

    // 1: Alice creates an automatic refund instance
    const installationHandle = zoe.install(source, moduleFormat);
    const terms = harden({
      assays,
    });
    const {
      instance: aliceAutomaticRefund,
      instanceHandle,
    } = await zoe.makeInstance(installationHandle, terms);
    const actualAssays = zoe.getAssaysForInstance(instanceHandle);
    t.deepEquals(actualAssays, assays);

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          units: assays[0].makeUnits(3),
        },
        {
          kind: 'wantExactly',
          units: assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];

    // Alice gets two kinds of things back: an 'escrowReceipt' that
    // represents what she escrowed and which she can use interact
    // safely with untrusted contracts, and a payout promise that resolves to
    // the array of payments
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payout: alicePayoutP,
    } = await zoe.escrow(aliceOfferRules, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment. (This is
    // unnecessary if she trusts zoe, but we will do it in the tests.)
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 4: Alice makes an offer with her escrow receipt

    // In the 'automaticRefund' trivial contract, you just get your
    // payoutRules back when you make an offer. The effect of calling
    // makeOffer will vary widely depending on the smart  contract.
    const aliceOutcome = await aliceAutomaticRefund.makeOffer(
      aliceEscrowReceipt,
    );

    // 5: Imagine that Alice has shared the instanceHandle with Bob.
    // He will do a lookup on Zoe to get the automaticRefund instance
    // and make sure the installation that he wants is installed.

    const {
      instance: bobAutomaticRefund,
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(instanceHandle);
    t.equals(bobInstallationId, installationHandle);
    const bobAssays = bobTerms.assays;

    // bob wants to know what assays this contract is about and in
    // what order. Is it what he expects?
    t.deepEquals(bobAssays, assays);

    // 6: Bob also wants to get an automaticRefund (why? we don't
    // know) so he escrows his offer and his offer payments.

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantExactly',
          units: bobAssays[0].makeUnits(15),
        },
        {
          kind: 'offerExactly',
          units: bobAssays[1].makeUnits(17),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // Bob also gets two things back: an escrowReceipt and a
    // payout
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payout: bobPayoutP,
    } = await zoe.escrow(bobOfferRules, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob makes an offer with his escrow receipt
    const bobOutcome = await bobAutomaticRefund.makeOffer(bobEscrowReceipt);

    t.equals(aliceOutcome, 'The offer was accepted');
    t.equals(bobOutcome, 'The offer was accepted');

    const alicePayout = await alicePayoutP;
    const bobPayout = await bobPayoutP;

    // Alice got back what she put in
    t.deepEquals(
      alicePayout[0].getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );

    // Alice didn't get any of what she wanted
    t.equals(alicePayout[1].getBalance().extent, 0);

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.depositAll(alicePayout[0]);
    await aliceSimoleanPurse.depositAll(alicePayout[1]);

    // 10: Bob deposits his refund to ensure he can
    await bobMoolaPurse.depositAll(bobPayout[0]);
    await bobSimoleanPurse.depositAll(bobPayout[1]);

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
    const zoe = await makeZoe({ require });

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(30));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const moola10 = assays[0].makeUnits(10);
    const aliceMoolaPayments = assays[0].split(aliceMoolaPayment, [
      moola10,
      moola10,
      moola10,
    ]);

    // 1: Alice creates 3 automatic refund instances
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const terms = harden({
      assays,
    });
    const { instance: automaticRefund1 } = await zoe.makeInstance(
      installationHandle,
      terms,
    );

    const { instance: automaticRefund2 } = await zoe.makeInstance(
      installationHandle,
      terms,
    );

    const { instance: automaticRefund3 } = await zoe.makeInstance(
      installationHandle,
      terms,
    );

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          units: assays[0].makeUnits(10),
        },
        {
          kind: 'wantExactly',
          units: assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const {
      escrowReceipt: aliceEscrowReceipt1,
      payout: payoutP1,
    } = await zoe.escrow(aliceOfferRules, [aliceMoolaPayments[0], undefined]);

    // 3: Alice escrows with zoe
    const {
      escrowReceipt: aliceEscrowReceipt2,
      payout: payoutP2,
    } = await zoe.escrow(aliceOfferRules, [aliceMoolaPayments[1], undefined]);

    // 4: Alice escrows with zoe
    const {
      escrowReceipt: aliceEscrowReceipt3,
      payout: payoutP3,
    } = await zoe.escrow(aliceOfferRules, [aliceMoolaPayments[2], undefined]);

    // 5: Alice makes an offer with each of her escrow receipts
    await automaticRefund1.makeOffer(aliceEscrowReceipt1);
    await automaticRefund2.makeOffer(aliceEscrowReceipt2);
    await automaticRefund3.makeOffer(aliceEscrowReceipt3);

    const payout1 = await payoutP1;
    const payout2 = await payoutP2;
    const payout3 = await payoutP3;

    // Ensure that she got what she put in for each
    t.deepEquals(payout1[0].getBalance(), aliceOfferRules.payoutRules[0].units);
    t.deepEquals(payout2[0].getBalance(), aliceOfferRules.payoutRules[0].units);
    t.deepEquals(payout3[0].getBalance(), aliceOfferRules.payoutRules[0].units);

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
    const zoe = await makeZoe({ require });

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(0));

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          units: assays[0].makeUnits(3),
        },
        {
          kind: 'wantExactly',
          units: assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];

    const {
      escrowReceipt: aliceEscrowReceipt,
      cancelObj,
      payout: payoutP,
    } = await zoe.escrow(aliceOfferRules, alicePayments);

    cancelObj.cancel();

    const alicePayout = await payoutP;

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);
    const terms = harden({
      assays,
    });
    const { instance: aliceAutomaticRefund } = await zoe.makeInstance(
      installationHandle,
      terms,
    );

    t.rejects(
      aliceAutomaticRefund.makeOffer(aliceEscrowReceipt),
      /Error: offer was cancelled/,
    );

    // Alice got back what she put in
    t.deepEquals(
      alicePayout[0].getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );

    // Alice didn't get any of what she wanted
    t.equals(alicePayout[1].getBalance().extent, 0);

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.depositAll(alicePayout[0]);
    await aliceSimoleanPurse.depositAll(alicePayout[1]);

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
    const zoe = await makeZoe({ require });

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(0));

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          units: assays[0].makeUnits(3),
        },
        {
          kind: 'wantExactly',
          units: assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];

    const {
      escrowReceipt: aliceEscrowReceipt,
      cancelObj,
      payout: payoutP,
    } = await zoe.escrow(aliceOfferRules, alicePayments);

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);
    const terms = harden({
      assays,
    });
    const { instance: aliceAutomaticRefund } = await zoe.makeInstance(
      installationHandle,
      terms,
    );

    await aliceAutomaticRefund.makeOffer(aliceEscrowReceipt);

    t.rejects(() => cancelObj.cancel(), /Error: offer has already completed/);

    const alicePayout = await payoutP;

    // Alice got back what she put in
    t.deepEquals(
      alicePayout[0].getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );

    // Alice didn't get any of what she wanted
    t.equals(alicePayout[1].getBalance().extent, 0);

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.depositAll(alicePayout[0]);
    await aliceSimoleanPurse.depositAll(alicePayout[1]);

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
