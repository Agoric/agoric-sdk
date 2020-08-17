import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import { makeIssuerKit, makeLocalAmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import fakeVatAdmin from './fakeVatAdmin';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';
import { setup } from '../setupBasicMints';

const multipoolAutoswapRoot = `${__dirname}/../../../src/contracts/multipoolAutoswap/multipoolAutoswap`;

test('multipoolAutoSwap with valid offers', async t => {
  t.plan(33);
  try {
    const { moolaR, simoleanR, moola, simoleans } = setup();
    const zoe = makeZoe(fakeVatAdmin);
    const invitationIssuer = zoe.getInvitationIssuer();

    // Set up central token
    const centralR = makeIssuerKit('central');
    const centralTokens = centralR.amountMath.make;

    // Setup Alice
    const aliceMoolaPayment = moolaR.mint.mintPayment(moola(100));
    // Let's assume that central tokens are worth 2x as much as moola
    const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(50));
    const aliceSimoleanPayment = simoleanR.mint.mintPayment(simoleans(398));

    // Setup Bob
    const bobMoolaPayment = moolaR.mint.mintPayment(moola(17));
    const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(74));

    // Alice creates an autoswap instance

    // Pack the contract.
    const bundle = await bundleSource(multipoolAutoswapRoot);

    const installation = await zoe.install(bundle);
    const { instance, publicFacet } = await zoe.startInstance(
      installation,
      harden({ Central: centralR.issuer }),
    );
    const aliceAddLiquidityInvitation = E(
      publicFacet,
    ).makeAddLiquidityInvitation();

    const invitationAmountMath = await makeLocalAmountMath(invitationIssuer);
    const aliceInvitationAmount = await invitationIssuer.getAmountOf(
      aliceAddLiquidityInvitation,
    );
    t.deepEquals(
      aliceInvitationAmount,
      invitationAmountMath.make(
        harden([
          {
            description: 'multipool autoswap add liquidity',
            instance,
            installation,
            handle: aliceInvitationAmount.value[0].handle,
          },
        ]),
      ),
      `invitation value is as expected`,
    );

    const moolaLiquidityIssuer = await E(publicFacet).addPool(
      moolaR.issuer,
      'Moola',
    );
    const moolaLiquidityAmountMath = await makeLocalAmountMath(
      moolaLiquidityIssuer,
    );
    const moolaLiquidity = moolaLiquidityAmountMath.make;

    const simoleanLiquidityIssuer = await E(publicFacet).addPool(
      simoleanR.issuer,
      'Simoleans',
    );
    const simoleanLiquidityAmountMath = await makeLocalAmountMath(
      simoleanLiquidityIssuer,
    );
    const simoleanLiquidity = simoleanLiquidityAmountMath.make;

    const issuerKeywordRecord = zoe.getIssuers(instance);
    t.deepEquals(
      issuerKeywordRecord,
      harden({
        Central: centralR.issuer,
        Moola: moolaR.issuer,
        MoolaLiquidity: moolaLiquidityIssuer,
        Simoleans: simoleanR.issuer,
        SimoleansLiquidity: simoleanLiquidityIssuer,
      }),
      `There are keywords for central token and two additional tokens and liquidity`,
    );
    t.deepEquals(
      await E(publicFacet).getPoolAllocation(moolaR.brand),
      {},
      `The poolAllocation object values for moola should be empty`,
    );
    t.deepEquals(
      await E(publicFacet).getPoolAllocation(simoleanR.brand),
      {},
      `The poolAllocation object values for simoleans should be empty`,
    );

    // Alice adds liquidity
    // 10 moola = 5 central tokens at the time of the liquidity adding
    // aka 2 moola = 1 central token
    const aliceProposal = harden({
      want: { Liquidity: moolaLiquidity(50) },
      give: { Secondary: moola(100), Central: centralTokens(50) },
    });
    const alicePayments = {
      Secondary: aliceMoolaPayment,
      Central: aliceCentralPayment,
    };

    const addLiquiditySeat = await zoe.offer(
      aliceAddLiquidityInvitation,
      aliceProposal,
      alicePayments,
    );

    t.equals(
      await E(addLiquiditySeat).getOfferResult(),
      'Added liquidity.',
      `Alice added moola and central liquidity`,
    );

    const liquidityPayout = await addLiquiditySeat.getPayout('Liquidity');

    t.deepEquals(
      await moolaLiquidityIssuer.getAmountOf(liquidityPayout),
      moolaLiquidity(50),
    );
    t.deepEquals(
      await E(publicFacet).getPoolAllocation(moolaR.brand),
      harden({
        Secondary: moola(100),
        Central: centralTokens(50),
        Liquidity: moolaLiquidity(0),
      }),
      `The poolAmounts record should contain the new liquidity`,
    );

    // Bob creates a swap invitation for himself
    const bobSwapInvitation1 = await E(publicFacet).makeSwapInvitation();

    const {
      value: [bobInvitationValue],
    } = await invitationIssuer.getAmountOf(bobSwapInvitation1);
    const bobPublicFacet = zoe.getPublicFacet(bobInvitationValue.instance);
    t.equals(
      bobInvitationValue.installation,
      installation,
      `installation is as expected`,
    );

    // Bob looks up the price of 17 moola in central tokens
    const priceInCentrals = await E(bobPublicFacet).getCurrentPrice(
      moola(17),
      centralR.brand,
    );
    t.deepEquals(
      priceInCentrals,
      centralTokens(7),
      `price in central tokens of 17 moola is as expected`,
    );

    const bobMoolaForCentralProposal = harden({
      want: { Out: centralTokens(7) },
      give: { In: moola(17) },
    });
    const bobMoolaForCentralPayments = harden({ In: bobMoolaPayment });

    // Bob swaps
    const bobSeat = await zoe.offer(
      bobSwapInvitation1,
      bobMoolaForCentralProposal,
      bobMoolaForCentralPayments,
    );

    t.equal(await E(bobSeat).getOfferResult(), 'Swap successfully completed.');

    const bobMoolaPayout1 = await bobSeat.getPayout('In');
    const bobCentralPayout1 = await bobSeat.getPayout('Out');

    t.deepEqual(
      await moolaR.issuer.getAmountOf(bobMoolaPayout1),
      moola(0),
      `bob gets no moola back`,
    );
    t.deepEqual(
      await centralR.issuer.getAmountOf(bobCentralPayout1),
      centralTokens(7),
      `bob gets the same price as when he called the getCurrentPrice method`,
    );
    t.deepEquals(
      await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
      {
        Secondary: moola(117),
        Central: centralTokens(43),
        Liquidity: moolaLiquidity(0),
      },
      `pool allocation added the moola and subtracted the central tokens`,
    );

    const bobCentralPurse = await E(centralR.issuer).makeEmptyPurse();
    await E(bobCentralPurse).deposit(bobCentralPayout1);

    // Bob looks up the price of 7 central tokens in moola
    const moolaAmounts = await E(bobPublicFacet).getCurrentPrice(
      centralTokens(7),
      moolaR.brand,
    );
    t.deepEquals(
      moolaAmounts,
      moola(16),
      `the fee was one moola over the two trades`,
    );

    // Bob makes another offer and swaps
    const bobSwapInvitation2 = await E(bobPublicFacet).makeSwapInvitation();
    const bobCentralForMoolaProposal = harden({
      want: { Out: moola(16) },
      give: { In: centralTokens(7) },
    });
    const centralForMoolaPayments = harden({
      In: await E(bobCentralPurse).withdraw(centralTokens(7)),
    });

    const bobSeat2 = await zoe.offer(
      bobSwapInvitation2,
      bobCentralForMoolaProposal,
      centralForMoolaPayments,
    );

    t.equal(
      await bobSeat2.getOfferResult(),
      'Swap successfully completed.',
      `second swap successful`,
    );

    const bobMoolaPayout2 = await bobSeat2.getPayout('Out');
    const bobCentralPayout2 = await bobSeat2.getPayout('In');

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
      await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
      {
        Secondary: moola(101),
        Central: centralTokens(50),
        Liquidity: moolaLiquidity(0),
      },
      `fee added to liquidity pool`,
    );

    // Alice adds simoleans and central tokens to the simolean
    // liquidity pool. 398 simoleans = 43 central tokens at the time of
    // the liquidity adding
    //
    const aliceSimCentralLiquidityInvitation = await E(
      publicFacet,
    ).makeAddLiquidityInvitation();
    const aliceSimCentralProposal = harden({
      want: { Liquidity: simoleanLiquidity(43) },
      give: { Secondary: simoleans(398), Central: centralTokens(43) },
    });
    const aliceCentralPayment2 = await centralR.mint.mintPayment(
      centralTokens(43),
    );
    const aliceSimCentralPayments = {
      Secondary: aliceSimoleanPayment,
      Central: aliceCentralPayment2,
    };

    const aliceSeat2 = await zoe.offer(
      aliceSimCentralLiquidityInvitation,
      aliceSimCentralProposal,
      aliceSimCentralPayments,
    );

    t.equals(
      await aliceSeat2.getOfferResult(),
      'Added liquidity.',
      `Alice added simoleans and central liquidity`,
    );

    const simoleanLiquidityPayout = await aliceSeat2.getPayout('Liquidity');

    t.deepEquals(
      await simoleanLiquidityIssuer.getAmountOf(simoleanLiquidityPayout),
      simoleanLiquidity(43),
      `simoleanLiquidity minted was equal to the amount of central tokens added to pool`,
    );
    t.deepEquals(
      await E(publicFacet).getPoolAllocation(simoleanR.brand),
      harden({
        Secondary: simoleans(398),
        Central: centralTokens(43),
        Liquidity: simoleanLiquidity(0),
      }),
      `The poolAmounts record should contain the new liquidity`,
    );

    // Bob tries to swap simoleans for moola. This will go through the
    // central token, meaning that two swaps will happen synchronously
    // under the hood.

    // Bob checks the price. Let's say he gives 74 simoleans, and he
    // wants to know how many moola he would get back.

    const priceInMoola = await E(bobPublicFacet).getCurrentPrice(
      simoleans(74),
      moolaR.brand,
    );
    t.deepEquals(
      priceInMoola,
      moola(10),
      `price is as expected for secondary token to secondary token`,
    );

    // This is the same as making two synchronous exchanges
    const priceInCentral = await E(bobPublicFacet).getCurrentPrice(
      simoleans(74),
      centralR.brand,
    );
    t.deepEquals(
      priceInCentral,
      centralTokens(6),
      `price is as expected for secondary token to central`,
    );

    const centralPriceInMoola = await E(bobPublicFacet).getCurrentPrice(
      centralTokens(6),
      moolaR.brand,
    );
    t.deepEquals(
      centralPriceInMoola,
      moola(10),
      `price is as expected for secondary token to secondary token`,
    );

    const bobThirdInvitation = await E(bobPublicFacet).makeSwapInvitation();
    const bobSimsForMoolaProposal = harden({
      want: { Out: moola(10) },
      give: { In: simoleans(74) },
    });
    const simsForMoolaPayments = harden({
      In: bobSimoleanPayment,
    });

    const bobSeat3 = await zoe.offer(
      bobThirdInvitation,
      bobSimsForMoolaProposal,
      simsForMoolaPayments,
    );

    const bobSimsPayout3 = await bobSeat3.getPayout('In');
    const bobMoolaPayout3 = await bobSeat3.getPayout('Out');

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
      await E(bobPublicFacet).getPoolAllocation(simoleanR.brand),
      harden({
        // 398 + 74
        Secondary: simoleans(472),
        // 43 - 6
        Central: centralTokens(37),
        Liquidity: simoleanLiquidity(0),
      }),
      `the simolean liquidity pool gains simoleans and loses central tokens`,
    );
    t.deepEqual(
      await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
      harden({
        // 101 - 10
        Secondary: moola(91),
        // 50 + 6
        Central: centralTokens(56),
        Liquidity: moolaLiquidity(0),
      }),
      `the moola liquidity pool loses moola and gains central tokens`,
    );

    // Alice removes her liquidity
    // She's not picky...
    const aliceRemoveLiquidityInvitation = await E(
      publicFacet,
    ).makeRemoveLiquidityInvitation();
    const aliceRemoveLiquidityProposal = harden({
      give: { Liquidity: moolaLiquidity(50) },
      want: { Secondary: moola(91), Central: centralTokens(56) },
    });

    const aliceSeat3 = await zoe.offer(
      aliceRemoveLiquidityInvitation,
      aliceRemoveLiquidityProposal,
      harden({ Liquidity: liquidityPayout }),
    );

    t.equals(
      await aliceSeat3.getOfferResult(),
      'Liquidity successfully removed.',
    );

    const aliceMoolaPayout = await aliceSeat3.getPayout('Secondary');
    const aliceCentralPayout = await aliceSeat3.getPayout('Central');
    const aliceLiquidityPayout = await aliceSeat3.getPayout('Liquidity');

    t.deepEquals(
      await moolaR.issuer.getAmountOf(aliceMoolaPayout),
      moola(91),
      `alice gets all the moola in the pool`,
    );
    t.deepEquals(
      await centralR.issuer.getAmountOf(aliceCentralPayout),
      centralTokens(56),
      `alice gets all the central tokens in the pool`,
    );
    t.deepEquals(
      await moolaLiquidityIssuer.getAmountOf(aliceLiquidityPayout),
      moolaLiquidity(0),
      `alice gets no liquidity tokens`,
    );
    t.deepEqual(
      await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
      harden({
        Secondary: moola(0),
        Central: centralTokens(0),
        Liquidity: moolaLiquidity(50),
      }),
      `liquidity is empty`,
    );
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});
