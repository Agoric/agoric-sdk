import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../zoe';
import { setup } from '../setupBasicMints';

const myFirstDappRoot = `${__dirname}/../../../contracts/myFirstDapp`;

test('myFirstDapp with valid offers', async t => {
  try {
    const { assays: defaultAssays, mints } = setup();
    const zoe = await makeZoe({ require });
    const assays = defaultAssays.slice(0, 2);

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(assays[0].makeUnits(1));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(assays[1].makeUnits(1));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(assays[0].makeUnits(1));
    const bobMoolaPayment = bobMoolaPurse.withdrawAll();

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(myFirstDappRoot);
    const installationHandle = zoe.install(source, moduleFormat);
    const { instance: myFirstDapp, instanceHandle } = await zoe.makeInstance(
      installationHandle,
      {
        assays,
      },
    );
    const liquidityAssay = myFirstDapp.getLiquidityAssay();
    const allAssays = [...assays, liquidityAssay];

    // Alice adds liquidity
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          units: allAssays[0].makeUnits(1),
        },
        {
          kind: 'offerExactly',
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
    const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment, undefined];

    const { escrowReceipt: aliceEscrowReceipt } = await zoe.escrow(
      aliceOfferRules,
      alicePayments,
    );

    const liquidityOk = await myFirstDapp.addLiquidity(aliceEscrowReceipt);

    t.equals(liquidityOk, 'Added liquidity');

    t.deepEquals(myFirstDapp.getPoolExtents(), [1, 1, 0]);

    // 4: Imagine that Alice sends bob the myFirstDapp instanceHandle
    const {
      instance: bobSimpleSwap,
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(instanceHandle);
    t.equals(bobInstallationId, installationHandle);

    // 5: Bob looks up the price of 1 moola in simoleans (it's 1)
    const units1Moola = bobTerms.assays[0].makeUnits(1);
    const simoleanUnits = bobSimpleSwap.getPrice([units1Moola, undefined]);
    t.deepEquals(simoleanUnits, bobTerms.assays[1].makeUnits(1));

    const bobMoolaForSimOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerExactly',
          units: allAssays[0].makeUnits(1),
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
    const moolaForSimsPayments = [bobMoolaPayment, undefined];

    const {
      escrowReceipt: bobsMoolaForSimsEscrowReceipt,
      payout: bobMoolaForSimsPayoutP,
    } = await zoe.escrow(bobMoolaForSimOfferRules, moolaForSimsPayments);

    const moolaForSimsOk = await bobSimpleSwap.makeOffer(
      bobsMoolaForSimsEscrowReceipt,
    );
    t.equal(
      moolaForSimsOk,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    const bobsNewSimsPayment = await bobMoolaForSimsPayoutP;

    t.deepEqual(bobsNewSimsPayment[0].getBalance(), assays[0].makeUnits(0));
    t.deepEqual(bobsNewSimsPayment[1].getBalance(), assays[1].makeUnits(1));
    t.deepEqual(bobSimpleSwap.getPoolExtents(), [2, 0, 0]);

    const bobSimForMoolaOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          units: assays[0].makeUnits(1),
        },
        {
          kind: 'offerExactly',
          units: assays[1].makeUnits(1),
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
    const bobSimForMoolaPayments = [
      undefined,
      bobsNewSimsPayment[1],
      undefined,
    ];

    const {
      escrowReceipt: bobEscrowReceipt,
      payout: bobPayoutP,
    } = await zoe.escrow(bobSimForMoolaOfferRules, bobSimForMoolaPayments);

    // 7: Bob swaps
    const offerOk = await bobSimpleSwap.makeOffer(bobEscrowReceipt);
    t.equal(
      offerOk,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    const bobPayout = await bobPayoutP;
    t.deepEqual(bobPayout[0].getBalance(), assays[0].makeUnits(1));
    t.deepEqual(bobPayout[1].getBalance(), assays[1].makeUnits(0));
    t.deepEquals(bobSimpleSwap.getPoolExtents(), [1, 1, 0]);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
