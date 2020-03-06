// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';
import { sameStructure } from '@agoric/same-structure';

import buildManualTimer from '../../../tools/manualTimer';
import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const coveredCallRoot = `${__dirname}/../../../src/contracts/coveredCall`;
const atomicSwapRoot = `${__dirname}/../../../src/contracts/atomicSwap`;

test('zoe - coveredCall', async t => {
  try {
    const {
      mints: defaultMints,
      issuers: defaultIssuers,
      moola,
      simoleans,
      amountMaths,
    } = setup();
    const mints = defaultMints.slice(0, 2);
    const issuers = defaultIssuers.slice(0, 2);
    const [moolaIssuer, simoleanIssuer] = issuers;
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(coveredCallRoot);
    const coveredCallInstallationHandle = zoe.install(source, moduleFormat);
    const timer = buildManualTimer(console.log);

    // Setup Alice
    const aliceMoolaPayment = mints[0].mintPayment(moola(3));
    const aliceMoolaPurse = issuers[0].makeEmptyPurse();
    const aliceSimoleanPurse = issuers[1].makeEmptyPurse();

    // Setup Bob
    const bobSimoleanPayment = mints[1].mintPayment(simoleans(7));
    const bobMoolaPurse = issuers[0].makeEmptyPurse();
    const bobSimoleanPurse = issuers[1].makeEmptyPurse();

    // Alice creates a coveredCall instance
    const terms = {
      issuers,
    };
    const aliceInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      terms,
    );

    // Alice escrows with Zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(3),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(7),
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
    t.ok(amountMaths[0].isEqual(optionExtent.underlyingAsset, moola(3)));
    t.ok(amountMaths[1].isEqual(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 1);
    t.deepEqual(optionExtent.timerAuthority, timer);

    const bobPayments = [undefined, bobSimoleanPayment];

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: optionExtent.underlyingAsset,
        },
        {
          kind: 'offerAtMost',
          amount: optionExtent.strikePrice,
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
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

    const [bobMoolaPayout, bobSimoleanPayout] = await Promise.all(bobPayout);
    const [aliceMoolaPayout, aliceSimoleanPayout] = await Promise.all(
      alicePayout,
    );

    // Alice gets what Alice wanted
    t.deepEquals(
      simoleanIssuer.getAmountOf(aliceSimoleanPayout),
      aliceOfferRules.payoutRules[1].amount,
    );

    // Alice didn't get any of what Alice put in
    t.deepEquals(moolaIssuer.getAmountOf(aliceMoolaPayout), moola(0));

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
    const {
      mints: defaultMints,
      issuers: defaultIssuers,
      moola,
      simoleans,
      amountMaths,
    } = setup();
    const mints = defaultMints.slice(0, 2);
    const issuers = defaultIssuers.slice(0, 2);
    const [moolaIssuer, simoleanIssuer] = issuers;
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(coveredCallRoot);
    const coveredCallInstallationHandle = zoe.install(source, moduleFormat);
    const timer = buildManualTimer(console.log);

    // Setup Alice
    const aliceMoolaPayment = mints[0].mintPayment(moola(3));
    const aliceMoolaPurse = issuers[0].makeEmptyPurse();
    const aliceSimoleanPurse = issuers[1].makeEmptyPurse();

    // Setup Bob
    const bobSimoleanPayment = mints[1].mintPayment(simoleans(7));
    const bobMoolaPurse = issuers[0].makeEmptyPurse();
    const bobSimoleanPurse = issuers[1].makeEmptyPurse();

    // Alice creates a coveredCall instance
    const terms = {
      issuers,
    };
    const aliceInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      terms,
    );

    // Alice escrows with Zoe
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(3),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(7),
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
    t.ok(amountMaths[0].isEqual(optionExtent.underlyingAsset, moola(3)));
    t.ok(amountMaths[1].isEqual(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 1);
    t.deepEqual(optionExtent.timerAuthority, timer);

    const bobPayments = [undefined, bobSimoleanPayment];

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: optionExtent.underlyingAsset,
        },
        {
          kind: 'offerAtMost',
          amount: optionExtent.strikePrice,
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
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

    const [bobMoolaPayout, bobSimoleanPayout] = await Promise.all(bobPayout);
    const [aliceMoolaPayout, aliceSimoleanPayout] = await Promise.all(
      alicePayout,
    );

    // Alice gets back what she put in
    t.deepEquals(moolaIssuer.getAmountOf(aliceMoolaPayout), moola(3));

    // Alice doesn't get what she wanted
    t.deepEquals(simoleanIssuer.getAmountOf(aliceSimoleanPayout), simoleans(0));

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
    const { mints, issuers, moola, simoleans, bucks, amountMaths } = setup();
    const [moolaMint, simoleanMint, bucksMint] = mints;
    const [moolaIssuer, simoleanIssuer, bucksIssuer] = issuers;
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
    const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
    const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

    // Setup Bob
    // Bob starts with nothing
    const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();
    const bobBucksPurse = bucksIssuer.makeEmptyPurse();

    // Setup Dave
    // Dave starts with 1 buck
    const daveSimoleanPayment = simoleanMint.mintPayment(simoleans(7));
    const daveBucksPayment = bucksMint.mintPayment(bucks(1));
    const daveMoolaPurse = moolaIssuer.makeEmptyPurse();
    const daveSimoleanPurse = simoleanIssuer.makeEmptyPurse();
    const daveBucksPurse = bucksIssuer.makeEmptyPurse();

    // Alice creates a coveredCall instance of moola for simoleans
    const terms = harden({
      issuers: [moolaIssuer, simoleanIssuer],
    });
    const aliceInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      terms,
    );

    // Alice escrows with Zoe. She specifies her offer offerRules,
    // which include an offer description as well as the exit
    // offerRules. In this case, she choses an exit condition of after
    // the deadline of "100" according to a particular timer. This is
    // meant to be something far in the future, and will not be
    // reached in this test.

    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(3),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(7),
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
    t.ok(amountMaths[0].isEqual(optionDesc.underlyingAsset, moola(3)));
    t.ok(amountMaths[1].isEqual(optionDesc.strikePrice, simoleans(7)));
    t.equal(optionDesc.expirationDate, 100);
    t.deepEqual(optionDesc.timerAuthority, timer);

    // Let's imagine that Bob wants to create a swap to trade this
    // invite for bucks.
    const bobSwapInvite = await zoe.makeInstance(swapInstallationId, {
      issuers: harden([inviteIssuer, bucksIssuer]),
    });

    // Bob wants to swap an invite with the same amount as his
    // current invite from Alice. He wants 1 buck in return.
    const bobOfferRulesSwap = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: inviteIssuer.getAmountOf(bobExclOption),
        },
        {
          kind: 'wantAtLeast',
          amount: bucks(1),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    const bobPayments = [bobExclOption, undefined];

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
      terms: daveSwapTerms,
    } = zoe.getInstance(swapInstanceHandle);

    // Dave is looking to buy the option to trade his 7 simoleans for
    // 3 moola, and is willing to pay 1 buck for the option. He
    // checks that this instance matches what he wants

    // Did this swap use the correct swap installation? Yes
    t.equal(daveSwapInstallId, swapInstallationId);

    // Is this swap for the correct issuers and has no other terms? Yes
    t.ok(
      sameStructure(
        daveSwapTerms,
        harden({
          issuers: harden([inviteIssuer, bucksIssuer]),
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
          amount: optionAmount,
        },
        {
          kind: 'offerAtMost',
          amount: bucks(1),
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

    const daveSwapPayout = await daveSwapPayoutP;
    const [daveOption, daveBucksPayout] = await Promise.all(daveSwapPayout);

    // Dave exercises his option by making an offer to the covered
    // call. First, he escrows with Zoe.

    const daveCoveredCallOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: moola(3),
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
    const daveCoveredCallPayments = harden([undefined, daveSimoleanPayment]);
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
    const [daveMoolaPayout, daveSimoleanPayout] = await Promise.all(
      daveCoveredCallResult,
    );
    const aliceResult = await alicePayoutP;
    const [aliceMoolaPayout, aliceSimoleanPayout] = await Promise.all(
      aliceResult,
    );
    const bobResult = await bobPayoutP;
    const [bobInvitePayout, bobBucksPayout] = await Promise.all(bobResult);

    t.deepEquals(moolaIssuer.getAmountOf(daveMoolaPayout), moola(3));
    t.deepEquals(simoleanIssuer.getAmountOf(daveSimoleanPayout), simoleans(0));

    t.deepEquals(moolaIssuer.getAmountOf(aliceMoolaPayout), moola(0));
    t.deepEquals(simoleanIssuer.getAmountOf(aliceSimoleanPayout), simoleans(7));

    t.deepEquals(
      inviteIssuer.getAmountOf(bobInvitePayout),
      inviteAmountMath.getEmpty(),
    );
    t.deepEquals(bucksIssuer.getAmountOf(bobBucksPayout), bucks(1));

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
    const { mints, issuers, moola, simoleans, bucks, amountMaths } = setup();
    const [moolaMint, simoleanMint, bucksMint] = mints;
    const [moolaIssuer, simoleanIssuer, bucksIssuer] = issuers;
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(coveredCallRoot);

    const coveredCallInstallationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    // Alice starts with 3 moola
    const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
    const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

    // Setup Bob
    // Bob starts with nothing
    const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
    const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();
    const bobBucksPurse = bucksIssuer.makeEmptyPurse();

    // Setup Dave
    // Dave starts with 1 buck and 7 simoleans
    const daveSimoleanPayment = simoleanMint.mintPayment(simoleans(7));
    const daveBucksPayment = bucksMint.mintPayment(bucks(1));
    const daveMoolaPurse = moolaIssuer.makeEmptyPurse();
    const daveSimoleanPurse = simoleanIssuer.makeEmptyPurse();
    const daveBucksPurse = bucksIssuer.makeEmptyPurse();

    // Alice creates a coveredCall instance of moola for simoleans
    const terms = harden({
      issuers: [moolaIssuer, simoleanIssuer],
    });
    const aliceCoveredCallInvite = await zoe.makeInstance(
      coveredCallInstallationHandle,
      terms,
    );

    // Alice escrows with Zoe. She specifies her offer offerRules,
    // which include an offer description as well as the exit
    // offerRules. In this case, she choses an exit condition of after
    // the deadline of "100" according to a particular timer. This is
    // meant to be something far in the future, and will not be
    // reached in this test.

    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(3),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(7),
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
    t.ok(amountMaths[0].isEqual(optionExtent.underlyingAsset, moola(3)));
    t.ok(amountMaths[1].isEqual(optionExtent.strikePrice, simoleans(7)));
    t.equal(optionExtent.expirationDate, 100);
    t.deepEqual(optionExtent.timerAuthority, timer);

    // Let's imagine that Bob wants to create another coveredCall, but
    // this time to trade this invite for bucks.
    const bobInviteForSecondCoveredCall = await zoe.makeInstance(
      coveredCallInstallationHandle,
      harden({
        issuers: [inviteIssuer, bucksIssuer],
      }),
    );

    // Bob wants to swap an invite with the same amount as his
    // current invite from Alice. He wants 1 buck in return.
    const bobOfferRulesSecondCoveredCall = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: inviteIssuer.getAmountOf(bobExclOption),
        },
        {
          kind: 'wantAtLeast',
          amount: bucks(1),
        },
      ],
      exitRule: {
        kind: 'afterDeadline',
        deadline: 100, // we will not reach this
        timer,
      },
    });

    const bobPayments = [bobExclOption, undefined];

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
    t.ok(amountMaths[2].isEqual(daveOptionExtent.strikePrice, bucks(1)));
    t.equal(daveOptionExtent.expirationDate, 100);
    t.deepEqual(daveOptionExtent.timerAuthority, timer);

    // What about the underlying asset (the other option)?
    t.equal(
      daveOptionExtent.underlyingAsset.extent[0].seatDesc,
      'exerciseOption',
    );
    t.equal(daveOptionExtent.underlyingAsset.extent[0].expirationDate, 100);
    t.ok(
      amountMaths[1].isEqual(
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
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: daveOptionExtent.underlyingAsset,
        },
        {
          kind: 'offerAtMost',
          amount: bucks(1),
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
      firstCoveredCallInviteP,
      daveBucksPayoutP,
    ] = await daveSecondCoveredCallPayoutP;

    const firstCoveredCallInvite = await firstCoveredCallInviteP;
    const daveBucksPayout = await daveBucksPayoutP;

    // Dave exercises his option by making an offer to the covered
    // call. First, he escrows with Zoe.

    const daveFirstCoveredCallOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: moola(3),
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

    const [daveMoolaPayout, daveSimoleanPayout] = await Promise.all(
      daveFirstCoveredCallResult,
    );

    const [aliceMoolaPayout, aliceSimoleanPayout] = await Promise.all(
      aliceResult,
    );

    const [bobInvitePayout, bobBucksPayout] = await Promise.all(bobResult);

    t.deepEquals(moolaIssuer.getAmountOf(daveMoolaPayout), moola(3));
    t.deepEquals(simoleanIssuer.getAmountOf(daveSimoleanPayout), simoleans(0));

    t.deepEquals(moolaIssuer.getAmountOf(aliceMoolaPayout), moola(0));
    t.deepEquals(simoleanIssuer.getAmountOf(aliceSimoleanPayout), simoleans(7));

    t.deepEquals(
      inviteIssuer.getAmountOf(bobInvitePayout),
      inviteAmountMath.getEmpty(),
    );
    t.deepEquals(bucksIssuer.getAmountOf(bobBucksPayout), bucks(1));

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
