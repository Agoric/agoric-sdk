import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import buildManualTimer from '@agoric/ertp/tools/manualTimer';
import { sameStructure } from '@agoric/ertp/util/sameStructure';
import { makeZoe } from '../../../zoe';
import { setup } from '../setupBasicMints';

const coveredCallRoot = `${__dirname}/../../../contracts/coveredCall`;
const atomicSwapRoot = `${__dirname}/../../../contracts/atomicSwap`;

test('zoe - coveredCall', async t => {
  try {
    const {
      mints: defaultMints,
      assays: defaultAssays,
      moola,
      simoleans,
      unitOps,
    } = setup();
    const mints = defaultMints.slice(0, 2);
    const assays = defaultAssays.slice(0, 2);
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(coveredCallRoot);
    const coveredCallInstallationHandle = zoe.install(source, moduleFormat);
    const timer = buildManualTimer(console.log);

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(moola(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(simoleans(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(moola(0));
    const bobSimoleanPurse = mints[1].mint(simoleans(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Alice creates a coveredCall instance
    const terms = {
      assays,
    };
    const aliceInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      terms,
    );

    // 2: Alice escrows with Zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(7),
        },
      ],
      exitRule: {
        kind: 'afterDeadline',
        deadline: 1,
        timer,
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceOfferRules,
      alicePayments,
    );

    // 3: Alice creates a call option

    const option = aliceSeat.makeCallOption();

    // Imagine that Alice sends the option to Bob for free (not done here
    // since this test doesn't actually have separate vats/parties)

    // 4: Bob inspects the option (an invite payment) and checks that it is the
    // contract instance that he expects as well as that Alice has
    // already escrowed.

    const inviteAssay = zoe.getInviteAssay();
    const bobExclOption = await inviteAssay.claimAll(option);
    const optionExtent = bobExclOption.getBalance().extent;
    const { installationHandle } = zoe.getInstance(optionExtent.instanceHandle);
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionExtent.seatDesc, 'exerciseOption');
    t.ok(unitOps[0].equals(optionExtent.underlyingAsset, moola(3)));
    t.ok(unitOps[1].equals(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 1);
    t.deepEqual(optionExtent.timerAuthority, timer);

    const bobPayments = [undefined, bobSimoleanPayment];

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: optionExtent.underlyingAsset,
        },
        {
          kind: 'offerAtMost',
          units: optionExtent.strikePrice,
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    // 6: Bob escrows
    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclOption,
      bobOfferRules,
      bobPayments,
    );

    // 8: Bob makes an offer with his escrow receipt
    const bobOutcome = await bobSeat.exercise();

    t.equals(
      bobOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    const bobPayout = await bobPayoutP;
    const alicePayout = await alicePayoutP;

    const [bobMoolaPayout, bobSimoleanPayout] = await Promise.all(bobPayout);
    const [aliceMoolaPayout, aliceSimoleanPayout] = await Promise.all(
      alicePayout,
    );

    // Alice gets what Alice wanted
    t.deepEquals(
      aliceSimoleanPayout.getBalance(),
      aliceOfferRules.payoutRules[1].units,
    );

    // Alice didn't get any of what Alice put in
    t.equals(aliceMoolaPayout.getBalance().extent, 0);

    // 13: Alice deposits her payout to ensure she can
    await aliceMoolaPurse.depositAll(aliceMoolaPayout);
    await aliceSimoleanPurse.depositAll(aliceSimoleanPayout);

    // 14: Bob deposits his original payments to ensure he can
    await bobMoolaPurse.depositAll(bobMoolaPayout);
    await bobSimoleanPurse.depositAll(bobSimoleanPayout);

    // Assert that the correct payouts were received.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
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

test(`zoe - coveredCall - alice's deadline expires, cancelling alice and bob`, async t => {
  try {
    const {
      mints: defaultMints,
      assays: defaultAssays,
      moola,
      simoleans,
      unitOps,
    } = setup();
    const mints = defaultMints.slice(0, 2);
    const assays = defaultAssays.slice(0, 2);
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(coveredCallRoot);
    const coveredCallInstallationHandle = zoe.install(source, moduleFormat);
    const timer = buildManualTimer(console.log);

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(moola(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(simoleans(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(moola(0));
    const bobSimoleanPurse = mints[1].mint(simoleans(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Alice creates a coveredCall instance
    const terms = {
      assays,
    };
    const aliceInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      terms,
    );

    // 2: Alice escrows with Zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(7),
        },
      ],
      exitRule: {
        kind: 'afterDeadline',
        deadline: 1,
        timer,
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceOfferRules,
      alicePayments,
    );

    // 3: Alice gets an option
    const option = aliceSeat.makeCallOption();
    timer.tick();

    // Imagine that Alice sends the option to Bob for free (not done here
    // since this test doesn't actually have separate vats/parties)

    // 4: Bob inspects the option (an invite payment) and checks that it is the
    // contract instance that he expects as well as that Alice has
    // already escrowed.

    const inviteAssay = zoe.getInviteAssay();
    const bobExclOption = await inviteAssay.claimAll(option);
    const optionExtent = bobExclOption.getBalance().extent;
    const { installationHandle } = zoe.getInstance(optionExtent.instanceHandle);
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionExtent.seatDesc, 'exerciseOption');
    t.ok(unitOps[0].equals(optionExtent.underlyingAsset, moola(3)));
    t.ok(unitOps[1].equals(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 1);
    t.deepEqual(optionExtent.timerAuthority, timer);

    const bobPayments = [undefined, bobSimoleanPayment];

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: optionExtent.underlyingAsset,
        },
        {
          kind: 'offerAtMost',
          units: optionExtent.strikePrice,
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    // 6: Bob escrows
    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclOption,
      bobOfferRules,
      bobPayments,
    );

    t.throws(() => bobSeat.exercise(), /The covered call option is expired/);

    const bobPayout = await bobPayoutP;
    const alicePayout = await alicePayoutP;

    const [bobMoolaPayout, bobSimoleanPayout] = await Promise.all(bobPayout);
    const [aliceMoolaPayout, aliceSimoleanPayout] = await Promise.all(
      alicePayout,
    );

    // Alice gets back what she put in
    t.deepEquals(aliceMoolaPayout.getBalance(), moola(3));

    // Alice doesn't get what she wanted
    t.deepEquals(aliceSimoleanPayout.getBalance(), simoleans(0));

    // 11: Alice deposits her winnings to ensure she can
    await aliceMoolaPurse.depositAll(aliceMoolaPayout);
    await aliceSimoleanPurse.depositAll(aliceSimoleanPayout);

    // 12: Bob deposits his winnings to ensure he can
    await bobMoolaPurse.depositAll(bobMoolaPayout);
    await bobSimoleanPurse.depositAll(bobSimoleanPayout);

    // Assert that the correct outcome was achieved.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    t.deepEquals(aliceMoolaPurse.getBalance(), moola(3));
    t.deepEquals(aliceSimoleanPurse.getBalance(), simoleans(0));
    t.deepEquals(bobMoolaPurse.getBalance(), moola(0));
    t.deepEquals(bobSimoleanPurse.getBalance(), simoleans(7));
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
    const { mints, assays, moola, simoleans, bucks, unitOps } = setup();
    const [moolaMint, simoleanMint, bucksMint] = mints;
    const [moolaAssay, simoleanAssay, bucksAssay] = assays;
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
    const aliceMoolaPurse = moolaMint.mint(moola(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = simoleanMint.mint(simoleans(0));

    // Setup Bob
    // Bob starts with nothing
    const bobMoolaPurse = moolaMint.mint(moola(0));
    const bobSimoleanPurse = simoleanMint.mint(simoleans(0));
    const bobBucksPurse = bucksMint.mint(bucks(0));

    // Setup Dave
    // Dave starts with 1 buck
    const daveMoolaPurse = moolaMint.mint(moola(0));
    const daveSimoleanPurse = simoleanMint.mint(simoleans(7));
    const daveBucksPurse = bucksMint.mint(bucks(1));
    const daveBucksPayment = daveBucksPurse.withdrawAll();
    const daveSimoleanPayment = daveSimoleanPurse.withdrawAll();

    // 1: Alice creates a coveredCall instance of moola for simoleans
    const terms = harden({
      assays: [moolaAssay, simoleanAssay],
    });
    const aliceInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      terms,
    );

    // 2: Alice escrows with Zoe. She specifies her offer offerRules,
    // which include an offer description as well as the exit
    // offerRules. In this case, she choses an exit condition of after
    // the deadline of "100" according to a particular timer. This is
    // meant to be something far in the future, and will not be
    // reached in this test.

    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(7),
        },
      ],
      exitRule: {
        kind: 'afterDeadline',
        deadline: 100, // we will not reach this
        timer,
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceOfferRules,
      alicePayments,
    );

    // 3: Alice initializes the coveredCall with her escrow receipt

    // Alice gets two kinds of things back - she gets an 'outcome'
    // which is just a message that the offer was accepted or
    // rejected. She also gets an invite, which is an ERTP payment
    // that can be unwrapped to get an object with a `matchOffer`
    // method. The invite is the only way to make a counter-offer in
    // this particular contract. It is not public.
    const option = aliceSeat.makeCallOption();

    // 4: Imagine that Alice sends the invite to Bob as well as the
    // instanceHandle (not done here since this test doesn't actually have
    // separate vats/parties)

    // 5: Bob inspects the invite payment and checks its information against the
    // questions that he has about whether it is worth being a counter
    // party in the covered call: Did the covered call use the
    // expected covered call installation (code)? Does it use the assays
    // that he expects (moola and simoleans)?
    const inviteAssay = zoe.getInviteAssay();
    const bobExclOption = await inviteAssay.claimAll(option);
    const optionExtent = bobExclOption.getBalance().extent;
    const { installationHandle } = zoe.getInstance(optionExtent.instanceHandle);
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionExtent.seatDesc, 'exerciseOption');
    t.ok(unitOps[0].equals(optionExtent.underlyingAsset, moola(3)));
    t.ok(unitOps[1].equals(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 100);
    t.deepEqual(optionExtent.timerAuthority, timer);

    // Let's imagine that Bob wants to create a swap to trade this
    // invite for bucks.
    const bobSwapInvite = await zoe.makeInstance(swapInstallationId, {
      assays: harden([inviteAssay, bucksAssay]),
    });

    // Bob wants to swap an invite with the same units as his
    // current invite from Alice. He wants 1 buck in return.
    const bobOfferRulesSwap = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: bobExclOption.getBalance(),
        },
        {
          kind: 'wantAtLeast',
          units: bucks(1),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    const bobPayments = [bobExclOption, undefined];

    // 6: Bob escrows his option in the swap
    const { seat: bobSwapSeat, payout: bobPayoutP } = await zoe.redeem(
      bobSwapInvite,
      bobOfferRulesSwap,
      bobPayments,
    );

    // 8: Bob makes an offer to the swap with his "higher order"
    const daveSwapInvite = await bobSwapSeat.makeFirstOffer();

    // Bob passes the swap invite to Dave and tells him about
    // what kind of offer the swap is for (Dave doesn't necessarily
    // trust this, but he can use the information). This swap is a
    // public swap in that only having the instanceHandle for the swap is
    // enough to get an invite for the swap.

    const {
      extent: { instanceHandle: swapInstanceHandle },
    } = daveSwapInvite.getBalance();

    const {
      installationHandle: daveSwapInstallId,
      terms: daveSwapTerms,
    } = zoe.getInstance(swapInstanceHandle);

    // Dave is looking to buy the option to trade his 7 simoleans for
    // 3 moola, and is willing to pay 1 buck for the option. He
    // checks that this instance matches what he wants

    // Did this swap use the correct swap installation? Yes
    t.equal(daveSwapInstallId, swapInstallationId);

    // Is this swap for the correct assays and has no other terms? Yes
    t.ok(
      sameStructure(
        daveSwapTerms,
        harden({
          assays: harden([inviteAssay, bucksAssay]),
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
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: bobOfferRulesSwap.payoutRules[0].units,
        },
        {
          kind: 'offerAtMost',
          units: bucksAssay.makeUnits(1),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    const daveSwapPayments = [undefined, daveBucksPayment];
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

    const [daveOption, daveBucksPayout] = await daveSwapPayoutP;

    // Dave exercises his option by making an offer to the covered
    // call. First, he escrows with Zoe.

    const daveCoveredCallOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: moola(3),
        },
        {
          kind: 'offerAtMost',
          units: simoleans(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const daveCoveredCallPayments = [undefined, daveSimoleanPayment];
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
    const aliceResult = await alicePayoutP;
    const bobResult = await bobPayoutP;

    t.deepEquals(daveCoveredCallResult[0].getBalance(), moola(3));
    t.deepEquals(daveCoveredCallResult[1].getBalance(), simoleans(0));

    t.deepEquals(aliceResult[0].getBalance(), moola(0));
    t.deepEquals(aliceResult[1].getBalance(), simoleans(7));

    t.deepEquals(bobResult[0].getBalance(), inviteAssay.makeUnits(null));
    t.deepEquals(bobResult[1].getBalance(), bucks(1));

    // Alice deposits her payouts
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // Bob deposits his payouts
    await bobBucksPurse.depositAll(bobResult[1]);

    // Dave deposits his payouts
    await daveMoolaPurse.depositAll(daveCoveredCallResult[0]);
    await daveSimoleanPurse.depositAll(daveCoveredCallResult[1]);
    await daveBucksPurse.depositAll(daveBucksPayout);

    t.equals(aliceMoolaPurse.getBalance().extent, 0);
    t.equals(aliceSimoleanPurse.getBalance().extent, 7);

    t.equals(bobMoolaPurse.getBalance().extent, 0);
    t.equals(bobSimoleanPurse.getBalance().extent, 0);
    t.equals(bobBucksPurse.getBalance().extent, 1);

    t.equals(daveMoolaPurse.getBalance().extent, 3);
    t.equals(daveSimoleanPurse.getBalance().extent, 0);
    t.equals(daveBucksPurse.getBalance().extent, 0);
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
    const { mints, assays, moola, simoleans, bucks, unitOps } = setup();
    const [moolaMint, simoleanMint, bucksMint] = mints;
    const [moolaAssay, simoleanAssay, bucksAssay] = assays;
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(coveredCallRoot);

    const coveredCallInstallationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    // Alice starts with 3 moola
    const aliceMoolaPurse = moolaMint.mint(moola(3));
    const aliceSimoleanPurse = simoleanMint.mint(simoleans(0));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();

    // Setup Bob
    // Bob starts with nothing
    const bobMoolaPurse = moolaMint.mint(moola(0));
    const bobSimoleanPurse = simoleanMint.mint(simoleans(0));
    const bobBucksPurse = bucksMint.mint(bucks(0));

    // Setup Dave
    // Dave starts with 1 buck and 7 simoleans
    const daveMoolaPurse = moolaMint.mint(moola(0));
    const daveSimoleanPurse = simoleanMint.mint(simoleans(7));
    const daveBucksPurse = bucksMint.mint(bucks(1));
    const daveBucksPayment = daveBucksPurse.withdrawAll();
    const daveSimoleanPayment = daveSimoleanPurse.withdrawAll();

    // 1: Alice creates a coveredCall instance of moola for simoleans
    const terms = harden({
      assays: [moolaAssay, simoleanAssay],
    });
    const aliceCoveredCallInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      terms,
    );

    // 2: Alice escrows with Zoe. She specifies her offer offerRules,
    // which include an offer description as well as the exit
    // offerRules. In this case, she choses an exit condition of after
    // the deadline of "100" according to a particular timer. This is
    // meant to be something far in the future, and will not be
    // reached in this test.

    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: assays[0].makeUnits(3),
        },
        {
          kind: 'wantAtLeast',
          units: assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'afterDeadline',
        deadline: 100, // we will not reach this
        timer,
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceCoveredCallInvite,
      aliceOfferRules,
      alicePayments,
    );

    // 3: Alice makes a call option, which is an invite to join the
    // covered call contract
    const option = await aliceSeat.makeCallOption();

    // 4: Imagine that Alice sends the invite to Bob as well as the
    // instanceHandle (not done here since this test doesn't actually have
    // separate vats/parties)

    // 5: Bob inspects the invite payment and checks its information against the
    // questions that he has about whether it is worth being a counter
    // party in the covered call: Did the covered call use the
    // expected covered call installation (code)? Does it use the assays
    // that he expects (moola and simoleans)?
    const inviteAssay = zoe.getInviteAssay();
    const bobExclOption = await inviteAssay.claimAll(option);
    const optionExtent = bobExclOption.getBalance().extent;
    const { installationHandle } = zoe.getInstance(optionExtent.instanceHandle);
    t.equal(installationHandle, coveredCallInstallationHandle);
    t.equal(optionExtent.seatDesc, 'exerciseOption');
    t.ok(unitOps[0].equals(optionExtent.underlyingAsset, moola(3)));
    t.ok(unitOps[1].equals(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 100);
    t.deepEqual(optionExtent.timerAuthority, timer);

    // Let's imagine that Bob wants to create another coveredCall, but
    // this time to trade this invite for bucks.
    const bobInviteForSecondCoveredCall = await zoe.makeInstance(
      coveredCallInstallationHandle,
      harden({
        assays: [inviteAssay, bucksAssay],
      }),
    );

    // Bob wants to swap an invite with the same units as his
    // current invite from Alice. He wants 1 buck in return.
    const bobOfferRulesSecondCoveredCall = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: bobExclOption.getBalance(),
        },
        {
          kind: 'wantAtLeast',
          units: bucksAssay.makeUnits(1),
        },
      ],
      exitRule: {
        kind: 'afterDeadline',
        deadline: 100, // we will not reach this
        timer,
      },
    });

    const bobPayments = [bobExclOption, undefined];

    // 6: Bob escrows his invite
    const {
      seat: bobSecondCoveredCallSeat,
      payout: bobPayoutP,
    } = await zoe.redeem(
      bobInviteForSecondCoveredCall,
      bobOfferRulesSecondCoveredCall,
      bobPayments,
    );

    // 8: Bob makes an offer to the swap with his "higher order" escrow receipt
    const inviteForDave = await bobSecondCoveredCallSeat.makeCallOption();

    // Bob passes the invite to the higher order covered call and
    // instanceHandle to Dave

    // Dave is looking to buy the option to trade his 7 simoleans for
    // 3 moola, and is willing to pay 1 buck for the option. He
    // checks that this invite matches what he wants
    const daveExclOption = await inviteAssay.claimAll(inviteForDave);
    const daveOptionExtent = daveExclOption.getBalance().extent;
    const {
      installationHandle: daveOptionInstallationHandle,
    } = zoe.getInstance(daveOptionExtent.instanceHandle);
    t.equal(daveOptionInstallationHandle, coveredCallInstallationHandle);
    t.equal(daveOptionExtent.seatDesc, 'exerciseOption');
    t.ok(unitOps[2].equals(daveOptionExtent.strikePrice, bucks(1)));
    t.equal(daveOptionExtent.expirationDate, 100);
    t.deepEqual(daveOptionExtent.timerAuthority, timer);

    // What about the underlying asset (the other option)?
    t.equal(daveOptionExtent.underlyingAsset.extent.seatDesc, 'exerciseOption');
    t.equal(daveOptionExtent.underlyingAsset.extent.expirationDate, 100);
    t.ok(
      unitOps[1].equals(
        daveOptionExtent.underlyingAsset.extent.strikePrice,
        simoleans(7),
      ),
    );
    t.deepEqual(daveOptionExtent.underlyingAsset.extent.timerAuthority, timer);

    // Dave's planned offerRules
    const daveOfferRulesCoveredCall = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: daveOptionExtent.underlyingAsset,
        },
        {
          kind: 'offerAtMost',
          units: bucksAssay.makeUnits(1),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    // Dave escrows his 1 buck with Zoe and forms his offer offerRules

    const daveSecondCoveredCallPayments = [undefined, daveBucksPayment];
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
    );

    const [
      firstCoveredCallInvite,
      daveBucksPayout,
    ] = await daveSecondCoveredCallPayoutP;

    // Dave exercises his option by making an offer to the covered
    // call. First, he escrows with Zoe.

    const daveFirstCoveredCallOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: moola(3),
        },
        {
          kind: 'offerAtMost',
          units: simoleans(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const daveFirstCoveredCallPayments = [undefined, daveSimoleanPayment];
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
    );

    // Dave should get 3 moola, Bob should get 1 buck, and Alice
    // get 7 simoleans
    const daveFirstCoveredCallResult = await daveFirstCoveredCallPayoutP;
    const aliceResult = await alicePayoutP;
    const bobResult = await bobPayoutP;

    t.deepEquals(daveFirstCoveredCallResult[0].getBalance(), moola(3));
    t.deepEquals(daveFirstCoveredCallResult[1].getBalance(), simoleans(0));

    t.deepEquals(aliceResult[0].getBalance(), moola(0));
    t.deepEquals(aliceResult[1].getBalance(), simoleans(7));

    t.deepEquals(bobResult[0].getBalance(), inviteAssay.makeUnits(null));
    t.deepEquals(bobResult[1].getBalance(), bucks(1));

    // Alice deposits her payouts
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // Bob deposits his payouts
    await bobBucksPurse.depositAll(bobResult[1]);

    // Dave deposits his payouts
    await daveMoolaPurse.depositAll(daveFirstCoveredCallResult[0]);
    await daveSimoleanPurse.depositAll(daveFirstCoveredCallResult[1]);
    await daveBucksPurse.depositAll(daveBucksPayout);

    t.equals(aliceMoolaPurse.getBalance().extent, 0);
    t.equals(aliceSimoleanPurse.getBalance().extent, 7);

    t.equals(bobMoolaPurse.getBalance().extent, 0);
    t.equals(bobSimoleanPurse.getBalance().extent, 0);
    t.equals(bobBucksPurse.getBalance().extent, 1);

    t.equals(daveMoolaPurse.getBalance().extent, 3);
    t.equals(daveSimoleanPurse.getBalance().extent, 0);
    t.equals(daveBucksPurse.getBalance().extent, 0);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
