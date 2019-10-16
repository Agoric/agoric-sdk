import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeZoe } from '../../../../../core/zoe/zoe/zoe';
import { setup } from '../setupBasicMints';

import { sameStructure } from '../../../../../util/sameStructure';

import { coveredCallSrcs } from '../../../../../core/zoe/contracts/coveredCall';

test('zoe - coveredCall', async t => {
  try {
    const { mints: defaultMints, assays: defaultAssays } = setup();
    const mints = defaultMints.slice(0, 2);
    const assays = defaultAssays.slice(0, 2);
    const zoe = await makeZoe();
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Alice creates a coveredCall instance
    const coveredCallInstallationId = zoe.install(coveredCallSrcs);
    const { instance: aliceCoveredCall, instanceId } = await zoe.makeInstance(
      assays,
      coveredCallInstallationId,
    );

    // The assays are defined at this step
    t.deepEquals(zoe.getAssaysForInstance(instanceId), assays);

    // 2: Alice escrows with Zoe
    const aliceOffer = harden([
      {
        rule: 'offerExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'wantExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
    ]);
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payoff: alicePayoffP,
    } = await zoe.escrow(aliceOffer, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 3: Alice initializes the coveredCall with her escrow receipt

    // Alice gets two kinds of things back - invites (the ability to
    // make an offer) and a seat for herself (the right to claim after
    // an offer has been made). She gets a seat since she made an
    // offer. Bob gets an invite.
    const {
      outcome: aliceOutcome,
      invite: bobInvitePayment,
    } = await aliceCoveredCall.init(aliceEscrowReceipt);

    // Check that the assays and bobInvitePayment are as expected
    t.deepEquals(bobInvitePayment.getBalance().extent.instanceId, instanceId);
    t.deepEquals(bobInvitePayment.getBalance().extent.offerToBeMade, [
      {
        rule: 'wantExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'offerExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
    ]);

    // 3: Imagine that Alice sends the invite to Bob (not done here
    // since this test doesn't actually have separate vats/parties)

    // 4: Bob inspects the invite payment and checks that it is the
    // contract instance that he expects as well as that Alice has
    // already escrowed.

    const bobIntendedOffer = harden([
      {
        rule: 'wantExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'offerExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
    ]);

    const inviteExtent = bobInvitePayment.getBalance().extent;
    t.equal(inviteExtent.instanceId, instanceId);
    t.equal(inviteExtent.installationId, coveredCallInstallationId);
    t.equal(inviteExtent.status, 'acceptingOffers');
    t.ok(sameStructure(inviteExtent.offerMade, aliceOffer));
    t.ok(sameStructure(inviteExtent.offerToBeMade, bobIntendedOffer));

    // Bob claims all with the Zoe inviteAssay
    const inviteAssay = zoe.getInviteAssay();
    const bobExclInvitePayment = await inviteAssay.claimAll(bobInvitePayment);

    // 5: Only after assaying the invite does he unwrap it (destroying
    // the ERTP invite) and accept it
    const bobInvite = await bobExclInvitePayment.unwrap();
    const bobPayments = [undefined, bobSimoleanPayment];

    // 6: Bob escrows
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payoff: bobPayoffP,
    } = await zoe.escrow(bobIntendedOffer, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob makes an offer with his escrow receipt
    const bobOutcome = await bobInvite.makeOffer(bobEscrowReceipt);

    t.equals(
      bobOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );
    t.equals(
      aliceOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    const aliceResult = await alicePayoffP;
    const bobResult = await bobPayoffP;

    // Alice gets back 0 of the kind she put in
    t.equals(aliceResult[0].getBalance().extent, 0);

    // Alice got what she wanted
    t.deepEquals(aliceResult[1].getBalance(), aliceOffer[1].assetDesc);

    // 11: Alice deposits her winnings to ensure she can
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // 12: Bob deposits his winnings to ensure he can
    await bobMoolaPurse.depositAll(bobResult[0]);
    await bobSimoleanPurse.depositAll(bobResult[1]);

    // Assert that the correct outcome was achieved.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    // Now, Alice should have 0 moola and 7 simoleans.
    // Bob should have 3 moola and 0 simoleans.
    t.equals(aliceMoolaPurse.getBalance().extent, 0);
    t.equals(aliceSimoleanPurse.getBalance().extent, 7);
    t.equals(bobMoolaPurse.getBalance().extent, 3);
    t.equals(bobSimoleanPurse.getBalance().extent, 0);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
