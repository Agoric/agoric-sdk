// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';
import makeAmountMath from '@agoric/ertp/src/amountMath';
import produceIssuer from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints2';

const multipoolAutoswapRoot = `${__dirname}/../../../src/contracts/multipoolAutoswap`;

test('multipoolAutoSwap with valid offers', async t => {
  t.plan(37);
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();

    // Set up central token
    const centralR = produceIssuer('central');
    const centralTokens = centralR.amountMath.make;

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(100));
    // Let's assume that central tokens are worth 2x as much as moola
    const aliceCentralTokenPayment = centralR.mint.mintPayment(
      centralTokens(50),
    );
    const aliceSimoleanPayment = simoleanR.mint.mintPayment(simoleans(398));

    // Setup Bob
    const bobMoolaPayment = moolaR.mint.mintPayment(moola(17));
    const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(74));

    // Alice creates an autoswap instance

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(multipoolAutoswapRoot);

    const installationHandle = zoe.install(source, moduleFormat);
    const aliceInvite = await zoe.makeInstance(
      installationHandle,
      harden({ CentralToken: centralR.issuer }),
      harden({ CentralToken: centralR.issuer }),
    );

    const makeAmountMathFromIssuer = issuer =>
      Promise.all([
        E(issuer).getBrand(),
        E(issuer).getMathHelpersName(),
      ]).then(([brand, mathName]) => makeAmountMath(brand, mathName));

    const inviteAmountMath = await makeAmountMathFromIssuer(inviteIssuer);

    const aliceInviteAmount = await inviteIssuer.getAmountOf(aliceInvite);
    t.deepEquals(
      aliceInviteAmount,
      inviteAmountMath.make(
        harden([
          {
            seatDesc: 'autoswapSeat',
            instanceHandle: aliceInviteAmount.extent[0].instanceHandle,
            handle: aliceInviteAmount.extent[0].handle,
          },
        ]),
      ),
      `seat extent is as expected`,
    );

    const { publicAPI, handle: instanceHandle } = zoe.getInstance(
      aliceInviteAmount.extent[0].instanceHandle,
    );

    const addMoolaPoolResult = await E(publicAPI).addPool(
      moolaR.issuer,
      'Moola',
    );
    t.equals(
      addMoolaPoolResult,
      `liquidity pool for Moola added`,
      `adding pool for moola`,
    );
    const moolaLiquidityIssuer = await E(publicAPI).getLiquidityIssuer(
      moolaR.brand,
    );
    const moolaLiquidityAmountMath = await makeAmountMathFromIssuer(
      moolaLiquidityIssuer,
    );
    const moolaLiquidity = moolaLiquidityAmountMath.make;

    const addSimoleansPoolResult = await E(publicAPI).addPool(
      simoleanR.issuer,
      'Simoleans',
    );
    t.equals(
      addSimoleansPoolResult,
      `liquidity pool for Simoleans added`,
      `adding pool for simoleans`,
    );
    const simoleanLiquidityIssuer = await E(publicAPI).getLiquidityIssuer(
      simoleanR.brand,
    );
    const simoleanLiquidityAmountMath = await makeAmountMathFromIssuer(
      simoleanLiquidityIssuer,
    );
    const simoleanLiquidity = simoleanLiquidityAmountMath.make;

    const { issuerKeywordRecord } = zoe.getInstance(instanceHandle);
    t.deepEquals(
      issuerKeywordRecord,
      harden({
        CentralToken: centralR.issuer,
        Moola: moolaR.issuer,
        MoolaLiquidity: moolaLiquidityIssuer,
        Simoleans: simoleanR.issuer,
        SimoleansLiquidity: simoleanLiquidityIssuer,
      }),
      `There are keywords for central token and two additional tokens and liquidity`,
    );
    t.deepEquals(
      await E(publicAPI).getPoolAllocation(moolaR.brand),
      harden({
        Moola: moolaR.amountMath.getEmpty(),
        CentralToken: centralR.amountMath.getEmpty(),
        MoolaLiquidity: moolaLiquidityAmountMath.getEmpty(),
      }),
      `The poolAmounts object should only have keywords for Moola, CentralToken, and MoolaLiquidity. Values should be empty`,
    );
    t.deepEquals(
      await E(publicAPI).getPoolAllocation(simoleanR.brand),
      harden({
        Simoleans: simoleanR.amountMath.getEmpty(),
        CentralToken: centralR.amountMath.getEmpty(),
        SimoleansLiquidity: simoleanLiquidityAmountMath.getEmpty(),
      }),
      `The poolAmounts object should only have keywords for Simoleans, CentralToken, and SimoleansLiquidity. Values should be empty`,
    );

    // Alice adds liquidity
    // 10 moola = 5 central tokens at the time of the liquidity adding
    // aka 2 moola = 1 central token
    const aliceProposal = harden({
      want: { MoolaLiquidity: moolaLiquidity(50) },
      give: { Moola: moola(100), CentralToken: centralTokens(50) },
    });
    const alicePayments = {
      Moola: aliceMoolaPayment,
      CentralToken: aliceCentralTokenPayment,
    };

    const {
      seat: aliceSeat,
      payout: aliceAddLiquidityPayoutP,
    } = await zoe.redeem(aliceInvite, aliceProposal, alicePayments);

    const liquidityOk = await aliceSeat.addLiquidity();
    t.equals(
      liquidityOk,
      'Added liquidity.',
      `Alice added moola and central liquidity`,
    );

    const liquidityPayments = await aliceAddLiquidityPayoutP;
    const liquidityPayout = await liquidityPayments.MoolaLiquidity;

    t.deepEquals(
      await moolaLiquidityIssuer.getAmountOf(liquidityPayout),
      moolaLiquidity(50),
    );
    t.deepEquals(
      await E(publicAPI).getPoolAllocation(moolaR.brand),
      harden({
        Moola: moola(100),
        CentralToken: centralTokens(50),
        MoolaLiquidity: moolaLiquidity(0),
      }),
      `The poolAmounts record should contain the new liquidity`,
    );

    // Alice creates an invite for autoswap and sends it to Bob
    const bobInvite = await E(publicAPI).makeInvite();

    // Bob claims it
    const bobExclInvite = await inviteIssuer.claim(bobInvite);
    const {
      extent: [bobInviteExtent],
    } = await inviteIssuer.getAmountOf(bobExclInvite);
    const {
      publicAPI: bobPublicAPI,
      installationHandle: bobInstallationId,
    } = zoe.getInstance(bobInviteExtent.instanceHandle);
    t.equals(
      bobInstallationId,
      installationHandle,
      `installationHandle is as expected`,
    );

    // Bob can learn the keywords for brands by calling the following
    // two methods on the publicAPI: getBrandKeywordRecord and getKeywordForBrand

    t.deepEquals(
      await E(bobPublicAPI).getBrandKeywordRecord(),
      harden({
        Moola: moolaR.brand,
        Simoleans: simoleanR.brand,
        CentralToken: centralR.brand,
        MoolaLiquidity: await E(moolaLiquidityIssuer).getBrand(),
        SimoleansLiquidity: await E(simoleanLiquidityIssuer).getBrand(),
      }),
      `keywords have expected brands`,
    );

    t.equals(
      await E(bobPublicAPI).getKeywordForBrand(moolaR.brand),
      'Moola',
      `moola keyword is Moola`,
    );

    // Bob looks up the price of 17 moola in central tokens
    const priceInCentralTokens = bobPublicAPI.getCurrentPrice(
      moola(17),
      centralR.brand,
    );
    t.deepEquals(
      priceInCentralTokens,
      centralTokens(7),
      `price in central tokens of 17 moola is as expected`,
    );

    const bobMoolaForCentralProposal = harden({
      want: { CentralToken: centralTokens(7) },
      give: { Moola: moola(17) },
    });
    const bobMoolaForCentralPayments = harden({ Moola: bobMoolaPayment });

    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclInvite,
      bobMoolaForCentralProposal,
      bobMoolaForCentralPayments,
    );

    // Bob swaps
    const offerOk = bobSeat.swap();
    t.equal(offerOk, 'Swap successfully completed.');

    const bobPayout = await bobPayoutP;

    const bobMoolaPayout1 = await bobPayout.Moola;
    const bobCentralTokenPayout1 = await bobPayout.CentralToken;

    t.deepEqual(
      await moolaR.issuer.getAmountOf(bobMoolaPayout1),
      moola(0),
      `bob gets no moola back`,
    );
    t.deepEqual(
      await centralR.issuer.getAmountOf(bobCentralTokenPayout1),
      centralTokens(7),
      `bob gets the same price as when he called the getCurrentPrice method`,
    );
    t.deepEquals(
      bobPublicAPI.getPoolAllocation(moolaR.brand),
      {
        Moola: moola(117),
        CentralToken: centralTokens(43),
        MoolaLiquidity: moolaLiquidity(0),
      },
      `pool allocation added the moola and subtracted the central tokens`,
    );

    const bobCentralTokenPurse = await E(centralR.issuer).makeEmptyPurse();
    await E(bobCentralTokenPurse).deposit(bobCentralTokenPayout1);

    // Bob looks up the price of 7 central tokens in moola
    const moolaAmounts = bobPublicAPI.getCurrentPrice(
      centralTokens(7),
      moolaR.brand,
    );
    t.deepEquals(
      moolaAmounts,
      moola(16),
      `the fee was one moola over the two trades`,
    );

    // Bob makes another offer and swaps
    const bobSecondInvite = bobPublicAPI.makeInvite();
    const bobCentralForMoolaProposal = harden({
      want: { Moola: moola(16) },
      give: { CentralToken: centralTokens(7) },
    });
    const centralForMoolaPayments = harden({
      CentralToken: await E(bobCentralTokenPurse).withdraw(centralTokens(7)),
    });

    const {
      seat: bobSeatCentralForMoola,
      payout: bobCentralForMoolaPayoutP,
    } = await zoe.redeem(
      bobSecondInvite,
      bobCentralForMoolaProposal,
      centralForMoolaPayments,
    );

    const centralForMoolaOk = bobSeatCentralForMoola.swap();
    t.equal(
      centralForMoolaOk,
      'Swap successfully completed.',
      `second swap successful`,
    );

    const bobCentralForMoolaPayout = await bobCentralForMoolaPayoutP;
    const bobMoolaPayout2 = await bobCentralForMoolaPayout.Moola;
    const bobCentralPayout2 = await bobCentralForMoolaPayout.CentralToken;

    t.deepEqual(
      await moolaR.issuer.getAmountOf(bobMoolaPayout2),
      moola(16),
      `bob gets 16 moola back`,
    );
    t.deepEqual(
      await centralR.issuer.getAmountOf(bobCentralPayout2),
      centralTokens(0),
      `bob gets no central tokens back`,
    );
    t.deepEqual(
      bobPublicAPI.getPoolAllocation(moolaR.brand),
      {
        Moola: moola(101),
        CentralToken: centralTokens(50),
        MoolaLiquidity: moolaLiquidity(0),
      },
      `fee added to liquidity pool`,
    );

    // Alice adds simoleans and central tokens to the simolean
    // liquidity pool. 398 simoleans = 43 central tokens at the time of
    // the liquidity adding
    //
    const aliceSimCentralLiquidityInvite = publicAPI.makeInvite();
    const aliceSimCentralProposal = harden({
      want: { SimoleansLiquidity: simoleanLiquidity(43) },
      give: { Simoleans: simoleans(398), CentralToken: centralTokens(43) },
    });
    const aliceCentralTokenPayment2 = await centralR.mint.mintPayment(
      centralTokens(43),
    );
    const aliceSimCentralPayments = {
      Simoleans: aliceSimoleanPayment,
      CentralToken: aliceCentralTokenPayment2,
    };

    const {
      seat: aliceSimCentralSeat,
      payout: aliceSimCentralPayoutP,
    } = await zoe.redeem(
      aliceSimCentralLiquidityInvite,
      aliceSimCentralProposal,
      aliceSimCentralPayments,
    );

    const simCentralLiquidityOk = await aliceSimCentralSeat.addLiquidity();
    t.equals(
      simCentralLiquidityOk,
      'Added liquidity.',
      `Alice added simoleans and central liquidity`,
    );

    const simCentralPayments = await aliceSimCentralPayoutP;
    const simoleanLiquidityPayout = await simCentralPayments.SimoleansLiquidity;

    t.deepEquals(
      await simoleanLiquidityIssuer.getAmountOf(simoleanLiquidityPayout),
      simoleanLiquidity(43),
      `simoleanLiquidity minted was equal to the amount of central tokens added to pool`,
    );
    t.deepEquals(
      await E(publicAPI).getPoolAllocation(simoleanR.brand),
      harden({
        Simoleans: simoleans(398),
        CentralToken: centralTokens(43),
        SimoleansLiquidity: simoleanLiquidity(0),
      }),
      `The poolAmounts record should contain the new liquidity`,
    );

    // Bob tries to swap simoleans for moola. This will go through the
    // central token, meaning that two swaps will happen synchronously
    // under the hood.

    // Bob checks the price. Let's say he gives 74 simoleans, and he
    // wants to know how many moola he would get back.

    const priceInMoola = await E(bobPublicAPI).getCurrentPrice(
      simoleans(74),
      moolaR.brand,
    );
    t.deepEquals(
      priceInMoola,
      moola(10),
      `price is as expected for secondary token to secondary token`,
    );

    // This is the same as making two synchronous exchanges
    const priceInCentral = await E(bobPublicAPI).getCurrentPrice(
      simoleans(74),
      centralR.brand,
    );
    t.deepEquals(
      priceInCentral,
      centralTokens(6),
      `price is as expected for secondary token to central`,
    );

    const centralPriceInMoola = await E(bobPublicAPI).getCurrentPrice(
      centralTokens(6),
      moolaR.brand,
    );
    t.deepEquals(
      centralPriceInMoola,
      moola(10),
      `price is as expected for secondary token to secondary token`,
    );

    const bobThirdInvite = await E(bobPublicAPI).makeInvite();
    const bobSimsForMoolaProposal = harden({
      want: { Moola: moola(10) },
      give: { Simoleans: simoleans(74) },
    });
    const simsForMoolaPayments = harden({
      Simoleans: bobSimoleanPayment,
    });

    const {
      seat: bobSeatSimsForMoola,
      payout: bobSimsForMoolaPayoutP,
    } = await zoe.redeem(
      bobThirdInvite,
      bobSimsForMoolaProposal,
      simsForMoolaPayments,
    );

    bobSeatSimsForMoola.swap();

    const bobSimsForMoolaPayout = await bobSimsForMoolaPayoutP;
    const bobSimsPayout3 = await bobSimsForMoolaPayout.Simoleans;
    const bobMoolaPayout3 = await bobSimsForMoolaPayout.Moola;

    t.deepEqual(
      await moolaR.issuer.getAmountOf(bobMoolaPayout3),
      moola(10),
      `bob gets 10 moola`,
    );
    t.deepEqual(
      await simoleanR.issuer.getAmountOf(bobSimsPayout3),
      simoleans(0),
      `bob gets no simoleans back`,
    );

    t.deepEqual(
      bobPublicAPI.getPoolAllocation(simoleanR.brand),
      harden({
        // 398 + 74
        Simoleans: simoleans(472),
        // 43 - 6
        CentralToken: centralTokens(37),
        SimoleansLiquidity: simoleanLiquidity(0),
      }),
      `the simolean liquidity pool gains simoleans and loses central tokens`,
    );
    t.deepEqual(
      bobPublicAPI.getPoolAllocation(moolaR.brand),
      harden({
        // 101 - 10
        Moola: moola(91),
        // 50 + 6
        CentralToken: centralTokens(56),
        MoolaLiquidity: moolaLiquidity(0),
      }),
      `the moola liquidity pool loses moola and gains central tokens`,
    );

    // Alice removes her liquidity
    // She's not picky...
    const aliceSecondInvite = publicAPI.makeInvite();
    const aliceRemoveLiquidityProposal = harden({
      give: { MoolaLiquidity: moolaLiquidity(50) },
      want: { Moola: moola(91), CentralToken: centralTokens(56) },
    });

    const {
      seat: aliceRemoveLiquiditySeat,
      payout: aliceRemoveLiquidityPayoutP,
    } = await zoe.redeem(
      aliceSecondInvite,
      aliceRemoveLiquidityProposal,
      harden({ MoolaLiquidity: liquidityPayout }),
    );

    const removeLiquidityResult = aliceRemoveLiquiditySeat.removeLiquidity();
    t.equals(removeLiquidityResult, 'Liquidity successfully removed.');

    const aliceRemoveLiquidityPayout = await aliceRemoveLiquidityPayoutP;
    const aliceMoolaPayout = await aliceRemoveLiquidityPayout.Moola;
    const aliceCentralTokenPayout = await aliceRemoveLiquidityPayout.CentralToken;
    const aliceMoolaLiquidityPayout = await aliceRemoveLiquidityPayout.MoolaLiquidity;

    t.deepEquals(
      await moolaR.issuer.getAmountOf(aliceMoolaPayout),
      moola(91),
      `alice gets all the moola in the pool`,
    );
    t.deepEquals(
      await centralR.issuer.getAmountOf(aliceCentralTokenPayout),
      centralTokens(56),
      `alice gets all the central tokens in the pool`,
    );
    t.deepEquals(
      await moolaLiquidityIssuer.getAmountOf(aliceMoolaLiquidityPayout),
      moolaLiquidity(0),
      `alice gets no liquidity tokens`,
    );
    t.deepEqual(
      bobPublicAPI.getPoolAllocation(moolaR.brand),
      harden({
        Moola: moola(0),
        CentralToken: centralTokens(0),
        MoolaLiquidity: moolaLiquidity(50),
      }),
      `liquidity is empty`,
    );
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});
