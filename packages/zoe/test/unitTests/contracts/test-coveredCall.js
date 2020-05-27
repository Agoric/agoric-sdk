import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';
import { sameStructure } from '@agoric/same-structure';

import buildManualTimer from '../../../tools/manualTimer';
import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';
import { setupNonFungible } from '../setupNonFungibleMints';

const coveredCallRoot = `${__dirname}/../../../src/contracts/coveredCall`;
const atomicSwapRoot = `${__dirname}/../../../src/contracts/atomicSwap`;

test('zoe - coveredCall', async t => {
  t.plan(13);
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe();
    // Pack the contract.
    const bundle = await bundleSource(coveredCallRoot);
    const coveredCallInstallationHandle = await zoe.install(bundle);
    const timer = buildManualTimer(console.log);

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(3));
    const aliceMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Setup Bob
    const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(7));
    const bobMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Alice creates a coveredCall instance
    const issuerKeywordRecord = harden({
      UnderlyingAsset: moolaR.issuer,
      StrikePrice: simoleanR.issuer,
    });
    // separate issuerKeywordRecord from contract-specific terms
    const { invite: aliceInvite } = await zoe.makeInstance(
      coveredCallInstallationHandle,
      issuerKeywordRecord,
    );

    // Alice escrows with Zoe
    const aliceProposal = harden({
      give: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: { afterDeadline: { deadline: 1, timer } },
    });
    const alicePayments = { UnderlyingAsset: aliceMoolaPayment };
    // Alice creates a call option
    const { payout: alicePayoutP, outcome: optionP } = await zoe.offer(
      aliceInvite,
      aliceProposal,
      alicePayments,
    );

    // Imagine that Alice sends the option to Bob for free (not done here
    // since this test doesn't actually have separate vats/parties)

    // Bob inspects the option (an invite payment) and checks that it is the
    // contract instance that he expects as well as that Alice has
    // already escrowed.

    const inviteIssuer = zoe.getInviteIssuer();
    const bobExclOption = await inviteIssuer.claim(optionP);
    const {
      extent: [optionExtent],
    } = await inviteIssuer.getAmountOf(bobExclOption);
    const { installationHandle } = zoe.getInstanceRecord(
      optionExtent.instanceHandle,
    );
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionExtent.inviteDesc, 'exerciseOption');
    t.ok(moolaR.amountMath.isEqual(optionExtent.underlyingAsset, moola(3)));
    t.ok(simoleanR.amountMath.isEqual(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 1);
    t.deepEqual(optionExtent.timerAuthority, timer);

    const bobPayments = { StrikePrice: bobSimoleanPayment };

    const bobProposal = harden({
      want: { UnderlyingAsset: optionExtent.underlyingAsset },
      give: { StrikePrice: optionExtent.strikePrice },
      exit: { onDemand: null },
    });

    // Bob redeems his invite and escrows with Zoe
    // Bob exercises the option
    const { payout: bobPayoutP, outcome: bobOutcomeP } = await zoe.offer(
      bobExclOption,
      bobProposal,
      bobPayments,
    );

    t.equals(
      await bobOutcomeP,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    const bobPayout = await bobPayoutP;
    const alicePayout = await alicePayoutP;

    const bobMoolaPayout = await bobPayout.UnderlyingAsset;
    const bobSimoleanPayout = await bobPayout.StrikePrice;
    const aliceMoolaPayout = await alicePayout.UnderlyingAsset;
    const aliceSimoleanPayout = await alicePayout.StrikePrice;

    // Alice gets what Alice wanted
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
      aliceProposal.want.StrikePrice,
    );

    // Alice didn't get any of what Alice put in
    t.deepEquals(await moolaR.issuer.getAmountOf(aliceMoolaPayout), moola(0));

    // Alice deposits her payout to ensure she can
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // Bob deposits his original payments to ensure he can
    await bobMoolaPurse.deposit(bobMoolaPayout);
    await bobSimoleanPurse.deposit(bobSimoleanPayout);

    // Assert that the correct payouts were received.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    t.equals(aliceMoolaPurse.getCurrentAmount().extent, 0);
    t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 7);
    t.equals(bobMoolaPurse.getCurrentAmount().extent, 3);
    t.equals(bobSimoleanPurse.getCurrentAmount().extent, 0);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

test(`zoe - coveredCall - alice's deadline expires, cancelling alice and bob`, async t => {
  t.plan(13);
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe();
    // Pack the contract.
    const bundle = await bundleSource(coveredCallRoot);
    const coveredCallInstallationHandle = await zoe.install(bundle);
    const timer = buildManualTimer(console.log);

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(3));
    const aliceMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Setup Bob
    const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(7));
    const bobMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Alice creates a coveredCall instance
    const issuerKeywordRecord = harden({
      UnderlyingAsset: moolaR.issuer,
      StrikePrice: simoleanR.issuer,
    });
    const { invite: aliceInvite } = await zoe.makeInstance(
      coveredCallInstallationHandle,
      issuerKeywordRecord,
    );

    // Alice escrows with Zoe
    const aliceProposal = harden({
      give: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: {
        afterDeadline: {
          deadline: 1,
          timer,
        },
      },
    });
    const alicePayments = { UnderlyingAsset: aliceMoolaPayment };
    // Alice makes an option
    const { payout: alicePayoutP, outcome: optionP } = await zoe.offer(
      aliceInvite,
      aliceProposal,
      alicePayments,
    );
    timer.tick();

    // Imagine that Alice sends the option to Bob for free (not done here
    // since this test doesn't actually have separate vats/parties)

    // Bob inspects the option (an invite payment) and checks that it is the
    // contract instance that he expects as well as that Alice has
    // already escrowed.

    const inviteIssuer = zoe.getInviteIssuer();
    const bobExclOption = await inviteIssuer.claim(optionP);
    const {
      extent: [optionExtent],
    } = await inviteIssuer.getAmountOf(bobExclOption);
    const { installationHandle } = zoe.getInstanceRecord(
      optionExtent.instanceHandle,
    );
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionExtent.inviteDesc, 'exerciseOption');
    t.ok(moolaR.amountMath.isEqual(optionExtent.underlyingAsset, moola(3)));
    t.ok(simoleanR.amountMath.isEqual(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 1);
    t.deepEqual(optionExtent.timerAuthority, timer);

    const bobPayments = { StrikePrice: bobSimoleanPayment };

    const bobProposal = harden({
      want: { UnderlyingAsset: optionExtent.underlyingAsset },
      give: { StrikePrice: optionExtent.strikePrice },
    });

    // Bob escrows
    const { payout: bobPayoutP, outcome: bobOutcomeP } = await zoe.offer(
      bobExclOption,
      bobProposal,
      bobPayments,
    );

    t.rejects(
      () => bobOutcomeP,
      new Error('The covered call option is expired'),
      'The call option should be expired',
    );

    const bobPayout = await bobPayoutP;
    const alicePayout = await alicePayoutP;

    const bobMoolaPayout = await bobPayout.UnderlyingAsset;
    const bobSimoleanPayout = await bobPayout.StrikePrice;
    const aliceMoolaPayout = await alicePayout.UnderlyingAsset;
    const aliceSimoleanPayout = await alicePayout.StrikePrice;

    // Alice gets back what she put in
    t.deepEquals(await moolaR.issuer.getAmountOf(aliceMoolaPayout), moola(3));

    // Alice doesn't get what she wanted
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
      simoleans(0),
    );

    // Alice deposits her winnings to ensure she can
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // Bob deposits his winnings to ensure he can
    await bobMoolaPurse.deposit(bobMoolaPayout);
    await bobSimoleanPurse.deposit(bobSimoleanPayout);

    // Assert that the correct outcome was achieved.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    t.deepEquals(aliceMoolaPurse.getCurrentAmount(), moola(3));
    t.deepEquals(aliceSimoleanPurse.getCurrentAmount(), simoleans(0));
    t.deepEquals(bobMoolaPurse.getCurrentAmount(), moola(0));
    t.deepEquals(bobSimoleanPurse.getCurrentAmount(), simoleans(7));
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

// Alice makes a covered call and escrows. She shares the invite to
// Bob. Bob tries to sell the invite to Dave through a swap. Can Bob
// trick Dave? Can Dave describe what it is that he wants in the swap
// offer description?
test('zoe - coveredCall with swap for invite', async t => {
  t.plan(24);
  try {
    // Setup the environment
    const timer = buildManualTimer(console.log);
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const zoe = makeZoe();
    // Pack the contract.
    const coveredCallBundle = await bundleSource(coveredCallRoot);

    const coveredCallInstallationHandle = await zoe.install(coveredCallBundle);
    const atomicSwapBundle = await bundleSource(atomicSwapRoot);

    const swapInstallationId = await zoe.install(atomicSwapBundle);

    // Setup Alice
    // Alice starts with 3 moola
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(3));
    const aliceMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Setup Bob
    // Bob starts with nothing
    const bobMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanR.issuer.makeEmptyPurse();
    const bobBucksPurse = bucksR.issuer.makeEmptyPurse();

    // Setup Dave
    // Dave starts with 1 buck
    const daveSimoleanPayment = simoleanR.mint.mintPayment(simoleans(7));
    const daveBucksPayment = bucksR.mint.mintPayment(bucks(1));
    const daveMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const daveSimoleanPurse = simoleanR.issuer.makeEmptyPurse();
    const daveBucksPurse = bucksR.issuer.makeEmptyPurse();

    // Alice creates a coveredCall instance of moola for simoleans
    const issuerKeywordRecord = harden({
      UnderlyingAsset: moolaR.issuer,
      StrikePrice: simoleanR.issuer,
    });
    const { invite: aliceInvite } = await zoe.makeInstance(
      coveredCallInstallationHandle,
      issuerKeywordRecord,
    );

    // Alice escrows with Zoe. She specifies her proposal,
    // which includes the amounts she gives and wants as well as the exit
    // conditions. In this case, she choses an exit condition of after
    // the deadline of "100" according to a particular timer. This is
    // meant to be something far in the future, and will not be
    // reached in this test.

    const aliceProposal = harden({
      give: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: {
        afterDeadline: {
          deadline: 100, // we will not reach this
          timer,
        },
      },
    });
    const alicePayments = { UnderlyingAsset: aliceMoolaPayment };
    // Alice makes an option.
    const { payout: alicePayoutP, outcome: optionP } = await zoe.offer(
      aliceInvite,
      aliceProposal,
      alicePayments,
    );

    // Imagine that Alice sends the invite to Bob (not done here since
    // this test doesn't actually have separate vats/parties)

    // Bob inspects the invite payment and checks its information against the
    // questions that he has about whether it is worth being a counter
    // party in the covered call: Did the covered call use the
    // expected covered call installation (code)? Does it use the issuers
    // that he expects (moola and simoleans)?
    const inviteIssuer = zoe.getInviteIssuer();
    const inviteAmountMath = inviteIssuer.getAmountMath();
    const bobExclOption = await inviteIssuer.claim(optionP);
    const optionAmount = await inviteIssuer.getAmountOf(bobExclOption);
    const optionDesc = optionAmount.extent[0];
    const { installationHandle } = zoe.getInstanceRecord(
      optionDesc.instanceHandle,
    );
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionDesc.inviteDesc, 'exerciseOption');
    t.ok(moolaR.amountMath.isEqual(optionDesc.underlyingAsset, moola(3)));
    t.ok(simoleanR.amountMath.isEqual(optionDesc.strikePrice, simoleans(7)));
    t.equal(optionDesc.expirationDate, 100);
    t.deepEqual(optionDesc.timerAuthority, timer);

    // Let's imagine that Bob wants to create a swap to trade this
    // invite for bucks.
    const swapIssuerKeywordRecord = harden({
      Asset: inviteIssuer,
      Price: bucksR.issuer,
    });
    const { invite: bobSwapInvite } = await zoe.makeInstance(
      swapInstallationId,
      swapIssuerKeywordRecord,
    );

    // Bob wants to swap an invite with the same amount as his
    // current invite from Alice. He wants 1 buck in return.
    const bobProposalSwap = harden({
      give: { Asset: await inviteIssuer.getAmountOf(bobExclOption) },
      want: { Price: bucks(1) },
    });

    const bobPayments = harden({ Asset: bobExclOption });

    // Bob escrows his option in the swap
    // Bob makes an offer to the swap with his "higher order" invite
    const { payout: bobPayoutP, outcome: daveSwapInviteP } = await zoe.offer(
      bobSwapInvite,
      bobProposalSwap,
      bobPayments,
    );

    // Bob passes the swap invite to Dave and tells him the
    // optionAmounts (basically, the description of the option)

    const {
      extent: [{ instanceHandle: swapInstanceHandle }],
    } = await inviteIssuer.getAmountOf(daveSwapInviteP);

    const {
      installationHandle: daveSwapInstallId,
      issuerKeywordRecord: daveSwapIssuers,
    } = zoe.getInstanceRecord(swapInstanceHandle);

    // Dave is looking to buy the option to trade his 7 simoleans for
    // 3 moola, and is willing to pay 1 buck for the option. He
    // checks that this instance matches what he wants

    // Did this swap use the correct swap installation? Yes
    t.equal(daveSwapInstallId, swapInstallationId);

    // Is this swap for the correct issuers and has no other terms? Yes
    t.ok(
      sameStructure(
        daveSwapIssuers,
        harden({
          Asset: inviteIssuer,
          Price: bucksR.issuer,
        }),
      ),
    );

    // What's actually up to be bought? Is it the kind of invite that
    // Dave wants? What's the price for that invite? Is it acceptable
    // to Dave? Bob can tell Dave this out of band, and if he lies,
    // Dave's offer will be rejected and he will get a refund. Dave
    // knows this to be true because he knows the swap.

    // Dave escrows his 1 buck with Zoe and forms his proposal
    const daveSwapProposal = harden({
      want: { Asset: optionAmount },
      give: { Price: bucks(1) },
    });

    const daveSwapPayments = harden({ Price: daveBucksPayment });
    const {
      payout: daveSwapPayoutP,
      outcome: daveSwapOutcomeP,
    } = await zoe.offer(daveSwapInviteP, daveSwapProposal, daveSwapPayments);

    t.equals(
      await daveSwapOutcomeP,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    const daveSwapPayout = await daveSwapPayoutP;
    const daveOption = await daveSwapPayout.Asset;
    const daveBucksPayout = await daveSwapPayout.Price;

    // Dave exercises his option by making an offer to the covered
    // call. First, he escrows with Zoe.

    const daveCoveredCallProposal = harden({
      want: { UnderlyingAsset: moola(3) },
      give: { StrikePrice: simoleans(7) },
    });
    const daveCoveredCallPayments = harden({
      StrikePrice: daveSimoleanPayment,
    });
    const {
      payout: daveCoveredCallPayoutP,
      outcome: daveCoveredCallOutcomeP,
    } = await zoe.offer(
      daveOption,
      daveCoveredCallProposal,
      daveCoveredCallPayments,
    );

    t.equals(
      await daveCoveredCallOutcomeP,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    // Dave should get 3 moola, Bob should get 1 buck, and Alice
    // get 7 simoleans
    const daveCoveredCallResult = await daveCoveredCallPayoutP;
    const daveMoolaPayout = await daveCoveredCallResult.UnderlyingAsset;
    const daveSimoleanPayout = await daveCoveredCallResult.StrikePrice;
    const aliceResult = await alicePayoutP;
    const aliceMoolaPayout = await aliceResult.UnderlyingAsset;
    const aliceSimoleanPayout = await aliceResult.StrikePrice;
    const bobResult = await bobPayoutP;
    const bobInvitePayout = await bobResult.Asset;
    const bobBucksPayout = await bobResult.Price;

    t.deepEquals(await moolaR.issuer.getAmountOf(daveMoolaPayout), moola(3));
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(daveSimoleanPayout),
      simoleans(0),
    );

    t.deepEquals(await moolaR.issuer.getAmountOf(aliceMoolaPayout), moola(0));
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
      simoleans(7),
    );

    t.deepEquals(
      await inviteIssuer.getAmountOf(bobInvitePayout),
      inviteAmountMath.getEmpty(),
    );
    t.deepEquals(await bucksR.issuer.getAmountOf(bobBucksPayout), bucks(1));

    // Alice deposits her payouts
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // Bob deposits his payouts
    await bobBucksPurse.deposit(bobBucksPayout);

    // Dave deposits his payouts
    await daveMoolaPurse.deposit(daveMoolaPayout);
    await daveSimoleanPurse.deposit(daveSimoleanPayout);
    await daveBucksPurse.deposit(daveBucksPayout);

    t.equals(aliceMoolaPurse.getCurrentAmount().extent, 0);
    t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 7);

    t.equals(bobMoolaPurse.getCurrentAmount().extent, 0);
    t.equals(bobSimoleanPurse.getCurrentAmount().extent, 0);
    t.equals(bobBucksPurse.getCurrentAmount().extent, 1);

    t.equals(daveMoolaPurse.getCurrentAmount().extent, 3);
    t.equals(daveSimoleanPurse.getCurrentAmount().extent, 0);
    t.equals(daveBucksPurse.getCurrentAmount().extent, 0);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

// Alice makes a covered call and escrows. She shares the invite to
// Bob. Bob tries to sell the invite to Dave through another covered
// call. Can Bob trick Dave? Can Dave describe what it is that he
// wants in his offer description in the second covered call?
test('zoe - coveredCall with coveredCall for invite', async t => {
  t.plan(31);
  try {
    // Setup the environment
    const timer = buildManualTimer(console.log);
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const zoe = makeZoe();
    // Pack the contract.
    const bundle = await bundleSource(coveredCallRoot);

    const coveredCallInstallationHandle = await zoe.install(bundle);

    // Setup Alice
    // Alice starts with 3 moola
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(3));
    const aliceMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanR.issuer.makeEmptyPurse();

    // Setup Bob
    // Bob starts with nothing
    const bobMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanR.issuer.makeEmptyPurse();
    const bobBucksPurse = bucksR.issuer.makeEmptyPurse();

    // Setup Dave
    // Dave starts with 1 buck and 7 simoleans
    const daveSimoleanPayment = simoleanR.mint.mintPayment(simoleans(7));
    const daveBucksPayment = bucksR.mint.mintPayment(bucks(1));
    const daveMoolaPurse = moolaR.issuer.makeEmptyPurse();
    const daveSimoleanPurse = simoleanR.issuer.makeEmptyPurse();
    const daveBucksPurse = bucksR.issuer.makeEmptyPurse();

    // Alice creates a coveredCall instance of moola for simoleans
    const issuerKeywordRecord = harden({
      UnderlyingAsset: moolaR.issuer,
      StrikePrice: simoleanR.issuer,
    });
    const { invite: aliceCoveredCallInvite } = await zoe.makeInstance(
      coveredCallInstallationHandle,
      issuerKeywordRecord,
    );

    // Alice escrows with Zoe. She specifies her proposal,
    // which include what she wants and gives as well as the exit
    // condition. In this case, she choses an exit condition of after
    // the deadline of "100" according to a particular timer. This is
    // meant to be something far in the future, and will not be
    // reached in this test.

    const aliceProposal = harden({
      give: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: {
        afterDeadline: {
          deadline: 100, // we will not reach this
          timer,
        },
      },
    });
    const alicePayments = { UnderlyingAsset: aliceMoolaPayment };
    // Alice makes a call option, which is an invite to join the
    // covered call contract
    const { payout: alicePayoutP, outcome: optionP } = await zoe.offer(
      aliceCoveredCallInvite,
      aliceProposal,
      alicePayments,
    );

    // Imagine that Alice sends the invite to Bob as well as the
    // instanceHandle (not done here since this test doesn't actually have
    // separate vats/parties)

    // Bob inspects the invite payment and checks its information against the
    // questions that he has about whether it is worth being a counter
    // party in the covered call: Did the covered call use the
    // expected covered call installation (code)? Does it use the issuers
    // that he expects (moola and simoleans)?
    const inviteIssuer = zoe.getInviteIssuer();
    const inviteAmountMath = inviteIssuer.getAmountMath();
    const bobExclOption = await inviteIssuer.claim(optionP);
    const {
      extent: [optionExtent],
    } = await inviteIssuer.getAmountOf(bobExclOption);
    const { installationHandle } = zoe.getInstanceRecord(
      optionExtent.instanceHandle,
    );
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionExtent.inviteDesc, 'exerciseOption');
    t.ok(moolaR.amountMath.isEqual(optionExtent.underlyingAsset, moola(3)));
    t.ok(simoleanR.amountMath.isEqual(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 100);
    t.deepEqual(optionExtent.timerAuthority, timer);

    // Let's imagine that Bob wants to create another coveredCall, but
    // this time to trade this invite for bucks.
    const issuerKeywordRecord2 = harden({
      UnderlyingAsset: inviteIssuer,
      StrikePrice: bucksR.issuer,
    });
    const { invite: bobInviteForSecondCoveredCall } = await zoe.makeInstance(
      coveredCallInstallationHandle,
      issuerKeywordRecord2,
    );

    // Bob wants to swap an invite with the same amount as his
    // current invite from Alice. He wants 1 buck in return.
    const bobProposalSecondCoveredCall = harden({
      give: { UnderlyingAsset: await inviteIssuer.getAmountOf(bobExclOption) },
      want: { StrikePrice: bucks(1) },
      exit: {
        afterDeadline: {
          deadline: 100, // we will not reach this
          timer,
        },
      },
    });

    const bobPayments = { UnderlyingAsset: bobExclOption };

    // Bob escrows his invite
    // Bob makes an offer to the swap with his "higher order" option
    const { payout: bobPayoutP, outcome: inviteForDaveP } = await zoe.offer(
      bobInviteForSecondCoveredCall,
      bobProposalSecondCoveredCall,
      bobPayments,
    );

    // Bob passes the higher order invite and
    // optionAmounts to Dave

    // Dave is looking to buy the option to trade his 7 simoleans for
    // 3 moola, and is willing to pay 1 buck for the option. He
    // checks that this invite matches what he wants
    const daveExclOption = await inviteIssuer.claim(inviteForDaveP);
    const {
      extent: [daveOptionExtent],
    } = await inviteIssuer.getAmountOf(daveExclOption);
    const {
      installationHandle: daveOptionInstallationHandle,
    } = zoe.getInstanceRecord(daveOptionExtent.instanceHandle);
    t.equal(daveOptionInstallationHandle, coveredCallInstallationHandle);
    t.equal(daveOptionExtent.inviteDesc, 'exerciseOption');
    t.ok(bucksR.amountMath.isEqual(daveOptionExtent.strikePrice, bucks(1)));
    t.equal(daveOptionExtent.expirationDate, 100);
    t.deepEqual(daveOptionExtent.timerAuthority, timer);

    // What about the underlying asset (the other option)?
    t.equal(
      daveOptionExtent.underlyingAsset.extent[0].inviteDesc,
      'exerciseOption',
    );
    t.equal(daveOptionExtent.underlyingAsset.extent[0].expirationDate, 100);
    t.ok(
      simoleanR.amountMath.isEqual(
        daveOptionExtent.underlyingAsset.extent[0].strikePrice,
        simoleans(7),
      ),
    );
    t.deepEqual(
      daveOptionExtent.underlyingAsset.extent[0].timerAuthority,
      timer,
    );

    // Dave's planned proposal
    const daveProposalCoveredCall = harden({
      want: { UnderlyingAsset: daveOptionExtent.underlyingAsset },
      give: { StrikePrice: bucks(1) },
    });

    // Dave escrows his 1 buck with Zoe and forms his proposal

    const daveSecondCoveredCallPayments = { StrikePrice: daveBucksPayment };
    const {
      payout: daveSecondCoveredCallPayoutP,
      outcome: daveSecondCoveredCallOutcomeP,
    } = await zoe.offer(
      daveExclOption,
      daveProposalCoveredCall,
      daveSecondCoveredCallPayments,
    );
    t.equals(
      await daveSecondCoveredCallOutcomeP,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      `dave second offer accepted`,
    );

    const daveSecondCoveredCallPayout = await daveSecondCoveredCallPayoutP;

    const firstCoveredCallInvite = await daveSecondCoveredCallPayout.UnderlyingAsset;
    const daveBucksPayout = await daveSecondCoveredCallPayout.StrikePrice;

    // Dave exercises his option by making an offer to the covered
    // call. First, he escrows with Zoe.

    const daveFirstCoveredCallProposal = harden({
      want: { UnderlyingAsset: moola(3) },
      give: { StrikePrice: simoleans(7) },
    });
    const daveFirstCoveredCallPayments = harden({
      StrikePrice: daveSimoleanPayment,
    });
    const {
      payout: daveFirstCoveredCallPayoutP,
      outcome: daveFirstCoveredCallOutcomeP,
    } = await zoe.offer(
      firstCoveredCallInvite,
      daveFirstCoveredCallProposal,
      daveFirstCoveredCallPayments,
    );

    t.equals(
      await daveFirstCoveredCallOutcomeP,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      `dave first offer accepted`,
    );

    // Dave should get 3 moola, Bob should get 1 buck, and Alice
    // get 7 simoleans
    const daveFirstCoveredCallResult = await daveFirstCoveredCallPayoutP;
    const aliceResult = await alicePayoutP;
    const bobResult = await bobPayoutP;

    const daveMoolaPayout = await daveFirstCoveredCallResult.UnderlyingAsset;
    const daveSimoleanPayout = await daveFirstCoveredCallResult.StrikePrice;

    const aliceMoolaPayout = await aliceResult.UnderlyingAsset;
    const aliceSimoleanPayout = await aliceResult.StrikePrice;

    const bobInvitePayout = await bobResult.UnderlyingAsset;
    const bobBucksPayout = await bobResult.StrikePrice;

    t.deepEquals(await moolaR.issuer.getAmountOf(daveMoolaPayout), moola(3));
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(daveSimoleanPayout),
      simoleans(0),
    );

    t.deepEquals(await moolaR.issuer.getAmountOf(aliceMoolaPayout), moola(0));
    t.deepEquals(
      await simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
      simoleans(7),
    );

    t.deepEquals(
      await inviteIssuer.getAmountOf(bobInvitePayout),
      inviteAmountMath.getEmpty(),
    );
    t.deepEquals(await bucksR.issuer.getAmountOf(bobBucksPayout), bucks(1));

    // Alice deposits her payouts
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // Bob deposits his payouts
    await bobBucksPurse.deposit(bobBucksPayout);

    // Dave deposits his payouts
    await daveMoolaPurse.deposit(daveMoolaPayout);
    await daveSimoleanPurse.deposit(daveSimoleanPayout);
    await daveBucksPurse.deposit(daveBucksPayout);

    t.equals(aliceMoolaPurse.getCurrentAmount().extent, 0);
    t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 7);

    t.equals(bobMoolaPurse.getCurrentAmount().extent, 0);
    t.equals(bobSimoleanPurse.getCurrentAmount().extent, 0);
    t.equals(bobBucksPurse.getCurrentAmount().extent, 1);

    t.equals(daveMoolaPurse.getCurrentAmount().extent, 3);
    t.equals(daveSimoleanPurse.getCurrentAmount().extent, 0);
    t.equals(daveBucksPurse.getCurrentAmount().extent, 0);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

// Alice uses a covered call to sell a cryptoCat to Bob for the
// 'Glorious shield' she has wanted for a long time.
test('zoe - coveredCall non-fungible', async t => {
  t.plan(13);
  const {
    ccIssuer,
    rpgIssuer,
    ccMint,
    rpgMint,
    cryptoCats,
    rpgItems,
    amountMaths,
    createRpgItem,
  } = setupNonFungible();

  const zoe = makeZoe();
  // install the contract.
  const bundle = await bundleSource(coveredCallRoot);
  const coveredCallInstallationHandle = await zoe.install(bundle);
  const timer = buildManualTimer(console.log);

  // Setup Alice
  const growlTiger = harden(['GrowlTiger']);
  const growlTigerAmount = cryptoCats(growlTiger);
  const aliceCcPayment = ccMint.mintPayment(growlTigerAmount);
  const aliceCcPurse = ccIssuer.makeEmptyPurse();
  const aliceRpgPurse = rpgIssuer.makeEmptyPurse();

  // Setup Bob
  const aGloriousShield = createRpgItem(
    'Glorious Shield',
    25,
    'a Glorious Shield, burnished to a blinding brightness',
  );
  const aGloriousShieldAmount = rpgItems(aGloriousShield);
  const bobRpgPayment = rpgMint.mintPayment(aGloriousShieldAmount);
  const bobCcPurse = ccIssuer.makeEmptyPurse();
  const bobRpgPurse = rpgIssuer.makeEmptyPurse();

  // Alice creates a coveredCall instance
  const issuerKeywordRecord = harden({
    UnderlyingAsset: ccIssuer,
    StrikePrice: rpgIssuer,
  });
  // separate issuerKeywordRecord from contract-specific terms
  const { invite: aliceInvite } = await zoe.makeInstance(
    coveredCallInstallationHandle,
    issuerKeywordRecord,
  );

  // Alice escrows with Zoe
  const aliceProposal = harden({
    give: { UnderlyingAsset: growlTigerAmount },
    want: { StrikePrice: aGloriousShieldAmount },
    exit: { afterDeadline: { deadline: 1, timer } },
  });
  const alicePayments = { UnderlyingAsset: aliceCcPayment };
  // Alice creates a call option
  const { payout: alicePayoutP, outcome: optionP } = await zoe.offer(
    aliceInvite,
    aliceProposal,
    alicePayments,
  );

  // Imagine that Alice sends the option to Bob for free (not done here
  // since this test doesn't actually have separate vats/parties)

  // Bob inspects the option (an invite payment) and checks that it is the
  // contract instance that he expects as well as that Alice has
  // already escrowed.

  const inviteIssuer = zoe.getInviteIssuer();
  const bobExclOption = await inviteIssuer.claim(optionP);
  const {
    extent: [optionExtent],
  } = await inviteIssuer.getAmountOf(bobExclOption);
  const { installationHandle } = zoe.getInstanceRecord(
    optionExtent.instanceHandle,
  );
  t.equal(installationHandle, coveredCallInstallationHandle);
  t.equal(optionExtent.inviteDesc, 'exerciseOption');
  t.ok(
    amountMaths
      .get('cc')
      .isEqual(optionExtent.underlyingAsset, growlTigerAmount),
  );
  t.ok(
    amountMaths
      .get('rpg')
      .isEqual(optionExtent.strikePrice, aGloriousShieldAmount),
  );
  t.equal(optionExtent.expirationDate, 1);
  t.deepEqual(optionExtent.timerAuthority, timer);

  const bobPayments = { StrikePrice: bobRpgPayment };

  const bobProposal = harden({
    want: { UnderlyingAsset: optionExtent.underlyingAsset },
    give: { StrikePrice: optionExtent.strikePrice },
    exit: { onDemand: null },
  });

  // Bob redeems his invite and escrows with Zoe
  // Bob exercises the option
  const { payout: bobPayoutP, outcome: bobOutcomeP } = await zoe.offer(
    bobExclOption,
    bobProposal,
    bobPayments,
  );

  t.equals(
    await bobOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );

  const bobPayout = await bobPayoutP;
  const alicePayout = await alicePayoutP;

  const bobCcPayout = await bobPayout.UnderlyingAsset;
  const bobRpgPayout = await bobPayout.StrikePrice;
  const aliceCcPayout = await alicePayout.UnderlyingAsset;
  const aliceRpgPayout = await alicePayout.StrikePrice;

  // Alice gets what Alice wanted
  t.deepEquals(
    await rpgIssuer.getAmountOf(aliceRpgPayout),
    aliceProposal.want.StrikePrice,
  );

  // Alice didn't get any of what Alice put in
  t.deepEquals(
    await ccIssuer.getAmountOf(aliceCcPayout),
    cryptoCats(harden([])),
  );

  // Alice deposits her payout to ensure she can
  await aliceCcPurse.deposit(aliceCcPayout);
  await aliceRpgPurse.deposit(aliceRpgPayout);

  // Bob deposits his original payments to ensure he can
  await bobCcPurse.deposit(bobCcPayout);
  await bobRpgPurse.deposit(bobRpgPayout);

  // Assert that the correct payouts were received.
  // Alice had growlTiger and no RPG tokens.
  // Bob had an empty CryptoCat purse and the Glorious Shield.
  t.deepEquals(aliceCcPurse.getCurrentAmount().extent, []);
  t.deepEquals(aliceRpgPurse.getCurrentAmount().extent, aGloriousShield);
  t.deepEquals(bobCcPurse.getCurrentAmount().extent, ['GrowlTiger']);
  t.deepEquals(bobRpgPurse.getCurrentAmount().extent, []);
});
