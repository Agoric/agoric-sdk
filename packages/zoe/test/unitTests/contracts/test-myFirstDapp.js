import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const myFirstDappRoot = `${__dirname}/../../../src/contracts/myFirstDapp`;

test('myFirstDapp with valid offers', async t => {
  try {
    const {
      mints: defaultMints,
      issuers: defaultIssuers,
      moola,
      simoleans,
    } = setup();
    const mints = defaultMints.slice(0, 2);
    const issuers = defaultIssuers.slice(0, 2);
    const zoe = makeZoe({ require });

    // Setup Alice
    const aliceMoolaPurse = mints[0].mintPayment(moola(1));
    const aliceMoolaPayment = aliceMoolaPurse.withdraw();
    const aliceSimoleanPurse = mints[1].mintPayment(simoleans(1));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdraw();

    // Setup Bob
    const bobMoolaPurse = mints[0].mintPayment(moola(1));
    const bobMoolaPayment = bobMoolaPurse.withdraw();

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(myFirstDappRoot);
    const installationHandle = zoe.install(source, moduleFormat);
    const aliceInvite = await zoe.makeInstance(installationHandle, {
      issuers,
    });
    const { instanceHandle } = aliceInvite.getBalance().extent;
    const { publicAPI } = zoe.getInstance(instanceHandle);
    const liquidityIssuer = publicAPI.getLiquidityIssuer();
    const liquidity = liquidityIssuer.makeAmounts;

    // Alice adds liquidity
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(1),
        },
        {
          kind: 'offerAtMost',
          amount: simoleans(1),
        },
        {
          kind: 'wantAtLeast',
          amount: liquidity(0),
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

    t.deepEquals(publicAPI.getPoolAmounts(), [
      moola(1),
      simoleans(1),
      liquidity(0),
    ]);

    // Imagine that Alice sends Bob the myFirstDapp invite
    const bobInvite = publicAPI.makeInvite();
    const inviteIssuer = zoe.getInviteIssuer();
    const bobExclInvite = await inviteIssuer.claim(bobInvite);
    const bobInviteExtent = bobExclInvite.getBalance().extent;
    const {
      publicAPI: bobAutoswap,
      installationHandle: bobInstallationId,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);
    t.equals(bobInstallationId, installationHandle);

    // Bob looks up the price of 1 moola in simoleans (it's 1)
    const simoleanAmounts = bobAutoswap.getPrice(moola(1));
    t.deepEquals(simoleanAmounts, simoleans(1));

    const bobMoolaForSimOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(1),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(1),
        },
        {
          kind: 'wantAtLeast',
          amount: liquidity(0),
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

    t.deepEqual(bobsNewSimsPayment[0].getBalance(), issuers[0].makeAmounts(0));
    t.deepEqual(bobsNewSimsPayment[1].getBalance(), issuers[1].makeAmounts(1));
    t.deepEqual(bobAutoswap.getPoolAmounts(), [
      moola(2),
      simoleans(0),
      liquidity(0),
    ]);

    const bobSimForMoolaOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: moola(1),
        },
        {
          kind: 'offerAtMost',
          amount: simoleans(1),
        },
        {
          kind: 'wantAtLeast',
          amount: liquidity(0),
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
    t.deepEquals(bobAutoswap.getPoolAmounts(), [
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
