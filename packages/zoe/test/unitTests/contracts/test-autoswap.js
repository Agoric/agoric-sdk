import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../zoe';
import { setup } from '../setupBasicMints';

const autoswapRoot = `${__dirname}/../../../contracts/autoswap`;

test.only('autoSwap with valid offers', async t => {
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

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(moola(10));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    // Let's assume that simoleans are worth 2x as much as moola
    const aliceSimoleanPurse = mints[1].mint(simoleans(5));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(moola(2));
    const bobMoolaPayment = bobMoolaPurse.withdrawAll();
    const bobSimoleanPurse = mints[1].mint(simoleans(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdraw(simoleans(3));

    // 1: Alice creates an autoswap instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(autoswapRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const terms = {
      assays,
    };
    const aliceInvite = await zoe.makeInstance(installationHandle, terms);
    const { instanceHandle } = aliceInvite.getBalance().extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);
    const liquidityAssay = publicAPI.getLiquidityAssay();
    const allAssays = [...terms.assays, liquidityAssay];

    // Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: allAssays[0].makeUnits(10),
        },
        {
          kind: 'offerAtMost',
          units: allAssays[1].makeUnits(5),
        },
        {
          kind: 'wantAtLeast',
          units: allAssays[2].makeUnits(10),
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

    t.deepEquals(
      liquidityPayments[2].getBalance(),
      liquidityAssay.makeUnits(10),
    );
    t.deepEquals(publicAPI.getPoolExtents(), [10, 5, 0]);

    // Alice creates an invite for autoswap and sends it to Bob
    const bobInvite = publicAPI.makeInvite();

    // Bob claims it
    const inviteAssay = zoe.getInviteAssay();
    const bobExclInvite = inviteAssay.claimAll(bobInvite);
    const bobInviteExtent = bobExclInvite.getBalance().extent;
    const {
      publicAPI: bobAutoswap,
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);
    t.equals(bobInstallationId, installationHandle);

    // Bob looks up the price of 2 moola in simoleans
    const units2Moola = moola(2);
    const simoleanUnits = bobAutoswap.getPrice(units2Moola);
    t.deepEquals(simoleanUnits, simoleans(1));

    // 6: Bob escrows

    const bobMoolaForSimOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: moola(2),
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
    t.deepEquals(bobAutoswap.getPoolExtents(), [12, 4, 0]);

    // Bob looks up the price of 3 simoleans

    const units3Sims = simoleans(3);
    const moolaUnits = bobAutoswap.getPrice(units3Sims);
    t.deepEquals(moolaUnits, moola(6));

    // 8: Bob makes another offer and swaps
    const bobSimsForMoolaOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: moola(6),
        },
        {
          kind: 'offerAtMost',
          units: simoleans(3),
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
    const simsForMoolaPayments = [undefined, bobSimoleanPayment, undefined];

    const {
      seat: bobSeatSimsForMoola,
      payout: bobSimsForMoolaPayoutP,
    } = await zoe.escrow(bobSimsForMoolaOfferRules, simsForMoolaPayments);

    const simsForMoolaOk = bobSeatSimsForMoola.swap();
    t.equal(simsForMoolaOk, 'Swap successfully completed.');

    const bobsNewMoolaPayment = await bobSimsForMoolaPayoutP;

    t.deepEqual(bobsNewMoolaPayment[0].getBalance(), moola(6));
    t.deepEqual(bobsNewMoolaPayment[1].getBalance(), simoleans(0));
    t.deepEqual(bobAutoswap.getPoolExtents(), [6, 7, 0]);

    // 8: Alice removes her liquidity
    // She's not picky...
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
          units: liquidityAssay.makeUnits(10),
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
      aliceRemoveLiquidityInvite,
      aliceRemoveLiquidityOfferRules,
      harden([undefined, undefined, liquidityPayments[2]]),
    );

    const removeLiquidityResult = aliceRemoveLiquiditySeat.removeLiquidity();
    t.equals(removeLiquidityResult, 'Liquidity successfully removed.');

    const alicePayoutPayments = await aliceRemoveLiquidityPayoutP;

    t.deepEquals(alicePayoutPayments[0].getBalance(), moola(6));
    t.deepEquals(alicePayoutPayments[1].getBalance(), simoleans(7));
    t.deepEquals(
      alicePayoutPayments[2].getBalance(),
      liquidityAssay.makeUnits(0),
    );
    t.deepEquals(publicAPI.getPoolExtents(), [0, 0, 10]);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test.skip('autoSwap - test fee', async t => {
  try {
    const { assays: defaultAssays, mints } = setup();
    const zoe = await makeZoe({ require });
    const assays = defaultAssays.slice(0, 2);
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(10000));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(10000));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(1000));
    const bobMoolaPayment = bobMoolaPurse.withdrawAll();

    // 1: Alice creates an autoswap instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(autoswapRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const terms = {
      assays,
    };
    const {
      instance: aliceAutoswap,
      instanceHandle,
      terms: aliceTerms,
    } = await zoe.makeInstance(installationHandle, terms);
    const liquidityAssay = aliceAutoswap.getLiquidityAssay();
    const allAssays = [...terms.assays, liquidityAssay];
    t.deepEquals(aliceTerms.assays, allAssays);

    // 2: Alice adds liquidity
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: allAssays[0].makeUnits(10000),
        },
        {
          kind: 'offerAtMost',
          units: allAssays[1].makeUnits(10000),
        },
        {
          kind: 'wantAtLeast',
          units: allAssays[2].makeUnits(0),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment, undefined];

    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payout: aliceAddLiquidityPayoutP,
    } = await zoe.escrow(aliceOfferRules, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    const liquidityOk = await aliceAutoswap.addLiquidity(aliceEscrowReceipt);

    t.equals(liquidityOk, 'Added liquidity.');

    await aliceAddLiquidityPayoutP;

    t.deepEquals(aliceAutoswap.getPoolExtents(), [10000, 10000, 0]);

    // 4: Imagine that Alice sends bob the autoswap instanceHandle
    const {
      instance: bobAutoswap,
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(instanceHandle);
    t.equals(bobInstallationId, installationHandle);

    // 5: Bob looks up the price of 1000 moola in simoleans
    const units1000Moola = bobTerms.assays[0].makeUnits(1000);
    const simoleanUnits = bobAutoswap.getPrice(units1000Moola);
    t.deepEquals(simoleanUnits, bobTerms.assays[1].makeUnits(907));

    // 6: Bob escrows

    const bobMoolaForSimOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          units: allAssays[0].makeUnits(1000),
        },
        {
          kind: 'wantAtLeast',
          units: allAssays[1].makeUnits(0),
        },
        {
          kind: 'wantAtLeast',
          units: allAssays[2].makeUnits(0),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobMoolaForSimPayments = [bobMoolaPayment, undefined, undefined];

    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payout: bobPayoutP,
    } = await zoe.escrow(bobMoolaForSimOfferRules, bobMoolaForSimPayments);

    // 3: Bob does a claimAll on the escrowReceipt payment
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 7: Bob swaps
    const offerOk = await bobAutoswap.makeOffer(bobEscrowReceipt);
    t.equal(offerOk, 'Swap successfully completed.');

    const bobPayout = await bobPayoutP;

    t.deepEqual(bobPayout[0].getBalance(), allAssays[0].makeUnits(0));
    t.deepEqual(bobPayout[1].getBalance(), allAssays[1].makeUnits(907));
    t.deepEquals(bobAutoswap.getPoolExtents(), [11000, 9093, 0]);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
