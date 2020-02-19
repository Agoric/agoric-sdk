import { test } from 'tap';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const autoswapRoot = `${__dirname}/../../../src/contracts/autoswap`;

test('autoSwap with valid offers', async t => {
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
    const aliceMoolaPurse = mints[0].mint(moola(10));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    // Let's assume that simoleans are worth 2x as much as moola
    const aliceSimoleanPurse = mints[1].mint(simoleans(5));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(moola(3));
    const bobMoolaPayment = bobMoolaPurse.withdrawAll();
    const bobSimoleanPurse = mints[1].mint(simoleans(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdraw(simoleans(3));

    // Alice creates an autoswap instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(autoswapRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const aliceInvite = await zoe.makeInstance(installationHandle, {
      assays,
    });
    const { instanceHandle } = aliceInvite.getBalance().extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);
    const liquidityAssay = publicAPI.getLiquidityAssay();
    const liquidity = liquidityAssay.makeUnits;

    // Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(10),
        },
        {
          kind: 'offerAtMost',
          units: simoleans(5),
        },
        {
          kind: 'wantAtLeast',
          units: liquidity(10),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment, undefined];

    const {
      seat: aliceSeat,
      payout: aliceAddLiquidityPayoutP,
    } = await zoe.redeem(aliceInvite, aliceOfferRules, alicePayments);

    const liquidityOk = await aliceSeat.addLiquidity();
    t.equals(liquidityOk, 'Added liquidity.');

    const liquidityPayments = await aliceAddLiquidityPayoutP;

    t.deepEquals(liquidityPayments[2].getBalance(), liquidity(10));
    t.deepEquals(publicAPI.getPoolUnits(), [
      moola(10),
      simoleans(5),
      liquidity(0),
    ]);

    // Alice creates an invite for autoswap and sends it to Bob
    const bobInvite = publicAPI.makeInvite();

    // Bob claims it
    const inviteAssay = zoe.getInviteAssay();
    const bobExclInvite = await inviteAssay.claimAll(bobInvite);
    const bobInviteExtent = bobExclInvite.getBalance().extent;
    const {
      publicAPI: bobAutoswap,
      installationHandle: bobInstallationId,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);
    t.equals(bobInstallationId, installationHandle);

    // Bob looks up the price of 3 moola in simoleans
    const simoleanUnits = bobAutoswap.getPrice(moola(3));
    t.deepEquals(simoleanUnits, simoleans(1));

    // Bob escrows

    const bobMoolaForSimOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(3),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(1),
        },
        {
          kind: 'wantAtLeast',
          units: liquidityAssay.makeUnits(0),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobMoolaForSimPayments = [bobMoolaPayment, undefined, undefined];

    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclInvite,
      bobMoolaForSimOfferRules,
      bobMoolaForSimPayments,
    );

    // Bob swaps
    const offerOk = bobSeat.swap();
    t.equal(offerOk, 'Swap successfully completed.');

    const bobPayout = await bobPayoutP;

    t.deepEqual(bobPayout[0].getBalance(), moola(0));
    t.deepEqual(bobPayout[1].getBalance(), simoleans(1));
    t.deepEquals(bobAutoswap.getPoolUnits(), [
      moola(13),
      simoleans(4),
      liquidity(0),
    ]);

    // Bob looks up the price of 3 simoleans
    const moolaUnits = bobAutoswap.getPrice(simoleans(3));
    t.deepEquals(moolaUnits, moola(5));

    // Bob makes another offer and swaps
    const bobSecondInvite = bobAutoswap.makeInvite();
    const bobSimsForMoolaOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: moola(5),
        },
        {
          kind: 'offerAtMost',
          units: simoleans(3),
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
    const simsForMoolaPayments = [undefined, bobSimoleanPayment, undefined];

    const {
      seat: bobSeatSimsForMoola,
      payout: bobSimsForMoolaPayoutP,
    } = await zoe.redeem(
      bobSecondInvite,
      bobSimsForMoolaOfferRules,
      simsForMoolaPayments,
    );

    const simsForMoolaOk = bobSeatSimsForMoola.swap();
    t.equal(simsForMoolaOk, 'Swap successfully completed.');

    const bobsNewMoolaPayment = await bobSimsForMoolaPayoutP;

    t.deepEqual(bobsNewMoolaPayment[0].getBalance(), moola(5));
    t.deepEqual(bobsNewMoolaPayment[1].getBalance(), simoleans(0));
    t.deepEqual(bobAutoswap.getPoolUnits(), [
      moola(8),
      simoleans(7),
      liquidity(0),
    ]);

    // Alice removes her liquidity
    // She's not picky...
    const aliceSecondInvite = publicAPI.makeInvite();
    const aliceRemoveLiquidityOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: moola(0),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(0),
        },
        {
          kind: 'offerAtMost',
          units: liquidity(10),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    const {
      seat: aliceRemoveLiquiditySeat,
      payout: aliceRemoveLiquidityPayoutP,
    } = await zoe.redeem(
      aliceSecondInvite,
      aliceRemoveLiquidityOfferRules,
      harden([undefined, undefined, liquidityPayments[2]]),
    );

    const removeLiquidityResult = aliceRemoveLiquiditySeat.removeLiquidity();
    t.equals(removeLiquidityResult, 'Liquidity successfully removed.');

    const alicePayoutPayments = await aliceRemoveLiquidityPayoutP;

    t.deepEquals(alicePayoutPayments[0].getBalance(), moola(8));
    t.deepEquals(alicePayoutPayments[1].getBalance(), simoleans(7));
    t.deepEquals(alicePayoutPayments[2].getBalance(), liquidity(0));
    t.deepEquals(publicAPI.getPoolUnits(), [
      moola(0),
      simoleans(0),
      liquidity(10),
    ]);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('autoSwap - test fee', {skip:true},async t => {
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
    const aliceMoolaPurse = mints[0].mint(moola(10000));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(simoleans(10000));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(moola(1000));
    const bobMoolaPayment = bobMoolaPurse.withdrawAll();

    // Alice creates an autoswap instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(autoswapRoot);

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
          units: moola(10000),
        },
        {
          kind: 'offerAtMost',
          units: simoleans(10000),
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

    const {
      seat: aliceSeat,
      payout: aliceAddLiquidityPayoutP,
    } = await zoe.redeem(aliceInvite, aliceOfferRules, alicePayments);

    const liquidityOk = await aliceSeat.addLiquidity();
    t.equals(liquidityOk, 'Added liquidity.');

    const liquidityPayments = await aliceAddLiquidityPayoutP;

    t.deepEquals(liquidityPayments[2].getBalance(), liquidity(10000));
    t.deepEquals(publicAPI.getPoolUnits(), [
      moola(10000),
      simoleans(10000),
      liquidity(0),
    ]);

    // Alice creates an invite for autoswap and sends it to Bob
    const bobInvite = publicAPI.makeInvite();

    // Bob claims it
    const inviteAssay = zoe.getInviteAssay();
    const bobExclInvite = await inviteAssay.claimAll(bobInvite);
    const bobInviteExtent = bobExclInvite.getBalance().extent;
    const {
      publicAPI: bobAutoswap,
      installationHandle: bobInstallationId,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);
    t.equals(bobInstallationId, installationHandle);

    // Bob looks up the price of 1000 moola in simoleans
    const simoleanUnits = bobAutoswap.getPrice(moola(1000));
    t.deepEquals(simoleanUnits, simoleans(906));

    // Bob escrows
    const bobMoolaForSimOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(1000),
        },
        {
          kind: 'wantAtLeast',
          units: simoleans(0),
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

    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclInvite,
      bobMoolaForSimOfferRules,
      bobMoolaForSimPayments,
    );

    // Bob swaps
    const offerOk = bobSeat.swap();
    t.equal(offerOk, 'Swap successfully completed.');

    const bobPayout = await bobPayoutP;

    t.deepEqual(bobPayout[0].getBalance(), moola(0));
    t.deepEqual(bobPayout[1].getBalance(), simoleans(906));
    t.deepEquals(bobAutoswap.getPoolUnits(), [
      moola(11000),
      simoleans(9094),
      liquidity(0),
    ]);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
