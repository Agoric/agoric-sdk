// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints2';

const automaticRefundRoot = `${__dirname}/../../../src/contracts/automaticRefund`;

test('zoe - simplest automaticRefund', async t => {
  try {
    // Setup zoe and mints
    const { moolaR, moola } = setup();
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(3));

    // 1: Alice creates an automatic refund instance
    const roles = harden({ Contribution: moolaR.issuer });
    const invite = await zoe.makeInstance(installationHandle, roles);

    const aliceOfferRules = harden({
      offer: { Contribution: moola(3) },
      exit: { onDemand: {} },
    });
    const alicePayments = { Contribution: aliceMoolaPayment };

    const { payout: payoutP } = await zoe.redeem(
      invite,
      aliceOfferRules,
      alicePayments,
    );

    const alicePayout = await payoutP;
    const aliceMoolaPayout = await alicePayout.Contribution;

    // Alice got back what she put in
    t.deepEquals(
      moolaR.issuer.getAmountOf(aliceMoolaPayout),
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
    const { moolaR, moola } = setup();
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(9));

    // 1: Alice creates an automatic refund instance
    const roles = harden({
      Contribution1: moolaR.issuer,
      Contribution2: moolaR.issuer,
    });
    const invite = await zoe.makeInstance(installationHandle, roles);

    const aliceOfferRules = harden({
      offer: { Contribution2: moola(9) },
      exit: { onDemand: {} },
    });
    const alicePayments = harden({ Contribution2: aliceMoolaPayment });

    const { payout: payoutP } = await zoe.redeem(
      invite,
      aliceOfferRules,
      alicePayments,
    );

    const alicePayout = await payoutP;
    const aliceMoolaPayout = await alicePayout.Contribution2;

    // Alice got back what she put in
    t.deepEquals(
      moolaR.issuer.getAmountOf(aliceMoolaPayout),
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
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(3));
    const aliceMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Setup Bob
    const bobMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanR.issuer.makeEmptyPurse();
    const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(17));

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);

    // 1: Alice creates an automatic refund instance
    const installationHandle = zoe.install(source, moduleFormat);
    const roles = harden({
      Contribution1: moolaR.issuer,
      Contribution2: simoleanR.issuer,
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
    //
    // In the 'automaticRefund' trivial contract, you just get your
    // payments back when you make an offer. The effect of calling
    // makeOffer will vary widely depending on the smart  contract.
    const {
      payout: alicePayoutP,
      offerResult: aliceOutcome,
    } = await zoe.redeem(aliceInvite, aliceOfferRules, alicePayments);

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
      Contribution1: moolaR.issuer,
      Contribution2: simoleanR.issuer,
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
    const { payout: bobPayoutP, offerResult: bobOutcome } = await zoe.redeem(
      exclusBobInvite,
      bobOfferRules,
      bobPayments,
    );

    t.equals(await aliceOutcome, 'The offer was accepted');
    t.equals(await bobOutcome, 'The offer was accepted');

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
      moolaR.issuer.getAmountOf(aliceMoolaPayout),
      aliceOfferRules.offer.Contribution1,
    );

    // Alice didn't get any of what she wanted
    t.deepEquals(
      simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
      simoleans(0),
    );

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
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe({ require });

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(30));
    const moola10 = moola(10);
    const aliceMoolaPayments = moolaR.issuer.splitMany(aliceMoolaPayment, [
      moola10,
      moola10,
      moola10,
    ]);

    // 1: Alice creates 3 automatic refund instances
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const roles = harden({
      ContributionA: moolaR.issuer,
      ContributionB: simoleanR.issuer,
    });
    const inviteIssuer = zoe.getInviteIssuer();
    const aliceInvite1 = await zoe.makeInstance(installationHandle, roles);
    const { publicAPI: publicAPI1 } = zoe.getInstance(
      inviteIssuer.getAmountOf(aliceInvite1).extent[0].instanceHandle,
    );

    const aliceInvite2 = await zoe.makeInstance(installationHandle, roles);
    const { publicAPI: publicAPI2 } = zoe.getInstance(
      inviteIssuer.getAmountOf(aliceInvite2).extent[0].instanceHandle,
    );

    const aliceInvite3 = await zoe.makeInstance(installationHandle, roles);
    const { publicAPI: publicAPI3 } = zoe.getInstance(
      inviteIssuer.getAmountOf(aliceInvite3).extent[0].instanceHandle,
    );

    // 2: Alice escrows with zoe
    const aliceOfferRules = harden({
      offer: { ContributionA: moola(10) },
      want: { ContributionB: simoleans(7) },
    });

    const { payout: payoutP1 } = await zoe.redeem(
      aliceInvite1,
      aliceOfferRules,
      harden({ ContributionA: aliceMoolaPayments[0] }),
    );

    // 3: Alice escrows with zoe
    const { payout: payoutP2 } = await zoe.redeem(
      aliceInvite2,
      aliceOfferRules,
      harden({ ContributionA: aliceMoolaPayments[1] }),
    );

    // 4: Alice escrows with zoe
    const { payout: payoutP3 } = await zoe.redeem(
      aliceInvite3,
      aliceOfferRules,
      harden({ ContributionA: aliceMoolaPayments[2] }),
    );

    const payout1 = await payoutP1;
    const payout2 = await payoutP2;
    const payout3 = await payoutP3;

    const moolaPayout1 = await payout1.ContributionA;
    const moolaPayout2 = await payout2.ContributionA;
    const moolaPayout3 = await payout3.ContributionA;

    // Ensure that she got what she put in for each
    t.deepEquals(
      moolaR.issuer.getAmountOf(moolaPayout1),
      aliceOfferRules.offer.ContributionA,
    );
    t.deepEquals(
      moolaR.issuer.getAmountOf(moolaPayout2),
      aliceOfferRules.offer.ContributionA,
    );
    t.deepEquals(
      moolaR.issuer.getAmountOf(moolaPayout3),
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
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe({ require });

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(3));
    const aliceMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
    const installationHandle = zoe.install(source, moduleFormat);
    const roles = harden({
      ContributionA: moolaR.issuer,
      ContributionB: simoleanR.issuer,
    });
    const invite = await zoe.makeInstance(installationHandle, roles);

    const aliceOfferRules = harden({
      offer: { ContributionA: moola(3) },
      want: { ContributionB: simoleans(7) },
    });
    const alicePayments = { ContributionA: aliceMoolaPayment };

    const { cancelObj, payout: payoutP, offerResult } = await zoe.redeem(
      invite,
      aliceOfferRules,
      alicePayments,
    );

    await offerResult;

    t.throws(() => cancelObj.cancel(), /Error: offer has already completed/);

    const payout = await payoutP;
    const moolaPayout = await payout.ContributionA;
    const simoleanPayout = await payout.ContributionB;

    // Alice got back what she put in
    t.deepEquals(
      moolaR.issuer.getAmountOf(moolaPayout),
      aliceOfferRules.offer.ContributionA,
    );

    // Alice didn't get any of what she wanted
    t.deepEquals(simoleanR.issuer.getAmountOf(simoleanPayout), simoleans(0));

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
