import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeZoe } from '../../../../../core/zoe/zoe/zoe';
import { setup } from '../setupBasicMints';
import buildManualTimer from '../../../../../tools/manualTimer';
import { sameStructure } from '../../../../../util/sameStructure';
import { coveredCallSrcs } from '../../../../../core/zoe/contracts/coveredCall';
import { publicSwapSrcs } from '../../../../../core/zoe/contracts/publicSwap';

test('zoe - coveredCall', async t => {
  try {
    const { mints: defaultMints, assays: defaultAssays } = setup();
    const mints = defaultMints.slice(0, 2);
    const assays = defaultAssays.slice(0, 2);
    const zoe = await makeZoe();
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();
    const coveredCallInstallationId = zoe.install(coveredCallSrcs);

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Alice creates a coveredCall instance
    const terms = {
      assays,
    };
    const {
      instance: aliceCoveredCall,
      instanceId,
      terms: aliceTerms,
    } = await zoe.makeInstance(coveredCallInstallationId, terms);

    // The assays are defined at this step
    t.deepEquals(aliceTerms.assays, assays);

    // 2: Alice escrows with Zoe
    const aliceConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'wantExactly',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payoff: alicePayoffP,
    } = await zoe.escrow(aliceConditions, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 3: Alice initializes the coveredCall with her escrow receipt

    // Alice gets two kinds of things back - invites (the ability to
    // make an offer) and a seat for herself (the right to claim after
    // an offer has been made). She gets a seat since she made an
    // offer. Bob gets an invite.
    const {
      outcome: aliceOutcome,
      invite: bobInvitePayment,
    } = await aliceCoveredCall.init(aliceEscrowReceipt);

    // Check that the assays and bobInvitePayment are as expected
    t.deepEquals(bobInvitePayment.getBalance().extent.instanceId, instanceId);
    t.deepEquals(bobInvitePayment.getBalance().extent.offerToBeMade, [
      {
        rule: 'wantExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'offerExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
    ]);

    // 3: Imagine that Alice sends the invite to Bob (not done here
    // since this test doesn't actually have separate vats/parties)

    // 4: Bob inspects the invite payment and checks that it is the
    // contract instance that he expects as well as that Alice has
    // already escrowed.

    const bobIntendedConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'offerExactly',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });

    const inviteExtent = bobInvitePayment.getBalance().extent;
    t.equal(inviteExtent.instanceId, instanceId);
    t.equal(inviteExtent.installationId, coveredCallInstallationId);
    t.equal(inviteExtent.status, 'acceptingOffers');
    t.ok(sameStructure(inviteExtent.conditions, aliceConditions));
    t.ok(
      sameStructure(
        inviteExtent.offerToBeMade,
        bobIntendedConditions.offerDesc,
      ),
    );

    // Bob claims all with the Zoe inviteAssay
    const inviteAssay = zoe.getInviteAssay();
    const bobExclInvitePayment = await inviteAssay.claimAll(bobInvitePayment);

    // 5: Only after assaying the invite does he unwrap it (destroying
    // the ERTP invite) and accept it
    const bobInvite = await bobExclInvitePayment.unwrap();
    const bobPayments = [undefined, bobSimoleanPayment];

    // 6: Bob escrows
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payoff: bobPayoffP,
    } = await zoe.escrow(bobIntendedConditions, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob makes an offer with his escrow receipt
    const bobOutcome = await bobInvite.makeOffer(bobEscrowReceipt);

    t.equals(
      bobOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );
    t.equals(
      aliceOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    const aliceResult = await alicePayoffP;
    const bobResult = await bobPayoffP;

    // Alice gets back 0 of the kind she put in
    t.equals(aliceResult[0].getBalance().extent, 0);

    // Alice got what she wanted
    t.deepEquals(
      aliceResult[1].getBalance(),
      aliceConditions.offerDesc[1].assetDesc,
    );

    // 11: Alice deposits her winnings to ensure she can
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // 12: Bob deposits his winnings to ensure he can
    await bobMoolaPurse.depositAll(bobResult[0]);
    await bobSimoleanPurse.depositAll(bobResult[1]);

    // Assert that the correct outcome was achieved.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    // Now, Alice should have 0 moola and 7 simoleans.
    // Bob should have 3 moola and 0 simoleans.
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
    const { mints: defaultMints, assays: defaultAssays } = setup();
    const mints = defaultMints.slice(0, 2);
    const assays = defaultAssays.slice(0, 2);
    const zoe = await makeZoe();
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();
    const coveredCallInstallationId = zoe.install(coveredCallSrcs);

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Alice creates a coveredCall instance

    const terms = {
      assays,
    };
    const {
      instance: aliceCoveredCall,
      instanceId,
      terms: aliceTerms,
    } = await zoe.makeInstance(coveredCallInstallationId, terms);

    // The assays are defined at this step
    t.deepEquals(aliceTerms.assays, assays);

    // 2: Alice escrows with Zoe
    const timer = buildManualTimer(console.log);
    const aliceConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'wantExactly',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'afterDeadline',
        deadline: 1,
        timer,
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payoff: alicePayoffP,
    } = await zoe.escrow(aliceConditions, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 3: Alice initializes the coveredCall with her escrow receipt

    // Alice gets two kinds of things back - invites (the ability to
    // make an offer) and a seat for herself (the right to claim after
    // an offer has been made). She gets a seat since she made an
    // offer. Bob gets an invite.
    const {
      outcome: aliceOutcome,
      invite: bobInvitePayment,
    } = await aliceCoveredCall.init(aliceEscrowReceipt);

    // Check that the assays and bobInvitePayment are as expected
    t.deepEquals(bobInvitePayment.getBalance().extent.instanceId, instanceId);
    t.deepEquals(bobInvitePayment.getBalance().extent.offerToBeMade, [
      {
        rule: 'wantExactly',
        assetDesc: assays[0].makeAssetDesc(3),
      },
      {
        rule: 'offerExactly',
        assetDesc: assays[1].makeAssetDesc(7),
      },
    ]);

    timer.tick();

    // 3: Imagine that Alice sends the invite to Bob (not done here
    // since this test doesn't actually have separate vats/parties)

    // 4: Bob inspects the invite payment and checks that it is the
    // contract instance that he expects as well as that Alice has
    // already escrowed.

    const bobIntendedConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'offerExactly',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });

    const inviteExtent = bobInvitePayment.getBalance().extent;
    t.equal(inviteExtent.instanceId, instanceId);
    t.equal(inviteExtent.installationId, coveredCallInstallationId);
    t.equal(inviteExtent.status, 'acceptingOffers');
    t.ok(sameStructure(inviteExtent.conditions, aliceConditions));
    t.ok(
      sameStructure(
        inviteExtent.offerToBeMade,
        bobIntendedConditions.offerDesc,
      ),
    );

    // Bob claims all with the Zoe inviteAssay
    const inviteAssay = zoe.getInviteAssay();
    const bobExclInvitePayment = await inviteAssay.claimAll(bobInvitePayment);

    // 5: Only after assaying the invite does he unwrap it (destroying
    // the ERTP invite) and accept it
    const bobInvite = await bobExclInvitePayment.unwrap();
    const bobPayments = [undefined, bobSimoleanPayment];

    // 6: Bob escrows
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payoff: bobPayoffP,
    } = await zoe.escrow(bobIntendedConditions, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob makes an offer with his escrow receipt
    t.rejects(
      bobInvite.makeOffer(bobEscrowReceipt),
      /The first offer was withdrawn/,
    );

    t.equals(
      aliceOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    const aliceResult = await alicePayoffP;
    const bobResult = await bobPayoffP;

    // Alice gets back what she put in
    t.deepEquals(aliceResult[0].getBalance(), assays[0].makeAssetDesc(3));

    // Alice doesn't get what she wanted
    t.deepEquals(aliceResult[1].getBalance(), assays[1].makeAssetDesc(0));

    // 11: Alice deposits her winnings to ensure she can
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // 12: Bob deposits his winnings to ensure he can
    await bobMoolaPurse.depositAll(bobResult[0]);
    await bobSimoleanPurse.depositAll(bobResult[1]);

    // Assert that the correct outcome was achieved.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    t.deepEquals(aliceMoolaPurse.getBalance(), assays[0].makeAssetDesc(3));
    t.deepEquals(aliceSimoleanPurse.getBalance(), assays[1].makeAssetDesc(0));
    t.deepEquals(bobMoolaPurse.getBalance(), assays[0].makeAssetDesc(0));
    t.deepEquals(bobSimoleanPurse.getBalance(), assays[1].makeAssetDesc(7));
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
    const { mints, assays } = setup();
    const [moolaMint, simoleanMint, bucksMint] = mints;
    const [moolaAssay, simoleanAssay, bucksAssay] = assays;
    const timer = buildManualTimer(console.log);
    const zoe = await makeZoe();
    const coveredCallInstallationId = zoe.install(coveredCallSrcs);
    const swapInstallationId = zoe.install(publicSwapSrcs);

    // Setup Alice
    // Alice starts with 3 moola
    const aliceMoolaPurse = moolaMint.mint(moolaAssay.makeAssetDesc(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = simoleanMint.mint(
      simoleanAssay.makeAssetDesc(0),
    );

    // Setup Bob
    // Bob starts with nothing
    const bobMoolaPurse = moolaMint.mint(moolaAssay.makeAssetDesc(0));
    const bobSimoleanPurse = simoleanMint.mint(simoleanAssay.makeAssetDesc(0));
    const bobBucksPurse = bucksMint.mint(bucksAssay.makeAssetDesc(0));

    // Setup Dave
    // Dave starts with 1 buck
    const daveMoolaPurse = moolaMint.mint(moolaAssay.makeAssetDesc(0));
    const daveSimoleanPurse = simoleanMint.mint(simoleanAssay.makeAssetDesc(7));
    const daveBucksPurse = bucksMint.mint(bucksAssay.makeAssetDesc(1));
    const daveBucksPayment = daveBucksPurse.withdrawAll();
    const daveSimoleanPayment = daveSimoleanPurse.withdrawAll();

    // 1: Alice creates a coveredCall instance of moola for simoleans
    const terms = harden({
      assays: [moolaAssay, simoleanAssay],
    });
    const { instance: aliceCoveredCall, instanceId } = await zoe.makeInstance(
      coveredCallInstallationId,
      terms,
    );

    // 2: Alice escrows with Zoe. She specifies her offer conditions,
    // which include an offer description as well as the exit
    // conditions. In this case, she choses an exit condition of after
    // the deadline of "100" according to a particular timer. This is
    // meant to be something far in the future, and will not be
    // reached in this test.

    const aliceConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'wantExactly',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'afterDeadline',
        deadline: 100, // we will not reach this
        timer,
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      escrowReceipt: aliceEscrowReceipt,
      payoff: alicePayoffP,
    } = await zoe.escrow(aliceConditions, alicePayments);

    // 3: Alice initializes the coveredCall with her escrow receipt

    // Alice gets two kinds of things back - she gets an 'outcome'
    // which is just a message that the offer was accepted or
    // rejected. She also gets an invite, which is an ERTP payment
    // that can be unwrapped to get an object with a `makeOffer`
    // method. The invite is the only way to make a counter-offer in
    // this particular contract. It is not public.
    const {
      outcome: aliceOutcome,
      invite: bobInvitePayment,
    } = await aliceCoveredCall.init(aliceEscrowReceipt);

    t.equals(
      aliceOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    // 4: Imagine that Alice sends the invite to Bob as well as the
    // instanceId (not done here since this test doesn't actually have
    // separate vats/parties)

    // 5: Bob inspects the invite payment and checks its information against the
    // questions that he has about whether it is worth being a counter
    // party in the covered call: Did the covered call use the
    // expected covered call installation (code)? Does it use the assays
    // that he expects (moola and simoleans)?

    const inviteExtent = bobInvitePayment.getBalance().extent;

    // Is the installation as expected?
    t.equal(inviteExtent.installationId, coveredCallInstallationId);

    // Does the instanceId in the invite match what Alice told him?
    t.equal(inviteExtent.instanceId, instanceId);

    // Are the assays and other terms as expected?
    t.ok(
      sameStructure(
        inviteExtent.terms,
        harden({ assays: [moolaAssay, simoleanAssay] }),
      ),
    );

    // Do bob's expected offer conditions match what the covered call
    // expects from a counter-party?

    const bobExpectationsOfAliceConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'wantExactly',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'afterDeadline',
        deadline: 100, // we will not reach this
        timer,
      },
    });

    t.ok(
      sameStructure(inviteExtent.conditions, bobExpectationsOfAliceConditions),
    );

    // Bob's planned conditions
    const bobConditionsCoveredCall = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'offerExactly',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });

    t.ok(
      sameStructure(
        inviteExtent.offerToBeMade,
        bobConditionsCoveredCall.offerDesc,
      ),
    );

    // What was the governing contract status when the invite was
    // made? (Note: This check may be superfluous, and the
    // status/state machine may be taken out of this contract)
    t.equal(inviteExtent.status, 'acceptingOffers');

    // Satisfied with the description, Bob claims all with the Zoe
    // inviteAssay and can therefore know that it was a valid invite
    const inviteAssay = zoe.getInviteAssay();
    const bobExclInvitePayment = await inviteAssay.claimAll(bobInvitePayment);

    // Let's imagine that Bob wants to create a swap to trade this
    // invite for bucks.
    const {
      instance: bobSwap,
      instanceId: bobSwapInstanceId,
    } = await zoe.makeInstance(swapInstallationId, {
      assays: harden([inviteAssay, bucksAssay]),
    });

    // Bob wants to swap an invite with the same asset desc as his
    // current invite from Alice. He wants 1 buck in return.
    const bobConditionsSwap = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: bobExclInvitePayment.getBalance(),
        },
        {
          rule: 'wantExactly',
          assetDesc: bucksAssay.makeAssetDesc(1),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });

    const bobPayments = [bobExclInvitePayment, undefined];

    // 6: Bob escrows his invite
    const {
      escrowReceipt: bobEscrowReceipt,
      payoff: bobPayoffP,
    } = await zoe.escrow(bobConditionsSwap, bobPayments);

    // 8: Bob makes an offer to the swap with his "higher order" escrow receipt
    const bobOutcome = await bobSwap.makeOffer(bobEscrowReceipt);

    t.equals(
      bobOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    // Bob passes the swap instance id to Dave and tells him about
    // what kind of offer the swap is for (Dave doesn't necessarily
    // trust this, but he can use the information). This swap is a
    // public swap in that only having the instanceId for the swap is
    // enough to get access to the swap.

    const {
      instance: daveSwapInstance,
      installationId: daveSwapInstallId,
      terms: daveSwapTerms,
    } = zoe.getInstance(bobSwapInstanceId);

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

    // Dave escrows his 1 buck with Zoe and forms his offer conditions
    const daveSwapConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: bobConditionsSwap.offerDesc[0].assetDesc,
        },
        {
          rule: 'offerExactly',
          assetDesc: bucksAssay.makeAssetDesc(1),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });

    const daveSwapPayments = [undefined, daveBucksPayment];
    const {
      escrowReceipt: daveSwapEscrowReceipt,
      payoff: daveSwapPayoffP,
    } = await zoe.escrow(daveSwapConditions, daveSwapPayments);

    const daveSwapOutcome = await daveSwapInstance.makeOffer(
      daveSwapEscrowReceipt,
    );
    t.equals(
      daveSwapOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    const [coveredCallInvite, daveBucksPayoff] = await daveSwapPayoffP;

    const coveredCallObj = await coveredCallInvite.unwrap();

    // Dave exercises his option by making an offer to the covered
    // call. First, he escrows with Zoe.

    const daveCoveredCallConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: moolaAssay.makeAssetDesc(3),
        },
        {
          rule: 'offerExactly',
          assetDesc: simoleanAssay.makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const daveCoveredCallPayments = [undefined, daveSimoleanPayment];
    const {
      escrowReceipt: daveCoveredCallEscrowReceipt,
      payoff: daveCoveredCallPayoffP,
    } = await zoe.escrow(daveCoveredCallConditions, daveCoveredCallPayments);

    const daveCoveredCallOutcome = await coveredCallObj.makeOffer(
      daveCoveredCallEscrowReceipt,
    );
    t.equals(
      daveCoveredCallOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    // Dave should get 3 moola, Bob should get 1 buck, and Alice
    // get 7 simoleans
    const daveCoveredCallResult = await daveCoveredCallPayoffP;
    const aliceResult = await alicePayoffP;
    const bobResult = await bobPayoffP;

    t.deepEquals(
      daveCoveredCallResult[0].getBalance(),
      moolaAssay.makeAssetDesc(3),
    );
    t.deepEquals(
      daveCoveredCallResult[1].getBalance(),
      simoleanAssay.makeAssetDesc(0),
    );

    t.deepEquals(aliceResult[0].getBalance(), moolaAssay.makeAssetDesc(0));
    t.deepEquals(aliceResult[1].getBalance(), simoleanAssay.makeAssetDesc(7));

    t.deepEquals(bobResult[0].getBalance(), inviteAssay.makeAssetDesc(null));
    t.deepEquals(bobResult[1].getBalance(), bucksAssay.makeAssetDesc(1));

    // Alice deposits her payoffs
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // Bob deposits his payoffs
    await bobBucksPurse.depositAll(bobResult[1]);

    // Dave deposits his payoffs
    await daveMoolaPurse.depositAll(daveCoveredCallResult[0]);
    await daveSimoleanPurse.depositAll(daveCoveredCallResult[1]);
    await daveBucksPurse.depositAll(daveBucksPayoff);

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
    const { mints, assays } = setup();
    const [moolaMint, simoleanMint, bucksMint] = mints;
    const [moolaAssay, simoleanAssay, bucksAssay] = assays;
    const timer = buildManualTimer(console.log);
    const zoe = await makeZoe();
    const coveredCallInstallationId = zoe.install(coveredCallSrcs);

    // Setup Alice
    // Alice starts with 3 moola
    const aliceMoolaPurse = moolaMint.mint(moolaAssay.makeAssetDesc(3));
    const aliceSimoleanPurse = simoleanMint.mint(
      simoleanAssay.makeAssetDesc(0),
    );
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();

    // Setup Bob
    // Bob starts with nothing
    const bobMoolaPurse = moolaMint.mint(moolaAssay.makeAssetDesc(0));
    const bobSimoleanPurse = simoleanMint.mint(simoleanAssay.makeAssetDesc(0));
    const bobBucksPurse = bucksMint.mint(bucksAssay.makeAssetDesc(0));

    // Setup Dave
    // Dave starts with 1 buck and 7 simoleans
    const daveMoolaPurse = moolaMint.mint(moolaAssay.makeAssetDesc(0));
    const daveSimoleanPurse = simoleanMint.mint(simoleanAssay.makeAssetDesc(7));
    const daveBucksPurse = bucksMint.mint(bucksAssay.makeAssetDesc(1));
    const daveBucksPayment = daveBucksPurse.withdrawAll();
    const daveSimoleanPayment = daveSimoleanPurse.withdrawAll();

    // 1: Alice creates a coveredCall instance of moola for simoleans
    const terms = harden({
      assays: [moolaAssay, simoleanAssay],
    });
    const { instance: aliceCoveredCall, instanceId } = await zoe.makeInstance(
      coveredCallInstallationId,
      terms,
    );

    // 2: Alice escrows with Zoe. She specifies her offer conditions,
    // which include an offer description as well as the exit
    // conditions. In this case, she choses an exit condition of after
    // the deadline of "100" according to a particular timer. This is
    // meant to be something far in the future, and will not be
    // reached in this test.

    const aliceConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'wantExactly',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'afterDeadline',
        deadline: 100, // we will not reach this
        timer,
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const {
      escrowReceipt: aliceEscrowReceipt,
      payoff: alicePayoffP,
    } = await zoe.escrow(aliceConditions, alicePayments);

    // 3: Alice initializes the coveredCall with her escrow receipt

    // Alice gets two kinds of things back - she gets an 'outcome'
    // which is just a message that the offer was accepted or
    // rejected. She also gets an invite, which is an ERTP payment
    // that can be unwrapped to get an object with a `makeOffer`
    // method. The invite is the only way to make a counter-offer in
    // this particular contract. It is not public.
    const {
      outcome: aliceOutcome,
      invite: bobInvitePayment,
    } = await aliceCoveredCall.init(aliceEscrowReceipt);

    t.equals(
      aliceOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    // 4: Imagine that Alice sends the invite to Bob as well as the
    // instanceId (not done here since this test doesn't actually have
    // separate vats/parties)

    // 5: Bob inspects the invite payment and checks its information against the
    // questions that he has about whether it is worth being a counter
    // party in the covered call: Did the covered call use the
    // expected covered call installation (code)? Does it use the assays
    // that he expects (moola and simoleans)?

    const inviteExtent = bobInvitePayment.getBalance().extent;

    // Is the installation as expected?
    t.equal(inviteExtent.installationId, coveredCallInstallationId);

    // Does the instanceId in the invite match what Alice told him?
    t.equal(inviteExtent.instanceId, instanceId);

    // Are the assays and other terms as expected?
    t.ok(
      sameStructure(
        inviteExtent.terms,
        harden({ assays: [moolaAssay, simoleanAssay] }),
      ),
    );

    // Do bob's expected offer conditions match what the covered call
    // expects from a counter-party?

    const bobExpectationsOfAliceConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'wantExactly',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'afterDeadline',
        deadline: 100, // we will not reach this
        timer,
      },
    });

    t.ok(
      sameStructure(inviteExtent.conditions, bobExpectationsOfAliceConditions),
    );

    // Bob's planned conditions
    const bobConditionsCoveredCall = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: assays[0].makeAssetDesc(3),
        },
        {
          rule: 'offerExactly',
          assetDesc: assays[1].makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });

    t.ok(
      sameStructure(
        inviteExtent.offerToBeMade,
        bobConditionsCoveredCall.offerDesc,
      ),
    );

    // What was the governing contract status when the invite was
    // made? (Note: This check may be superfluous, and the
    // status/state machine may be taken out of this contract)
    t.equal(inviteExtent.status, 'acceptingOffers');

    // Satisfied with the description, Bob claims all with the Zoe
    // inviteAssay and can therefore know that it was a valid invite
    const inviteAssay = zoe.getInviteAssay();
    const bobExclInvitePayment = await inviteAssay.claimAll(bobInvitePayment);

    // Let's imagine that Bob wants to create another coveredCall, but
    // this time to trade this invite for bucks.
    const {
      instance: bobSecondCoveredCall,
      instanceId: secondCoveredCallInstanceId,
    } = await zoe.makeInstance(
      coveredCallInstallationId,
      harden({
        assays: [inviteAssay, bucksAssay],
      }),
    );

    // Bob wants to swap an invite with the same asset desc as his
    // current invite from Alice. He wants 1 buck in return.
    const firstCoveredCallInviteAssetDec = bobExclInvitePayment.getBalance();
    const bobConditionsSecondCoveredCall = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: firstCoveredCallInviteAssetDec,
        },
        {
          rule: 'wantExactly',
          assetDesc: bucksAssay.makeAssetDesc(1),
        },
      ],
      exit: {
        kind: 'afterDeadline',
        deadline: 100, // we will not reach this
        timer,
      },
    });

    const bobPayments = [bobExclInvitePayment, undefined];

    // 6: Bob escrows his invite
    const {
      escrowReceipt: bobEscrowReceipt,
      payoff: bobPayoffP,
    } = await zoe.escrow(bobConditionsSecondCoveredCall, bobPayments);

    // 8: Bob makes an offer to the swap with his "higher order" escrow receipt
    const {
      outcome: bobOutcome,
      invite: inviteForDave,
    } = await bobSecondCoveredCall.init(bobEscrowReceipt);

    t.equals(
      bobOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    // Bob passes the invite to the higher order covered call and
    // instanceId to Dave

    // Dave is looking to buy the option to trade his 7 simoleans for
    // 3 moola, and is willing to pay 1 buck for the option. He
    // checks that this invite matches what he wants

    const daveInviteExtent = inviteForDave.getBalance().extent;

    // Is the installation as expected?
    t.equal(daveInviteExtent.installationId, coveredCallInstallationId);

    // Does the instanceId in the invite match what Bob told him?
    t.equal(daveInviteExtent.instanceId, secondCoveredCallInstanceId);

    // Are the assays and other terms as expected?
    t.ok(
      sameStructure(
        daveInviteExtent.terms,
        harden({ assays: [inviteAssay, bucksAssay] }),
      ),
    );

    // Do dave's expected offer conditions match what the covered call
    // expects from a counter-party?

    const daveExpectationsOfBobConditions = harden({
      offerDesc: [
        {
          rule: 'offerExactly',
          assetDesc: firstCoveredCallInviteAssetDec,
        },
        {
          rule: 'wantExactly',
          assetDesc: bucksAssay.makeAssetDesc(1),
        },
      ],
      exit: {
        kind: 'afterDeadline',
        deadline: 100, // we will not reach this
        timer,
      },
    });

    t.ok(
      sameStructure(
        daveInviteExtent.conditions,
        daveExpectationsOfBobConditions,
      ),
    );

    // Dave's planned conditions
    const daveConditionsCoveredCall = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: firstCoveredCallInviteAssetDec,
        },
        {
          rule: 'offerExactly',
          assetDesc: bucksAssay.makeAssetDesc(1),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });

    t.ok(
      sameStructure(
        daveInviteExtent.offerToBeMade,
        daveConditionsCoveredCall.offerDesc,
      ),
    );

    // What was the governing contract status when the invite was
    // made? (Note: This check may be superfluous, and the
    // status/state machine may be taken out of this contract)
    t.equal(daveInviteExtent.status, 'acceptingOffers');

    // Satisfied with the description, Dave claims all with the Zoe
    // inviteAssay and can therefore know that it was a valid invite
    const secondCoveredCallInvite = await inviteAssay.claimAll(inviteForDave);

    // Dave escrows his 1 buck with Zoe and forms his offer conditions

    const daveSecondCoveredCallPayments = [undefined, daveBucksPayment];
    const {
      escrowReceipt: daveCoveredCallEscrowReceipt,
      payoff: daveSecondCoveredCallPayoffP,
    } = await zoe.escrow(
      daveConditionsCoveredCall,
      daveSecondCoveredCallPayments,
    );
    const secondCoveredCallObj = await secondCoveredCallInvite.unwrap();
    const daveSecondCoveredCallOutcome = await secondCoveredCallObj.makeOffer(
      daveCoveredCallEscrowReceipt,
    );
    t.equals(
      daveSecondCoveredCallOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    const [
      firstCoveredCallInvite,
      daveBucksPayoff,
    ] = await daveSecondCoveredCallPayoffP;

    const firstCoveredCallObj = await firstCoveredCallInvite.unwrap();

    // Dave exercises his option by making an offer to the covered
    // call. First, he escrows with Zoe.

    const daveFirstCoveredCallConditions = harden({
      offerDesc: [
        {
          rule: 'wantExactly',
          assetDesc: moolaAssay.makeAssetDesc(3),
        },
        {
          rule: 'offerExactly',
          assetDesc: simoleanAssay.makeAssetDesc(7),
        },
      ],
      exit: {
        kind: 'onDemand',
      },
    });
    const daveFirstCoveredCallPayments = [undefined, daveSimoleanPayment];
    const {
      escrowReceipt: daveFirstCoveredCallEscrowReceipt,
      payoff: daveFirstCoveredCallPayoffP,
    } = await zoe.escrow(
      daveFirstCoveredCallConditions,
      daveFirstCoveredCallPayments,
    );

    const daveFirstCoveredCallOutcome = await firstCoveredCallObj.makeOffer(
      daveFirstCoveredCallEscrowReceipt,
    );
    t.equals(
      daveFirstCoveredCallOutcome,
      'The offer has been accepted. Once the contract has been completed, please check your winnings',
    );

    // Dave should get 3 moola, Bob should get 1 buck, and Alice
    // get 7 simoleans
    const daveFirstCoveredCallResult = await daveFirstCoveredCallPayoffP;
    const aliceResult = await alicePayoffP;
    const bobResult = await bobPayoffP;

    t.deepEquals(
      daveFirstCoveredCallResult[0].getBalance(),
      moolaAssay.makeAssetDesc(3),
    );
    t.deepEquals(
      daveFirstCoveredCallResult[1].getBalance(),
      simoleanAssay.makeAssetDesc(0),
    );

    t.deepEquals(aliceResult[0].getBalance(), moolaAssay.makeAssetDesc(0));
    t.deepEquals(aliceResult[1].getBalance(), simoleanAssay.makeAssetDesc(7));

    t.deepEquals(bobResult[0].getBalance(), inviteAssay.makeAssetDesc(null));
    t.deepEquals(bobResult[1].getBalance(), bucksAssay.makeAssetDesc(1));

    // Alice deposits her payoffs
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // Bob deposits his payoffs
    await bobBucksPurse.depositAll(bobResult[1]);

    // Dave deposits his payoffs
    await daveMoolaPurse.depositAll(daveFirstCoveredCallResult[0]);
    await daveSimoleanPurse.depositAll(daveFirstCoveredCallResult[1]);
    await daveBucksPurse.depositAll(daveBucksPayoff);

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
