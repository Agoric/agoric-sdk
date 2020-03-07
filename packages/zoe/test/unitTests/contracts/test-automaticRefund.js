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
    const roles = harden({ Contribution: moolaIssuer });
    const invite = await zoe.makeInstance(installationHandle, roles);

    const aliceOfferRules = harden({
      offer: { Contribution: moola(3) },
      exit: { onDemand: {} },
    });
    const alicePayments = { Contribution: aliceMoolaPayment };

    const { seat, payout: payoutP } = await zoe.redeem(
      invite,
      aliceOfferRules,
      alicePayments,
    );

    seat.makeOffer();
    const alicePayout = await payoutP;
    const aliceMoolaPayout = await alicePayout.Contribution;

    // Alice got back what she put in
    t.deepEquals(
      moolaIssuer.getAmountOf(aliceMoolaPayout),
      aliceOfferRules.offer.Contribution,
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
    const { issuers, mints, moola } = setup();
    const [moolaIssuer] = issuers;
    const [moolaMint] = mints;
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPayment = moolaMint.mintPayment(moola(9));

    // 1: Alice creates an automatic refund instance
    const roles = harden({
      Contribution1: moolaIssuer,
      Contribution2: moolaIssuer,
    });
    const invite = await zoe.makeInstance(installationHandle, roles);

    const aliceOfferRules = harden({
      offer: { Contribution2: moola(9) },
      exit: { onDemand: {} },
    });
    const alicePayments = harden({ Contribution2: aliceMoolaPayment });

    const { seat, payout: payoutP } = await zoe.redeem(
      invite,
      aliceOfferRules,
      alicePayments,
    );

    seat.makeOffer();
    const alicePayout = await payoutP;
    const aliceMoolaPayout = await alicePayout.Contribution2;

    // Alice got back what she put in
    t.deepEquals(
      moolaIssuer.getAmountOf(aliceMoolaPayout),
      aliceOfferRules.offer.Contribution2,
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
    const { issuers, mints, moola, simoleans } = setup();
    const [moolaIssuer, simoleanIssuer] = issuers;
    const [moolaMint, simoleanMint] = mints;
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();

    // Setup Alice
    const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
    const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

    // Setup Bob
    const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();
    const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(17));

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);

    // 1: Alice creates an automatic refund instance
    const installationHandle = zoe.install(source, moduleFormat);
    const roles = harden({
      Contribution1: moolaIssuer,
      Contribution2: simoleanIssuer,
    });
    const aliceInvite = await zoe.makeInstance(installationHandle, roles);
    const { publicAPI } = zoe.getInstance(
      inviteIssuer.getAmountOf(aliceInvite).extent[0].instanceHandle,
    );

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      offer: { Contribution1: moola(3) },
      want: { Contribution2: simoleans(7) },
      exit: { onDemand: {} },
    });
    const alicePayments = { Contribution1: aliceMoolaPayment };

    // Alice gets two kinds of things back: a seat which she can use
    // interact with the contract, and a payout promise
    // that resolves to the array of promises for payments
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
    // will do a claim on the invite with the Zoe invite issuer and
    // will check that the installationId and terms match what he
    // expects
    const exclusBobInvite = await inviteIssuer.claim(bobInvite);
    const { instanceHandle } = inviteIssuer.getAmountOf(
      exclusBobInvite,
    ).extent[0];

    const {
      installationHandle: bobInstallationId,
      roles: bobRoles,
    } = zoe.getInstance(instanceHandle);
    t.equals(bobInstallationId, installationHandle);

    // bob wants to know what issuers this contract is about and in
    // what order. Is it what he expects?
    t.deepEquals(bobRoles, {
      Contribution1: moolaIssuer,
      Contribution2: simoleanIssuer,
    });

    // 6: Bob also wants to get an automaticRefund (why? we don't
    // know) so he escrows his offer and his offer payments.
    const bobOfferRules = harden({
      offer: { Contribution2: simoleans(17) },
      want: { Contribution1: moola(15) },
      exit: { onDemand: {} },
    });
    const bobPayments = { Contribution2: bobSimoleanPayment };

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
    const bobPayout = await bobPayoutP;
    const aliceMoolaPayout = await alicePayout.Contribution1;
    const aliceSimoleanPayout = await alicePayout.Contribution2;

    const bobMoolaPayout = await bobPayout.Contribution1;
    const bobSimoleanPayout = await bobPayout.Contribution2;

    // Alice got back what she put in
    t.deepEquals(
      moolaIssuer.getAmountOf(aliceMoolaPayout),
      aliceOfferRules.offer.Contribution1,
    );

    // Alice didn't get any of what she wanted
    t.deepEquals(simoleanIssuer.getAmountOf(aliceSimoleanPayout), simoleans(0));

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // 10: Bob deposits his refund to ensure he can
    await bobMoolaPurse.deposit(bobMoolaPayout);
    await bobSimoleanPurse.deposit(bobSimoleanPayout);

    // Assert that the correct refund was achieved.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    t.equals(aliceMoolaPurse.getCurrentAmount().extent, 3);
    t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 0);
    t.equals(bobMoolaPurse.getCurrentAmount().extent, 0);
    t.equals(bobSimoleanPurse.getCurrentAmount().extent, 17);
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
    const { issuers, mints, moola, simoleans } = setup();
    const [moolaIssuer, simoleanIssuer] = issuers;
    const [moolaMint] = mints;
    const zoe = makeZoe({ require });

    // Setup Alice
    const aliceMoolaPayment = moolaMint.mintPayment(moola(30));
    const moola10 = moola(10);
    const aliceMoolaPayments = moolaIssuer.splitMany(aliceMoolaPayment, [
      moola10,
      moola10,
      moola10,
    ]);

    // 1: Alice creates 3 automatic refund instances
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const terms = harden({
      roles: { ContributionA: moolaIssuer, ContributionB: simoleanIssuer },
    });
    const inviteIssuer = zoe.getInviteIssuer();
    const aliceInvite1 = await zoe.makeInstance(installationHandle, terms);
    const { publicAPI: publicAPI1 } = zoe.getInstance(
      inviteIssuer.getAmountOf(aliceInvite1).extent[0].instanceHandle,
    );

    const aliceInvite2 = await zoe.makeInstance(installationHandle, terms);
    const { publicAPI: publicAPI2 } = zoe.getInstance(
      inviteIssuer.getAmountOf(aliceInvite2).extent[0].instanceHandle,
    );

    const aliceInvite3 = await zoe.makeInstance(installationHandle, terms);
    const { publicAPI: publicAPI3 } = zoe.getInstance(
      inviteIssuer.getAmountOf(aliceInvite3).extent[0].instanceHandle,
    );

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      offer: { ContributionA: moola(10) },
      want: { ContributionB: simoleans(7) },
      exitRule: { kind: 'onDemand' },
    });

    const { seat: aliceSeat1, payout: payoutP1 } = await zoe.redeem(
      aliceInvite1,
      aliceOfferRules,
      harden({ ContributionA: aliceMoolaPayments[0] }),
    );

    // 3: Alice escrows with zoe
    const { seat: aliceSeat2, payout: payoutP2 } = await zoe.redeem(
      aliceInvite2,
      aliceOfferRules,
      harden({ ContributionA: aliceMoolaPayments[1] }),
    );

    // 4: Alice escrows with zoe
    const { seat: aliceSeat3, payout: payoutP3 } = await zoe.redeem(
      aliceInvite3,
      aliceOfferRules,
      harden({ ContributionA: aliceMoolaPayments[2] }),
    );

    // 5: Alice makes an offer
    aliceSeat1.makeOffer();
    aliceSeat2.makeOffer();
    aliceSeat3.makeOffer();

    const payout1 = await payoutP1;
    const payout2 = await payoutP2;
    const payout3 = await payoutP3;

    const moolaPayout1 = await payout1.ContributionA;
    const moolaPayout2 = await payout2.ContributionA;
    const moolaPayout3 = await payout3.ContributionA;

    // Ensure that she got what she put in for each
    t.deepEquals(
      issuers[0].getAmountOf(moolaPayout1),
      aliceOfferRules.offer.ContributionA,
    );
    t.deepEquals(
      issuers[0].getAmountOf(moolaPayout2),
      aliceOfferRules.offer.ContributionA,
    );
    t.deepEquals(
      issuers[0].getAmountOf(moolaPayout3),
      aliceOfferRules.offer.ContributionA,
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
      issuers[0].getAmountOf(moolaPayout),
      aliceOfferRules.payoutRules[0].amount,
    );

    // Alice didn't get any of what she wanted
    t.deepEquals(issuers[1].getAmountOf(simoleanPayout), simoleans(0));

    // 9: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.deposit(moolaPayout);
    await aliceSimoleanPurse.deposit(simoleanPayout);

    // Assert that the correct refund was achieved.
    // Alice had 3 moola and 0 simoleans.
    t.equals(aliceMoolaPurse.getCurrentAmount().extent, 3);
    t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 0);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
