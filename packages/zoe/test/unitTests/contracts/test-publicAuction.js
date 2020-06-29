import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';
import { setupMixed } from '../setupMixedMints';

const publicAuctionRoot = `${__dirname}/../../../src/contracts/publicAuction`;

test('zoe - secondPriceAuction w/ 3 bids', async t => {
  t.plan(34);
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe();
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
    const bundle = await bundleSource(publicAuctionRoot);

    const installationHandle = await zoe.install(bundle);
    const numBidsAllowed = 3;
    const issuerKeywordRecord = harden({
      Asset: moolaR.issuer,
      Ask: simoleanR.issuer,
    });
    const terms = harden({ numBidsAllowed });
    const {
      invite: aliceInvite,
      instanceRecord: { publicAPI },
    } = await zoe.makeInstance(installationHandle, issuerKeywordRecord, terms);

    // Alice escrows with zoe
    const aliceProposal = harden({
      give: { Asset: moola(1) },
      want: { Ask: simoleans(3) },
    });
    const alicePayments = { Asset: aliceMoolaPayment };
    // Alice initializes the auction
    const { payout: alicePayoutP, outcome: aliceOutcomeP } = await zoe.offer(
      aliceInvite,
      aliceProposal,
      alicePayments,
    );

    const [bobInvite, carolInvite, daveInvite] = await publicAPI.makeInvites(3);

    t.equals(
      await aliceOutcomeP,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      'aliceOutcome',
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
    } = zoe.getInstanceRecord(bobInviteExtent.instanceHandle);

    t.equals(bobInstallationId, installationHandle, 'bobInstallationId');
    t.deepEquals(
      bobIssuers,
      { Asset: moolaR.issuer, Ask: simoleanR.issuer },
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
    const { payout: bobPayoutP, outcome: bobOutcomeP } = await zoe.offer(
      bobExclusiveInvite,
      bobProposal,
      bobPayments,
    );

    t.equals(
      await bobOutcomeP,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      'bobOutcome',
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
    } = zoe.getInstanceRecord(carolInviteExtent.instanceHandle);

    t.equals(carolInstallationId, installationHandle, 'carolInstallationId');
    t.deepEquals(
      carolIssuers,
      { Asset: moolaR.issuer, Ask: simoleanR.issuer },
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
    const { payout: carolPayoutP, outcome: carolOutcomeP } = await zoe.offer(
      carolExclusiveInvite,
      carolProposal,
      carolPayments,
    );

    t.equals(
      await carolOutcomeP,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      'carolOutcome',
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
    } = zoe.getInstanceRecord(daveInviteExtent.instanceHandle);

    t.equals(daveInstallationId, installationHandle, 'daveInstallationHandle');
    t.deepEquals(
      daveIssuers,
      { Asset: moolaR.issuer, Ask: simoleanR.issuer },
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
    const { payout: davePayoutP, outcome: daveOutcomeP } = await zoe.offer(
      daveExclusiveInvite,
      daveProposal,
      davePayments,
    );

    t.equals(
      await daveOutcomeP,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      'daveOutcome',
    );

    const aliceResult = await alicePayoutP;
    const bobResult = await bobPayoutP;
    const carolResult = await carolPayoutP;
    const daveResult = await davePayoutP;

    const aliceMoolaPayout = await aliceResult.Asset;
    const aliceSimoleanPayout = await aliceResult.Ask;

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
    const zoe = makeZoe();

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
    const bundle = await bundleSource(publicAuctionRoot);

    const installationHandle = await zoe.install(bundle);
    const numBidsAllowed = 3;
    const issuerKeywordRecord = harden({
      Asset: moolaR.issuer,
      Ask: simoleanR.issuer,
    });
    const terms = harden({ numBidsAllowed });
    const {
      invite: aliceInvite,
      instanceRecord: { publicAPI },
    } = await zoe.makeInstance(installationHandle, issuerKeywordRecord, terms);

    // Alice escrows with zoe
    const aliceProposal = harden({
      give: { Asset: moola(1) },
      want: { Ask: simoleans(3) },
    });
    const alicePayments = harden({ Asset: aliceMoolaPayment });
    // Alice initializes the auction
    const {
      payout: alicePayoutP,
      completeObj,
      outcome: aliceOutcomeP,
    } = await zoe.offer(aliceInvite, aliceProposal, alicePayments);

    const [bobInvite] = publicAPI.makeInvites(1);

    t.equals(
      await aliceOutcomeP,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    // Alice completes her offer, making the auction stop accepting
    // offers
    completeObj.complete();

    // Alice gives Bob the invite

    const bobProposal = harden({
      want: { Asset: moola(1) },
      give: { Bid: simoleans(11) },
    });
    const bobPayments = harden({ Bid: bobSimoleanPayment });

    // Bob escrows with zoe
    // Bob bids
    const { payout: bobPayoutP, outcome: brokenOutcomeP } = await zoe.offer(
      bobInvite,
      bobProposal,
      bobPayments,
    );

    t.rejects(
      () => brokenOutcomeP,
      new Error(
        'The item up for auction has been withdrawn or the auction has completed',
      ),
      'The bid should have failed.',
    );

    const aliceResult = await alicePayoutP;
    const bobResult = await bobPayoutP;

    const aliceMoolaPayout = await aliceResult.Asset;
    const aliceSimoleanPayout = await aliceResult.Ask;
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

// Three bidders with (fungible) moola bid for a CryptoCat
test('zoe - secondPriceAuction non-fungible asset', async t => {
  t.plan(34);
  const {
    ccIssuer,
    moolaIssuer,
    ccMint,
    moolaMint,
    cryptoCats,
    moola,
  } = setupMixed();
  const zoe = makeZoe();
  const inviteIssuer = zoe.getInviteIssuer();

  // Setup Alice
  const aliceCcPayment = ccMint.mintPayment(cryptoCats(harden(['Felix'])));
  const aliceCcPurse = ccIssuer.makeEmptyPurse();
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();

  // Setup Bob
  const bobMoolaPayment = moolaMint.mintPayment(moola(11));
  const bobCcPurse = ccIssuer.makeEmptyPurse();
  const bobMoolaPurse = moolaIssuer.makeEmptyPurse();

  // Setup Carol
  const carolMoolaPayment = moolaMint.mintPayment(moola(7));
  const carolCcPurse = ccIssuer.makeEmptyPurse();
  const carolMoolaPurse = moolaIssuer.makeEmptyPurse();

  // Setup Dave
  const daveMoolaPayment = moolaMint.mintPayment(moola(5));
  const daveCcPurse = ccIssuer.makeEmptyPurse();
  const daveMoolaPurse = moolaIssuer.makeEmptyPurse();

  // Alice creates a secondPriceAuction instance

  // Pack the contract.
  const bundle = await bundleSource(publicAuctionRoot);

  const installationHandle = await zoe.install(bundle);
  const numBidsAllowed = 3;
  const issuerKeywordRecord = harden({
    Asset: ccIssuer,
    Ask: moolaIssuer,
  });
  const terms = harden({ numBidsAllowed });
  const {
    invite: aliceInvite,
    instanceRecord: { publicAPI },
  } = await zoe.makeInstance(installationHandle, issuerKeywordRecord, terms);

  // Alice escrows with zoe
  const aliceProposal = harden({
    give: { Asset: cryptoCats(harden(['Felix'])) },
    want: { Ask: moola(3) },
  });
  const alicePayments = { Asset: aliceCcPayment };
  // Alice initializes the auction
  const { payout: alicePayoutP, outcome: aliceOutcomeP } = await zoe.offer(
    aliceInvite,
    aliceProposal,
    alicePayments,
  );

  const [bobInvite, carolInvite, daveInvite] = await publicAPI.makeInvites(3);

  t.equals(
    await aliceOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
    'aliceOutcome',
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
  } = zoe.getInstanceRecord(bobInviteExtent.instanceHandle);

  t.equals(bobInstallationId, installationHandle, 'bobInstallationId');
  t.deepEquals(bobIssuers, { Asset: ccIssuer, Ask: moolaIssuer }, 'bobIssuers');
  t.equals(bobTerms.numBidsAllowed, 3, 'bobTerms');
  t.deepEquals(bobInviteExtent.minimumBid, moola(3), 'minimumBid');
  t.deepEquals(
    bobInviteExtent.auctionedAssets,
    cryptoCats(harden(['Felix'])),
    'assets',
  );

  const bobProposal = harden({
    give: { Bid: moola(11) },
    want: { Asset: cryptoCats(harden(['Felix'])) },
  });
  const bobPayments = { Bid: bobMoolaPayment };

  // Bob escrows with zoe
  // Bob bids
  const { payout: bobPayoutP, outcome: bobOutcomeP } = await zoe.offer(
    bobExclusiveInvite,
    bobProposal,
    bobPayments,
  );

  t.equals(
    await bobOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
    'bobOutcome',
  );

  // Carol decides to bid for the one cc

  const carolExclusiveInvite = await inviteIssuer.claim(carolInvite);
  const {
    extent: [carolInviteExtent],
  } = await inviteIssuer.getAmountOf(carolExclusiveInvite);

  const {
    installationHandle: carolInstallationId,
    terms: carolTerms,
    issuerKeywordRecord: carolIssuers,
  } = zoe.getInstanceRecord(carolInviteExtent.instanceHandle);

  t.equals(carolInstallationId, installationHandle, 'carolInstallationId');
  t.deepEquals(
    carolIssuers,
    { Asset: ccIssuer, Ask: moolaIssuer },
    'carolIssuers',
  );
  t.equals(carolTerms.numBidsAllowed, 3, 'carolTerms');
  t.deepEquals(carolInviteExtent.minimumBid, moola(3), 'carolMinimumBid');
  t.deepEquals(
    carolInviteExtent.auctionedAssets,
    cryptoCats(harden(['Felix'])),
    'carolAuctionedAssets',
  );

  const carolProposal = harden({
    give: { Bid: moola(7) },
    want: { Asset: cryptoCats(harden(['Felix'])) },
  });
  const carolPayments = { Bid: carolMoolaPayment };

  // Carol escrows with zoe
  // Carol bids
  const { payout: carolPayoutP, outcome: carolOutcomeP } = await zoe.offer(
    carolExclusiveInvite,
    carolProposal,
    carolPayments,
  );

  t.equals(
    await carolOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
    'carolOutcome',
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
  } = zoe.getInstanceRecord(daveInviteExtent.instanceHandle);

  t.equals(daveInstallationId, installationHandle, 'daveInstallationHandle');
  t.deepEquals(
    daveIssuers,
    { Asset: ccIssuer, Ask: moolaIssuer },
    'daveIssuers',
  );
  t.equals(daveTerms.numBidsAllowed, 3, 'bobTerms');
  t.deepEquals(daveInviteExtent.minimumBid, moola(3), 'daveMinimumBid');
  t.deepEquals(
    daveInviteExtent.auctionedAssets,
    cryptoCats(harden(['Felix'])),
    'daveAssets',
  );

  const daveProposal = harden({
    give: { Bid: moola(5) },
    want: { Asset: cryptoCats(harden(['Felix'])) },
  });
  const davePayments = { Bid: daveMoolaPayment };

  // Dave escrows with zoe
  // Dave bids
  const { payout: davePayoutP, outcome: daveOutcomeP } = await zoe.offer(
    daveExclusiveInvite,
    daveProposal,
    davePayments,
  );

  t.equals(
    await daveOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
    'daveOutcome',
  );

  const aliceResult = await alicePayoutP;
  const bobResult = await bobPayoutP;
  const carolResult = await carolPayoutP;
  const daveResult = await davePayoutP;

  const aliceCcPayout = await aliceResult.Asset;
  const aliceMoolaPayout = await aliceResult.Ask;

  const bobCcPayout = await bobResult.Asset;
  const bobMoolaPayout = await bobResult.Bid;

  const carolCcPayout = await carolResult.Asset;
  const carolMoolaPayout = await carolResult.Bid;

  const daveCcPayout = await daveResult.Asset;
  const daveMoolaPayout = await daveResult.Bid;

  // Alice (the creator of the auction) gets back the second highest bid
  t.deepEquals(
    await moolaIssuer.getAmountOf(aliceMoolaPayout),
    carolProposal.give.Bid,
    `alice gets carol's bid`,
  );

  // Alice didn't get any of what she put in
  t.deepEquals(
    await ccIssuer.getAmountOf(aliceCcPayout),
    cryptoCats(harden([])),
    `alice gets nothing of what she put in`,
  );

  // Alice deposits her payout to ensure she can
  await aliceCcPurse.deposit(aliceCcPayout);
  await aliceMoolaPurse.deposit(aliceMoolaPayout);

  // Bob (the winner of the auction) gets the one moola and the
  // difference between his bid and the price back
  t.deepEquals(
    await ccIssuer.getAmountOf(bobCcPayout),
    cryptoCats(harden(['Felix'])),
    `bob is the winner`,
  );
  t.deepEquals(
    await moolaIssuer.getAmountOf(bobMoolaPayout),
    moola(4),
    `bob gets difference back`,
  );

  // Bob deposits his payout to ensure he can
  await bobCcPurse.deposit(bobCcPayout);
  await bobMoolaPurse.deposit(bobMoolaPayout);

  // Carol gets a full refund
  t.deepEquals(
    await ccIssuer.getAmountOf(carolCcPayout),
    cryptoCats(harden([])),
    `carol doesn't win`,
  );
  t.deepEquals(
    await moolaIssuer.getAmountOf(carolMoolaPayout),
    carolProposal.give.Bid,
    `carol gets a refund`,
  );

  // Carol deposits her payout to ensure she can
  await carolCcPurse.deposit(carolCcPayout);
  await carolMoolaPurse.deposit(carolMoolaPayout);

  // Dave gets a full refund
  t.deepEquals(
    await moolaIssuer.getAmountOf(daveMoolaPayout),
    daveProposal.give.Bid,
    `dave gets a refund`,
  );

  // Dave deposits his payout to ensure he can
  await daveCcPurse.deposit(daveCcPayout);
  await daveMoolaPurse.deposit(daveMoolaPayout);

  // Assert that the correct payout were received.
  // Alice had 1 CryptoCat and an empty CryptoCat purse.
  // Bob had an empty CryptoCat purse and 11 moola.
  // Carol had an empty CryptoCat purse and 7 moola.
  // Dave had an empty CryptoCat purse and 5 moola.

  // Now, they should have:
  // Alice: an empty CryptoCat purse and 7 moola
  // Bob: the CryptoCat and 4 moola
  // Carol: an empty CryptoCat purse and 7 moola
  // Dave: an empty CryptoCat purse and 5 moola
  t.deepEquals(aliceCcPurse.getCurrentAmount().extent, []);
  t.equals(aliceMoolaPurse.getCurrentAmount().extent, 7);
  t.deepEquals(bobCcPurse.getCurrentAmount().extent, ['Felix']);
  t.equals(bobMoolaPurse.getCurrentAmount().extent, 4);
  t.deepEquals(carolCcPurse.getCurrentAmount().extent, []);
  t.equals(carolMoolaPurse.getCurrentAmount().extent, 7);
  t.deepEquals(daveCcPurse.getCurrentAmount().extent, []);
  t.equals(daveMoolaPurse.getCurrentAmount().extent, 5);
});
