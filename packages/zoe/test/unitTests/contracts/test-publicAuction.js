// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints2';

const publicAuctionRoot = `${__dirname}/../../../src/contracts/publicAuction`;

test('zoe - secondPriceAuction w/ 3 bids', async t => {
  t.plan(34);
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(1));
    const aliceMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Setup Bob
    const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(11));
    const bobMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Setup Carol
    const carolSimoleanPayment = simoleanR.mint.mintPayment(simoleans(7));
    const carolMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const carolSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Setup Dave
    const daveSimoleanPayment = simoleanR.mint.mintPayment(simoleans(5));
    const daveMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const daveSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Alice creates a secondPriceAuction instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(publicAuctionRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const numBidsAllowed = 3;
    const issuerKeywordRecord = harden({
      Asset: moolaR.issuer,
      Bid: simoleanR.issuer,
    });
    const terms = harden({ numBidsAllowed });
    const aliceInvite = await zoe.makeInstance(
      installationHandle,
      issuerKeywordRecord,
      terms,
    );

    const {
      extent: [{ instanceHandle }],
    } = await inviteIssuer.getAmountOf(aliceInvite);
    const { publicAPI } = zoe.getInstance(instanceHandle);

    // Alice escrows with zoe
    const aliceProposal = harden({
      give: { Asset: moola(1) },
      want: { Bid: simoleans(3) },
    });
    const alicePayments = { Asset: aliceMoolaPayment };
    // Alice initializes the auction
    const { payout: alicePayoutP, outcome: aliceOfferResult } = await zoe.offer(
      aliceInvite,
      aliceProposal,
      alicePayments,
    );

    const [bobInvite, carolInvite, daveInvite] = await publicAPI.makeInvites(3);

    t.equals(
      await aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      'aliceOfferResult',
    );

    // Alice spreads the invites far and wide and Bob decides he
    // wants to participate in the auction.
    const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);
    const {
      extent: [bobInviteExtent],
    } = await inviteIssuer.getAmountOf(bobExclusiveInvite);

    const {
      installationHandle: bobInstallationId,
      terms: bobTerms,
      issuerKeywordRecord: bobIssuers,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);

    t.equals(bobInstallationId, installationHandle, 'bobInstallationId');
    t.deepEquals(
      bobIssuers,
      { Asset: moolaR.issuer, Bid: simoleanR.issuer },
      'bobIssuers',
    );
    t.equals(bobTerms.numBidsAllowed, 3, 'bobTerms');
    t.deepEquals(bobInviteExtent.minimumBid, simoleans(3), 'minimumBid');
    t.deepEquals(bobInviteExtent.auctionedAssets, moola(1), 'assets');

    const bobProposal = harden({
      give: { Bid: simoleans(11) },
      want: { Asset: moola(1) },
    });
    const bobPayments = { Bid: bobSimoleanPayment };

    // Bob escrows with zoe
    // Bob bids
    const { payout: bobPayoutP, outcome: bobOfferResult } = await zoe.offer(
      bobExclusiveInvite,
      bobProposal,
      bobPayments,
    );

    t.equals(
      await bobOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      'bobOfferResult',
    );

    // Carol decides to bid for the one moola

    const carolExclusiveInvite = await inviteIssuer.claim(carolInvite);
    const {
      extent: [carolInviteExtent],
    } = await inviteIssuer.getAmountOf(carolExclusiveInvite);

    const {
      installationHandle: carolInstallationId,
      terms: carolTerms,
      issuerKeywordRecord: carolIssuers,
    } = zoe.getInstance(carolInviteExtent.instanceHandle);

    t.equals(carolInstallationId, installationHandle, 'carolInstallationId');
    t.deepEquals(
      carolIssuers,
      { Asset: moolaR.issuer, Bid: simoleanR.issuer },
      'carolIssuers',
    );
    t.equals(carolTerms.numBidsAllowed, 3, 'carolTerms');
    t.deepEquals(carolInviteExtent.minimumBid, simoleans(3), 'carolMinimumBid');
    t.deepEquals(
      carolInviteExtent.auctionedAssets,
      moola(1),
      'carolAuctionedAssets',
    );

    const carolProposal = harden({
      give: { Bid: simoleans(7) },
      want: { Asset: moola(1) },
    });
    const carolPayments = { Bid: carolSimoleanPayment };

    // Carol escrows with zoe
    // Carol bids
    const { payout: carolPayoutP, outcome: carolOfferResult } = await zoe.offer(
      carolExclusiveInvite,
      carolProposal,
      carolPayments,
    );

    t.equals(
      await carolOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      'carolOfferResult',
    );

    // Dave decides to bid for the one moola
    const daveExclusiveInvite = await inviteIssuer.claim(daveInvite);
    const {
      extent: [daveInviteExtent],
    } = await inviteIssuer.getAmountOf(daveExclusiveInvite);

    const {
      installationHandle: daveInstallationId,
      terms: daveTerms,
      issuerKeywordRecord: daveIssuers,
    } = zoe.getInstance(daveInviteExtent.instanceHandle);

    t.equals(daveInstallationId, installationHandle, 'daveInstallationHandle');
    t.deepEquals(
      daveIssuers,
      { Asset: moolaR.issuer, Bid: simoleanR.issuer },
      'daveIssuers',
    );
    t.equals(daveTerms.numBidsAllowed, 3, 'bobTerms');
    t.deepEquals(daveInviteExtent.minimumBid, simoleans(3), 'daveMinimumBid');
    t.deepEquals(daveInviteExtent.auctionedAssets, moola(1), 'daveAssets');

    const daveProposal = harden({
      give: { Bid: simoleans(5) },
      want: { Asset: moola(1) },
    });
    const davePayments = { Bid: daveSimoleanPayment };

    // Dave escrows with zoe
    // Dave bids
    const { payout: davePayoutP, outcome: daveOfferResult } = await zoe.offer(
      daveExclusiveInvite,
      daveProposal,
      davePayments,
    );

    t.equals(
      await daveOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      'daveOfferResult',
    );

    const aliceResult = await alicePayoutP;
    const bobResult = await bobPayoutP;
    const carolResult = await carolPayoutP;
    const daveResult = await davePayoutP;

    const aliceMoolaPayout = await aliceResult.Asset;
    const aliceSimoleanPayout = await aliceResult.Bid;

    const bobMoolaPayout = await bobResult.Asset;
    const bobSimoleanPayout = await bobResult.Bid;

    const carolMoolaPayout = await carolResult.Asset;
    const carolSimoleanPayout = await carolResult.Bid;

    const daveMoolaPayout = await daveResult.Asset;
    const daveSimoleanPayout = await daveResult.Bid;

    // Alice (the creator of the auction) gets back the second highest bid
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
      carolProposal.give.Bid,
      `alice gets carol's bid`,
    );

    // Alice didn't get any of what she put in
    t.deepEquals(
      await moolaR.issuer.getAmountOf(aliceMoolaPayout),
      moola(0),
      `alice gets nothing of what she put in`,
    );

    // Alice deposits her payout to ensure she can
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // Bob (the winner of the auction) gets the one moola and the
    // difference between his bid and the price back
    t.deepEquals(
      await moolaR.issuer.getAmountOf(bobMoolaPayout),
      moola(1),
      `bob is the winner`,
    );
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(bobSimoleanPayout),
      simoleans(4),
      `bob gets difference back`,
    );

    // Bob deposits his payout to ensure he can
    await bobMoolaPurse.deposit(bobMoolaPayout);
    await bobSimoleanPurse.deposit(bobSimoleanPayout);

    // Carol gets a full refund
    t.deepEquals(
      await moolaR.issuer.getAmountOf(carolMoolaPayout),
      moola(0),
      `carol doesn't win`,
    );
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(carolSimoleanPayout),
      carolProposal.give.Bid,
      `carol gets a refund`,
    );

    // Carol deposits her payout to ensure she can
    await carolMoolaPurse.deposit(carolMoolaPayout);
    await carolSimoleanPurse.deposit(carolSimoleanPayout);

    // Dave gets a full refund
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(daveSimoleanPayout),
      daveProposal.give.Bid,
      `dave gets a refund`,
    );

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
  }
});

test('zoe - secondPriceAuction w/ 3 bids - alice exits onDemand', async t => {
  t.plan(10);
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(1));
    const aliceMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Setup Bob
    const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(11));
    const bobMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Alice creates a secondPriceAuction instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(publicAuctionRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const numBidsAllowed = 3;
    const issuerKeywordRecord = harden({
      Asset: moolaR.issuer,
      Bid: simoleanR.issuer,
    });
    const terms = harden({ numBidsAllowed });
    const aliceInvite = await zoe.makeInstance(
      installationHandle,
      issuerKeywordRecord,
      terms,
    );
    const {
      extent: [{ instanceHandle }],
    } = await inviteIssuer.getAmountOf(aliceInvite);
    const { publicAPI } = zoe.getInstance(instanceHandle);

    // Alice escrows with zoe
    const aliceProposal = harden({
      give: { Asset: moola(1) },
      want: { Bid: simoleans(3) },
    });
    const alicePayments = harden({ Asset: aliceMoolaPayment });
    // Alice initializes the auction
    const {
      payout: alicePayoutP,
      cancelObj,
      outcome: aliceOfferResult,
    } = await zoe.offer(aliceInvite, aliceProposal, alicePayments);

    const [bobInvite] = publicAPI.makeInvites(1);

    t.equals(
      await aliceOfferResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    // Alice cancels her offer, making the auction stop accepting
    // offers
    cancelObj.cancel();

    // Alice gives Bob the invite

    const bobProposal = harden({
      want: { Asset: moola(1) },
      give: { Bid: simoleans(11) },
    });
    const bobPayments = harden({ Bid: bobSimoleanPayment });

    // Bob escrows with zoe
    const { payout: bobPayoutP, outcome: brokenOutcome } = await zoe.offer(
      bobInvite,
      bobProposal,
      bobPayments,
    );

    // Bob bids
    t.throws(
      // TODO what's the rejected promise equiv of t.throws?
      brokenOutcome,
      `The item up for auction has been withdrawn or the auction has completed`,
    );

    const aliceResult = await alicePayoutP;
    const bobResult = await bobPayoutP;

    const aliceMoolaPayout = await aliceResult.Asset;
    const aliceSimoleanPayout = await aliceResult.Bid;
    const bobMoolaPayout = await bobResult.Asset;
    const bobSimoleanPayout = await bobResult.Bid;

    // Alice (the creator of the auction) gets back what she put in
    t.deepEquals(
      await moolaR.issuer.getAmountOf(aliceMoolaPayout),
      aliceProposal.give.Asset,
    );

    // Alice didn't get any of what she wanted
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
      simoleans(0),
    );

    // Alice deposits her payout to ensure she can
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // Bob gets a refund
    t.deepEquals(await moolaR.issuer.getAmountOf(bobMoolaPayout), moola(0));
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(bobSimoleanPayout),
      bobProposal.give.Bid,
    );

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
  }
});
