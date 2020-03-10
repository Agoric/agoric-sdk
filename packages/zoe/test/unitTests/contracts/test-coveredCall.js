// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';
import { sameStructure } from '@agoric/same-structure';

import buildManualTimer from '../../../tools/manualTimer';
import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints2';

const coveredCallRoot = `${__dirname}/../../../src/contracts/coveredCall`;
const atomicSwapRoot = `${__dirname}/../../../src/contracts/atomicSwap`;

test('zoe - coveredCall', async t => {
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(coveredCallRoot);
    const coveredCallInstallationHandle = zoe.install(source, moduleFormat);
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
    const roles = harden({
      UnderlyingAsset: moolaR.issuer,
      StrikePrice: simoleanR.issuer,
    });
    // separate roles from contract-specific terms
    const aliceInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      roles,
    );

    // Alice escrows with Zoe
    const aliceOfferRules = harden({
      offer: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: { afterDeadline: { deadline: 1, timer } },
    });
    const alicePayments = { UnderlyingAsset: aliceMoolaPayment };
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceOfferRules,
      alicePayments,
    );

    // Alice creates a call option

    const option = aliceSeat.makeCallOption();

    // Imagine that Alice sends the option to Bob for free (not done here
    // since this test doesn't actually have separate vats/parties)

    // Bob inspects the option (an invite payment) and checks that it is the
    // contract instance that he expects as well as that Alice has
    // already escrowed.

    const inviteIssuer = zoe.getInviteIssuer();
    const bobExclOption = await inviteIssuer.claim(option);
    const optionExtent = inviteIssuer.getAmountOf(bobExclOption).extent[0];
    const { installationHandle } = zoe.getInstance(optionExtent.instanceHandle);
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionExtent.seatDesc, 'exerciseOption');
    t.ok(moolaR.amountMath.isEqual(optionExtent.underlyingAsset, moola(3)));
    t.ok(simoleanR.amountMath.isEqual(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 1);
    t.deepEqual(optionExtent.timerAuthority, timer);

    const bobPayments = { StrikePrice: bobSimoleanPayment };

    const bobOfferRules = harden({
      want: { UnderlyingAsset: optionExtent.underlyingAsset },
      offer: { StrikePrice: optionExtent.strikePrice },
      exit: { onDemand: {} },
    });

    // Bob redeems his invite and escrows with Zoe
    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclOption,
      bobOfferRules,
      bobPayments,
    );

    // Bob exercises the option
    const bobOutcome = await bobSeat.exercise();

    t.equals(
      bobOutcome,
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
      simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
      aliceOfferRules.want.StrikePrice,
    );

    // Alice didn't get any of what Alice put in
    t.deepEquals(moolaR.issuer.getAmountOf(aliceMoolaPayout), moola(0));

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
  } finally {
    t.end();
  }
});

test(`zoe - coveredCall - alice's deadline expires, cancelling alice and bob`, async t => {
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(coveredCallRoot);
    const coveredCallInstallationHandle = zoe.install(source, moduleFormat);
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
    const roles = harden({
      UnderlyingAsset: moolaR.issuer,
      StrikePrice: simoleanR.issuer,
    });
    const aliceInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      roles,
    );

    // Alice escrows with Zoe
    const aliceOfferRules = harden({
      offer: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: {
        afterDeadline: {
          deadline: 1,
          timer,
        },
      },
    });
    const alicePayments = { UnderlyingAsset: aliceMoolaPayment };
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceOfferRules,
      alicePayments,
    );

    // Alice makes an option
    const option = aliceSeat.makeCallOption();
    timer.tick();

    // Imagine that Alice sends the option to Bob for free (not done here
    // since this test doesn't actually have separate vats/parties)

    // Bob inspects the option (an invite payment) and checks that it is the
    // contract instance that he expects as well as that Alice has
    // already escrowed.

    const inviteIssuer = zoe.getInviteIssuer();
    const bobExclOption = await inviteIssuer.claim(option);
    const optionExtent = inviteIssuer.getAmountOf(bobExclOption).extent[0];
    const { installationHandle } = zoe.getInstance(optionExtent.instanceHandle);
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionExtent.seatDesc, 'exerciseOption');
    t.ok(moolaR.amountMath.isEqual(optionExtent.underlyingAsset, moola(3)));
    t.ok(simoleanR.amountMath.isEqual(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 1);
    t.deepEqual(optionExtent.timerAuthority, timer);

    const bobPayments = { StrikePrice: bobSimoleanPayment };

    const bobOfferRules = harden({
      want: { UnderlyingAsset: optionExtent.underlyingAsset },
      offer: { StrikePrice: optionExtent.strikePrice },
    });

    // Bob escrows
    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclOption,
      bobOfferRules,
      bobPayments,
    );

    t.throws(() => bobSeat.exercise(), /The covered call option is expired/);

    const bobPayout = await bobPayoutP;
    const alicePayout = await alicePayoutP;

    const bobMoolaPayout = await bobPayout.UnderlyingAsset;
    const bobSimoleanPayout = await bobPayout.StrikePrice;
    const aliceMoolaPayout = await alicePayout.UnderlyingAsset;
    const aliceSimoleanPayout = await alicePayout.StrikePrice;

    // Alice gets back what she put in
    t.deepEquals(moolaR.issuer.getAmountOf(aliceMoolaPayout), moola(3));

    // Alice doesn't get what she wanted
    t.deepEquals(
      simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
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
  } finally {
    t.end();
  }
});

// Alice makes a covered call and escrows. She shares the invite to
// Bob. Bob tries to sell the invite to Dave through a swap. Can Bob
// trick Dave? Can Dave describe what it is that he wants in the swap
// offer description?
test('zoe - coveredCall with swap for invite', async t => {
  try {
    // Setup the environment
    const timer = buildManualTimer(console.log);
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(coveredCallRoot);

    const coveredCallInstallationHandle = zoe.install(source, moduleFormat);
    const {
      source: swapSource,
      moduleFormat: swapModuleFormat,
    } = await bundleSource(atomicSwapRoot);

    const swapInstallationId = zoe.install(swapSource, swapModuleFormat);

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
    const roles = harden({
      UnderlyingAsset: moolaR.issuer,
      StrikePrice: simoleanR.issuer,
    });
    const aliceInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      roles,
    );

    // Alice escrows with Zoe. She specifies her offer offerRules,
    // which include an offer description as well as the exit
    // offerRules. In this case, she choses an exit condition of after
    // the deadline of "100" according to a particular timer. This is
    // meant to be something far in the future, and will not be
    // reached in this test.

    const aliceOfferRules = harden({
      offer: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: {
        afterDeadline: {
          deadline: 100, // we will not reach this
          timer,
        },
      },
    });
    const alicePayments = { UnderlyingAsset: aliceMoolaPayment };
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceOfferRules,
      alicePayments,
    );

    // Alice makes an option.
    const option = aliceSeat.makeCallOption();

    // Imagine that Alice sends the invite to Bob (not done here since
    // this test doesn't actually have separate vats/parties)

    // Bob inspects the invite payment and checks its information against the
    // questions that he has about whether it is worth being a counter
    // party in the covered call: Did the covered call use the
    // expected covered call installation (code)? Does it use the issuers
    // that he expects (moola and simoleans)?
    const inviteIssuer = zoe.getInviteIssuer();
    const inviteAmountMath = inviteIssuer.getAmountMath();
    const bobExclOption = await inviteIssuer.claim(option);
    const optionAmount = inviteIssuer.getAmountOf(bobExclOption);
    const optionDesc = optionAmount.extent[0];
    const { installationHandle } = zoe.getInstance(optionDesc.instanceHandle);
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionDesc.seatDesc, 'exerciseOption');
    t.ok(moolaR.amountMath.isEqual(optionDesc.underlyingAsset, moola(3)));
    t.ok(simoleanR.amountMath.isEqual(optionDesc.strikePrice, simoleans(7)));
    t.equal(optionDesc.expirationDate, 100);
    t.deepEqual(optionDesc.timerAuthority, timer);

    // Let's imagine that Bob wants to create a swap to trade this
    // invite for bucks.
    const swapRoles = harden({ Asset: inviteIssuer, Price: bucksR.issuer });
    const bobSwapInvite = await zoe.makeInstance(swapInstallationId, swapRoles);

    // Bob wants to swap an invite with the same amount as his
    // current invite from Alice. He wants 1 buck in return.
    const bobOfferRulesSwap = harden({
      offer: { Asset: inviteIssuer.getAmountOf(bobExclOption) },
      want: { Price: bucks(1) },
    });

    const bobPayments = harden({ Asset: bobExclOption });

    // Bob escrows his option in the swap
    const { seat: bobSwapSeat, payout: bobPayoutP } = await zoe.redeem(
      bobSwapInvite,
      bobOfferRulesSwap,
      bobPayments,
    );

    // Bob makes an offer to the swap with his "higher order" invite
    const daveSwapInvite = await bobSwapSeat.makeFirstOffer();

    // Bob passes the swap invite to Dave and tells him the
    // optionAmounts (basically, the description of the option)

    const {
      extent: [{ instanceHandle: swapInstanceHandle }],
    } = inviteIssuer.getAmountOf(daveSwapInvite);

    const {
      installationHandle: daveSwapInstallId,
      roles: daveSwapRoles,
    } = zoe.getInstance(swapInstanceHandle);

    // Dave is looking to buy the option to trade his 7 simoleans for
    // 3 moola, and is willing to pay 1 buck for the option. He
    // checks that this instance matches what he wants

    // Did this swap use the correct swap installation? Yes
    t.equal(daveSwapInstallId, swapInstallationId);

    // Is this swap for the correct issuers and has no other terms? Yes
    t.ok(
      sameStructure(
        daveSwapRoles,
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

    // Dave escrows his 1 buck with Zoe and forms his offer offerRules
    const daveSwapOfferRules = harden({
      want: { Asset: optionAmount },
      offer: { Price: bucks(1) },
    });

    const daveSwapPayments = harden({ Price: daveBucksPayment });
    const { seat: daveSwapSeat, payout: daveSwapPayoutP } = await zoe.redeem(
      daveSwapInvite,
      daveSwapOfferRules,
      daveSwapPayments,
    );

    const daveSwapOutcome = await daveSwapSeat.matchOffer();
    t.equals(
      daveSwapOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    const daveSwapPayout = await daveSwapPayoutP;
    const daveOption = await daveSwapPayout.Asset;
    const daveBucksPayout = await daveSwapPayout.Price;

    // Dave exercises his option by making an offer to the covered
    // call. First, he escrows with Zoe.

    const daveCoveredCallOfferRules = harden({
      want: { UnderlyingAsset: moola(3) },
      offer: { StrikePrice: simoleans(7) },
    });
    const daveCoveredCallPayments = harden({
      StrikePrice: daveSimoleanPayment,
    });
    const {
      seat: daveCoveredCallSeat,
      payout: daveCoveredCallPayoutP,
    } = await zoe.redeem(
      daveOption,
      daveCoveredCallOfferRules,
      daveCoveredCallPayments,
    );

    const daveCoveredCallOutcome = await daveCoveredCallSeat.exercise();
    t.equals(
      daveCoveredCallOutcome,
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

    t.deepEquals(moolaR.issuer.getAmountOf(daveMoolaPayout), moola(3));
    t.deepEquals(
      simoleanR.issuer.getAmountOf(daveSimoleanPayout),
      simoleans(0),
    );

    t.deepEquals(moolaR.issuer.getAmountOf(aliceMoolaPayout), moola(0));
    t.deepEquals(
      simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
      simoleans(7),
    );

    t.deepEquals(
      inviteIssuer.getAmountOf(bobInvitePayout),
      inviteAmountMath.getEmpty(),
    );
    t.deepEquals(bucksR.issuer.getAmountOf(bobBucksPayout), bucks(1));

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
  } finally {
    t.end();
  }
});

// Alice makes a covered call and escrows. She shares the invite to
// Bob. Bob tries to sell the invite to Dave through another covered
// call. Can Bob trick Dave? Can Dave describe what it is that he
// wants in his offer description in the second covered call?
test('zoe - coveredCall with coveredCall for invite', async t => {
  try {
    // Setup the environment
    const timer = buildManualTimer(console.log);
    const { moolaR, simoleanR, bucksR, moola, simoleans, bucks } = setup();
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(coveredCallRoot);

    const coveredCallInstallationHandle = zoe.install(source, moduleFormat);

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
    const roles = harden({
      UnderlyingAsset: moolaR.issuer,
      StrikePrice: simoleanR.issuer,
    });
    const aliceCoveredCallInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      roles,
    );

    // Alice escrows with Zoe. She specifies her offer offerRules,
    // which include an offer description as well as the exit
    // offerRules. In this case, she choses an exit condition of after
    // the deadline of "100" according to a particular timer. This is
    // meant to be something far in the future, and will not be
    // reached in this test.

    const aliceOfferRules = harden({
      offer: { UnderlyingAsset: moola(3) },
      want: { StrikePrice: simoleans(7) },
      exit: {
        afterDeadline: {
          deadline: 100, // we will not reach this
          timer,
        },
      },
    });
    const alicePayments = { UnderlyingAsset: aliceMoolaPayment };
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceCoveredCallInvite,
      aliceOfferRules,
      alicePayments,
    );

    // Alice makes a call option, which is an invite to join the
    // covered call contract
    const option = await aliceSeat.makeCallOption();

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
    const bobExclOption = await inviteIssuer.claim(option);
    const optionExtent = inviteIssuer.getAmountOf(bobExclOption).extent[0];
    const { installationHandle } = zoe.getInstance(optionExtent.instanceHandle);
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionExtent.seatDesc, 'exerciseOption');
    t.ok(moolaR.amountMath.isEqual(optionExtent.underlyingAsset, moola(3)));
    t.ok(simoleanR.amountMath.isEqual(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 100);
    t.deepEqual(optionExtent.timerAuthority, timer);

    // Let's imagine that Bob wants to create another coveredCall, but
    // this time to trade this invite for bucks.
    const roles2 = harden({
      UnderlyingAsset: inviteIssuer,
      StrikePrice: bucksR.issuer,
    });
    const bobInviteForSecondCoveredCall = await zoe.makeInstance(
      coveredCallInstallationHandle,
      roles2,
    );

    // Bob wants to swap an invite with the same amount as his
    // current invite from Alice. He wants 1 buck in return.
    const bobOfferRulesSecondCoveredCall = harden({
      offer: { UnderlyingAsset: inviteIssuer.getAmountOf(bobExclOption) },
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
    const {
      seat: bobSecondCoveredCallSeat,
      payout: bobPayoutP,
    } = await zoe.redeem(
      bobInviteForSecondCoveredCall,
      bobOfferRulesSecondCoveredCall,
      bobPayments,
    );

    // Bob makes an offer to the swap with his "higher order" option
    const inviteForDave = await bobSecondCoveredCallSeat.makeCallOption();

    // Bob passes the higher order invite and
    // optionAmounts to Dave

    // Dave is looking to buy the option to trade his 7 simoleans for
    // 3 moola, and is willing to pay 1 buck for the option. He
    // checks that this invite matches what he wants
    const daveExclOption = await inviteIssuer.claim(inviteForDave);
    const daveOptionExtent = inviteIssuer.getAmountOf(daveExclOption).extent[0];
    const {
      installationHandle: daveOptionInstallationHandle,
    } = zoe.getInstance(daveOptionExtent.instanceHandle);
    t.equal(daveOptionInstallationHandle, coveredCallInstallationHandle);
    t.equal(daveOptionExtent.seatDesc, 'exerciseOption');
    t.ok(bucksR.amountMath.isEqual(daveOptionExtent.strikePrice, bucks(1)));
    t.equal(daveOptionExtent.expirationDate, 100);
    t.deepEqual(daveOptionExtent.timerAuthority, timer);

    // What about the underlying asset (the other option)?
    t.equal(
      daveOptionExtent.underlyingAsset.extent[0].seatDesc,
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

    // Dave's planned offerRules
    const daveOfferRulesCoveredCall = harden({
      want: { UnderlyingAsset: daveOptionExtent.underlyingAsset },
      offer: { StrikePrice: bucks(1) },
    });

    // Dave escrows his 1 buck with Zoe and forms his offer offerRules

    const daveSecondCoveredCallPayments = { StrikePrice: daveBucksPayment };
    const {
      seat: daveSecondCoveredCallSeat,
      payout: daveSecondCoveredCallPayoutP,
    } = await zoe.redeem(
      daveExclOption,
      daveOfferRulesCoveredCall,
      daveSecondCoveredCallPayments,
    );
    const daveSecondCoveredCallOutcome = daveSecondCoveredCallSeat.exercise();
    t.equals(
      daveSecondCoveredCallOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
      `dave second offer accepted`,
    );

    const daveSecondCoveredCallPayout = await daveSecondCoveredCallPayoutP;

    const firstCoveredCallInvite = await daveSecondCoveredCallPayout.UnderlyingAsset;
    const daveBucksPayout = await daveSecondCoveredCallPayout.StrikePrice;

    // Dave exercises his option by making an offer to the covered
    // call. First, he escrows with Zoe.

    const daveFirstCoveredCallOfferRules = harden({
      want: { UnderlyingAsset: moola(3) },
      offer: { StrikePrice: simoleans(7) },
    });
    const daveFirstCoveredCallPayments = harden({
      StrikePrice: daveSimoleanPayment,
    });
    const {
      seat: daveFirstCoveredCallSeat,
      payout: daveFirstCoveredCallPayoutP,
    } = await zoe.redeem(
      firstCoveredCallInvite,
      daveFirstCoveredCallOfferRules,
      daveFirstCoveredCallPayments,
    );

    const daveFirstCoveredCallOutcome = daveFirstCoveredCallSeat.exercise();
    t.equals(
      daveFirstCoveredCallOutcome,
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

    t.deepEquals(moolaR.issuer.getAmountOf(daveMoolaPayout), moola(3));
    t.deepEquals(
      simoleanR.issuer.getAmountOf(daveSimoleanPayout),
      simoleans(0),
    );

    t.deepEquals(moolaR.issuer.getAmountOf(aliceMoolaPayout), moola(0));
    t.deepEquals(
      simoleanR.issuer.getAmountOf(aliceSimoleanPayout),
      simoleans(7),
    );

    t.deepEquals(
      inviteIssuer.getAmountOf(bobInvitePayout),
      inviteAmountMath.getEmpty(),
    );
    t.deepEquals(bucksR.issuer.getAmountOf(bobBucksPayout), bucks(1));

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
  } finally {
    t.end();
  }
});
