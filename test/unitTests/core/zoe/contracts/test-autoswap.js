import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../../../core/zoe/zoe/zoe';
import { setup } from '../setupBasicMints';

const autoswapRoot = `${__dirname}/../../../../../core/zoe/contracts/autoswap`;

test('autoSwap with valid offers', async t => {
  try {
    const { assays: defaultAssays, mints } = setup();
    const zoe = await makeZoe({ require });
    const assays = defaultAssays.slice(0, 2);
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
    const allAssays = [...aliceTerms.assays, liquidityAssay];
    t.deepEquals([...aliceTerms.assays, liquidityAssay], allAssays);

    // 2: Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          assetDesc: allAssays[0].makeAssetDesc(10),
        },
        {
          kind: 'offerExactly',
          assetDesc: allAssays[1].makeAssetDesc(5),
        },
        {
          kind: 'wantAtLeast',
          assetDesc: allAssays[2].makeAssetDesc(10),
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
      liquidityAssay.makeAssetDesc(10),
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
    const assetDesc2Moola = bobTerms.assays[0].makeAssetDesc(2);
    const simoleanAssetDesc = bobAutoswap.getPrice([
      assetDesc2Moola,
      undefined,
      undefined,
    ]);
    t.deepEquals(simoleanAssetDesc, bobTerms.assays[1].makeAssetDesc(1));

    // 6: Bob escrows

    const bobMoolaForSimOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          assetDesc: allAssays[0].makeAssetDesc(2),
        },
        {
          kind: 'wantAtLeast',
          assetDesc: allAssays[1].makeAssetDesc(1),
        },
        {
          kind: 'wantAtLeast',
          assetDesc: allAssays[2].makeAssetDesc(0),
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

    t.deepEqual(bobPayout[0].getBalance(), allAssays[0].makeAssetDesc(0));
    t.deepEqual(bobPayout[1].getBalance(), allAssays[1].makeAssetDesc(1));
    t.deepEquals(bobAutoswap.getPoolExtents(), [12, 4, 0]);

    // 7: Bob looks up the price of 3 simoleans

    const assetDesc3Sims = allAssays[1].makeAssetDesc(3);
    const moolaAssetDesc = bobAutoswap.getPrice([undefined, assetDesc3Sims]);
    t.deepEquals(moolaAssetDesc, allAssays[0].makeAssetDesc(6));

    // 8: Bob makes another offer and swaps
    const bobSimsForMoolaOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          assetDesc: allAssays[0].makeAssetDesc(6),
        },
        {
          kind: 'offerExactly',
          assetDesc: allAssays[1].makeAssetDesc(3),
        },
        {
          kind: 'wantAtLeast',
          assetDesc: allAssays[2].makeAssetDesc(0),
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

    t.deepEqual(
      bobsNewMoolaPayment[0].getBalance(),
      allAssays[0].makeAssetDesc(6),
    );
    t.deepEqual(
      bobsNewMoolaPayment[1].getBalance(),
      allAssays[1].makeAssetDesc(0),
    );
    t.deepEqual(bobAutoswap.getPoolExtents(), [6, 7, 0]);

    // 8: Alice removes her liquidity
    // She's not picky...
    const aliceRemoveLiquidityPayoutRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          assetDesc: allAssays[0].makeAssetDesc(0),
        },
        {
          kind: 'wantAtLeast',
          assetDesc: allAssays[1].makeAssetDesc(0),
        },
        {
          kind: 'offerExactly',
          assetDesc: allAssays[2].makeAssetDesc(10),
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
      aliceRemoveLiquidityPayoutRules,
      harden([undefined, undefined, liquidityPayments[2]]),
    );

    const removeLiquidityResult = await aliceAutoswap.removeLiquidity(
      aliceRemoveLiquidityEscrowReceipt,
    );
    t.equals(removeLiquidityResult, 'Liquidity successfully removed.');

    const alicePayoutPayments = await aliceRemoveLiquidityPayoutP;

    t.deepEquals(
      alicePayoutPayments[0].getBalance(),
      allAssays[0].makeAssetDesc(6),
    );
    t.deepEquals(
      alicePayoutPayments[1].getBalance(),
      allAssays[1].makeAssetDesc(7),
    );
    t.deepEquals(
      alicePayoutPayments[2].getBalance(),
      allAssays[2].makeAssetDesc(0),
    );
    t.deepEquals(aliceAutoswap.getPoolExtents(), [0, 0, 10]);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
