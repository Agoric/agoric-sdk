import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../zoe';
import { setup } from '../setupBasicMints';

const myFirstDappRoot = `${__dirname}/../../../contracts/myFirstDapp`;

test('myFirstDapp with valid offers', async t => {
  try {
    const {
      mints: defaultMints,
      assays: defaultAssays,
      moola,
      simoleans,
    } = setup();
    const mints = defaultMints.slice(0, 2);
    const assays = defaultAssays.slice(0, 2);
    const zoe = makeZoe({ require });

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(moola(1));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(simoleans(1));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(moola(1));
    const bobMoolaPayment = bobMoolaPurse.withdrawAll();

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(myFirstDappRoot);
    const installationHandle = zoe.install(source, moduleFormat);
    const aliceInvite = await zoe.makeInstance(installationHandle, {
      assays,
    });
    const { instanceHandle } = aliceInvite.getBalance().extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);
    const liquidityAssay = publicAPI.getLiquidityAssay();
    const liquidity = liquidityAssay.makeUnits;

    // Alice adds liquidity
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(1),
        },
        {
          kind: 'offerAtMost',
          units: simoleans(1),
        },
        {
          kind: 'wantAtLeast',
          units: liquidity(0),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment, undefined];

    const { seat: aliceSeat } = await zoe.redeem(
      aliceInvite,
      aliceOfferRules,
      alicePayments,
    );

    const liquidityOk = await aliceSeat.addLiquidity();
    t.equals(liquidityOk, 'Added liquidity.');

    t.deepEquals(publicAPI.getPoolUnits(), [
      moola(1),
      simoleans(1),
      liquidity(0),
    ]);

    // Imagine that Alice sends Bob the myFirstDapp invite
    const bobInvite = publicAPI.makeInvite();
    const inviteAssay = zoe.getInviteAssay();
    const bobExclInvite = await inviteAssay.claimAll(bobInvite);
    const bobInviteExtent = bobExclInvite.getBalance().extent;
    const {
      publicAPI: bobAutoswap,
      installationHandle: bobInstallationId,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);
    t.equals(bobInstallationId, installationHandle);

    // Bob looks up the price of 1 moola in simoleans (it's 1)
    const simoleanUnits = bobAutoswap.getPrice(moola(1));
    t.deepEquals(simoleanUnits, simoleans(1));

    const bobMoolaForSimOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(1),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(1),
        },
        {
          kind: 'wantAtLeast',
          units: liquidity(0),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobMoolaForSimPayments = [bobMoolaPayment, undefined, undefined];

    const { seat: bobSeat, payout: bobMoolaForSimsPayoutP } = await zoe.redeem(
      bobExclInvite,
      bobMoolaForSimOfferRules,
      bobMoolaForSimPayments,
    );

    // Bob swaps
    const offerOk = bobSeat.swap();
    t.equal(offerOk, 'Swap successfully completed.');

    const bobsNewSimsPayment = await bobMoolaForSimsPayoutP;

    t.deepEqual(bobsNewSimsPayment[0].getBalance(), assays[0].makeUnits(0));
    t.deepEqual(bobsNewSimsPayment[1].getBalance(), assays[1].makeUnits(1));
    t.deepEqual(bobAutoswap.getPoolUnits(), [
      moola(2),
      simoleans(0),
      liquidity(0),
    ]);

    const bobSimForMoolaOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: moola(1),
        },
        {
          kind: 'offerAtMost',
          units: simoleans(1),
        },
        {
          kind: 'wantAtLeast',
          units: liquidity(0),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobSimForMoolaPayments = [
      undefined,
      bobsNewSimsPayment[1],
      undefined,
    ];

    const bobSecondInvite = publicAPI.makeInvite();

    const {
      seat: bobSeatSimsForMoola,
      payout: bobSimsForMoolaPayoutP,
    } = await zoe.redeem(
      bobSecondInvite,
      bobSimForMoolaOfferRules,
      bobSimForMoolaPayments,
    );

    const simsForMoolaOk = bobSeatSimsForMoola.swap();
    t.equal(simsForMoolaOk, 'Swap successfully completed.');

    const bobPayout = await bobSimsForMoolaPayoutP;

    t.deepEqual(bobPayout[0].getBalance(), moola(1));
    t.deepEqual(bobPayout[1].getBalance(), simoleans(0));
    t.deepEquals(bobAutoswap.getPoolUnits(), [
      moola(1),
      simoleans(1),
      liquidity(0),
    ]);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
