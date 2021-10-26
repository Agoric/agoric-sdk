// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import fakeVatAdmin from '../../../../tools/fakeVatAdmin.js';

// noinspection ES6PreferShortImport
import { makeZoeKit } from '../../../../src/zoeService/zoe.js';
import { setup } from '../../setupBasicMints.js';
import {
  makeTrader,
  updatePoolState,
  scaleForAddLiquidity,
  scaleForRemoveLiquidity,
  priceFromTargetOutput,
} from '../../../autoswapJig.js';
import {
  assertPayoutDeposit,
  assertAmountsEqual,
} from '../../../zoeTestHelpers.js';
import buildManualTimer from '../../../../tools/manualTimer.js';
import { getAmountOut } from '../../../../src/contractSupport/index.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const multipoolAutoswapRoot = `${dirname}/../../../../src/contracts/multipoolAutoswap/multipoolAutoswap`;

test('multipoolAutoSwap with valid offers', async t => {
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitationBrand = await E(invitationIssuer).getBrand();

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // Setup Alice
  const aliceMoolaPayment = moolaR.mint.mintPayment(moola(100n));
  // Let's assume that central tokens are worth 2x as much as moola
  const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(50n));
  const aliceSimoleanPayment = simoleanR.mint.mintPayment(simoleans(398n));

  // Setup Bob
  const bobMoolaPayment = moolaR.mint.mintPayment(moola(17n));
  const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(74n));

  // Alice creates an autoswap instance

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);

  const installation = await E(zoe).install(bundle);
  // This timer is only used to build quotes. Let's make it non-zero
  const fakeTimer = buildManualTimer(console.log, 30n);
  const { instance, publicFacet } = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
    { timer: fakeTimer },
  );
  const aliceAddLiquidityInvitation = E(
    publicFacet,
  ).makeAddLiquidityInvitation();

  const aliceInvitationAmount = await E(invitationIssuer).getAmountOf(
    aliceAddLiquidityInvitation,
  );
  t.deepEqual(
    aliceInvitationAmount,
    AmountMath.make(
      invitationBrand,
      harden([
        {
          description: 'multipool autoswap add liquidity',
          instance,
          installation,
          handle: aliceInvitationAmount.value[0].handle,
          fee: undefined,
          expiry: undefined,
          zoeTimeAuthority: undefined,
        },
      ]),
    ),
    `invitation value is as expected`,
  );

  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(simoleanLiquidityBrand, value);

  const quoteIssuer = await E(publicFacet).getQuoteIssuer();
  const { toCentral: priceAuthority } = await E(
    publicFacet,
  ).getPriceAuthorities(moolaR.brand);

  const issuerKeywordRecord = await E(zoe).getIssuers(instance);
  t.deepEqual(
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
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(moolaR.brand),
    {},
    `The poolAllocation object values for moola should be empty`,
  );
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(simoleanR.brand),
    {},
    `The poolAllocation object values for simoleans should be empty`,
  );

  // Alice adds liquidity
  // 10 moola = 5 central tokens at the time of the liquidity adding
  // aka 2 moola = 1 central token
  const aliceProposal = harden({
    want: { Liquidity: moolaLiquidity(50n) },
    give: { Secondary: moola(100n), Central: centralTokens(50n) },
  });
  const alicePayments = {
    Secondary: aliceMoolaPayment,
    Central: aliceCentralPayment,
  };

  const addLiquiditySeat = await E(zoe).offer(
    aliceAddLiquidityInvitation,
    aliceProposal,
    alicePayments,
  );

  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Alice added moola and central liquidity`,
  );

  const liquidityPayout = await addLiquiditySeat.getPayout('Liquidity');

  t.deepEqual(
    await moolaLiquidityIssuer.getAmountOf(liquidityPayout),
    moolaLiquidity(50n),
  );
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(moolaR.brand),
    harden({
      Secondary: moola(100n),
      Central: centralTokens(50n),
      Liquidity: moolaLiquidity(0n),
    }),
    `The poolAmounts record should contain the new liquidity`,
  );

  const quotePostLiquidity = await E(priceAuthority).quoteGiven(
    moola(50n),
    centralR.brand,
  );
  t.truthy(
    AmountMath.isEqual(
      await quoteIssuer.getAmountOf(quotePostLiquidity.quotePayment),
      quotePostLiquidity.quoteAmount,
    ),
  );
  t.truthy(
    AmountMath.isEqual(
      getAmountOut(quotePostLiquidity),
      AmountMath.make(centralR.brand, 16n),
    ),
  );

  // Bob creates a swap invitation for himself
  const bobSwapInvitation1 = await E(publicFacet).makeSwapInInvitation();

  const {
    value: [bobInvitationValue],
  } = await E(invitationIssuer).getAmountOf(bobSwapInvitation1);
  const bobPublicFacet = await E(zoe).getPublicFacet(
    bobInvitationValue.instance,
  );

  t.is(
    bobInvitationValue.installation,
    installation,
    `installation is as expected`,
  );

  // Bob looks up the price of 17 moola in central tokens
  const priceInCentrals = await E(bobPublicFacet).getInputPrice(
    moola(17n),
    centralR.brand,
  );
  t.deepEqual(
    priceInCentrals,
    centralTokens(7n),
    `price in central tokens of 7 moola is as expected`,
  );

  const bobMoolaForCentralProposal = harden({
    want: { Out: centralTokens(7n) },
    give: { In: moola(17n) },
  });
  const bobMoolaForCentralPayments = harden({ In: bobMoolaPayment });

  // Bob swaps
  const bobSeat = await E(zoe).offer(
    bobSwapInvitation1,
    bobMoolaForCentralProposal,
    bobMoolaForCentralPayments,
  );
  const quoteGivenBob = await E(priceAuthority).quoteGiven(
    moola(50n),
    centralR.brand,
  );
  t.truthy(
    AmountMath.isEqual(
      getAmountOut(quoteGivenBob),
      AmountMath.make(centralR.brand, 12n),
    ),
  );

  t.is(await E(bobSeat).getOfferResult(), 'Swap successfully completed.');

  const bobMoolaPayout1 = await bobSeat.getPayout('In');
  const bobCentralPayout1 = await bobSeat.getPayout('Out');

  t.deepEqual(
    await moolaR.issuer.getAmountOf(bobMoolaPayout1),
    moola(0n),
    `bob gets no moola back`,
  );
  t.deepEqual(
    await centralR.issuer.getAmountOf(bobCentralPayout1),
    centralTokens(7n),
    `bob gets the same price as when he called the getInputPrice method`,
  );
  t.deepEqual(
    await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
    {
      Secondary: moola(117n),
      Central: centralTokens(43n),
      Liquidity: moolaLiquidity(0n),
    },
    `pool allocation added the moola and subtracted the central tokens`,
  );

  const bobCentralPurse = await E(centralR.issuer).makeEmptyPurse();
  await E(bobCentralPurse).deposit(bobCentralPayout1);

  // Bob looks up the price of 7 central tokens in moola
  const moolaAmounts = await E(bobPublicFacet).getInputPrice(
    centralTokens(7n),
    moolaR.brand,
  );
  t.deepEqual(
    moolaAmounts,
    moola(16n),
    `the fee was one moola over the two trades`,
  );

  // Bob makes another offer and swaps
  const bobSwapInvitation2 = await E(bobPublicFacet).makeSwapInInvitation();
  const bobCentralForMoolaProposal = harden({
    want: { Out: moola(16n) },
    give: { In: centralTokens(7n) },
  });
  const centralForMoolaPayments = harden({
    In: await E(bobCentralPurse).withdraw(centralTokens(7n)),
  });

  const bobSeat2 = await E(zoe).offer(
    bobSwapInvitation2,
    bobCentralForMoolaProposal,
    centralForMoolaPayments,
  );

  t.is(
    await bobSeat2.getOfferResult(),
    'Swap successfully completed.',
    `second swap successful`,
  );

  const quoteBob2 = await E(priceAuthority).quoteGiven(
    moola(50n),
    centralR.brand,
  );
  t.truthy(
    AmountMath.isEqual(
      getAmountOut(quoteBob2),
      AmountMath.make(centralR.brand, 16n),
    ),
  );

  const bobMoolaPayout2 = await bobSeat2.getPayout('Out');
  const bobCentralPayout2 = await bobSeat2.getPayout('In');

  t.deepEqual(
    await moolaR.issuer.getAmountOf(bobMoolaPayout2),
    moola(16n),
    `bob gets 16 moola back`,
  );
  t.deepEqual(
    await centralR.issuer.getAmountOf(bobCentralPayout2),
    centralTokens(0n),
    `bob gets no central tokens back`,
  );
  t.deepEqual(
    await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
    {
      Secondary: moola(101n),
      Central: centralTokens(50n),
      Liquidity: moolaLiquidity(0n),
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
    want: { Liquidity: simoleanLiquidity(43n) },
    give: { Secondary: simoleans(398n), Central: centralTokens(43n) },
  });
  const aliceCentralPayment2 = await centralR.mint.mintPayment(
    centralTokens(43n),
  );
  const aliceSimCentralPayments = {
    Secondary: aliceSimoleanPayment,
    Central: aliceCentralPayment2,
  };

  const aliceSeat2 = await E(zoe).offer(
    aliceSimCentralLiquidityInvitation,
    aliceSimCentralProposal,
    aliceSimCentralPayments,
  );

  const quoteLiquidation2 = await E(priceAuthority).quoteGiven(
    moola(50n),
    centralR.brand,
  );
  // a simolean trade had no effect
  t.truthy(
    AmountMath.isEqual(
      getAmountOut(quoteLiquidation2),
      AmountMath.make(centralR.brand, 16n),
    ),
  );
  t.is(
    await aliceSeat2.getOfferResult(),
    'Added liquidity.',
    `Alice added simoleans and central liquidity`,
  );

  const simoleanLiquidityPayout = await aliceSeat2.getPayout('Liquidity');

  t.deepEqual(
    await simoleanLiquidityIssuer.getAmountOf(simoleanLiquidityPayout),
    simoleanLiquidity(43n),
    `simoleanLiquidity minted was equal to the amount of central tokens added to pool`,
  );
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(simoleanR.brand),
    harden({
      Secondary: simoleans(398n),
      Central: centralTokens(43n),
      Liquidity: simoleanLiquidity(0n),
    }),
    `The poolAmounts record should contain the new liquidity`,
  );

  // Bob tries to swap simoleans for moola. This will go through the
  // central token, meaning that two swaps will happen synchronously
  // under the hood.

  // Bob checks the price. Let's say he gives 74 simoleans, and he
  // wants to know how many moola he would get back.

  const priceInMoola = await E(bobPublicFacet).getInputPrice(
    simoleans(74n),
    moolaR.brand,
  );
  t.deepEqual(
    priceInMoola,
    moola(10n),
    `price is as expected for secondary token to secondary token`,
  );

  // This is the same as making two synchronous exchanges
  const priceInCentral = await E(bobPublicFacet).getInputPrice(
    simoleans(74n),
    centralR.brand,
  );
  t.deepEqual(
    priceInCentral,
    centralTokens(6n),
    `price is as expected for secondary token to central`,
  );

  const centralPriceInMoola = await E(bobPublicFacet).getInputPrice(
    centralTokens(6n),
    moolaR.brand,
  );
  t.deepEqual(
    centralPriceInMoola,
    moola(10n),
    `price is as expected for secondary token to secondary token`,
  );

  const bobThirdInvitation = await E(bobPublicFacet).makeSwapInInvitation();
  const bobSimsForMoolaProposal = harden({
    want: { Out: moola(10n) },
    give: { In: simoleans(74n) },
  });
  const simsForMoolaPayments = harden({
    In: bobSimoleanPayment,
  });

  const bobSeat3 = await E(zoe).offer(
    bobThirdInvitation,
    bobSimsForMoolaProposal,
    simsForMoolaPayments,
  );

  const bobSimsPayout3 = await bobSeat3.getPayout('In');
  const bobMoolaPayout3 = await bobSeat3.getPayout('Out');

  const quotePostTrade = await E(priceAuthority).quoteGiven(
    moola(50n),
    centralR.brand,
  );
  t.truthy(
    AmountMath.isEqual(
      getAmountOut(quotePostTrade),
      AmountMath.make(centralR.brand, 19n),
    ),
  );

  t.deepEqual(
    await moolaR.issuer.getAmountOf(bobMoolaPayout3),
    moola(10n),
    `bob gets 10 moola`,
  );
  t.deepEqual(
    await simoleanR.issuer.getAmountOf(bobSimsPayout3),
    simoleans(9n),
    `bob gets 9 simoleans back because 74 was more than required`,
  );

  t.deepEqual(
    await E(bobPublicFacet).getPoolAllocation(simoleanR.brand),
    harden({
      // 398 + 65
      Secondary: simoleans(463n),
      // 43 - 6
      Central: centralTokens(37n),
      Liquidity: simoleanLiquidity(0n),
    }),
    `the simolean liquidity pool gains simoleans and loses central tokens`,
  );
  t.deepEqual(
    await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
    harden({
      // 101 - 10
      Secondary: moola(91n),
      // 50 + 6
      Central: centralTokens(56n),
      Liquidity: moolaLiquidity(0n),
    }),
    `the moola liquidity pool loses moola and gains central tokens`,
  );

  // Alice removes her liquidity
  // She's not picky...
  const aliceRemoveLiquidityInvitation = await E(
    publicFacet,
  ).makeRemoveLiquidityInvitation();
  const aliceRemoveLiquidityProposal = harden({
    give: { Liquidity: moolaLiquidity(50n) },
    want: { Secondary: moola(91n), Central: centralTokens(56n) },
  });

  const aliceSeat3 = await E(zoe).offer(
    aliceRemoveLiquidityInvitation,
    aliceRemoveLiquidityProposal,
    harden({ Liquidity: liquidityPayout }),
  );

  t.is(await aliceSeat3.getOfferResult(), 'Liquidity successfully removed.');

  const aliceMoolaPayout = await aliceSeat3.getPayout('Secondary');
  const aliceCentralPayout = await aliceSeat3.getPayout('Central');
  const aliceLiquidityPayout = await aliceSeat3.getPayout('Liquidity');

  t.deepEqual(
    await moolaR.issuer.getAmountOf(aliceMoolaPayout),
    moola(91n),
    `alice gets all the moola in the pool`,
  );
  t.deepEqual(
    await centralR.issuer.getAmountOf(aliceCentralPayout),
    centralTokens(56n),
    `alice gets all the central tokens in the pool`,
  );
  t.deepEqual(
    await moolaLiquidityIssuer.getAmountOf(aliceLiquidityPayout),
    moolaLiquidity(0n),
    `alice gets no liquidity tokens`,
  );
  t.deepEqual(
    await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
    harden({
      Secondary: moola(0n),
      Central: centralTokens(0n),
      Liquidity: moolaLiquidity(50n),
    }),
    `liquidity is empty`,
  );

  t.deepEqual(await E(publicFacet).getAllPoolBrands(), [
    moolaR.brand,
    simoleanR.brand,
  ]);
});

test('multipoolAutoSwap get detailed prices', async t => {
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitationBrand = await E(invitationIssuer).getBrand();

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // Setup Alice
  const aliceMoolaPayment = moolaR.mint.mintPayment(moola(1000n));
  // Let's assume that central tokens are worth 2x as much as moola
  const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(500n));
  const aliceSimoleanPayment = simoleanR.mint.mintPayment(simoleans(4000n));

  // Alice creates an autoswap instance

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);

  const installation = await E(zoe).install(bundle);
  const { instance, publicFacet } = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
  );
  const aliceAddLiquidityInvitation = E(
    publicFacet,
  ).makeAddLiquidityInvitation();

  const aliceInvitationAmount = await E(invitationIssuer).getAmountOf(
    aliceAddLiquidityInvitation,
  );
  t.deepEqual(
    aliceInvitationAmount,
    AmountMath.make(
      invitationBrand,
      harden([
        {
          description: 'multipool autoswap add liquidity',
          instance,
          installation,
          handle: aliceInvitationAmount.value[0].handle,
          fee: undefined,
          expiry: undefined,
          zoeTimeAuthority: undefined,
        },
      ]),
    ),
    `invitation value is as expected`,
  );

  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(simoleanLiquidityBrand, value);

  // Alice adds liquidity to the moola pool
  // 10 moola = 5 central tokens at the time of the liquidity adding
  // aka 2 moola = 1 central token
  const aliceProposal = harden({
    want: { Liquidity: moolaLiquidity(500n) },
    give: { Secondary: moola(1000n), Central: centralTokens(500n) },
  });
  const alicePayments = {
    Secondary: aliceMoolaPayment,
    Central: aliceCentralPayment,
  };

  const addLiquiditySeat = await E(zoe).offer(
    aliceAddLiquidityInvitation,
    aliceProposal,
    alicePayments,
  );

  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Alice added moola and central liquidity`,
  );

  const liquidityPayout = await addLiquiditySeat.getPayout('Liquidity');

  t.deepEqual(
    await moolaLiquidityIssuer.getAmountOf(liquidityPayout),
    moolaLiquidity(500n),
  );
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(moolaR.brand),
    harden({
      Secondary: moola(1000n),
      Central: centralTokens(500n),
      Liquidity: moolaLiquidity(0n),
    }),
    `The poolAmounts record should contain the new liquidity`,
  );

  // Alice adds simoleans and central tokens to the simolean
  // liquidity pool. 4000 simoleans = 500 central tokens at the time of
  // adding the liquidity
  const aliceSimCentralLiquidityInvitation = await E(
    publicFacet,
  ).makeAddLiquidityInvitation();
  const aliceSimCentralProposal = harden({
    want: { Liquidity: simoleanLiquidity(500n) },
    give: { Secondary: simoleans(4000n), Central: centralTokens(500n) },
  });
  const aliceCentralPayment2 = await centralR.mint.mintPayment(
    centralTokens(500n),
  );
  const aliceSimCentralPayments = {
    Secondary: aliceSimoleanPayment,
    Central: aliceCentralPayment2,
  };

  const aliceSeat2 = await E(zoe).offer(
    aliceSimCentralLiquidityInvitation,
    aliceSimCentralProposal,
    aliceSimCentralPayments,
  );

  t.is(
    await aliceSeat2.getOfferResult(),
    'Added liquidity.',
    `Alice added simoleans and central liquidity`,
  );

  const simoleanLiquidityPayout = await aliceSeat2.getPayout('Liquidity');

  t.deepEqual(
    await simoleanLiquidityIssuer.getAmountOf(simoleanLiquidityPayout),
    simoleanLiquidity(500n),
    `simoleanLiquidity minted was equal to the amount of central tokens added to pool`,
  );
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(simoleanR.brand),
    harden({
      Secondary: simoleans(4000n),
      Central: centralTokens(500n),
      Liquidity: simoleanLiquidity(0n),
    }),
    `The poolAmounts record should contain the new liquidity`,
  );

  // Let's check the price. What can we get for 74 simoleans?
  const priceGivenSimoleansIn = await E(
    publicFacet,
  ).getPriceGivenAvailableInput(simoleans(100n), moolaR.brand);
  // for 100 simoleans you can't get more than 23 moola, but the price of
  // 23 moola is only 99.
  t.deepEqual(
    priceGivenSimoleansIn,
    { amountIn: simoleans(99n), amountOut: moola(23n) },
    `price is as expected for secondary token to secondary token`,
  );

  // How much would it cost to get at least 35 moola?
  const priceGivenMoolaOut = await E(publicFacet).getPriceGivenRequiredOutput(
    simoleanR.brand,
    moola(35n),
  );
  // it would cost 159 to get 35 moola, but for 159 you can get 36.
  t.deepEqual(
    priceGivenMoolaOut,
    { amountIn: simoleans(159n), amountOut: moola(36n) },
    `price is as expected for secondary token to secondary token`,
  );

  t.deepEqual(await E(publicFacet).getAllPoolBrands(), [
    moolaR.brand,
    simoleanR.brand,
  ]);
});

test('multipoolAutoSwap with some invalid offers', async t => {
  const { moolaR, moola } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);
  const invitationIssuer = await E(zoe).getInvitationIssuer();

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // Setup Bob
  const bobMoolaPayment = moolaR.mint.mintPayment(moola(17n));

  // Alice creates an autoswap instance

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);

  const installation = await E(zoe).install(bundle);
  const { publicFacet } = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
  );

  await E(publicFacet).addPool(moolaR.issuer, 'Moola');
  // Bob creates a swap invitation for himself
  const bobSwapInvitation1 = await E(publicFacet).makeSwapInInvitation();

  const {
    value: [bobInvitationValue],
  } = await E(invitationIssuer).getAmountOf(bobSwapInvitation1);
  const bobPublicFacet = E(zoe).getPublicFacet(bobInvitationValue.instance);

  // Bob tries to look up prices, but the pool isn't initiailzed
  await t.throwsAsync(
    () => E(bobPublicFacet).getInputPrice(moola(5n), centralR.brand),
    { message: 'pool not initialized' },
    'pool not initialized',
  );

  // Bob tries to trade anyway.
  const bobMoolaForCentralProposal = harden({
    want: { Out: centralTokens(7n) },
    give: { In: moola(17n) },
  });
  const bobMoolaForCentralPayments = harden({ In: bobMoolaPayment });

  // Bob swaps
  const failedSeat = await E(zoe).offer(
    bobSwapInvitation1,
    bobMoolaForCentralProposal,
    bobMoolaForCentralPayments,
  );
  await t.throwsAsync(
    () => failedSeat.getOfferResult(),
    { message: 'pool not initialized' },
    'pool not initialized',
  );

  t.deepEqual(await E(publicFacet).getAllPoolBrands(), [moolaR.brand]);
});

test('multipoolAutoSwap jig - addLiquidity', async t => {
  const { moolaR, moola } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);
  const installation = await E(zoe).install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(20000n));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(20000n)));

  const startRecord = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
  );
  const {
    /** @type {MultipoolAutoswapPublicFacet} */ publicFacet,
  } = startRecord;
  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const issuerKeywordRecord = {
    Central: centralR.issuer,
    Secondary: moolaR.issuer,
    Liquidity: moolaLiquidityIssuer,
  };
  const purses = [
    moolaPurse,
    moolaLiquidityIssuer.makeEmptyPurse(),
    centralPurse,
  ];
  const alice = await makeTrader(purses, zoe, publicFacet, centralR.issuer);

  let moolaPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initLiquidityDetails = {
    cAmount: centralTokens(10000n),
    sAmount: moola(10000n),
    lAmount: moolaLiquidity(10000n),
  };
  const initLiquidityExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000n,
  };

  await alice.initLiquidityAndCheck(
    t,
    moolaPoolState,
    initLiquidityDetails,
    initLiquidityExpected,
    issuerKeywordRecord,
  );
  moolaPoolState = updatePoolState(moolaPoolState, initLiquidityExpected);

  // Alice adds liquidity
  // 1 moola = 1 liquidity tokens
  const liqDetails1 = {
    cAmount: centralTokens(100n),
    sAmount: moola(100n),
    lAmount: moolaLiquidity(100n),
  };

  const deposit = { c: 100n, s: 100n };
  const liqExpected1 = scaleForAddLiquidity(moolaPoolState, deposit, true);
  await alice.addLiquidityAndCheck(
    t,
    moolaPoolState,
    liqDetails1,
    liqExpected1,
    issuerKeywordRecord,
  );
  moolaPoolState = updatePoolState(moolaPoolState, liqExpected1);

  // Alice adds liquidity with an out-of-balance offer -- too much moola
  const liqDetails2 = {
    cAmount: centralTokens(100n),
    sAmount: moola(200n),
    lAmount: moolaLiquidity(100n),
  };

  const deposit2 = { c: 100n, s: 200n };
  const liqExpected2 = scaleForAddLiquidity(moolaPoolState, deposit2, true);
  t.is(liqExpected2.payoutS, 100n, 'alice should get 100 moola back');
  await alice.addLiquidityAndCheck(
    t,
    moolaPoolState,
    liqDetails2,
    liqExpected2,
    issuerKeywordRecord,
  );
  moolaPoolState = updatePoolState(moolaPoolState, liqExpected2);

  // Alice tries to add liquidity with little moola -- the offer is rejected
  const proposal = harden({
    give: { Central: centralTokens(200n), Secondary: moola(100n) },
    want: { Liquidity: moolaLiquidity(100n) },
  });
  const payment = harden({
    Central: centralPurse.withdraw(centralTokens(200n)),
    Secondary: moolaPurse.withdraw(moola(100n)),
  });

  const invite = E(publicFacet).makeAddLiquidityInvitation();
  const seat = E(zoe).offer(invite, proposal, payment);
  await t.throwsAsync(
    () => E(seat).getOfferResult(),
    { message: 'insufficient Secondary deposited' },
    `insufficient secondary is unsuccessful`,
  );

  t.deepEqual(await E(publicFacet).getAllPoolBrands(), [moolaR.brand]);
});

test('multipoolAutoSwap jig - check liquidity', async t => {
  const { moolaR, moola } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);
  const installation = await E(zoe).install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(20000n));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(20000n)));

  const startRecord = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
  );

  const {
    /** @type {MultipoolAutoswapPublicFacet} */ publicFacet,
  } = startRecord;
  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );

  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const issuerKeywordRecord = {
    Central: centralR.issuer,
    Secondary: moolaR.issuer,
    Liquidity: moolaLiquidityIssuer,
  };
  const purses = [
    moolaPurse,
    moolaLiquidityIssuer.makeEmptyPurse(),
    centralPurse,
  ];
  const alice = await makeTrader(purses, zoe, publicFacet, centralR.issuer);

  let moolaPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initLiquidityDetails = {
    cAmount: centralTokens(10000n),
    sAmount: moola(10000n),
    lAmount: moolaLiquidity(10000n),
  };
  const initLiquidityExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000n,
  };

  const {
    central: centralP,
    secondary: secondaryP,
    liquidity: liquidityP,
  } = await alice.initLiquidityAndCheck(
    t,
    moolaPoolState,
    initLiquidityDetails,
    initLiquidityExpected,
    issuerKeywordRecord,
  );
  moolaPoolState = updatePoolState(moolaPoolState, initLiquidityExpected);
  await assertPayoutDeposit(t, centralP, centralPurse, centralTokens(0n));
  await assertPayoutDeposit(t, secondaryP, moolaPurse, moola(0n));
  await assertPayoutDeposit(t, liquidityP, purses[1], moolaLiquidity(10000n));

  const liquidityIssuer = await E(publicFacet).getLiquidityIssuer(moolaR.brand);
  t.truthy(liquidityIssuer, 'issuer');

  // alice checks the liquidity levels
  const moolaAllocations = await E(publicFacet).getPoolAllocation(moolaR.brand);
  t.is(moolaAllocations.Central.value, moolaPoolState.c);
  t.is(moolaAllocations.Secondary.value, moolaPoolState.s);

  // trade to move the balance of liquidity
  // trade for moola specifying 300 output
  const gainC = 300n;
  const mPriceC = priceFromTargetOutput(
    gainC,
    moolaPoolState.c,
    moolaPoolState.s,
    30n,
  );

  const tradeDetailsC = {
    inAmount: centralTokens(mPriceC),
    outAmount: moola(gainC),
  };

  const expectedC = {
    c: moolaPoolState.c + mPriceC,
    s: moolaPoolState.s - gainC,
    l: 10000n,
    k: (moolaPoolState.c + mPriceC) * (moolaPoolState.s - gainC),
    out: gainC,
    in: 0n,
  };
  await alice.tradeAndCheck(
    t,
    false,
    moolaPoolState,
    tradeDetailsC,
    expectedC,
    { Secondary: moolaR.issuer },
  );
  moolaPoolState = updatePoolState(moolaPoolState, expectedC);

  // alice checks the liquidity levels again
  const newMoolaAllocations = await E(publicFacet).getPoolAllocation(
    moolaR.brand,
  );
  t.is(newMoolaAllocations.Central.value, moolaPoolState.c);
  t.is(newMoolaAllocations.Secondary.value, moolaPoolState.s);

  t.deepEqual(await E(publicFacet).getAllPoolBrands(), [moolaR.brand]);
});

test('multipoolAutoSwap jig - swapOut', async t => {
  const { moolaR, moola, simoleanR, simoleans } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);
  const installation = await E(zoe).install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(30000n));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(20000n)));
  const simoleanPurse = simoleanR.issuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanR.mint.mintPayment(simoleans(20000n)));

  const startRecord = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
  );

  const {
    /** @type {MultipoolAutoswapPublicFacet} */ publicFacet,
  } = startRecord;
  t.deepEqual(await E(publicFacet).getAllPoolBrands(), []);
  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  t.deepEqual(await E(publicFacet).getAllPoolBrands(), [moolaR.brand]);
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(simoleanLiquidityBrand, value);
  const mIssuerKeywordRecord = {
    Secondary: moolaR.issuer,
    Liquidity: moolaLiquidityIssuer,
  };
  const purses = [
    moolaPurse,
    moolaLiquidityIssuer.makeEmptyPurse(),
    centralPurse,
    simoleanPurse,
    simoleanLiquidityIssuer.makeEmptyPurse(),
  ];
  const alice = await makeTrader(purses, zoe, publicFacet, centralR.issuer);

  let mPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initmoolaLiquidityDetails = {
    cAmount: centralTokens(10000n),
    sAmount: moola(10000n),
    lAmount: moolaLiquidity(10000n),
  };
  const initmoolaLiquidityExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000n,
  };
  await alice.initLiquidityAndCheck(
    t,
    mPoolState,
    initmoolaLiquidityDetails,
    initmoolaLiquidityExpected,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, initmoolaLiquidityExpected);

  let sPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initsimoleanLiquidityDetails = {
    cAmount: centralTokens(10000n),
    sAmount: simoleans(10000n),
    lAmount: simoleanLiquidity(10000n),
  };
  const initSimLiqExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000n,
  };
  const sIssuerKeywordRecord = {
    Secondary: simoleanR.issuer,
    Liquidity: simoleanLiquidityIssuer,
  };

  await alice.initLiquidityAndCheck(
    t,
    sPoolState,
    initsimoleanLiquidityDetails,
    initSimLiqExpected,
    sIssuerKeywordRecord,
  );
  sPoolState = updatePoolState(sPoolState, initSimLiqExpected);

  // trade for central specifying 300 output: moola price 311
  const gain = 300n;
  const mPrice = priceFromTargetOutput(gain, mPoolState.c, mPoolState.s, 30n);
  t.is(mPrice, 311n);

  const tradeDetailsB = {
    inAmount: moola(500n),
    outAmount: centralTokens(gain),
  };

  const expectedB = {
    c: mPoolState.c - gain,
    s: mPoolState.s + mPrice,
    l: 10000n,
    k: (mPoolState.c - gain) * (mPoolState.s + mPrice),
    out: gain,
    in: 500n - mPrice,
  };
  await alice.tradeAndCheck(
    t,
    false,
    mPoolState,
    tradeDetailsB,
    expectedB,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, expectedB);

  // trade for moola specifying 250 output: central price: 242. don't overpay
  const gainC = 250n;
  const mPriceC = priceFromTargetOutput(gainC, mPoolState.s, mPoolState.c, 30n);
  t.is(mPriceC, 242n);

  const tradeDetailsC = {
    inAmount: centralTokens(mPriceC),
    outAmount: moola(gainC),
  };

  const expectedC = {
    c: mPoolState.c + mPriceC,
    s: mPoolState.s - gainC,
    l: 10000n,
    k: (mPoolState.c + mPriceC) * (mPoolState.s - gainC),
    out: gainC,
    in: 0n,
  };
  await alice.tradeAndCheck(
    t,
    false,
    mPoolState,
    tradeDetailsC,
    expectedC,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, expectedC);

  // trade simoleans for moola specifying 305 moola output: requires 312 Sim
  const gainD = 305n;
  const mPriceD = priceFromTargetOutput(gainD, mPoolState.s, mPoolState.c, 30n);
  t.is(mPriceD, 312n);

  const tradeDetailsD = {
    inAmount: centralTokens(mPriceD),
    outAmount: moola(gainD),
  };

  const expectedD = {
    c: mPoolState.c + mPriceD,
    s: mPoolState.s - gainD,
    l: 10000n,
    k: (mPoolState.c + mPriceD) * (mPoolState.s - gainD),
    out: gainD,
    in: 0n,
  };
  await alice.tradeAndCheck(
    t,
    false,
    mPoolState,
    tradeDetailsD,
    expectedD,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, expectedD);

  t.deepEqual(await E(publicFacet).getAllPoolBrands(), [
    moolaR.brand,
    simoleanR.brand,
  ]);
});

test('multipoolAutoSwap jig - swapOut uneven', async t => {
  const { moolaR, moola, simoleanR, simoleans } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);
  const installation = await E(zoe).install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(30000n));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(20000n)));
  const simoleanPurse = simoleanR.issuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanR.mint.mintPayment(simoleans(20000n)));

  const startRecord = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
  );

  const {
    /** @type {MultipoolAutoswapPublicFacet} */ publicFacet,
  } = startRecord;
  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(simoleanLiquidityBrand, value);
  const mIssuerKeywordRecord = {
    Secondary: moolaR.issuer,
    Liquidity: moolaLiquidityIssuer,
  };
  const purses = [
    moolaPurse,
    moolaLiquidityIssuer.makeEmptyPurse(),
    centralPurse,
    simoleanPurse,
    simoleanLiquidityIssuer.makeEmptyPurse(),
  ];
  const alice = await makeTrader(purses, zoe, publicFacet, centralR.issuer);

  let mPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };

  // this test uses twice as much Central as Moola to make the price difference
  // more visible.
  const initmoolaLiquidityDetails = {
    cAmount: centralTokens(10000n),
    sAmount: moola(5000n),
    lAmount: moolaLiquidity(10000n),
  };
  const initmoolaLiquidityExpected = {
    c: 10000n,
    s: 5000n,
    l: 10000n,
    k: 50000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000n,
  };
  await alice.initLiquidityAndCheck(
    t,
    mPoolState,
    initmoolaLiquidityDetails,
    initmoolaLiquidityExpected,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, initmoolaLiquidityExpected);

  let sPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initsimoleanLiquidityDetails = {
    cAmount: centralTokens(10000n),
    sAmount: simoleans(10000n),
    lAmount: simoleanLiquidity(10000n),
  };
  const initSimLiqExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000n,
  };
  const sIssuerKeywordRecord = {
    Secondary: simoleanR.issuer,
    Liquidity: simoleanLiquidityIssuer,
  };

  await alice.initLiquidityAndCheck(
    t,
    sPoolState,
    initsimoleanLiquidityDetails,
    initSimLiqExpected,
    sIssuerKeywordRecord,
  );
  sPoolState = updatePoolState(sPoolState, initSimLiqExpected);

  // trade for central specifying 300 output: moola price 156
  // Notice that it takes half as much moola as the desired Central
  const gain = 300n;
  const mPrice = priceFromTargetOutput(gain, mPoolState.c, mPoolState.s, 30n);

  const moolaIn = 160n;
  t.is(mPrice, 156n);
  const tradeDetailsB = {
    inAmount: moola(moolaIn),
    outAmount: centralTokens(gain),
  };

  const expectedB = {
    c: mPoolState.c - gain - 1n,
    s: mPoolState.s + mPrice,
    l: 10000n,
    k: (mPoolState.c - gain - 1n) * (mPoolState.s + mPrice),
    out: gain + 1n,
    in: moolaIn - mPrice,
  };
  await alice.tradeAndCheck(
    t,
    false,
    mPoolState,
    tradeDetailsB,
    expectedB,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, expectedB);

  // trade for moola specifying 250 output: central price: 496, roughly double.
  const gainC = 250n;
  const mPriceC = priceFromTargetOutput(gainC, mPoolState.s, mPoolState.c, 30n);
  t.is(mPriceC, 496n);

  const tradeDetailsC = {
    inAmount: centralTokens(mPriceC),
    outAmount: moola(gainC),
  };

  const expectedC = {
    c: mPoolState.c + mPriceC,
    s: mPoolState.s - gainC,
    l: 10000n,
    k: (mPoolState.c + mPriceC) * (mPoolState.s - gainC),
    out: gainC,
    in: 0n,
  };
  await alice.tradeAndCheck(
    t,
    false,
    mPoolState,
    tradeDetailsC,
    expectedC,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, expectedC);
});

test('multipoolAutoSwap jig - removeLiquidity', async t => {
  const { moolaR, moola } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);
  const installation = await E(zoe).install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(20000n));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(20000n)));

  const startRecord = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
  );

  const {
    /** @type {MultipoolAutoswapPublicFacet} */ publicFacet,
  } = startRecord;
  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const issuerKeywordRecord = {
    Central: centralR.issuer,
    Secondary: moolaR.issuer,
    Liquidity: moolaLiquidityIssuer,
  };
  const purses = [
    moolaPurse,
    moolaLiquidityIssuer.makeEmptyPurse(),
    centralPurse,
  ];
  const alice = await makeTrader(purses, zoe, publicFacet, centralR.issuer);

  let moolaPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initLiquidityDetails = {
    cAmount: centralTokens(10000n),
    sAmount: moola(10000n),
    lAmount: moolaLiquidity(10000n),
  };
  const initLiquidityExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000n,
  };

  const { liquidity: lPayout } = await alice.initLiquidityAndCheck(
    t,
    moolaPoolState,
    initLiquidityDetails,
    initLiquidityExpected,
    issuerKeywordRecord,
  );
  await purses[1].deposit(await lPayout);
  moolaPoolState = updatePoolState(moolaPoolState, initLiquidityExpected);

  // Withdraw liquidity -- straightforward
  const liqDetails1 = {
    cAmount: centralTokens(100n),
    sAmount: moola(100n),
    lAmount: moolaLiquidity(100n),
  };
  const withdraw = { l: 100n };
  const liqExpected1 = scaleForRemoveLiquidity(moolaPoolState, withdraw);
  await alice.removeLiquidityAndCheck(
    t,
    moolaPoolState,
    liqDetails1,
    liqExpected1,
    issuerKeywordRecord,
  );
  moolaPoolState = updatePoolState(moolaPoolState, liqExpected1);

  // Withdraw liquidity -- leave some leeway in the proposal
  const liqDetails2 = {
    cAmount: centralTokens(90n),
    sAmount: moola(90n),
    lAmount: moolaLiquidity(100n),
  };
  const withdraw2 = { l: 100n };
  const liqExpected2 = scaleForRemoveLiquidity(moolaPoolState, withdraw2);
  await alice.removeLiquidityAndCheck(
    t,
    moolaPoolState,
    liqDetails2,
    liqExpected2,
    issuerKeywordRecord,
  );
  moolaPoolState = updatePoolState(moolaPoolState, liqExpected2);
});

test('multipoolAutoSwap jig - removeLiquidity ask for too much', async t => {
  const { moolaR, moola } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);
  const installation = await E(zoe).install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(20000n));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(20000n)));

  const startRecord = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
  );

  const {
    /** @type {MultipoolAutoswapPublicFacet} */ publicFacet,
  } = startRecord;
  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const issuerKeywordRecord = {
    Central: centralR.issuer,
    Secondary: moolaR.issuer,
    Liquidity: moolaLiquidityIssuer,
  };
  const purses = [
    moolaPurse,
    moolaLiquidityIssuer.makeEmptyPurse(),
    centralPurse,
  ];
  const alice = await makeTrader(purses, zoe, publicFacet, centralR.issuer);

  let moolaPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initLiquidityDetails = {
    cAmount: centralTokens(10000n),
    sAmount: moola(10000n),
    lAmount: moolaLiquidity(10000n),
  };
  const initLiquidityExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000n,
  };

  const { liquidity: lPayout } = await alice.initLiquidityAndCheck(
    t,
    moolaPoolState,
    initLiquidityDetails,
    initLiquidityExpected,
    issuerKeywordRecord,
  );
  await purses[1].deposit(await lPayout);
  moolaPoolState = updatePoolState(moolaPoolState, initLiquidityExpected);

  // Withdraw liquidity -- Ask for more than is avaiable
  const proposal = harden({
    give: { Liquidity: moolaLiquidity(100n) },
    want: { Central: centralTokens(100n), Secondary: moola(101n) },
  });
  const payment = harden({
    Liquidity: purses[1].withdraw(moolaLiquidity(100n)),
  });

  const seat = await E(zoe).offer(
    E(publicFacet).makeRemoveLiquidityInvitation(),
    proposal,
    payment,
  );
  await t.throwsAsync(() => seat.getOfferResult(), {
    message: /Offer safety was violated by the proposed allocation/,
  });
});

test('multipoolAutoSwap jig - remove all liquidity', async t => {
  const { moolaR, moola } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);
  const installation = await E(zoe).install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(20000n));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(20000n)));

  const startRecord = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
  );

  const {
    /** @type {MultipoolAutoswapPublicFacet} */ publicFacet,
  } = startRecord;
  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const issuerKeywordRecord = {
    Central: centralR.issuer,
    Secondary: moolaR.issuer,
    Liquidity: moolaLiquidityIssuer,
  };
  const purses = [
    moolaPurse,
    moolaLiquidityIssuer.makeEmptyPurse(),
    centralPurse,
  ];
  const alice = await makeTrader(purses, zoe, publicFacet, centralR.issuer);

  let moolaPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initLiquidityDetails = {
    cAmount: centralTokens(10000n),
    sAmount: moola(10000n),
    lAmount: moolaLiquidity(10000n),
  };
  const initLiquidityExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000n,
  };

  const { liquidity: lPayout } = await alice.initLiquidityAndCheck(
    t,
    moolaPoolState,
    initLiquidityDetails,
    initLiquidityExpected,
    issuerKeywordRecord,
  );
  await purses[1].deposit(await lPayout);
  moolaPoolState = updatePoolState(moolaPoolState, initLiquidityExpected);

  // Withdraw liquidity -- straightforward
  const liqDetails = {
    cAmount: centralTokens(10000n),
    sAmount: moola(10000n),
    lAmount: moolaLiquidity(10000n),
  };
  const withdraw = { l: 10000n };
  const liqExpected = scaleForRemoveLiquidity(moolaPoolState, withdraw);
  await alice.removeLiquidityAndCheck(
    t,
    moolaPoolState,
    liqDetails,
    liqExpected,
    issuerKeywordRecord,
  );
  moolaPoolState = updatePoolState(moolaPoolState, liqExpected);
});

test('multipoolAutoSwap jig - insufficient', async t => {
  const { moolaR, moola } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  // Pack the contract.
  const bundle = await bundleSource(multipoolAutoswapRoot);
  const installation = await E(zoe).install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(30000n));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(20000n)));

  const startRecord = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
  );

  const {
    /** @type {MultipoolAutoswapPublicFacet} */ publicFacet,
  } = startRecord;
  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();

  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);
  const mIssuerKeywordRecord = {
    Secondary: moolaR.issuer,
    Liquidity: moolaLiquidityIssuer,
  };
  const purses = [
    moolaPurse,
    moolaLiquidityIssuer.makeEmptyPurse(),
    centralPurse,
  ];
  const alice = await makeTrader(purses, zoe, publicFacet, centralR.issuer);

  let mPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initmoolaLiquidityDetails = {
    cAmount: centralTokens(10000n),
    sAmount: moola(10000n),
    lAmount: moolaLiquidity(10000n),
  };
  const initmoolaLiquidityExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000n,
  };
  await alice.initLiquidityAndCheck(
    t,
    mPoolState,
    initmoolaLiquidityDetails,
    initmoolaLiquidityExpected,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, initmoolaLiquidityExpected);

  // trade for central specifying 300 output: moola price 311
  const gain = 300n;
  const mPrice = priceFromTargetOutput(gain, mPoolState.c, mPoolState.s, 30n);
  t.is(mPrice, 311n);

  // provide insufficient moola; trade fails
  const seat = await alice.offerAndTrade(
    centralTokens(gain),
    moola(200n),
    false,
  );
  await t.throwsAsync(
    () => seat.getOfferResult(),
    { message: / is insufficient to buy amountOut / },
    `shouldn't have been able to trade`,
  );
  const { In: refund, Out: payout } = await seat.getPayouts();
  t.deepEqual(await moolaR.issuer.getAmountOf(refund), moola(200n));
  t.deepEqual(await centralR.issuer.getAmountOf(payout), centralTokens(0n));
});

test('multipoolAutoSwap collect empty fees', async t => {
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  const bundle = await bundleSource(multipoolAutoswapRoot);
  const installation = await E(zoe).install(bundle);
  // This timer is only used to build quotes. Let's make it non-zero
  const fakeTimer = buildManualTimer(console.log, 30n);
  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
    { timer: fakeTimer },
  );
  const aliceCollectFeesInvitation = await E(
    creatorFacet,
  ).makeCollectFeesInvitation();

  const feeSeat = await E(zoe).offer(aliceCollectFeesInvitation);
  t.deepEqual(await E(feeSeat).getCurrentAllocation(), {});

  await assertAmountsEqual(
    t,
    await E(publicFacet).getProtocolPoolBalance(),
    centralTokens(0n),
    'no reported fees',
  );

  t.deepEqual(await E(feeSeat).getPayouts(), {});
});

test('multipoolAutoSwap swapout secondary to secondary', async t => {
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitationBrand = await E(invitationIssuer).getBrand();

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);

  // Setup Alice
  const aliceMoolaPayment = moolaR.mint.mintPayment(moola(10000n));
  // Let's assume that central tokens are worth 2x as much as moola
  const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(5000n));
  const aliceSimoleanPayment = simoleanR.mint.mintPayment(simoleans(20000n));

  // Setup Bob
  const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(250n));

  // Alice creates an autoswap instance
  const bundle = await bundleSource(multipoolAutoswapRoot);
  const installation = await E(zoe).install(bundle);
  // This timer is only used to build quotes. Let's make it non-zero
  const fakeTimer = buildManualTimer(console.log, 30n);
  const { instance, publicFacet } = await E(zoe).startInstance(
    installation,
    harden({ Central: centralR.issuer }),
    { timer: fakeTimer },
  );
  const aliceAddLiquidityInvitation = E(
    publicFacet,
  ).makeAddLiquidityInvitation();

  const aliceInvitationAmount = await E(invitationIssuer).getAmountOf(
    aliceAddLiquidityInvitation,
  );
  t.deepEqual(
    aliceInvitationAmount,
    AmountMath.make(
      invitationBrand,
      harden([
        {
          description: 'multipool autoswap add liquidity',
          instance,
          installation,
          handle: aliceInvitationAmount.value[0].handle,
          fee: undefined,
          expiry: undefined,
          zoeTimeAuthority: undefined,
        },
      ]),
    ),
    `invitation value is as expected`,
  );

  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(simoleanLiquidityBrand, value);

  const { toCentral: priceAuthority } = await E(
    publicFacet,
  ).getPriceAuthorities(moolaR.brand);

  const issuerKeywordRecord = await E(zoe).getIssuers(instance);
  t.deepEqual(
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

  // Alice adds liquidity
  // 10 moola = 5 central tokens at the time of the liquidity adding
  // aka 2 moola = 1 central token
  const aliceProposal = harden({
    want: { Liquidity: moolaLiquidity(5000n) },
    give: { Secondary: moola(10000n), Central: centralTokens(5000n) },
  });
  const alicePayments = {
    Secondary: aliceMoolaPayment,
    Central: aliceCentralPayment,
  };

  const addLiquiditySeat = await E(zoe).offer(
    aliceAddLiquidityInvitation,
    aliceProposal,
    alicePayments,
  );

  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Alice added moola and central liquidity`,
  );

  t.deepEqual(
    await E(publicFacet).getPoolAllocation(moolaR.brand),
    harden({
      Secondary: moola(10000n),
      Central: centralTokens(5000n),
      Liquidity: moolaLiquidity(0n),
    }),
    `The poolAmounts record should contain the new liquidity`,
  );

  // Alice adds simoleans and central tokens to the simolean
  // liquidity pool. 200 simoleans = 100 central tokens at the time of
  // the liquidity adding
  //
  const aliceSimCentralLiquidityInvitation = await E(
    publicFacet,
  ).makeAddLiquidityInvitation();
  const aliceSimCentralProposal = harden({
    want: { Liquidity: simoleanLiquidity(10000n) },
    give: { Secondary: simoleans(20000n), Central: centralTokens(10000n) },
  });
  const aliceCentralPayment2 = await centralR.mint.mintPayment(
    centralTokens(10000n),
  );
  const aliceSimCentralPayments = {
    Secondary: aliceSimoleanPayment,
    Central: aliceCentralPayment2,
  };

  const aliceAddLiquiditySeat2 = await E(zoe).offer(
    aliceSimCentralLiquidityInvitation,
    aliceSimCentralProposal,
    aliceSimCentralPayments,
  );

  t.is(
    await aliceAddLiquiditySeat2.getOfferResult(),
    'Added liquidity.',
    `Alice added simoleans and central liquidity`,
  );

  // Bob tries to swap simoleans for moola. This will go through the
  // central token, meaning that two swaps will happen synchronously
  // under the hood.

  // Bob checks the price. Let's say he wants 200 moola, and he
  // wants to know how many simoleans that would cost.
  const priceQuote = await E(publicFacet).getPriceGivenRequiredOutput(
    simoleanR.brand,
    moola(200n),
  );
  t.deepEqual(
    priceQuote,
    {
      amountIn: simoleans(209n),
      amountOut: moola(201n),
    },
    `price is as expected for secondary token to secondary token`,
  );

  const bobInvitation = await E(publicFacet).makeSwapOutInvitation();
  const bobSimsForMoolaProposal = harden({
    want: { Out: moola(200n) },
    give: { In: simoleans(250n) },
  });
  const simsForMoolaPayments = harden({
    In: bobSimoleanPayment,
  });

  const bobSeat = await E(zoe).offer(
    bobInvitation,
    bobSimsForMoolaProposal,
    simsForMoolaPayments,
  );

  const bobSimsPayout = await bobSeat.getPayout('In');
  const bobMoolaPayout = await bobSeat.getPayout('Out');
  t.is(await bobSeat.getOfferResult(), 'Swap successfully completed.');

  const quotePostTrade = await E(priceAuthority).quoteGiven(
    moola(50n),
    centralR.brand,
  );
  t.truthy(
    AmountMath.isEqual(
      getAmountOut(quotePostTrade),
      AmountMath.make(centralR.brand, 25n),
    ),
  );

  const moolaPayoutAmount = await moolaR.issuer.getAmountOf(bobMoolaPayout);
  t.deepEqual(moolaPayoutAmount, moola(201n), `bob gets 201 moola`);
  const simoleansPayoutAmount = await simoleanR.issuer.getAmountOf(
    bobSimsPayout,
  );
  t.deepEqual(
    simoleansPayoutAmount,
    simoleans(41n),
    `bob gets 41 simoleans back because 250 was more than the 209 required`,
  );

  t.deepEqual(
    await E(publicFacet).getPoolAllocation(simoleanR.brand),
    harden({
      // 20000 + 209
      Secondary: simoleans(20209n),
      // 10000 - 103
      Central: centralTokens(9897n),
      Liquidity: simoleanLiquidity(0n),
    }),
    `the simolean liquidity pool gains simoleans and loses central tokens`,
  );
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(moolaR.brand),
    harden({
      // 10000 - 201
      Secondary: moola(9799n),
      // 5000 + 103
      Central: centralTokens(5103n),
      Liquidity: moolaLiquidity(0n),
    }),
    `the moola liquidity pool loses moola and gains central tokens`,
  );
});
