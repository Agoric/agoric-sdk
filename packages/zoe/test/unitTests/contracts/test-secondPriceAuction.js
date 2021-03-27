/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';
import buildManualTimer from '../../../tools/manualTimer';
import { setup } from '../setupBasicMints';
import { setupMixed } from '../setupMixedMints';
import fakeVatAdmin from '../../../src/contractFacet/fakeVatAdmin';

const secondPriceAuctionRoot = `${__dirname}/../../../src/contracts/auction/secondPriceAuction`;

test('zoe - secondPriceAuction w/ 3 bids', async t => {
  t.plan(15);
  const { moolaKit, simoleanKit, moola, simoleans, zoe } = setup();

  const makeAlice = async (timer, moolaPayment) => {
    const moolaPurse = await E(moolaKit.issuer).makeEmptyPurse();
    const simoleanPurse = await E(simoleanKit.issuer).makeEmptyPurse();
    return {
      installCode: async () => {
        // pack the contract
        const bundle = await bundleSource(secondPriceAuctionRoot);
        // install the contract
        const installationP = E(zoe).install(bundle);
        return installationP;
      },
      startInstance: async installation => {
        const issuerKeywordRecord = harden({
          Asset: moolaKit.issuer,
          Ask: simoleanKit.issuer,
        });
        const terms = { timeAuthority: timer, closesAfter: 1n };
        const adminP = zoe.startInstance(
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
          exit: { waived: null },
        });

        const payments = { Asset: moolaPayment };

        const seat = await E(zoe).offer(sellInvitation, proposal, payments);

        const makeBidInvitationObj = await E(seat).getOfferResult();
        return { seat, makeBidInvitationObj };
      },
      collectPayout: async seat => {
        await E(seat)
          .getPayout('Asset')
          .then(moolaPurse.deposit)
          .then(amountDeposited =>
            t.deepEqual(
              amountDeposited,
              moola(0n),
              `Alice didn't get any of what she put in`,
            ),
          );

        await E(seat)
          .getPayout('Ask')
          .then(simoleanPurse.deposit)
          .then(amountDeposited =>
            t.deepEqual(
              amountDeposited,
              simoleans(7),
              `Alice got the second price bid, Carol's bid, even though Bob won`,
            ),
          );
      },
    };
  };

  const makeBob = (installation, simoleanPayment) => {
    const moolaPurse = moolaKit.issuer.makeEmptyPurse();
    const simoleanPurse = simoleanKit.issuer.makeEmptyPurse();
    return Far('bob', {
      offer: async untrustedInvitation => {
        const invitationIssuer = await E(zoe).getInvitationIssuer();

        // Bob is able to use the trusted invitationIssuer from Zoe to
        // transform an untrusted invitation that Alice also has access to, to
        // an
        const invitation = await invitationIssuer.claim(untrustedInvitation);

        const invitationValue = await E(zoe).getInvitationDetails(invitation);

        t.is(
          invitationValue.installation,
          installation,
          'installation is secondPriceAuction',
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
          invitationValue.closesAfter,
          1n,
          `auction will be closed after 1 tick according to the timeAuthority`,
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
        return seat;
      },
      collectPayout: async seat => {
        await E(seat)
          .getPayout('Asset')
          .then(moolaPurse.deposit)
          .then(amountDeposited =>
            t.deepEqual(amountDeposited, moola(1), `Bob wins the auction`),
          );

        await E(seat)
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
    return Far('losing bidder', {
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
        return seat;
      },
      collectPayout: async seat => {
        await E(seat)
          .getPayout('Asset')
          .then(moolaPurse.deposit)
          .then(amountDeposited =>
            t.deepEqual(amountDeposited, moola(0n), `didn't win the auction`),
          );

        await E(seat)
          .getPayout('Bid')
          .then(simoleanPurse.deposit)
          .then(amountDeposited =>
            t.deepEqual(amountDeposited, bidAmount, `full refund`),
          );
      },
    });
  };

  // Setup Alice
  const timer = buildManualTimer(console.log);
  const alice = await makeAlice(timer, moolaKit.mint.mintPayment(moola(1)));
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

  const { creatorInvitation } = await alice.startInstance(installation);

  const { seat: aliceSeat, makeBidInvitationObj } = await alice.offer(
    creatorInvitation,
  );

  const bidInvitation1 = E(makeBidInvitationObj).makeBidInvitation();
  const bidInvitation2 = E(makeBidInvitationObj).makeBidInvitation();
  const bidInvitation3 = E(makeBidInvitationObj).makeBidInvitation();

  const bobSeat = await bob.offer(bidInvitation1);
  const carolSeat = await carol.offer(bidInvitation2);
  const daveSeat = await dave.offer(bidInvitation3);
  timer.tick();

  await Promise.all([
    alice.collectPayout(aliceSeat),
    bob.collectPayout(bobSeat),
    carol.collectPayout(carolSeat),
    dave.collectPayout(daveSeat),
  ]);
});

test('zoe - secondPriceAuction - alice tries to exit', async t => {
  t.plan(12);
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

  // Setup Carol
  const carolSimoleanPayment = simoleanR.mint.mintPayment(simoleans(8));

  // Alice creates a secondPriceAuction instance

  // Pack the contract.
  const bundle = await bundleSource(secondPriceAuctionRoot);

  const installation = await zoe.install(bundle);
  const issuerKeywordRecord = harden({
    Asset: moolaR.issuer,
    Ask: simoleanR.issuer,
  });
  const timer = buildManualTimer(console.log);
  const terms = harden({ timeAuthority: timer, closesAfter: 1n });
  const { creatorInvitation: aliceInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  // Alice escrows with zoe
  const aliceProposal = harden({
    give: { Asset: moola(1) },
    want: { Ask: simoleans(3) },
    exit: { waived: null },
  });
  const alicePayments = harden({ Asset: aliceMoolaPayment });
  // Alice initializes the auction
  const aliceSeat = await zoe.offer(
    aliceInvitation,
    aliceProposal,
    alicePayments,
  );
  const makeInvitationObj = await E(aliceSeat).getOfferResult();

  const bobInvitation = await E(makeInvitationObj).makeBidInvitation();

  // Alice tries to exit, but cannot
  await t.throwsAsync(
    () => E(aliceSeat).tryExit(),
    { message: /Only seats with the exit rule "onDemand" can exit at will/ },
    `alice can't exit`,
  );

  // Alice gives Bob the invitation

  const bobProposal = harden({
    want: { Asset: moola(1) },
    give: { Bid: simoleans(11) },
  });
  const bobPayments = harden({ Bid: bobSimoleanPayment });

  // Bob escrows with zoe
  // Bob bids
  const bobSeat = await zoe.offer(bobInvitation, bobProposal, bobPayments);

  t.is(
    await E(bobSeat).getOfferResult(),
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );

  // Bob exits early, but this does not stop the auction.
  await E(bobSeat).tryExit();
  const bobMoolaPayout = await bobSeat.getPayout('Asset');
  const bobSimoleanPayout = await bobSeat.getPayout('Bid');

  const carolInvitation = await E(makeInvitationObj).makeBidInvitation();

  const carolProposal = harden({
    want: { Asset: moola(1) },
    give: { Bid: simoleans(8) },
  });
  const carolPayments = harden({ Bid: carolSimoleanPayment });

  // Carol bids
  const carolSeat = await zoe.offer(
    carolInvitation,
    carolProposal,
    carolPayments,
  );

  timer.tick();

  const aliceMoolaPayout = await aliceSeat.getPayout('Asset');
  const aliceSimoleanPayout = await aliceSeat.getPayout('Ask');

  const carolMoolaPayout = await carolSeat.getPayout('Asset');
  const carolSimoleanPayout = await carolSeat.getPayout('Bid');

  // Alice (the creator of the auction) gets Carol's simoleans and
  // carol gets the assets.
  t.deepEqual(
    await moolaR.issuer.getAmountOf(aliceMoolaPayout),
    moola(0n),
    `alice has no moola`,
  );

  // Alice got Carol's simoleans
  t.deepEqual(
    await simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
    simoleans(8),
  );

  // Alice deposits her payout to ensure she can
  await aliceMoolaPurse.deposit(aliceMoolaPayout);
  await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

  // Bob gets a refund
  t.deepEqual(await moolaR.issuer.getAmountOf(bobMoolaPayout), moola(0n));
  t.deepEqual(
    await simoleanR.issuer.getAmountOf(bobSimoleanPayout),
    bobProposal.give.Bid,
  );

  // Bob deposits his payout to ensure he can
  await bobMoolaPurse.deposit(bobMoolaPayout);
  await bobSimoleanPurse.deposit(bobSimoleanPayout);

  // Carol gets the assets and all her simoleans are taken to pay
  // Alice
  t.deepEqual(await moolaR.issuer.getAmountOf(carolMoolaPayout), moola(1));
  t.deepEqual(
    await simoleanR.issuer.getAmountOf(carolSimoleanPayout),
    simoleans(0),
  );

  // Assert that the correct refunds were received.
  t.is(aliceMoolaPurse.getCurrentAmount().value, 0n);
  t.is(aliceSimoleanPurse.getCurrentAmount().value, 8n);
  t.is(bobMoolaPurse.getCurrentAmount().value, 0n);
  t.is(bobSimoleanPurse.getCurrentAmount().value, 11n);
});

// Three bidders with (fungible) moola bid for a CryptoCat
test('zoe - secondPriceAuction non-fungible asset', async t => {
  t.plan(30);
  const {
    ccIssuer,
    moolaIssuer,
    ccMint,
    moolaMint,
    cryptoCats,
    moola,
    zoe,
  } = setupMixed();
  const invitationIssuer = zoe.getInvitationIssuer();

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
  const bundle = await bundleSource(secondPriceAuctionRoot);

  const installation = await zoe.install(bundle);
  const issuerKeywordRecord = harden({
    Asset: ccIssuer,
    Ask: moolaIssuer,
  });
  const timer = buildManualTimer(console.log);
  const terms = harden({ timeAuthority: timer, closesAfter: 1n });
  const { creatorInvitation: aliceInvitation } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  // Alice escrows with zoe
  const aliceProposal = harden({
    give: { Asset: cryptoCats(harden(['Felix'])) },
    want: { Ask: moola(3) },
    exit: { waived: null },
  });
  const alicePayments = { Asset: aliceCcPayment };
  // Alice initializes the auction
  const aliceSeat = await zoe.offer(
    aliceInvitation,
    aliceProposal,
    alicePayments,
  );
  const makeBidInvitationObj = await E(aliceSeat).getOfferResult();
  const bobInvitation = E(makeBidInvitationObj).makeBidInvitation();
  const carolInvitation = E(makeBidInvitationObj).makeBidInvitation();
  const daveInvitation = E(makeBidInvitationObj).makeBidInvitation();

  // Alice spreads the invitations far and wide and Bob decides he
  // wants to participate in the auction.
  const bobExclusiveInvitation = await invitationIssuer.claim(bobInvitation);
  const bobInvitationValue = await E(zoe).getInvitationDetails(
    bobExclusiveInvitation,
  );

  const bobIssuers = zoe.getIssuers(bobInvitationValue.instance);

  t.is(bobInvitationValue.installation, installation, 'bobInstallationId');
  t.deepEqual(bobIssuers, { Asset: ccIssuer, Ask: moolaIssuer }, 'bobIssuers');
  t.deepEqual(bobInvitationValue.minimumBid, moola(3), 'minimumBid');
  t.deepEqual(
    bobInvitationValue.auctionedAssets,
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
  const bobSeat = await zoe.offer(
    bobExclusiveInvitation,
    bobProposal,
    bobPayments,
  );

  t.is(
    await E(bobSeat).getOfferResult(),
    'The offer has been accepted. Once the contract has been completed, please check your payout',
    'bobOutcome',
  );

  // Carol decides to bid for the one cc

  const carolExclusiveInvitation = await invitationIssuer.claim(
    carolInvitation,
  );
  const carolInvitationValue = await E(zoe).getInvitationDetails(
    carolExclusiveInvitation,
  );

  const carolIssuers = zoe.getIssuers(carolInvitationValue.instance);

  t.is(carolInvitationValue.installation, installation, 'carolInstallationId');
  t.deepEqual(
    carolIssuers,
    { Asset: ccIssuer, Ask: moolaIssuer },
    'carolIssuers',
  );
  t.deepEqual(carolInvitationValue.minimumBid, moola(3), 'carolMinimumBid');
  t.deepEqual(
    carolInvitationValue.auctionedAssets,
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
  const carolSeat = await zoe.offer(
    carolExclusiveInvitation,
    carolProposal,
    carolPayments,
  );

  t.is(
    await E(carolSeat).getOfferResult(),
    'The offer has been accepted. Once the contract has been completed, please check your payout',
    'carolOutcome',
  );

  // Dave decides to bid for the one moola
  const daveExclusiveInvitation = await invitationIssuer.claim(daveInvitation);
  const daveInvitationValue = await E(zoe).getInvitationDetails(
    daveExclusiveInvitation,
  );

  const daveIssuers = zoe.getIssuers(daveInvitationValue.instance);

  t.is(daveInvitationValue.installation, installation, 'daveInstallation');
  t.deepEqual(
    daveIssuers,
    { Asset: ccIssuer, Ask: moolaIssuer },
    'daveIssuers',
  );
  t.deepEqual(daveInvitationValue.minimumBid, moola(3), 'daveMinimumBid');
  t.deepEqual(
    daveInvitationValue.auctionedAssets,
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
  const daveSeat = await zoe.offer(
    daveExclusiveInvitation,
    daveProposal,
    davePayments,
  );

  t.is(
    await E(daveSeat).getOfferResult(),
    'The offer has been accepted. Once the contract has been completed, please check your payout',
    'daveOutcome',
  );

  timer.tick();

  const aliceCcPayout = await aliceSeat.getPayout('Asset');
  const aliceMoolaPayout = await aliceSeat.getPayout('Ask');

  const bobCcPayout = await bobSeat.getPayout('Asset');
  const bobMoolaPayout = await bobSeat.getPayout('Bid');

  const carolCcPayout = await carolSeat.getPayout('Asset');
  const carolMoolaPayout = await carolSeat.getPayout('Bid');

  const daveCcPayout = await daveSeat.getPayout('Asset');
  const daveMoolaPayout = await daveSeat.getPayout('Bid');

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
  t.is(aliceMoolaPurse.getCurrentAmount().value, 7n);
  t.deepEqual(bobCcPurse.getCurrentAmount().value, ['Felix']);
  t.is(bobMoolaPurse.getCurrentAmount().value, 4n);
  t.deepEqual(carolCcPurse.getCurrentAmount().value, []);
  t.is(carolMoolaPurse.getCurrentAmount().value, 7n);
  t.deepEqual(daveCcPurse.getCurrentAmount().value, []);
  t.is(daveMoolaPurse.getCurrentAmount().value, 5n);
});
