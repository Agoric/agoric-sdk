import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '../../bundle-source';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const publicAuctionRoot = `${__dirname}/../../../src/contracts/publicAuction`;

test('zoe - secondPriceAuction w/ 3 bids', async t => {
  try {
    const { assays: originalAssays, mints, unitOps } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = makeZoe({ require });

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(1));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeUnits(11));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // Setup Carol
    const carolMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const carolSimoleanPurse = mints[1].mint(assays[1].makeUnits(7));
    const carolSimoleanPayment = carolSimoleanPurse.withdrawAll();

    // Setup Dave
    const daveMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const daveSimoleanPurse = mints[1].mint(assays[1].makeUnits(5));
    const daveSimoleanPayment = daveSimoleanPurse.withdrawAll();

    // Alice creates a secondPriceAuction instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(publicAuctionRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const numBidsAllowed = 3;
    const aliceInvite = await zoe.makeInstance(installationHandle, {
      assays,
      numBidsAllowed,
    });

    const { instanceHandle } = aliceInvite.getBalance().extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);

    // Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'wantAtLeast',
          units: assays[1].makeUnits(3),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceOfferRules,
      alicePayments,
    );

    // Alice initializes the auction
    const aliceOfferResult = await aliceSeat.sellAssets();
    const [bobInvite, carolInvite, daveInvite] = await publicAPI.makeInvites(3);

    t.equals(
      aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    // Alice spreads the invites far and wide and Bob decides he
    // wants to participate in the auction.
    const inviteAssay = zoe.getInviteAssay();
    const bobExclusiveInvite = await inviteAssay.claimAll(bobInvite);
    const bobInviteExtent = bobExclusiveInvite.getBalance().extent;

    const {
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);

    t.equals(bobInstallationId, installationHandle);
    t.deepEquals(bobTerms.assays, assays);
    t.deepEquals(bobInviteExtent.minimumBid, assays[1].makeUnits(3));
    t.deepEquals(bobInviteExtent.auctionedAssets, assays[0].makeUnits(1));

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'offerAtMost',
          units: assays[1].makeUnits(11),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // Bob escrows with zoe
    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclusiveInvite,
      bobOfferRules,
      bobPayments,
    );

    // Bob bids
    const bobOfferResult = await bobSeat.bid();

    t.equals(
      bobOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    // Carol decides to bid for the one moola

    const carolExclusiveInvite = await inviteAssay.claimAll(carolInvite);
    const carolInviteExtent = carolExclusiveInvite.getBalance().extent;

    const {
      installationHandle: carolInstallationId,
      terms: carolTerms,
    } = zoe.getInstance(carolInviteExtent.instanceHandle);

    t.equals(carolInstallationId, installationHandle);
    t.deepEquals(carolTerms.assays, assays);
    t.deepEquals(carolInviteExtent.minimumBid, assays[1].makeUnits(3));
    t.deepEquals(carolInviteExtent.auctionedAssets, assays[0].makeUnits(1));

    const carolOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'offerAtMost',
          units: assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const carolPayments = [undefined, carolSimoleanPayment];

    // Carol escrows with zoe
    const { seat: carolSeat, payout: carolPayoutP } = await zoe.redeem(
      carolExclusiveInvite,
      carolOfferRules,
      carolPayments,
    );

    // Carol bids
    const carolOfferResult = await carolSeat.bid();

    t.equals(
      carolOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    // Dave decides to bid for the one moola
    const daveExclusiveInvite = await inviteAssay.claimAll(daveInvite);
    const daveInviteExtent = daveExclusiveInvite.getBalance().extent;

    const {
      installationHandle: daveInstallationId,
      terms: daveTerms,
    } = zoe.getInstance(daveInviteExtent.instanceHandle);

    t.equals(daveInstallationId, installationHandle);
    t.deepEquals(daveTerms.assays, assays);
    t.deepEquals(daveInviteExtent.minimumBid, assays[1].makeUnits(3));
    t.deepEquals(daveInviteExtent.auctionedAssets, assays[0].makeUnits(1));

    const daveOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'offerAtMost',
          units: assays[1].makeUnits(5),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const davePayments = [undefined, daveSimoleanPayment];

    // Dave escrows with zoe
    const { seat: daveSeat, payout: davePayoutP } = await zoe.redeem(
      daveExclusiveInvite,
      daveOfferRules,
      davePayments,
    );

    // Dave bids
    const daveOfferResult = await daveSeat.bid();

    t.equals(
      daveOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    const aliceResult = await alicePayoutP;
    const bobResult = await bobPayoutP;
    const carolResult = await carolPayoutP;
    const daveResult = await davePayoutP;

    const [aliceMoolaPayout, aliceSimoleanPayout] = await Promise.all(
      aliceResult,
    );
    const [bobMoolaPayout, bobSimoleanPayout] = await Promise.all(bobResult);
    const [carolMoolaPayout, carolSimoleanPayout] = await Promise.all(
      carolResult,
    );
    const [daveMoolaPayout, daveSimoleanPayout] = await Promise.all(daveResult);

    // Alice (the creator of the auction) gets back the second highest bid
    t.deepEquals(
      aliceSimoleanPayout.getBalance(),
      carolOfferRules.payoutRules[1].units,
    );

    // Alice didn't get any of what she put in
    t.equals(aliceMoolaPayout.getBalance().extent, 0);

    // Alice deposits her payout to ensure she can
    await aliceMoolaPurse.depositAll(aliceMoolaPayout);
    await aliceSimoleanPurse.depositAll(aliceSimoleanPayout);

    // Bob (the winner of the auction) gets the one moola and the
    // difference between his bid and the price back
    t.deepEquals(bobMoolaPayout.getBalance(), unitOps[0].make(1));
    t.deepEquals(bobSimoleanPayout.getBalance(), unitOps[1].make(4));

    // Bob deposits his payout to ensure he can
    await bobMoolaPurse.depositAll(bobMoolaPayout);
    await bobSimoleanPurse.depositAll(bobSimoleanPayout);

    // Carol gets a full refund
    t.deepEquals(carolMoolaPayout.getBalance(), unitOps[0].make(0));
    t.deepEquals(
      carolSimoleanPayout.getBalance(),
      carolOfferRules.payoutRules[1].units,
    );

    // Carol deposits her payout to ensure she can
    await carolMoolaPurse.depositAll(carolMoolaPayout);
    await carolSimoleanPurse.depositAll(carolSimoleanPayout);

    // Dave gets a full refund
    t.deepEquals(daveMoolaPayout.getBalance(), unitOps[0].make(0));
    t.deepEquals(
      daveSimoleanPayout.getBalance(),
      daveOfferRules.payoutRules[1].units,
    );

    // Dave deposits his payout to ensure he can
    await daveMoolaPurse.depositAll(daveMoolaPayout);
    await daveSimoleanPurse.depositAll(daveSimoleanPayout);

    // Assert that the correct payout were received.
    // Alice had 1 moola and 0 simoleans.
    // Bob had 0 moola and 11 simoleans.
    // Carol had 0 moola and 7 simoleans.
    // Dave had 0 moola and 5 simoleans.

    // Now, they should have:
    // Alice: 0 moola and 7 simoleans
    // Bob: 1 moola and 4 simoleans
    // Carol: 0 moola and 7 simoleans
    // Dave: 0 moola and 5 simoleans
    t.equals(aliceMoolaPurse.getBalance().extent, 0);
    t.equals(aliceSimoleanPurse.getBalance().extent, 7);
    t.equals(bobMoolaPurse.getBalance().extent, 1);
    t.equals(bobSimoleanPurse.getBalance().extent, 4);
    t.equals(carolMoolaPurse.getBalance().extent, 0);
    t.equals(carolSimoleanPurse.getBalance().extent, 7);
    t.equals(daveMoolaPurse.getBalance().extent, 0);
    t.equals(daveSimoleanPurse.getBalance().extent, 5);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('zoe - secondPriceAuction w/ 3 bids - alice exits onDemand', async t => {
  try {
    const { assays: originalAssays, mints, unitOps } = setup();
    const assays = originalAssays.slice(0, 2);
    const zoe = makeZoe({ require });

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(1));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeUnits(11));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // Alice creates a secondPriceAuction instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(publicAuctionRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const numBidsAllowed = 3;
    const aliceInvite = await zoe.makeInstance(installationHandle, {
      assays,
      numBidsAllowed,
    });
    const { instanceHandle } = aliceInvite.getBalance().extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);

    // Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'wantAtLeast',
          units: assays[1].makeUnits(3),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      seat: aliceSeat,
      payout: alicePayoutP,
      cancelObj,
    } = await zoe.redeem(aliceInvite, aliceOfferRules, alicePayments);

    // Alice initializes the auction
    const aliceOfferResult = await aliceSeat.sellAssets();
    const [bobInvite] = publicAPI.makeInvites(1);

    t.equals(
      aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    // Alice cancels her offer, making the auction stop accepting
    // offers
    cancelObj.cancel();

    // Alice gives Bob the invite

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'offerAtMost',
          units: assays[1].makeUnits(11),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // Bob escrows with zoe
    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobInvite,
      bobOfferRules,
      bobPayments,
    );

    // Bob bids
    t.throws(
      () => bobSeat.bid(),
      `The item up for auction has been withdrawn or the auction has completed`,
    );

    const aliceResult = await alicePayoutP;
    const bobResult = await bobPayoutP;

    const [aliceMoolaPayout, aliceSimoleanPayout] = await Promise.all(
      aliceResult,
    );
    const [bobMoolaPayout, bobSimoleanPayout] = await Promise.all(bobResult);

    // Alice (the creator of the auction) gets back what she put in
    t.deepEquals(
      aliceMoolaPayout.getBalance(),
      aliceOfferRules.payoutRules[0].units,
    );

    // Alice didn't get any of what she wanted
    t.equals(aliceSimoleanPayout.getBalance().extent, 0);

    // Alice deposits her payout to ensure she can
    await aliceMoolaPurse.depositAll(aliceMoolaPayout);
    await aliceSimoleanPurse.depositAll(aliceSimoleanPayout);

    // Bob gets a refund
    t.deepEquals(bobMoolaPayout.getBalance(), unitOps[0].make(0));
    t.deepEquals(
      bobSimoleanPayout.getBalance(),
      bobOfferRules.payoutRules[1].units,
    );

    // Bob deposits his payout to ensure he can
    await bobMoolaPurse.depositAll(bobMoolaPayout);
    await bobSimoleanPurse.depositAll(bobSimoleanPayout);

    // Assert that the correct refunds were received.
    // Alice had 1 moola and 0 simoleans.
    // Bob had 0 moola and 11 simoleans.
    // Carol had 0 moola and 7 simoleans.
    // Dave had 0 moola and 5 simoleans.
    t.equals(aliceMoolaPurse.getBalance().extent, 1);
    t.equals(aliceSimoleanPurse.getBalance().extent, 0);
    t.equals(bobMoolaPurse.getBalance().extent, 0);
    t.equals(bobSimoleanPurse.getBalance().extent, 11);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
