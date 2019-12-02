import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../zoe';
import { setup } from '../setupBasicMints';

const autoswapRoot = `${__dirname}/../../../contracts/autoswap`;

test('autoSwap with valid offers', async t => {
  try {
    const { assays: defaultAssays, mints } = setup();
    const zoe = await makeZoe({ require });
    const assays = defaultAssays.slice(0, 2);
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(10));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    // Let's assume that simoleans are worth 2x as much as moola
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(5));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(2));
    const bobMoolaPayment = bobMoolaPurse.withdrawAll();
    const bobSimoleanPurse = mints[1].mint(assays[1].makeUnits(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdraw(
      assays[1].makeUnits(3),
    );

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
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          units: allAssays[0].makeUnits(10),
        },
        {
          kind: 'offerExactly',
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
      escrowReceipt: allegedAliceEscrowReceipt,
      payout: aliceAddLiquidityPayoutP,
    } = await zoe.escrow(aliceOfferRules, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    const liquidityOk = await aliceAutoswap.addLiquidity(aliceEscrowReceipt);

    t.equals(liquidityOk, 'Added liquidity.');

    const liquidityPayments = await aliceAddLiquidityPayoutP;

    t.deepEquals(
      liquidityPayments[2].getBalance(),
      liquidityAssay.makeUnits(10),
    );
    t.deepEquals(aliceAutoswap.getPoolExtents(), [10, 5, 0]);

    // 4: Imagine that Alice sends bob the autoswap instanceHandle
    const {
      instance: bobAutoswap,
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(instanceHandle);
    t.equals(bobInstallationId, installationHandle);

    // 5: Bob looks up the price of 2 moola in simoleans
    const units2Moola = bobTerms.assays[0].makeUnits(2);
    const simoleanUnits = bobAutoswap.getPrice([
      units2Moola,
      undefined,
      undefined,
    ]);
    t.deepEquals(simoleanUnits, bobTerms.assays[1].makeUnits(1));

    // 6: Bob escrows

    const bobMoolaForSimOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          units: allAssays[0].makeUnits(2),
        },
        {
          kind: 'wantAtLeast',
          units: allAssays[1].makeUnits(1),
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
    t.deepEqual(bobPayout[1].getBalance(), allAssays[1].makeUnits(1));
    t.deepEquals(bobAutoswap.getPoolExtents(), [12, 4, 0]);

    // 7: Bob looks up the price of 3 simoleans

    const units3Sims = allAssays[1].makeUnits(3);
    const moolaUnits = bobAutoswap.getPrice([undefined, units3Sims]);
    t.deepEquals(moolaUnits, allAssays[0].makeUnits(6));

    // 8: Bob makes another offer and swaps
    const bobSimsForMoolaOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: allAssays[0].makeUnits(6),
        },
        {
          kind: 'offerExactly',
          units: allAssays[1].makeUnits(3),
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
    const simsForMoolaPayments = [undefined, bobSimoleanPayment, undefined];

    const {
      escrowReceipt: bobsSimsForMoolaEscrowReceipt,
      payout: bobSimsForMoolaPayoutP,
    } = await zoe.escrow(bobSimsForMoolaOfferRules, simsForMoolaPayments);

    const simsForMoolaOk = await bobAutoswap.makeOffer(
      bobsSimsForMoolaEscrowReceipt,
    );
    t.equal(simsForMoolaOk, 'Swap successfully completed.');

    const bobsNewMoolaPayment = await bobSimsForMoolaPayoutP;

    t.deepEqual(bobsNewMoolaPayment[0].getBalance(), allAssays[0].makeUnits(6));
    t.deepEqual(bobsNewMoolaPayment[1].getBalance(), allAssays[1].makeUnits(0));
    t.deepEqual(bobAutoswap.getPoolExtents(), [6, 7, 0]);

    // 8: Alice removes her liquidity
    // She's not picky...
    const aliceRemoveLiquidityOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: allAssays[0].makeUnits(0),
        },
        {
          kind: 'wantAtLeast',
          units: allAssays[1].makeUnits(0),
        },
        {
          kind: 'offerExactly',
          units: allAssays[2].makeUnits(10),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });

    const {
      escrowReceipt: aliceRemoveLiquidityEscrowReceipt,
      payout: aliceRemoveLiquidityPayoutP,
    } = await zoe.escrow(
      aliceRemoveLiquidityOfferRules,
      harden([undefined, undefined, liquidityPayments[2]]),
    );

    const removeLiquidityResult = await aliceAutoswap.removeLiquidity(
      aliceRemoveLiquidityEscrowReceipt,
    );
    t.equals(removeLiquidityResult, 'Liquidity successfully removed.');

    const alicePayoutPayments = await aliceRemoveLiquidityPayoutP;

    t.deepEquals(
      alicePayoutPayments[0].getBalance(),
      allAssays[0].makeUnits(6),
    );
    t.deepEquals(
      alicePayoutPayments[1].getBalance(),
      allAssays[1].makeUnits(7),
    );
    t.deepEquals(
      alicePayoutPayments[2].getBalance(),
      allAssays[2].makeUnits(0),
    );
    t.deepEquals(aliceAutoswap.getPoolExtents(), [0, 0, 10]);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('autoSwap - test fee', async t => {
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
          kind: 'offerExactly',
          units: allAssays[0].makeUnits(10000),
        },
        {
          kind: 'offerExactly',
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
    const simoleanUnits = bobAutoswap.getPrice([
      units1000Moola,
      undefined,
      undefined,
    ]);
    t.deepEquals(simoleanUnits, bobTerms.assays[1].makeUnits(907));

    // 6: Bob escrows

    const bobMoolaForSimOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
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
