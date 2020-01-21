import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const automaticRefundRoot = `${__dirname}/../../../src/contracts/automaticRefund`;

test('zoe - simplest automaticRefund', async t => {
  try {
    // Setup zoe and mints
    const { assays, mints, moola } = setup();
    const [moolaAssay] = assays;
    const [moolaMint] = mints;
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPurse = moolaMint.mint(moola(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();

    // 1: Alice creates an automatic refund instance
    const invite = await zoe.makeInstance(installationHandle, {
      assays: harden([moolaAssay]),
    });

    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment];

    const { seat, payout: payoutP } = await zoe.redeem(
      invite,
      aliceOfferRules,
      alicePayments,
    );

    seat.makeOffer();
    const alicePayout = await payoutP;
    const aliceMoolaPayout = await alicePayout[0];

    // Alice got back what she put in
    t.deepEquals(
      aliceMoolaPayout.getBalance(),
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
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);

    // 1: Alice creates an automatic refund instance
    const invite = await zoe.makeInstance(installationHandle, {
      assays: harden([moolaAssay, moolaAssay]),
    });
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
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [undefined, undefined];

    const { seat, payout: payoutP } = await zoe.redeem(
      invite,
      aliceOfferRules,
      alicePayments,
    );

    seat.makeOffer();
    const alicePayout = await payoutP;
    const aliceMoolaPayout = await alicePayout[0];

    // Alice got back what she put in
    t.deepEquals(
      aliceMoolaPayout.getBalance(),
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
    const zoe = makeZoe({ require });
    const inviteAssay = zoe.getInviteAssay();

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
    const aliceInvite = await zoe.makeInstance(installationHandle, terms);
    const { publicAPI } = zoe.getInstance(
      aliceInvite.getBalance().extent.instanceHandle,
    );

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: assays[0].makeUnits(3),
        },
        {
          kind: 'wantAtLeast',
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
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceOfferRules,
      alicePayments,
    );

    // In the 'automaticRefund' trivial contract, you just get your
    // payoutRules back when you make an offer. The effect of calling
    // makeOffer will vary widely depending on the smart  contract.
    const aliceOutcome = aliceSeat.makeOffer();
    const bobInvite = publicAPI.makeInvite();
    const count = publicAPI.getOffersCount();
    t.equals(count, 1);

    // Imagine that Alice has shared the bobInvite with Bob. He
    // will do a claimAll on the invite with the Zoe invite assay and
    // will check that the installationId and terms match what he
    // expects
    const exclusBobInvite = await inviteAssay.claimAll(bobInvite);
    const { instanceHandle } = exclusBobInvite.getBalance().extent;

    const {
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
          kind: 'wantAtLeast',
          units: bobAssays[0].makeUnits(15),
        },
        {
          kind: 'offerAtMost',
          units: bobAssays[1].makeUnits(17),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // Bob also gets two things back: a seat and a
    // payout
    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      exclusBobInvite,
      bobOfferRules,
      bobPayments,
    );
    const bobOutcome = bobSeat.makeOffer();

    t.equals(aliceOutcome, 'The offer was accepted');
    t.equals(bobOutcome, 'The offer was accepted');

    // These promise resolve when the offer completes, but it may
    // still take longer for a remote assay to actually make the
    // payments, so we need to wait for those promises to resolve
    // separately.

    // offer completes
    const alicePayout = await alicePayoutP;
    const [bobMoolaPayoutP, bobSimoleanPayoutP] = await bobPayoutP;

    const [aliceMoolaPayout, aliceSimoleanPayout] = await Promise.all(
      alicePayout,
    );

    // Alice got back what she put in
    t.deepEquals(
      aliceMoolaPayout.getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );

    // Alice didn't get any of what she wanted
    t.equals(aliceSimoleanPayout.getBalance().extent, 0);

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.depositAll(aliceMoolaPayout);
    await aliceSimoleanPurse.depositAll(aliceSimoleanPayout);

    // 10: Bob deposits his refund to ensure he can
    await bobMoolaPurse.depositAll(bobMoolaPayoutP);
    await bobSimoleanPurse.depositAll(bobSimoleanPayoutP);

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
    const zoe = makeZoe({ require });

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
    const aliceInvite1 = await zoe.makeInstance(installationHandle, terms);
    const { publicAPI: publicAPI1 } = zoe.getInstance(
      aliceInvite1.getBalance().extent.instanceHandle,
    );

    const aliceInvite2 = await zoe.makeInstance(installationHandle, terms);
    const { publicAPI: publicAPI2 } = zoe.getInstance(
      aliceInvite2.getBalance().extent.instanceHandle,
    );

    const aliceInvite3 = await zoe.makeInstance(installationHandle, terms);
    const { publicAPI: publicAPI3 } = zoe.getInstance(
      aliceInvite3.getBalance().extent.instanceHandle,
    );

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: assays[0].makeUnits(10),
        },
        {
          kind: 'wantAtLeast',
          units: assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    const {
      seat: aliceSeat1,
      payout: payoutP1,
    } = await zoe.redeem(aliceInvite1, aliceOfferRules, [
      aliceMoolaPayments[0],
      undefined,
    ]);

    // 3: Alice escrows with zoe
    const {
      seat: aliceSeat2,
      payout: payoutP2,
    } = await zoe.redeem(aliceInvite2, aliceOfferRules, [
      aliceMoolaPayments[1],
      undefined,
    ]);

    // 4: Alice escrows with zoe
    const {
      seat: aliceSeat3,
      payout: payoutP3,
    } = await zoe.redeem(aliceInvite3, aliceOfferRules, [
      aliceMoolaPayments[2],
      undefined,
    ]);

    // 5: Alice makes an offer with each of her escrow receipts
    aliceSeat1.makeOffer();
    aliceSeat2.makeOffer();
    aliceSeat3.makeOffer();

    const [moolaPayout1P] = await payoutP1;
    const [moolaPayout2P] = await payoutP2;
    const [moolaPayout3P] = await payoutP3;

    const moolaPayout1 = await moolaPayout1P;
    const moolaPayout2 = await moolaPayout2P;
    const moolaPayout3 = await moolaPayout3P;

    // Ensure that she got what she put in for each
    t.deepEquals(
      moolaPayout1.getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );
    t.deepEquals(
      moolaPayout2.getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );
    t.deepEquals(
      moolaPayout3.getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );

    // Ensure that the number of offers received by each instance is one
    t.equals(publicAPI1.getOffersCount(), 1);
    t.equals(publicAPI2.getOffersCount(), 1);
    t.equals(publicAPI3.getOffersCount(), 1);
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
    const zoe = makeZoe({ require });

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(0));

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: assays[0].makeUnits(3),
        },
        {
          kind: 'wantAtLeast',
          units: assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);
    const terms = harden({
      assays,
    });
    const invite = await zoe.makeInstance(installationHandle, terms);

    const { seat, cancelObj, payout: payoutP } = await zoe.redeem(
      invite,
      aliceOfferRules,
      alicePayments,
    );

    await seat.makeOffer();

    t.throws(() => cancelObj.cancel(), /Error: offer has already completed/);

    const payout = await payoutP;
    const [moolaPayout, simoleanPayout] = await Promise.all(payout);

    // Alice got back what she put in
    t.deepEquals(
      moolaPayout.getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );

    // Alice didn't get any of what she wanted
    t.equals(simoleanPayout.getBalance().extent, 0);

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.depositAll(moolaPayout);
    await aliceSimoleanPurse.depositAll(simoleanPayout);

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
