// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'tape-promise/tape';
import { E } from '@agoric/eventual-send';
import { makeLocalAmountMath } from '@agoric/ertp';

import '../../../exported';

import { setup } from '../setupBasicMints';
import { installationPFromSource } from '../installFromSource';
import { assertOfferResult, assertPayoutAmount } from '../../zoeTestHelpers';

const autoswap = `${__dirname}/../../../src/contracts/autoswap`;

test('autoSwap with valid offers', async t => {
  t.plan(19);
  try {
    const {
      moolaIssuer,
      simoleanIssuer,
      moolaMint,
      simoleanMint,
      moola,
      simoleans,
      zoe,
    } = setup();
    const invitationIssuer = zoe.getInvitationIssuer();
    const installation = await installationPFromSource(zoe, autoswap);

    // Setup Alice
    const aliceMoolaPayment = moolaMint.mintPayment(moola(10));
    // Let's assume that simoleans are worth 2x as much as moola
    const aliceSimoleanPayment = simoleanMint.mintPayment(simoleans(5));

    // Setup Bob
    const bobMoolaPayment = moolaMint.mintPayment(moola(3));
    const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(3));

    // Alice creates an autoswap instance
    const issuerKeywordRecord = harden({
      TokenA: moolaIssuer,
      TokenB: simoleanIssuer,
    });
    const { publicFacet } = await zoe.startInstance(
      installation,
      issuerKeywordRecord,
    );
    const liquidityIssuerP = await E(publicFacet).getLiquidityIssuer();
    const liquidityAmountMath = await makeLocalAmountMath(liquidityIssuerP);
    const liquidity = liquidityAmountMath.make;

    // Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const aliceProposal = harden({
      want: { Liquidity: liquidity(10) },
      give: { TokenA: moola(10), TokenB: simoleans(5) },
    });
    const alicePayments = {
      TokenA: aliceMoolaPayment,
      TokenB: aliceSimoleanPayment,
    };
    const aliceInvitation = await publicFacet.makeAddLiquidityInvitation();
    const aliceSeat = await zoe.offer(
      aliceInvitation,
      aliceProposal,
      alicePayments,
    );

    assertOfferResult(t, aliceSeat, 'Added liquidity.');
    const liquidityPayout = await aliceSeat.getPayout('Liquidity');
    assertPayoutAmount(t, liquidityIssuerP, liquidityPayout, liquidity(10));
    t.deepEquals(
      await E(publicFacet).getPoolAllocation(),
      {
        TokenA: moola(10),
        TokenB: simoleans(5),
        Liquidity: liquidity(0),
      },
      `pool allocation`,
    );

    // Alice creates an invitation for autoswap and sends it to Bob
    const bobInvitation = await E(publicFacet).makeSwapInvitation();

    // Bob claims it
    const bobExclInvitation = await invitationIssuer.claim(bobInvitation);
    const bobInstance = await E(zoe).getInstance(bobExclInvitation);
    const bobInstallation = await E(zoe).getInstallation(bobExclInvitation);
    t.equals(bobInstallation, installation, `installation`);
    const bobAutoswap = E(zoe).getPublicFacet(bobInstance);

    // Bob looks up the price of 3 moola in simoleans
    const simoleanAmounts = await E(bobAutoswap).getCurrentPrice(
      moola(3),
      simoleans(0).brand,
    );
    t.deepEquals(simoleanAmounts, simoleans(1), `currentPrice`);

    // Bob escrows
    const bobMoolaForSimProposal = harden({
      want: { Out: simoleans(1) },
      give: { In: moola(3) },
    });
    const bobMoolaForSimPayments = harden({ In: bobMoolaPayment });

    const bobSeat = await zoe.offer(
      bobExclInvitation,
      bobMoolaForSimProposal,
      bobMoolaForSimPayments,
    );

    // Bob swaps
    assertOfferResult(t, bobSeat, 'Swap successfully completed.');

    const {
      In: bobMoolaPayout1,
      Out: bobSimoleanPayout1,
    } = await bobSeat.getPayouts();

    assertPayoutAmount(t, moolaIssuer, bobMoolaPayout1, moola(0));
    assertPayoutAmount(t, simoleanIssuer, bobSimoleanPayout1, simoleans(1));
    t.deepEquals(
      await E(bobAutoswap).getPoolAllocation(),
      {
        TokenA: moola(13),
        TokenB: simoleans(4),
        Liquidity: liquidity(0),
      },
      `pool allocation after first swap`,
    );

    // Bob looks up the price of 3 simoleans
    const moolaAmounts = await E(bobAutoswap).getCurrentPrice(
      simoleans(3),
      moola(0).brand,
    );
    t.deepEquals(moolaAmounts, moola(5), `price 2`);

    // Bob makes another offer and swaps
    const bobSecondInvitation = E(bobAutoswap).makeSwapInvitation();
    const bobSimsForMoolaProposal = harden({
      want: { Out: moola(5) },
      give: { In: simoleans(3) },
    });
    const simsForMoolaPayments = harden({ In: bobSimoleanPayment });

    const bobSecondSeat = await zoe.offer(
      bobSecondInvitation,
      bobSimsForMoolaProposal,
      simsForMoolaPayments,
    );

    assertOfferResult(t, bobSeat, 'Swap successfully completed.');

    const {
      Out: bobMoolaPayout2,
      In: bobSimoleanPayout2,
    } = await bobSecondSeat.getPayouts();
    assertPayoutAmount(t, moolaIssuer, bobMoolaPayout2, moola(5));
    assertPayoutAmount(t, simoleanIssuer, bobSimoleanPayout2, simoleans(0));

    t.deepEqual(
      await E(bobAutoswap).getPoolAllocation(),
      {
        TokenA: moola(8),
        TokenB: simoleans(7),
        Liquidity: liquidity(0),
      },
      `pool allocation after swap`,
    );

    // Alice removes her liquidity
    const aliceSecondInvitation = await E(
      publicFacet,
    ).makeRemoveLiquidityInvitation();
    // She's not picky...
    const aliceRemoveLiquidityProposal = harden({
      give: { Liquidity: liquidity(10) },
      want: { TokenA: moola(0), TokenB: simoleans(0) },
    });

    const aliceRmLiqSeat = await zoe.offer(
      aliceSecondInvitation,
      aliceRemoveLiquidityProposal,
      harden({ Liquidity: liquidityPayout }),
    );

    assertOfferResult(t, aliceRmLiqSeat, 'Liquidity successfully removed.');
    const {
      TokenA: aliceMoolaPayout,
      TokenB: aliceSimoleanPayout,
      Liquidity: aliceLiquidityPayout,
    } = await aliceRmLiqSeat.getPayouts();
    assertPayoutAmount(t, moolaIssuer, aliceMoolaPayout, moola(8));
    assertPayoutAmount(t, simoleanIssuer, aliceSimoleanPayout, simoleans(7));
    assertPayoutAmount(t, liquidityIssuerP, aliceLiquidityPayout, liquidity(0));

    t.deepEquals(await E(publicFacet).getPoolAllocation(), {
      TokenA: moola(0),
      TokenB: simoleans(0),
      Liquidity: liquidity(10),
    });
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});

test('autoSwap - test fee', async t => {
  t.plan(9);
  try {
    const {
      moolaIssuer,
      simoleanIssuer,
      moolaMint,
      simoleanMint,
      moola,
      simoleans,
      zoe,
    } = setup();
    const invitationIssuer = zoe.getInvitationIssuer();
    const installation = await installationPFromSource(zoe, autoswap);

    // Setup Alice
    const aliceMoolaPayment = moolaMint.mintPayment(moola(10000));
    const aliceSimoleanPayment = simoleanMint.mintPayment(simoleans(10000));

    // Setup Bob
    const bobMoolaPayment = moolaMint.mintPayment(moola(1000));

    // Alice creates an autoswap instance
    const issuerKeywordRecord = harden({
      TokenA: moolaIssuer,
      TokenB: simoleanIssuer,
    });
    const { publicFacet } = await zoe.startInstance(
      installation,
      issuerKeywordRecord,
    );
    const liquidityIssuer = await E(publicFacet).getLiquidityIssuer();
    const liquidity = (await makeLocalAmountMath(liquidityIssuer)).make;

    // Alice adds liquidity
    const aliceProposal = harden({
      give: {
        TokenA: moola(10000),
        TokenB: simoleans(10000),
      },
      want: { Liquidity: liquidity(0) },
    });
    const alicePayments = harden({
      TokenA: aliceMoolaPayment,
      TokenB: aliceSimoleanPayment,
    });

    const aliceAddLiquidityInvitation = await publicFacet.makeAddLiquidityInvitation();
    const aliceSeat = await zoe.offer(
      aliceAddLiquidityInvitation,
      aliceProposal,
      alicePayments,
    );

    assertOfferResult(t, aliceSeat, 'Added liquidity.');

    const liquidityPayout = await aliceSeat.getPayout('Liquidity');

    assertPayoutAmount(t, liquidityIssuer, liquidityPayout, liquidity(10000));

    t.deepEquals(
      await E(publicFacet).getPoolAllocation(),
      {
        TokenA: moola(10000),
        TokenB: simoleans(10000),
        Liquidity: liquidity(0),
      },
      `pool allocation`,
    );

    // Alice creates an invitation for autoswap and sends it to Bob
    const bobInvitation = await E(publicFacet).makeSwapInvitation();

    // Bob claims it
    const bobExclInvitation = await invitationIssuer.claim(bobInvitation);
    const bobInstance = await E(zoe).getInstance(bobExclInvitation);
    const bobInstallation = await E(zoe).getInstallation(bobExclInvitation);
    t.equals(bobInstallation, bobInstallation);

    const bobAutoswap = E(zoe).getPublicFacet(bobInstance);
    // Bob looks up the price of 1000 moola in simoleans
    const simoleanAmounts = await E(bobAutoswap).getCurrentPrice(
      moola(1000),
      simoleans(0).brand,
    );
    t.deepEquals(simoleanAmounts, simoleans(906), `simoleans out`);

    // Bob escrows
    const bobMoolaForSimProposal = harden({
      give: { In: moola(1000) },
      want: { Out: simoleans(0) },
    });
    const bobMoolaForSimPayments = harden({ In: bobMoolaPayment });

    // Bob swaps
    const bobSeat = await zoe.offer(
      bobExclInvitation,
      bobMoolaForSimProposal,
      bobMoolaForSimPayments,
    );

    assertOfferResult(t, bobSeat, 'Swap successfully completed.');

    const {
      In: bobMoolaPayout,
      Out: bobSimoleanPayout,
    } = await bobSeat.getPayouts();

    assertPayoutAmount(t, moolaIssuer, bobMoolaPayout, moola(0));
    assertPayoutAmount(t, simoleanIssuer, bobSimoleanPayout, simoleans(906));
    t.deepEquals(
      await E(bobAutoswap).getPoolAllocation(),
      {
        TokenA: moola(11000),
        TokenB: simoleans(9094),
        Liquidity: liquidity(0),
      },
      `pool allocation after first swap`,
    );
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});
