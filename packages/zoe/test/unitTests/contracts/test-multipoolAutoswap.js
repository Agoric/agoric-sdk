/* global harden */

import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import makeAmountMath from '@agoric/ertp/src/amountMath';
import produceIssuer from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const multipoolAutoswapRoot = `${__dirname}/../../../src/contracts/multipoolAutoswap`;

test('multipoolAutoSwap with valid offers', async t => {
  t.plan(35);
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe();
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
    const bundle = await bundleSource(multipoolAutoswapRoot);

    const installationHandle = await zoe.install(bundle);
    const { invite: aliceInvite } = await zoe.makeInstance(
      installationHandle,
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
            inviteDesc: 'multipool autoswap add liquidity',
            instanceHandle: aliceInviteAmount.value[0].instanceHandle,
            installationHandle,
            handle: aliceInviteAmount.value[0].handle,
          },
        ]),
      ),
      `invite value is as expected`,
    );

    const { publicAPI, handle: instanceHandle } = zoe.getInstanceRecord(
      aliceInviteAmount.value[0].instanceHandle,
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

    const { issuerKeywordRecord } = zoe.getInstanceRecord(instanceHandle);
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
      want: { Liquidity: moolaLiquidity(50) },
      give: { SecondaryToken: moola(100), CentralToken: centralTokens(50) },
    });
    const alicePayments = {
      SecondaryToken: aliceMoolaPayment,
      CentralToken: aliceCentralTokenPayment,
    };

    const {
      outcome: liquidityOkP,
      payout: aliceAddLiquidityPayoutP,
    } = await zoe.offer(aliceInvite, aliceProposal, alicePayments);

    t.equals(
      await liquidityOkP,
      'Added liquidity.',
      `Alice added moola and central liquidity`,
    );

    const liquidityPayments = await aliceAddLiquidityPayoutP;
    const liquidityPayout = await liquidityPayments.Liquidity;

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

    // Bob creates a swap invite for himself
    const bobSwapInvite1 = await E(publicAPI).makeSwapInvite();

    const {
      value: [bobInviteValue],
    } = await inviteIssuer.getAmountOf(bobSwapInvite1);
    const {
      publicAPI: bobPublicAPI,
      installationHandle: bobInstallationId,
    } = zoe.getInstanceRecord(bobInviteValue.instanceHandle);
    t.equals(
      bobInstallationId,
      installationHandle,
      `installationHandle is as expected`,
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
      want: { Out: centralTokens(7) },
      give: { In: moola(17) },
    });
    const bobMoolaForCentralPayments = harden({ In: bobMoolaPayment });

    // Bob swaps
    const { outcome: offerOkP, payout: bobPayoutP } = await zoe.offer(
      bobSwapInvite1,
      bobMoolaForCentralProposal,
      bobMoolaForCentralPayments,
    );

    t.equal(await offerOkP, 'Swap successfully completed.');

    const bobPayout = await bobPayoutP;

    const bobMoolaPayout1 = await bobPayout.In;
    const bobCentralTokenPayout1 = await bobPayout.Out;

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
    const bobSwapInvite2 = bobPublicAPI.makeSwapInvite();
    const bobCentralForMoolaProposal = harden({
      want: { Out: moola(16) },
      give: { In: centralTokens(7) },
    });
    const centralForMoolaPayments = harden({
      In: await E(bobCentralTokenPurse).withdraw(centralTokens(7)),
    });

    const {
      outcome: centralForMoolaOkP,
      payout: bobCentralForMoolaPayoutP,
    } = await zoe.offer(
      bobSwapInvite2,
      bobCentralForMoolaProposal,
      centralForMoolaPayments,
    );

    t.equal(
      await centralForMoolaOkP,
      'Swap successfully completed.',
      `second swap successful`,
    );

    const bobCentralForMoolaPayout = await bobCentralForMoolaPayoutP;
    const bobMoolaPayout2 = await bobCentralForMoolaPayout.Out;
    const bobCentralPayout2 = await bobCentralForMoolaPayout.In;

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
    const aliceSimCentralLiquidityInvite = publicAPI.makeAddLiquidityInvite();
    const aliceSimCentralProposal = harden({
      want: { Liquidity: simoleanLiquidity(43) },
      give: { SecondaryToken: simoleans(398), CentralToken: centralTokens(43) },
    });
    const aliceCentralTokenPayment2 = await centralR.mint.mintPayment(
      centralTokens(43),
    );
    const aliceSimCentralPayments = {
      SecondaryToken: aliceSimoleanPayment,
      CentralToken: aliceCentralTokenPayment2,
    };

    const {
      outcome: simCentralLiquidityOkP,
      payout: aliceSimCentralPayoutP,
    } = await zoe.offer(
      aliceSimCentralLiquidityInvite,
      aliceSimCentralProposal,
      aliceSimCentralPayments,
    );

    t.equals(
      await simCentralLiquidityOkP,
      'Added liquidity.',
      `Alice added simoleans and central liquidity`,
    );

    const simCentralPayments = await aliceSimCentralPayoutP;
    const simoleanLiquidityPayout = await simCentralPayments.Liquidity;

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

    const bobThirdInvite = await E(bobPublicAPI).makeSwapInvite();
    const bobSimsForMoolaProposal = harden({
      want: { Out: moola(10) },
      give: { In: simoleans(74) },
    });
    const simsForMoolaPayments = harden({
      In: bobSimoleanPayment,
    });

    const { payout: bobSimsForMoolaPayoutP } = await zoe.offer(
      bobThirdInvite,
      bobSimsForMoolaProposal,
      simsForMoolaPayments,
    );

    const bobSimsForMoolaPayout = await bobSimsForMoolaPayoutP;
    const bobSimsPayout3 = await bobSimsForMoolaPayout.In;
    const bobMoolaPayout3 = await bobSimsForMoolaPayout.Out;

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
    const aliceRemoveLiquidityInvite = publicAPI.makeRemoveLiquidityInvite();
    const aliceRemoveLiquidityProposal = harden({
      give: { Liquidity: moolaLiquidity(50) },
      want: { SecondaryToken: moola(91), CentralToken: centralTokens(56) },
    });

    const {
      outcome: removeLiquidityResultP,
      payout: aliceRemoveLiquidityPayoutP,
    } = await zoe.offer(
      aliceRemoveLiquidityInvite,
      aliceRemoveLiquidityProposal,
      harden({ Liquidity: liquidityPayout }),
    );

    t.equals(await removeLiquidityResultP, 'Liquidity successfully removed.');

    const aliceRemoveLiquidityPayout = await aliceRemoveLiquidityPayoutP;
    const aliceMoolaPayout = await aliceRemoveLiquidityPayout.SecondaryToken;
    const aliceCentralTokenPayout = await aliceRemoveLiquidityPayout.CentralToken;
    const aliceMoolaLiquidityPayout = await aliceRemoveLiquidityPayout.Liquidity;

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
