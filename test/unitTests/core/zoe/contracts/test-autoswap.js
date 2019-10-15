import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeZoe } from '../../../../../core/zoe/zoe/zoe';
import { makeAutoSwapMaker } from '../../../../../core/zoe/contracts/autoswap/autoswap';
import { setup } from '../setupBasicMints';

test.skip('autoSwap with valid offers', async t => {
  try {
    const { assays: defaultAssays, mints } = setup();
    const assays = defaultAssays.slice(0, 2);
    const zoe = await makeZoe();
    const escrowReceiptAssay = zoe.getEscrowReceiptAssay();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(10));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    // Let's assume that simoleans are worth 2x as much as moola
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(5));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeAssetDesc(2));
    const bobMoolaPayment = bobMoolaPurse.withdrawAll();
    const bobSimoleanPurse = mints[1].mint(assays[1].makeAssetDesc(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdraw(
      assays[1].makeAssetDesc(3),
    );

    // 1: Alice creates an autoswap instance

    const { liquidityAssay, makeAutoSwap } = makeAutoSwapMaker();
    const allAssays = [...assays, liquidityAssay];

    const { zoeInstance, governingContract: autoswap } = zoe.makeInstance(
      makeAutoSwap,
      allAssays,
    );

    // The assays are defined at this step
    t.deepEquals(zoeInstance.getAssays(), allAssays);

    const actualLiquidityAssay = autoswap.getLiquidityAssay();
    t.deepEquals(actualLiquidityAssay, liquidityAssay);

    // 2: Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const aliceOffer = harden([
      {
        rule: 'offerExactly',
        assetDesc: allAssays[0].makeAssetDesc(10),
      },
      {
        rule: 'offerExactly',
        assetDesc: allAssays[1].makeAssetDesc(5),
      },
      {
        rule: 'wantAtLeast',
        assetDesc: allAssays[2].makeAssetDesc(10),
      },
    ]);
    const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment, undefined];

    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      payoff: aliceAddLiquidityPayoffP,
    } = await zoeInstance.escrow(aliceOffer, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment
    const aliceEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedAliceEscrowReceipt,
    );

    const liquidityOk = await autoswap.addLiquidity(aliceEscrowReceipt);

    t.equals(liquidityOk, 'Added liquidity.');

    const liquidityPayments = await aliceAddLiquidityPayoffP;

    t.deepEquals(
      liquidityPayments[2].getBalance(),
      liquidityAssay.makeAssetDesc(10),
    );
    t.deepEquals(autoswap.getPoolExtents(), [10, 5, 0]);

    // 4: Imagine that Alice gives bob access to autoswap

    // 5: Bob looks up the price of 2 moola in simoleans
    const assetDesc2Moola = assays[0].makeAssetDesc(2);
    const simoleanAssetDesc = autoswap.getPrice([
      assetDesc2Moola,
      undefined,
      undefined,
    ]);
    t.deepEquals(simoleanAssetDesc, assays[1].makeAssetDesc(1));

    // 6: Bob escrows

    const bobMoolaForSimOfferDesc = harden([
      {
        rule: 'offerExactly',
        assetDesc: allAssays[0].makeAssetDesc(2),
      },
      {
        rule: 'wantAtLeast',
        assetDesc: allAssays[1].makeAssetDesc(1),
      },
      {
        rule: 'wantAtLeast',
        assetDesc: allAssays[2].makeAssetDesc(0),
      },
    ]);
    const bobMoolaForSimPayments = [bobMoolaPayment, undefined, undefined];

    const {
      escrowReceipt: allegedBobEscrowReceipt,
      payoff: bobPayoffP,
    } = await zoeInstance.escrow(
      bobMoolaForSimOfferDesc,
      bobMoolaForSimPayments,
    );

    // 3: Bob does a claimAll on the escrowReceipt payment
    const bobEscrowReceipt = await escrowReceiptAssay.claimAll(
      allegedBobEscrowReceipt,
    );

    // 7: Bob swaps
    const offerOk = await autoswap.makeOffer(bobEscrowReceipt);
    t.equal(offerOk, 'Swap successfully completed.');

    const bobPayoff = await bobPayoffP;

    t.deepEqual(bobPayoff[0].getBalance(), assays[0].makeAssetDesc(0));
    t.deepEqual(bobPayoff[1].getBalance(), assays[1].makeAssetDesc(1));
    t.deepEquals(autoswap.getPoolExtents(), [12, 4, 0]);

    // 7: Bob looks up the price of 3 simoleans

    const assetDesc3Sims = assays[1].makeAssetDesc(3);
    const moolaAssetDesc = autoswap.getPrice([undefined, assetDesc3Sims]);
    t.deepEquals(moolaAssetDesc, assays[0].makeAssetDesc(6));

    // 8: Bob makes another offer and swaps
    const bobSimsForMoolaOfferDesc = harden([
      {
        rule: 'wantAtLeast',
        assetDesc: assays[0].makeAssetDesc(6),
      },
      {
        rule: 'offerExactly',
        assetDesc: assays[1].makeAssetDesc(3),
      },
      {
        rule: 'wantAtLeast',
        assetDesc: allAssays[2].makeAssetDesc(0),
      },
    ]);
    const simsForMoolaPayments = [undefined, bobSimoleanPayment, undefined];

    const {
      escrowReceipt: bobsSimsForMoolaEscrowReceipt,
      payoff: bobSimsForMoolaPayoffP,
    } = await zoeInstance.escrow(
      bobSimsForMoolaOfferDesc,
      simsForMoolaPayments,
    );

    const simsForMoolaOk = await autoswap.makeOffer(
      bobsSimsForMoolaEscrowReceipt,
    );
    t.equal(simsForMoolaOk, 'Swap successfully completed.');

    const bobsNewMoolaPayment = await bobSimsForMoolaPayoffP;

    t.deepEqual(
      bobsNewMoolaPayment[0].getBalance(),
      assays[0].makeAssetDesc(6),
    );
    t.deepEqual(
      bobsNewMoolaPayment[1].getBalance(),
      assays[1].makeAssetDesc(0),
    );
    t.deepEqual(autoswap.getPoolExtents(), [6, 7, 0]);

    // 8: Alice removes her liquidity
    // She's not picky...
    const aliceRemoveLiquidityOfferDesc = harden([
      {
        rule: 'wantAtLeast',
        assetDesc: allAssays[0].makeAssetDesc(0),
      },
      {
        rule: 'wantAtLeast',
        assetDesc: allAssays[1].makeAssetDesc(0),
      },
      {
        rule: 'offerExactly',
        assetDesc: allAssays[2].makeAssetDesc(10),
      },
    ]);

    const {
      escrowReceipt: aliceRemoveLiquidityEscrowReceipt,
      payoff: aliceRemoveLiquidityPayoffP,
    } = await zoeInstance.escrow(
      aliceRemoveLiquidityOfferDesc,
      liquidityPayments,
    );

    const removeLiquidityResult = await autoswap.removeLiquidity(
      aliceRemoveLiquidityEscrowReceipt,
    );
    t.equals(removeLiquidityResult, 'Liquidity successfully removed.');

    const alicePayoffPayments = await aliceRemoveLiquidityPayoffP;

    t.deepEquals(
      alicePayoffPayments[0].getBalance(),
      allAssays[0].makeAssetDesc(6),
    );
    t.deepEquals(
      alicePayoffPayments[1].getBalance(),
      allAssays[1].makeAssetDesc(7),
    );
    t.deepEquals(
      alicePayoffPayments[2].getBalance(),
      allAssays[2].makeAssetDesc(0),
    );
    t.deepEquals(autoswap.getPoolExtents(), [0, 0, 0]);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
