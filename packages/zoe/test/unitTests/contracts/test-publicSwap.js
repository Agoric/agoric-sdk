import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '../../bundle-source';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const atomicSwapRoot = `${__dirname}/../../../src/contracts/atomicSwap`;

test('zoe -atomicSwap', async t => {
  try {
    const { assays: defaultAssays, mints } = setup();
    const assays = defaultAssays.slice(0, 2);
    const zoe = makeZoe({ require });
    // pack the contract
    const { source, moduleFormat } = await bundleSource(atomicSwapRoot);
    // install the contract
    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(0));

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(0));
    const bobSimoleanPurse = mints[1].mint(assays[1].makeUnits(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Alice creates an atomicSwap instance
    const aliceInvite = await zoe.makeInstance(installationHandle, {
      assays,
    });

    // 2: Alice escrows with zoe
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
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];

    // 3: Alice redeems her invite and escrows with Zoe
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceOfferRules,
      alicePayments,
    );

    // 4: Alice makes the first offer in the swap.
    const bobInviteP = aliceSeat.makeFirstOffer();

    // 5: Alice spreads the invite far and wide with instructions
    // on how to use it and Bob decides he wants to be the
    // counter-party.

    const inviteAssay = zoe.getInviteAssay();
    const bobExclusiveInvite = await inviteAssay.claimAll(bobInviteP);
    const bobInviteExtent = bobExclusiveInvite.getBalance().extent;

    const {
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);

    t.equals(bobInstallationId, installationHandle);
    t.deepEquals(bobTerms.assays, assays);
    t.deepEquals(bobInviteExtent.offerMadeRules, aliceOfferRules.payoutRules);

    const bobOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: bobTerms.assays[0].makeUnits(3),
        },
        {
          kind: 'offerAtMost',
          units: bobTerms.assays[1].makeUnits(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // 6: Bob escrows with zoe
    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclusiveInvite,
      bobOfferRules,
      bobPayments,
    );

    // 7: Bob makes an offer with his escrow receipt
    const bobOfferResult = await bobSeat.matchOffer();

    t.equals(
      bobOfferResult,
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

    // Alice deposits her payout to ensure she can
    await aliceMoolaPurse.depositAll(aliceMoolaPayout);
    await aliceSimoleanPurse.depositAll(aliceSimoleanPayout);

    // Bob deposits his original payments to ensure he can
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
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
