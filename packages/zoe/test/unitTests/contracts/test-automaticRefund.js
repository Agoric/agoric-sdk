// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const automaticRefundRoot = `${__dirname}/../../../src/contracts/automaticRefund`;

test('zoe - simplest automaticRefund', async t => {
  try {
    // Setup zoe and mints
    const { issuers, mints, moola } = setup();
    const [moolaIssuer] = issuers;
    const [moolaMint] = mints;
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPayment = moolaMint.mintPayment(moola(3));

    // 1: Alice creates an automatic refund instance
    const invite = await zoe.makeInstance(installationHandle, {
      issuers: harden([moolaIssuer]),
    });

    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(3),
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
      moolaIssuer.getBalance(aliceMoolaPayout),
      aliceOfferRules.payoutRules[0].amount,
    );
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('zoe - automaticRefund same issuer', async t => {
  try {
    // Setup zoe and mints
    const { issuers, moola } = setup();
    const [moolaIssuer] = issuers;
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);

    // 1: Alice creates an automatic refund instance
    const invite = await zoe.makeInstance(installationHandle, {
      issuers: harden([moolaIssuer, moolaIssuer]),
    });
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: moola(0),
        },
        {
          kind: 'wantAtLeast',
          amount: moola(0),
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
      moolaIssuer.getBalance(aliceMoolaPayout),
      aliceOfferRules.payoutRules[0].amount,
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
    const {
      issuers: defaultIssuers,
      mints,
      amountMaths,
      moola,
      simoleans,
    } = setup();
    const issuers = defaultIssuers.slice(0, 2);
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();

    // Setup Alice
    const aliceMoolaPayment = mints[0].mintPayment(amountMaths[0].make(3));
    const aliceMoolaPurse = issuers[0].makeEmptyPurse();
    const aliceSimoleanPurse = issuers[1].makeEmptyPurse();

    // Setup Bob
    const bobMoolaPurse = issuers[0].makeEmptyPurse();
    const bobSimoleanPurse = issuers[1].makeEmptyPurse();
    const bobSimoleanPayment = mints[1].mintPayment(amountMaths[1].make(17));

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);

    // 1: Alice creates an automatic refund instance
    const installationHandle = zoe.install(source, moduleFormat);
    const terms = harden({
      issuers,
    });
    const aliceInvite = await zoe.makeInstance(installationHandle, terms);
    const { publicAPI } = zoe.getInstance(
      inviteIssuer.getBalance(aliceInvite).extent[0].instanceHandle,
    );

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(3),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(7),
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
    // will do a claimAll on the invite with the Zoe invite issuer and
    // will check that the installationId and terms match what he
    // expects
    const exclusBobInvite = await inviteIssuer.claim(bobInvite);
    const { instanceHandle } = inviteIssuer.getBalance(
      exclusBobInvite,
    ).extent[0];

    const {
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(instanceHandle);
    t.equals(bobInstallationId, installationHandle);
    const bobIssuers = bobTerms.issuers;

    // bob wants to know what issuers this contract is about and in
    // what order. Is it what he expects?
    t.deepEquals(bobIssuers, issuers);

    // 6: Bob also wants to get an automaticRefund (why? we don't
    // know) so he escrows his offer and his offer payments.

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: moola(15),
        },
        {
          kind: 'offerAtMost',
          amount: simoleans(17),
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
    // still take longer for a remote issuer to actually make the
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
      issuers[0].getBalance(aliceMoolaPayout),
      aliceOfferRules.payoutRules[0].amount,
    );

    // Alice didn't get any of what she wanted
    t.deepEquals(issuers[1].getBalance(aliceSimoleanPayout), simoleans(0));

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // 10: Bob deposits his refund to ensure he can
    await bobMoolaPurse.deposit(bobMoolaPayoutP);
    await bobSimoleanPurse.deposit(bobSimoleanPayoutP);

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
    const { issuers: originalIssuers, mints, moola, simoleans } = setup();
    const issuers = originalIssuers.slice(0, 2);
    const zoe = makeZoe({ require });

    // Setup Alice
    const aliceMoolaPayment = mints[0].mintPayment(moola(30));
    const moola10 = moola(10);
    const aliceMoolaPayments = issuers[0].splitMany(aliceMoolaPayment, [
      moola10,
      moola10,
      moola10,
    ]);

    // 1: Alice creates 3 automatic refund instances
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const terms = harden({
      issuers,
    });
    const inviteIssuer = zoe.getInviteIssuer();
    const aliceInvite1 = await zoe.makeInstance(installationHandle, terms);
    const { publicAPI: publicAPI1 } = zoe.getInstance(
      inviteIssuer.getBalance(aliceInvite1).extent[0].instanceHandle,
    );

    const aliceInvite2 = await zoe.makeInstance(installationHandle, terms);
    const { publicAPI: publicAPI2 } = zoe.getInstance(
      inviteIssuer.getBalance(aliceInvite2).extent[0].instanceHandle,
    );

    const aliceInvite3 = await zoe.makeInstance(installationHandle, terms);
    const { publicAPI: publicAPI3 } = zoe.getInstance(
      inviteIssuer.getBalance(aliceInvite3).extent[0].instanceHandle,
    );

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(10),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(7),
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
      issuers[0].getBalance(moolaPayout1),
      aliceOfferRules.payoutRules[0].amount,
    );
    t.deepEquals(
      issuers[0].getBalance(moolaPayout2),
      aliceOfferRules.payoutRules[0].amount,
    );
    t.deepEquals(
      issuers[0].getBalance(moolaPayout3),
      aliceOfferRules.payoutRules[0].amount,
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
    const { issuers: defaultIssuers, mints, moola, simoleans } = setup();
    const issuers = defaultIssuers.slice(0, 2);
    const zoe = makeZoe({ require });

    // Setup Alice
    const aliceMoolaPayment = mints[0].mintPayment(moola(3));
    const aliceMoolaPurse = issuers[0].makeEmptyPurse();
    const aliceSimoleanPurse = issuers[1].makeEmptyPurse();

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(3),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(7),
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
      issuers,
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
      issuers[0].getBalance(moolaPayout),
      aliceOfferRules.payoutRules[0].amount,
    );

    // Alice didn't get any of what she wanted
    t.deepEquals(issuers[1].getBalance(simoleanPayout), simoleans(0));

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.deposit(moolaPayout);
    await aliceSimoleanPurse.deposit(simoleanPayout);

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
