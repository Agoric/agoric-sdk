import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';
import { setup } from '../setupBasicMints';
import { setupMixed } from '../setupMixedMints';
import fakeVatAdmin from './fakeVatAdmin';

const publicAuctionRoot = `${__dirname}/../../../src/contracts/publicAuction`;

test('zoe - secondPriceAuction w/ 3 bids', async t => {
  t.plan(15);
  try {
    const { moolaKit, simoleanKit, moola, simoleans, zoe } = setup();

    const makeAlice = async moolaPayment => {
      const moolaPurse = await E(moolaKit.issuer).makeEmptyPurse();
      const simoleanPurse = await E(simoleanKit.issuer).makeEmptyPurse();
      return {
        installCode: async () => {
          // pack the contract
          const bundle = await bundleSource(publicAuctionRoot);
          // install the contract
          const installationP = E(zoe).install(bundle);
          return installationP;
        },
        makeInstance: async installation => {
          const issuerKeywordRecord = harden({
            Asset: moolaKit.issuer,
            Ask: simoleanKit.issuer,
          });
          const terms = harden({ numBidsAllowed: 3 });
          const adminP = zoe.makeInstance(
            installation,
            issuerKeywordRecord,
            terms,
          );
          return adminP;
        },
        offer: async sellInvitation => {
          const proposal = harden({
            give: { Asset: moola(1) },
            want: { Ask: simoleans(3) },
          });

          const payments = { Asset: moolaPayment };

          const seat = await E(zoe).offer(sellInvitation, proposal, payments);

          E(seat)
            .getPayout('Asset')
            .then(moolaPurse.deposit)
            .then(amountDeposited =>
              t.deepEqual(
                amountDeposited,
                moola(0),
                `Alice didn't get any of what she put in`,
              ),
            );

          E(seat)
            .getPayout('Ask')
            .then(simoleanPurse.deposit)
            .then(amountDeposited =>
              t.deepEqual(
                amountDeposited,
                simoleans(7),
                `Alice got the second price bid, Carol's bid, even though Bob won`,
              ),
            );

          const makeBidInvitationObj = await E(seat).getOfferResult();
          return makeBidInvitationObj;
        },
      };
    };

    const makeBob = (installation, simoleanPayment) => {
      const moolaPurse = moolaKit.issuer.makeEmptyPurse();
      const simoleanPurse = simoleanKit.issuer.makeEmptyPurse();
      return harden({
        offer: async untrustedInvitation => {
          const invitationIssuer = await E(zoe).getInvitationIssuer();

          // Bob is able to use the trusted invitationIssuer from Zoe to
          // transform an untrusted invitation that Alice also has access to, to
          // an
          const invitation = await invitationIssuer.claim(untrustedInvitation);

          const {
            value: [invitationValue],
          } = await invitationIssuer.getAmountOf(invitation);

         t.is(
            invitationValue.installation,
            installation,
            'installation is publicAuction',
          );
          t.deepEqual(
            invitationValue.auctionedAssets,
            moola(1),
            `asset to be auctioned is 1 moola`,
          );
          t.deepEqual(
            invitationValue.minimumBid,
            simoleans(3),
            `minimum bid is 3 simoleans`,
          );

          t.deepEqual(
            invitationValue.numBidsAllowed,
            3,
            `auction will be closed after 3 bids`,
          );

          const proposal = harden({
            give: { Bid: simoleans(11) },
            want: { Asset: moola(1) },
          });
          const payments = { Bid: simoleanPayment };

          const seat = await zoe.offer(invitation, proposal, payments);

         t.is(
            await E(seat).getOfferResult(),
            'The offer has been accepted. Once the contract has been completed, please check your payout',
          );

          E(seat)
            .getPayout('Asset')
            .then(moolaPurse.deposit)
            .then(amountDeposited =>
              t.deepEqual(
                amountDeposited,
                proposal.want.Asset,
                `Bob wins the auction`,
              ),
            );

          E(seat)
            .getPayout('Bid')
            .then(simoleanPurse.deposit)
            .then(amountDeposited =>
              t.deepEqual(
                amountDeposited,
                simoleans(4),
                `Bob gets the difference between the second-price bid (Carol's 7 simoleans) and his bid back`,
              ),
            );
        },
      });
    };

    const makeLosingBidder = (bidAmount, simoleanPayment) => {
      const moolaPurse = moolaKit.issuer.makeEmptyPurse();
      const simoleanPurse = simoleanKit.issuer.makeEmptyPurse();
      return harden({
        offer: async untrustedInvitation => {
          const invitationIssuer = await E(zoe).getInvitationIssuer();
          const invitation = await invitationIssuer.claim(untrustedInvitation);

          const proposal = harden({
            give: { Bid: bidAmount },
            want: { Asset: moola(1) },
          });
          const payments = { Bid: simoleanPayment };

          const seat = await zoe.offer(invitation, proposal, payments);

         t.is(
            await E(seat).getOfferResult(),
            'The offer has been accepted. Once the contract has been completed, please check your payout',
          );

          E(seat)
            .getPayout('Asset')
            .then(moolaPurse.deposit)
            .then(amountDeposited =>
              t.deepEqual(amountDeposited, moola(0), `didn't win the auction`),
            );

          E(seat)
            .getPayout('Bid')
            .then(simoleanPurse.deposit)
            .then(amountDeposited =>
              t.deepEqual(amountDeposited, bidAmount, `full refund`),
            );
        },
      });
    };

    // Setup Alice
    const alice = await makeAlice(moolaKit.mint.mintPayment(moola(1)));
    const installation = await alice.installCode();

    // Setup Bob, Carol, Dave
    const bob = makeBob(
      installation,
      await simoleanKit.mint.mintPayment(simoleans(11)),
    );
    const carol = makeLosingBidder(
      simoleans(7),
      await simoleanKit.mint.mintPayment(simoleans(7)),
    );
    const dave = makeLosingBidder(
      simoleans(5),
      await simoleanKit.mint.mintPayment(simoleans(5)),
    );

    const { creatorInvitation } = await alice.makeInstance(installation);

    const makeInvitationsObj = await alice.offer(creatorInvitation);

    const bidInvitation1 = E(makeInvitationsObj).makeBidInvitation();
    const bidInvitation2 = E(makeInvitationsObj).makeBidInvitation();
    const bidInvitation3 = E(makeInvitationsObj).makeBidInvitation();

    bob.offer(bidInvitation1);
    carol.offer(bidInvitation2);
    dave.offer(bidInvitation3);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});

test('zoe - secondPriceAuction w/ 3 bids - alice exits onDemand', async t => {
  t.plan(10);
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe(fakeVatAdmin);

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

    const [bobInvite] = await E(publicAPI).makeInvites(1);

   t.is(
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

    t.throwsAsync(
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
    t.deepEqual(
      await moolaR.issuer.getAmountOf(aliceMoolaPayout),
      aliceProposal.give.Asset,
    );

    // Alice didn't get any of what she wanted
    t.deepEqual(
      await simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
      simoleans(0),
    );

    // Alice deposits her payout to ensure she can
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // Bob gets a refund
    t.deepEqual(await moolaR.issuer.getAmountOf(bobMoolaPayout), moola(0));
    t.deepEqual(
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
   t.is(aliceMoolaPurse.getCurrentAmount().value, 1);
   t.is(aliceSimoleanPurse.getCurrentAmount().value, 0);
   t.is(bobMoolaPurse.getCurrentAmount().value, 0);
   t.is(bobSimoleanPurse.getCurrentAmount().value, 11);
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
  const zoe = makeZoe(fakeVatAdmin);
  const inviteIssuer = zoe.getInvitationIssuer();

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

  const [bobInvite, carolInvite, daveInvite] = await E(publicAPI).makeInvites(
    3,
  );

 t.is(
    await aliceOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
    'aliceOutcome',
  );

  // Alice spreads the invites far and wide and Bob decides he
  // wants to participate in the auction.
  const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);
  const {
    value: [bobInviteValue],
  } = await inviteIssuer.getAmountOf(bobExclusiveInvite);

  const {
    installationHandle: bobInstallationId,
    terms: bobTerms,
    issuerKeywordRecord: bobIssuers,
  } = zoe.getInstanceRecord(bobInviteValue.instanceHandle);

 t.is(bobInstallationId, installationHandle, 'bobInstallationId');
  t.deepEqual(bobIssuers, { Asset: ccIssuer, Ask: moolaIssuer }, 'bobIssuers');
 t.is(bobTerms.numBidsAllowed, 3, 'bobTerms');
  t.deepEqual(bobInviteValue.minimumBid, moola(3), 'minimumBid');
  t.deepEqual(
    bobInviteValue.auctionedAssets,
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

 t.is(
    await bobOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
    'bobOutcome',
  );

  // Carol decides to bid for the one cc

  const carolExclusiveInvite = await inviteIssuer.claim(carolInvite);
  const {
    value: [carolInviteValue],
  } = await inviteIssuer.getAmountOf(carolExclusiveInvite);

  const {
    installationHandle: carolInstallationId,
    terms: carolTerms,
    issuerKeywordRecord: carolIssuers,
  } = zoe.getInstanceRecord(carolInviteValue.instanceHandle);

 t.is(carolInstallationId, installationHandle, 'carolInstallationId');
  t.deepEqual(
    carolIssuers,
    { Asset: ccIssuer, Ask: moolaIssuer },
    'carolIssuers',
  );
 t.is(carolTerms.numBidsAllowed, 3, 'carolTerms');
  t.deepEqual(carolInviteValue.minimumBid, moola(3), 'carolMinimumBid');
  t.deepEqual(
    carolInviteValue.auctionedAssets,
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

 t.is(
    await carolOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
    'carolOutcome',
  );

  // Dave decides to bid for the one moola
  const daveExclusiveInvite = await inviteIssuer.claim(daveInvite);
  const {
    value: [daveInviteValue],
  } = await inviteIssuer.getAmountOf(daveExclusiveInvite);

  const {
    installationHandle: daveInstallationId,
    terms: daveTerms,
    issuerKeywordRecord: daveIssuers,
  } = zoe.getInstanceRecord(daveInviteValue.instanceHandle);

 t.is(daveInstallationId, installationHandle, 'daveInstallationHandle');
  t.deepEqual(
    daveIssuers,
    { Asset: ccIssuer, Ask: moolaIssuer },
    'daveIssuers',
  );
 t.is(daveTerms.numBidsAllowed, 3, 'bobTerms');
  t.deepEqual(daveInviteValue.minimumBid, moola(3), 'daveMinimumBid');
  t.deepEqual(
    daveInviteValue.auctionedAssets,
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

 t.is(
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
  t.deepEqual(
    await moolaIssuer.getAmountOf(aliceMoolaPayout),
    carolProposal.give.Bid,
    `alice gets carol's bid`,
  );

  // Alice didn't get any of what she put in
  t.deepEqual(
    await ccIssuer.getAmountOf(aliceCcPayout),
    cryptoCats(harden([])),
    `alice gets nothing of what she put in`,
  );

  // Alice deposits her payout to ensure she can
  await aliceCcPurse.deposit(aliceCcPayout);
  await aliceMoolaPurse.deposit(aliceMoolaPayout);

  // Bob (the winner of the auction) gets the one moola and the
  // difference between his bid and the price back
  t.deepEqual(
    await ccIssuer.getAmountOf(bobCcPayout),
    cryptoCats(harden(['Felix'])),
    `bob is the winner`,
  );
  t.deepEqual(
    await moolaIssuer.getAmountOf(bobMoolaPayout),
    moola(4),
    `bob gets difference back`,
  );

  // Bob deposits his payout to ensure he can
  await bobCcPurse.deposit(bobCcPayout);
  await bobMoolaPurse.deposit(bobMoolaPayout);

  // Carol gets a full refund
  t.deepEqual(
    await ccIssuer.getAmountOf(carolCcPayout),
    cryptoCats(harden([])),
    `carol doesn't win`,
  );
  t.deepEqual(
    await moolaIssuer.getAmountOf(carolMoolaPayout),
    carolProposal.give.Bid,
    `carol gets a refund`,
  );

  // Carol deposits her payout to ensure she can
  await carolCcPurse.deposit(carolCcPayout);
  await carolMoolaPurse.deposit(carolMoolaPayout);

  // Dave gets a full refund
  t.deepEqual(
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
  t.deepEqual(aliceCcPurse.getCurrentAmount().value, []);
 t.is(aliceMoolaPurse.getCurrentAmount().value, 7);
  t.deepEqual(bobCcPurse.getCurrentAmount().value, ['Felix']);
 t.is(bobMoolaPurse.getCurrentAmount().value, 4);
  t.deepEqual(carolCcPurse.getCurrentAmount().value, []);
 t.is(carolMoolaPurse.getCurrentAmount().value, 7);
  t.deepEqual(daveCcPurse.getCurrentAmount().value, []);
 t.is(daveMoolaPurse.getCurrentAmount().value, 5);
});
