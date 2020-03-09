// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints2';

const autoswapRoot = `${__dirname}/../../../src/contracts/autoswap`;

test.only('autoSwap with valid offers', async t => {
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(10));
    // Let's assume that simoleans are worth 2x as much as moola
    const aliceSimoleanPayment = simoleanR.mint.mintPayment(simoleans(5));

    // Setup Bob
    const bobMoolaPayment = moolaR.mint.mintPayment(moola(3));
    const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(3));

    // Alice creates an autoswap instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(autoswapRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const roles = harden({ TokenA: moolaR.issuer, TokenB: simoleanR.issuer });
    const aliceInvite = await zoe.makeInstance(installationHandle, roles);
    const { instanceHandle } = inviteIssuer.getAmountOf(aliceInvite).extent[0];
    const { publicAPI } = zoe.getInstance(instanceHandle);
    const liquidityIssuer = publicAPI.getLiquidityIssuer();
    const liquidity = liquidityIssuer.getAmountMath().make;

    // Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const aliceOfferRules = harden({
      want: { Liquidity: liquidity(10) },
      offer: { TokenA: moola(10), TokenB: simoleans(5) },
    });
    const alicePayments = {
      TokenA: aliceMoolaPayment,
      TokenB: aliceSimoleanPayment,
    };

    const {
      seat: aliceSeat,
      payout: aliceAddLiquidityPayoutP,
    } = await zoe.redeem(aliceInvite, aliceOfferRules, alicePayments);

    const liquidityOk = await aliceSeat.addLiquidity();
    t.equals(liquidityOk, 'Added liquidity.');

    const liquidityPayments = await aliceAddLiquidityPayoutP;
    const liquidityPayout = await liquidityPayments[2];

    t.deepEquals(liquidityIssuer.getAmountOf(liquidityPayout), liquidity(10));
    t.deepEquals(publicAPI.getPoolAmounts(), [
      moola(10),
      simoleans(5),
      liquidity(0),
    ]);

    // Alice creates an invite for autoswap and sends it to Bob
    const bobInvite = publicAPI.makeInvite();

    // Bob claims it
    const bobExclInvite = await inviteIssuer.claim(bobInvite);
    const bobInviteExtent = inviteIssuer.getAmountOf(bobExclInvite).extent[0];
    const {
      publicAPI: bobAutoswap,
      installationHandle: bobInstallationId,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);
    t.equals(bobInstallationId, installationHandle);

    // Bob looks up the price of 3 moola in simoleans
    const simoleanAmounts = bobAutoswap.getPrice(moola(3));
    t.deepEquals(simoleanAmounts, simoleans(1));

    // Bob escrows

    const bobMoolaForSimOfferRules = harden({
      want: { TokenB: simoleans(1) },
      offer: { TokenA: moola(3) },
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

    const [bobMoolaPayout1, bobSimoleanPayout1] = await Promise.all(bobPayout);

    t.deepEqual(moolaIssuer.getAmountOf(bobMoolaPayout1), moola(0));
    t.deepEqual(simoleanIssuer.getAmountOf(bobSimoleanPayout1), simoleans(1));
    t.deepEquals(bobAutoswap.getPoolAmounts(), [
      moola(13),
      simoleans(4),
      liquidity(0),
    ]);

    // Bob looks up the price of 3 simoleans
    const moolaAmounts = bobAutoswap.getPrice(simoleans(3));
    t.deepEquals(moolaAmounts, moola(5));

    // Bob makes another offer and swaps
    const bobSecondInvite = bobAutoswap.makeInvite();
    const bobSimsForMoolaOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: moola(5),
        },
        {
          kind: 'offerAtMost',
          amount: simoleans(3),
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
    const [bobMoolaPayout2, bobSimoleanPayout2] = await Promise.all(
      bobsNewMoolaPayment,
    );

    t.deepEqual(moolaIssuer.getAmountOf(bobMoolaPayout2), moola(5));
    t.deepEqual(simoleanIssuer.getAmountOf(bobSimoleanPayout2), simoleans(0));
    t.deepEqual(bobAutoswap.getPoolAmounts(), [
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
          kind: 'offerAtMost',
          amount: liquidity(10),
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
      harden([undefined, undefined, liquidityPayout]),
    );

    const removeLiquidityResult = aliceRemoveLiquiditySeat.removeLiquidity();
    t.equals(removeLiquidityResult, 'Liquidity successfully removed.');

    const alicePayoutPayments = await aliceRemoveLiquidityPayoutP;
    const [
      aliceMoolaPayout,
      aliceSimoleanPayout,
      aliceLiquidityPayout,
    ] = await Promise.all(alicePayoutPayments);

    t.deepEquals(moolaIssuer.getAmountOf(aliceMoolaPayout), moola(8));
    t.deepEquals(simoleanIssuer.getAmountOf(aliceSimoleanPayout), simoleans(7));
    t.deepEquals(
      liquidityIssuer.getAmountOf(aliceLiquidityPayout),
      liquidity(0),
    );
    t.deepEquals(publicAPI.getPoolAmounts(), [
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

test('autoSwap - test fee', async t => {
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
    const inviteIssuer = zoe.getInviteIssuer();
    const [moolaIssuer, simoleanIssuer] = issuers;

    // Setup Alice
    const aliceMoolaPayment = mints[0].mintPayment(moola(10000));
    const aliceSimoleanPayment = mints[1].mintPayment(simoleans(10000));

    // Setup Bob
    const bobMoolaPayment = mints[0].mintPayment(moola(1000));

    // Alice creates an autoswap instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(autoswapRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const aliceInvite = await zoe.makeInstance(installationHandle, {
      issuers,
    });
    const { instanceHandle } = inviteIssuer.getAmountOf(aliceInvite).extent[0];
    const { publicAPI } = zoe.getInstance(instanceHandle);
    const liquidityIssuer = publicAPI.getLiquidityIssuer();
    const liquidity = liquidityIssuer.getAmountMath().make;

    // Alice adds liquidity
    const aliceOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(10000),
        },
        {
          kind: 'offerAtMost',
          amount: simoleans(10000),
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

    const {
      seat: aliceSeat,
      payout: aliceAddLiquidityPayoutP,
    } = await zoe.redeem(aliceInvite, aliceOfferRules, alicePayments);

    const liquidityOk = await aliceSeat.addLiquidity();
    t.equals(liquidityOk, 'Added liquidity.');

    const liquidityPayments = await aliceAddLiquidityPayoutP;
    const liquidityPayout = await liquidityPayments[2];

    t.deepEquals(
      liquidityIssuer.getAmountOf(liquidityPayout),
      liquidity(10000),
    );
    t.deepEquals(publicAPI.getPoolAmounts(), [
      moola(10000),
      simoleans(10000),
      liquidity(0),
    ]);

    // Alice creates an invite for autoswap and sends it to Bob
    const bobInvite = publicAPI.makeInvite();

    // Bob claims it
    const bobExclInvite = await inviteIssuer.claim(bobInvite);
    const bobInviteExtent = inviteIssuer.getAmountOf(bobExclInvite).extent[0];
    const {
      publicAPI: bobAutoswap,
      installationHandle: bobInstallationId,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);
    t.equals(bobInstallationId, installationHandle);

    // Bob looks up the price of 1000 moola in simoleans
    const simoleanAmounts = bobAutoswap.getPrice(moola(1000));
    t.deepEquals(simoleanAmounts, simoleans(906));

    // Bob escrows
    const bobMoolaForSimOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(1000),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(0),
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

    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclInvite,
      bobMoolaForSimOfferRules,
      bobMoolaForSimPayments,
    );

    // Bob swaps
    const offerOk = bobSeat.swap();
    t.equal(offerOk, 'Swap successfully completed.');

    const bobPayout = await bobPayoutP;
    const [bobMoolaPayout, bobSimoleanPayout] = await Promise.all(bobPayout);

    t.deepEqual(moolaIssuer.getAmountOf(bobMoolaPayout), moola(0));
    t.deepEqual(simoleanIssuer.getAmountOf(bobSimoleanPayout), simoleans(906));
    t.deepEquals(bobAutoswap.getPoolAmounts(), [
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
