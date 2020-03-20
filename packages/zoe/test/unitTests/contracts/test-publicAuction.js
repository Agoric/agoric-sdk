// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const publicAuctionRoot = `${__dirname}/../../../src/contracts/publicAuction`;

test('zoe - secondPriceAuction w/ 3 bids', async t => {
  try {
    const { issuers: originalIssuers, mints, moola, simoleans } = setup();
    const issuers = originalIssuers.slice(0, 2);
    const [moolaMint, simoleanMint] = mints;
    const [moolaIssuer, simoleanIssuer] = issuers;
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();

    // Setup Alice
    const aliceMoolaPayment = moolaMint.mintPayment(moola(1));
    const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

    // Setup Bob
    const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(11));
    const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();

    // Setup Carol
    const carolSimoleanPayment = simoleanMint.mintPayment(simoleans(7));
    const carolMoolaPurse = moolaIssuer.makeEmptyPurse();
    const carolSimoleanPurse = simoleanIssuer.makeEmptyPurse();

    // Setup Dave
    const daveSimoleanPayment = simoleanMint.mintPayment(simoleans(5));
    const daveMoolaPurse = moolaIssuer.makeEmptyPurse();
    const daveSimoleanPurse = simoleanIssuer.makeEmptyPurse();

    // Alice creates a secondPriceAuction instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(publicAuctionRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const numBidsAllowed = 3;
    const aliceInvite = await zoe.makeInstance(installationHandle, {
      issuers,
      numBidsAllowed,
    });

    const aliceInviteAmount = await inviteIssuer.getAmountOf(aliceInvite);
    const [{ instanceHandle }] = aliceInviteAmount.extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);

    // Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(1),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(3),
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
    const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);
    const bobExclInvAmount = await inviteIssuer.getAmountOf(bobExclusiveInvite);
    const bobInviteExtent = bobExclInvAmount.extent[0];

    const {
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);

    t.equals(bobInstallationId, installationHandle);
    t.deepEquals(bobTerms.issuers, issuers);
    t.deepEquals(bobInviteExtent.minimumBid, simoleans(3));
    t.deepEquals(bobInviteExtent.auctionedAssets, moola(1));

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: moola(1),
        },
        {
          kind: 'offerAtMost',
          amount: simoleans(11),
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

    const carolExclusiveInvite = await inviteIssuer.claim(carolInvite);
    const carolExclAmt = await inviteIssuer.getAmountOf(carolExclusiveInvite);
    const carolInviteExtent = carolExclAmt.extent[0];

    const {
      installationHandle: carolInstallationId,
      terms: carolTerms,
    } = zoe.getInstance(carolInviteExtent.instanceHandle);

    t.equals(carolInstallationId, installationHandle);
    t.deepEquals(carolTerms.issuers, issuers);
    t.deepEquals(carolInviteExtent.minimumBid, simoleans(3));
    t.deepEquals(carolInviteExtent.auctionedAssets, moola(1));

    const carolOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: moola(1),
        },
        {
          kind: 'offerAtMost',
          amount: simoleans(7),
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
    const daveExclusiveInvite = await inviteIssuer.claim(daveInvite);
    const daveExclAmount = await inviteIssuer.getAmountOf(daveExclusiveInvite);
    const daveInviteExtent = daveExclAmount.extent[0];

    const {
      installationHandle: daveInstallationId,
      terms: daveTerms,
    } = zoe.getInstance(daveInviteExtent.instanceHandle);

    t.equals(daveInstallationId, installationHandle);
    t.deepEquals(daveTerms.issuers, issuers);
    t.deepEquals(daveInviteExtent.minimumBid, simoleans(3));
    t.deepEquals(daveInviteExtent.auctionedAssets, moola(1));

    const daveOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: moola(1),
        },
        {
          kind: 'offerAtMost',
          amount: simoleans(5),
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
    const aliceSimAmt = await simoleanIssuer.getAmountOf(aliceSimoleanPayout);
    t.deepEquals(aliceSimAmt, carolOfferRules.payoutRules[1].amount);

    // Alice didn't get any of what she put in
    const aliceMoolaAmount = await moolaIssuer.getAmountOf(aliceMoolaPayout);
    t.deepEquals(aliceMoolaAmount, moola(0));

    // Alice deposits her payout to ensure she can
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // Bob (the winner of the auction) gets the one moola and the
    // difference between his bid and the price back
    const bobMoolaAmount = await moolaIssuer.getAmountOf(bobMoolaPayout);
    t.deepEquals(bobMoolaAmount, moola(1));
    const bobSimAmount = await simoleanIssuer.getAmountOf(bobSimoleanPayout);
    t.deepEquals(bobSimAmount, simoleans(4));

    // Bob deposits his payout to ensure he can
    await bobMoolaPurse.deposit(bobMoolaPayout);
    await bobSimoleanPurse.deposit(bobSimoleanPayout);

    // Carol gets a full refund
    const carolMoolaAmount = await moolaIssuer.getAmountOf(carolMoolaPayout);
    t.deepEquals(carolMoolaAmount, moola(0));
    const carolSimAmt = await simoleanIssuer.getAmountOf(carolSimoleanPayout);
    t.deepEquals(carolSimAmt, carolOfferRules.payoutRules[1].amount);

    // Carol deposits her payout to ensure she can
    await carolMoolaPurse.deposit(carolMoolaPayout);
    await carolSimoleanPurse.deposit(carolSimoleanPayout);

    // Dave gets a full refund
    const daveSimAmount = await simoleanIssuer.getAmountOf(daveSimoleanPayout);
    t.deepEquals(daveSimAmount, daveOfferRules.payoutRules[1].amount);

    // Dave deposits his payout to ensure he can
    await daveMoolaPurse.deposit(daveMoolaPayout);
    await daveSimoleanPurse.deposit(daveSimoleanPayout);

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
    t.equals(aliceMoolaPurse.getCurrentAmount().extent, 0);
    t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 7);
    t.equals(bobMoolaPurse.getCurrentAmount().extent, 1);
    t.equals(bobSimoleanPurse.getCurrentAmount().extent, 4);
    t.equals(carolMoolaPurse.getCurrentAmount().extent, 0);
    t.equals(carolSimoleanPurse.getCurrentAmount().extent, 7);
    t.equals(daveMoolaPurse.getCurrentAmount().extent, 0);
    t.equals(daveSimoleanPurse.getCurrentAmount().extent, 5);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('zoe - secondPriceAuction w/ 3 bids - alice exits onDemand', async t => {
  try {
    const { issuers: originalIssuers, mints, moola, simoleans } = setup();
    const issuers = originalIssuers.slice(0, 2);
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();
    const [moolaMint, simoleanMint] = mints;
    const [moolaIssuer, simoleanIssuer] = issuers;

    // Setup Alice
    const aliceMoolaPayment = moolaMint.mintPayment(moola(1));
    const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

    // Setup Bob
    const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(11));
    const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();

    // Alice creates a secondPriceAuction instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(publicAuctionRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const numBidsAllowed = 3;
    const aliceInvite = await zoe.makeInstance(installationHandle, {
      issuers,
      numBidsAllowed,
    });
    const aliceInviteAmount = await inviteIssuer.getAmountOf(aliceInvite);
    const { instanceHandle } = aliceInviteAmount.extent[0];
    const { publicAPI } = zoe.getInstance(instanceHandle);

    // Alice escrows with zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(1),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(3),
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
          amount: moola(1),
        },
        {
          kind: 'offerAtMost',
          amount: simoleans(11),
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
    const aliceMoolaAmount = await moolaIssuer.getAmountOf(aliceMoolaPayout);
    t.deepEquals(aliceMoolaAmount, aliceOfferRules.payoutRules[0].amount);

    // Alice didn't get any of what she wanted
    const aliceSimAmt = await simoleanIssuer.getAmountOf(aliceSimoleanPayout);
    t.deepEquals(aliceSimAmt, simoleans(0));

    // Alice deposits her payout to ensure she can
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // Bob gets a refund
    const bobMoolaAmount = await moolaIssuer.getAmountOf(bobMoolaPayout);
    t.deepEquals(bobMoolaAmount, moola(0));
    const bobSimAmount = await simoleanIssuer.getAmountOf(bobSimoleanPayout);
    t.deepEquals(bobSimAmount, bobOfferRules.payoutRules[1].amount);

    // Bob deposits his payout to ensure he can
    await bobMoolaPurse.deposit(bobMoolaPayout);
    await bobSimoleanPurse.deposit(bobSimoleanPayout);

    // Assert that the correct refunds were received.
    // Alice had 1 moola and 0 simoleans.
    // Bob had 0 moola and 11 simoleans.
    // Carol had 0 moola and 7 simoleans.
    // Dave had 0 moola and 5 simoleans.
    t.equals(aliceMoolaPurse.getCurrentAmount().extent, 1);
    t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 0);
    t.equals(bobMoolaPurse.getCurrentAmount().extent, 0);
    t.equals(bobSimoleanPurse.getCurrentAmount().extent, 11);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
