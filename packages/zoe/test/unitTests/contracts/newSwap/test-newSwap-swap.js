/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, amountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { q } from '@agoric/assert';
import fakeVatAdmin from '../../../../src/contractFacet/fakeVatAdmin';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../../src/zoeService/zoe';
import { setup } from '../../setupBasicMints';
import {
  makeTrader,
  updatePoolState,
  priceFromTargetOutput,
  outputFromInputPrice,
} from '../../../autoswapJig';
import buildManualTimer from '../../../../tools/manualTimer';
import { getAmountOut } from '../../../../src/contractSupport';

const newSwapRoot = `${__dirname}/../../../../src/contracts/newSwap/multipoolAutoswap`;

test('multipoolAutoSwap with valid offers', async t => {
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const zoe = makeZoe(fakeVatAdmin);
  const invitationIssuer = zoe.getInvitationIssuer();
  const invitationBrand = await E(invitationIssuer).getBrand();

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => amountMath.make(value, centralR.brand);

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
  const bundle = await bundleSource(newSwapRoot);

  const installation = await zoe.install(bundle);
  // This timer is only used to build quotes. Let's make it non-zero
  const fakeTimer = buildManualTimer(console.log, 30);
  const { instance, publicFacet } = await zoe.startInstance(
    installation,
    harden({ Central: centralR.issuer }),
    { timer: fakeTimer, poolFee: 24n, protocolFee: 6n },
  );
  const aliceAddLiquidityInvitation = E(
    publicFacet,
  ).makeAddLiquidityInvitation();

  const aliceInvitationAmount = await invitationIssuer.getAmountOf(
    aliceAddLiquidityInvitation,
  );
  t.deepEqual(
    aliceInvitationAmount,
    amountMath.make(
      [
        {
          description: 'multipool autoswap add liquidity',
          instance,
          installation,
          handle: aliceInvitationAmount.value[0].handle,
        },
      ],
      invitationBrand,
    ),
    `invitation value is as expected`,
  );

  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => amountMath.make(value, moolaLiquidityBrand);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    amountMath.make(value, simoleanLiquidityBrand);

  const quoteIssuer = await E(publicFacet).getQuoteIssuer();
  const { toCentral: priceAuthority } = await E(
    publicFacet,
  ).getPriceAuthorities(moolaR.brand);

  const issuerKeywordRecord = zoe.getIssuers(instance);
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

  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Alice added moola and central liquidity`,
  );

  const liquidityPayout = await addLiquiditySeat.getPayout('Liquidity');

  t.deepEqual(
    await moolaLiquidityIssuer.getAmountOf(liquidityPayout),
    moolaLiquidity(50),
  );
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(moolaR.brand),
    harden({
      Secondary: moola(100),
      Central: centralTokens(50),
      Liquidity: moolaLiquidity(0),
    }),
    `The poolAmounts record should contain the new liquidity`,
  );

  const quotePostLiquidity = await E(priceAuthority).quoteGiven(
    moola(50),
    centralR.brand,
  );
  t.truthy(
    amountMath.isEqual(
      await quoteIssuer.getAmountOf(quotePostLiquidity.quotePayment),
      quotePostLiquidity.quoteAmount,
    ),
  );
  t.truthy(
    amountMath.isEqual(
      getAmountOut(quotePostLiquidity),
      amountMath.make(16, centralR.brand),
    ),
  );

  // Bob creates a swap invitation for himself
  const bobSwapInvitation1 = await E(publicFacet).makeSwapInInvitation();

  const {
    value: [bobInvitationValue],
  } = await invitationIssuer.getAmountOf(bobSwapInvitation1);
  const bobPublicFacet = await zoe.getPublicFacet(bobInvitationValue.instance);

  t.is(
    bobInvitationValue.installation,
    installation,
    `installation is as expected`,
  );

  // Bob looks up the price of 17 moola in central tokens
  const priceInCentrals = await E(bobPublicFacet).getInputPrice(
    moola(17),
    centralR.brand,
  );
  t.deepEqual(
    priceInCentrals,
    centralTokens(7),
    `price in central tokens of 7 moola is as expected`,
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
  const quoteGivenBob = await E(priceAuthority).quoteGiven(
    moola(50),
    centralR.brand,
  );
  t.truthy(
    amountMath.isEqual(
      getAmountOut(quoteGivenBob),
      amountMath.make(12, centralR.brand),
    ),
    `expected amount of 12, but saw ${q(getAmountOut(quoteGivenBob))}`,
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
    centralTokens(7),
    `bob gets the same price as when he called the getInputPrice method`,
  );
  t.deepEqual(
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
  const moolaAmounts = await E(bobPublicFacet).getInputPrice(
    centralTokens(7),
    moolaR.brand,
  );
  t.deepEqual(
    moolaAmounts,
    moola(16),
    `the fee was one moola over the two trades`,
  );

  // Bob makes another offer and swaps
  const bobSwapInvitation2 = await E(bobPublicFacet).makeSwapInInvitation();
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

  t.is(
    await bobSeat2.getOfferResult(),
    'Swap successfully completed.',
    `second swap successful`,
  );

  const quoteBob2 = await E(priceAuthority).quoteGiven(
    moola(50),
    centralR.brand,
  );
  t.truthy(
    amountMath.isEqual(
      getAmountOut(quoteBob2),
      amountMath.make(16, centralR.brand),
    ),
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

  const quoteLiquidation2 = await E(priceAuthority).quoteGiven(
    moola(50),
    centralR.brand,
  );
  // a simolean trade had no effect
  t.truthy(
    amountMath.isEqual(
      getAmountOut(quoteLiquidation2),
      amountMath.make(16, centralR.brand),
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
    simoleanLiquidity(43),
    `simoleanLiquidity minted was equal to the amount of central tokens added to pool`,
  );
  t.deepEqual(
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

  const priceInMoola = await E(bobPublicFacet).getInputPrice(
    simoleans(74),
    moolaR.brand,
  );
  t.deepEqual(
    priceInMoola,
    moola(10),
    `price is as expected for secondary token to secondary token`,
  );

  // This is the same as making two synchronous exchanges
  const priceInCentral = await E(bobPublicFacet).getInputPrice(
    simoleans(74),
    centralR.brand,
  );
  t.deepEqual(
    priceInCentral,
    centralTokens(6),
    `price is as expected for secondary token to central`,
  );

  const centralPriceInMoola = await E(bobPublicFacet).getInputPrice(
    centralTokens(6),
    moolaR.brand,
  );
  t.deepEqual(
    centralPriceInMoola,
    moola(10),
    `price is as expected for secondary token to secondary token`,
  );

  const bobThirdInvitation = await E(bobPublicFacet).makeSwapInInvitation();
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

  const quotePostTrade = await E(priceAuthority).quoteGiven(
    moola(50),
    centralR.brand,
  );
  t.truthy(
    amountMath.isEqual(
      getAmountOut(quotePostTrade),
      amountMath.make(19, centralR.brand),
    ),
  );

  t.deepEqual(
    await moolaR.issuer.getAmountOf(bobMoolaPayout3),
    moola(10),
    `bob gets 10 moola`,
  );
  t.deepEqual(
    await simoleanR.issuer.getAmountOf(bobSimsPayout3),
    simoleans(9),
    `bob gets 9 simoleans back because 74 was more than required`,
  );

  t.deepEqual(
    await E(bobPublicFacet).getPoolAllocation(simoleanR.brand),
    harden({
      // 398 + 65
      Secondary: simoleans(463),
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

  t.is(await aliceSeat3.getOfferResult(), 'Liquidity successfully removed.');

  const aliceMoolaPayout = await aliceSeat3.getPayout('Secondary');
  const aliceCentralPayout = await aliceSeat3.getPayout('Central');
  const aliceLiquidityPayout = await aliceSeat3.getPayout('Liquidity');

  t.deepEqual(
    await moolaR.issuer.getAmountOf(aliceMoolaPayout),
    moola(91),
    `alice gets all the moola in the pool`,
  );
  t.deepEqual(
    await centralR.issuer.getAmountOf(aliceCentralPayout),
    centralTokens(56),
    `alice gets all the central tokens in the pool`,
  );
  t.deepEqual(
    await moolaLiquidityIssuer.getAmountOf(aliceLiquidityPayout),
    moolaLiquidity(0),
    `alice gets no liquidity tokens`,
  );
  t.deepEqual(
    await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
    harden({
      Secondary: moola(0n),
      Central: centralTokens(0),
      Liquidity: moolaLiquidity(50),
    }),
    `liquidity is empty`,
  );

  t.deepEqual(await E(publicFacet).getAllPoolBrands(), [
    moolaR.brand,
    simoleanR.brand,
  ]);
});

test('multipoolAutoSwap with some invalid offers', async t => {
  const { moolaR, moola } = setup();
  const zoe = makeZoe(fakeVatAdmin);
  const invitationIssuer = zoe.getInvitationIssuer();

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => amountMath.make(value, centralR.brand);

  // Setup Bob
  const bobMoolaPayment = moolaR.mint.mintPayment(moola(17));

  // Alice creates an autoswap instance

  // Pack the contract.
  const bundle = await bundleSource(newSwapRoot);

  const fakeTimer = buildManualTimer(console.log);
  const installation = await zoe.install(bundle);
  const { publicFacet } = await zoe.startInstance(
    installation,
    harden({ Central: centralR.issuer }),
    { timer: fakeTimer, poolFee: 24n, protocolFee: 6n },
  );

  await E(publicFacet).addPool(moolaR.issuer, 'Moola');
  // Bob creates a swap invitation for himself
  const bobSwapInvitation1 = await E(publicFacet).makeSwapInInvitation();

  const {
    value: [bobInvitationValue],
  } = await invitationIssuer.getAmountOf(bobSwapInvitation1);
  const bobPublicFacet = zoe.getPublicFacet(bobInvitationValue.instance);

  // Bob tries to look up prices, but the pool isn't initiailzed
  await t.throwsAsync(
    () => E(bobPublicFacet).getInputPrice(moola(5), centralR.brand),
    { message: 'pool not initialized' },
    'pool not initialized',
  );

  // Bob tries to trade anyway.
  const bobMoolaForCentralProposal = harden({
    want: { Out: centralTokens(7) },
    give: { In: moola(17) },
  });
  const bobMoolaForCentralPayments = harden({ In: bobMoolaPayment });

  // Bob swaps
  const failedSeat = await zoe.offer(
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

test('multipoolAutoSwap jig - swapOut', async t => {
  const { moolaR, moola, simoleanR, simoleans } = setup();
  const zoe = makeZoe(fakeVatAdmin);

  // Pack the contract.
  const bundle = await bundleSource(newSwapRoot);
  const installation = await zoe.install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => amountMath.make(value, centralR.brand);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(30000));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(20000)));
  const simoleanPurse = simoleanR.issuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanR.mint.mintPayment(simoleans(20000)));

  const fakeTimer = buildManualTimer(console.log);
  const startRecord = await zoe.startInstance(
    installation,
    harden({ Central: centralR.issuer }),
    { timer: fakeTimer, poolFee: 24n, protocolFee: 6n },
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
  const moolaLiquidity = value => amountMath.make(value, moolaLiquidityBrand);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    amountMath.make(value, simoleanLiquidityBrand);
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
  const initMoolaLiquidityDetails = {
    cAmount: centralTokens(10000),
    sAmount: moola(10000),
    lAmount: moolaLiquidity(10000),
  };
  const initMoolaLiquidityExpected = {
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
    initMoolaLiquidityDetails,
    initMoolaLiquidityExpected,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, initMoolaLiquidityExpected);

  let sPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initSimoleanLiquidityDetails = {
    cAmount: centralTokens(10000),
    sAmount: simoleans(10000),
    lAmount: simoleanLiquidity(10000),
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
    initSimoleanLiquidityDetails,
    initSimLiqExpected,
    sIssuerKeywordRecord,
  );
  sPoolState = updatePoolState(sPoolState, initSimLiqExpected);

  // trade for central specifying 300 output: moola price 311
  const gain = 300n;
  const mPrice = priceFromTargetOutput(gain, mPoolState.c, mPoolState.s, 30n);
  t.is(mPrice, 311n);

  const tradeDetailsB = {
    inAmount: moola(500),
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

test.only('multipoolAutoSwap jig - swapOut uneven', async t => {
  const { moolaR, moola, simoleanR, simoleans } = setup();
  const zoe = makeZoe(fakeVatAdmin);

  // Pack the contract.
  const bundle = await bundleSource(newSwapRoot);
  const installation = await zoe.install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => amountMath.make(value, centralR.brand);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(30000000));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(20000000)));
  const simoleanPurse = simoleanR.issuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanR.mint.mintPayment(simoleans(20000000)));

  const fakeTimer = buildManualTimer(console.log);
  const startRecord = await zoe.startInstance(
    installation,
    harden({ Central: centralR.issuer }),
    { timer: fakeTimer, poolFee: 24n, protocolFee: 6n },
  );

  const {
    /** @type {MultipoolAutoswapPublicFacet} */ publicFacet,
  } = startRecord;
  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => amountMath.make(value, moolaLiquidityBrand);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    amountMath.make(value, simoleanLiquidityBrand);
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
  const initMoolaLiquidityDetails = {
    cAmount: centralTokens(10000000),
    sAmount: moola(5000000),
    lAmount: moolaLiquidity(10000000),
  };
  const initMoolaLiquidityExpected = {
    c: 10000000n,
    s: 5000000n,
    l: 10000000n,
    k: 50000000000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000000n,
  };
  await alice.initLiquidityAndCheck(
    t,
    mPoolState,
    initMoolaLiquidityDetails,
    initMoolaLiquidityExpected,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, initMoolaLiquidityExpected);

  let sPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initSimoleanLiquidityDetails = {
    cAmount: centralTokens(10000000),
    sAmount: simoleans(10000000),
    lAmount: simoleanLiquidity(10000000),
  };
  const initSimLiqExpected = {
    c: 10000000n,
    s: 10000000n,
    l: 10000000n,
    k: 100000000000000n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 10000000n,
  };
  const sIssuerKeywordRecord = {
    Secondary: simoleanR.issuer,
    Liquidity: simoleanLiquidityIssuer,
  };

  await alice.initLiquidityAndCheck(
    t,
    sPoolState,
    initSimoleanLiquidityDetails,
    initSimLiqExpected,
    sIssuerKeywordRecord,
  );
  sPoolState = updatePoolState(sPoolState, initSimLiqExpected);

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {});

  // trade for central specifying 30000 output: moola price 156
  // Notice that it takes half as much moola as the desired Central
  const mGain = 30000n;
  const mPrice = priceFromTargetOutput(mGain, mPoolState.c, mPoolState.s, 24n);
  const actualGain = outputFromInputPrice(
    mPoolState.s,
    mPoolState.c,
    mPrice,
    24n,
  );

  const moolaIn = 16000n;
  t.is(mPrice, 15082n);
  const tradeDetailsB = {
    inAmount: moola(moolaIn),
    outAmount: centralTokens(actualGain),
  };

  // The trader will get the calculated amount less the protocol fee. The pool
  // will pay the protocolFee
  const expectedProtocolCharge = (actualGain * 6n) / 10000n;

  const expectedB = {
    c: mPoolState.c - actualGain - expectedProtocolCharge,
    s: mPoolState.s + mPrice,
    l: 10000000n,
    k: (mPoolState.c - actualGain) * (mPoolState.s + mPrice),
    out: actualGain,
    in: moolaIn - mPrice,
  };

  console.log(`about to fail because in (${expectedB.in}) is wrong`);

  await alice.tradeAndCheck(
    t,
    false,
    mPoolState,
    tradeDetailsB,
    expectedB,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, expectedB);

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    Central: expectedProtocolCharge,
  });

  // trade for moola specifying 2500 moola output: central price: 496, roughly double.
  const gainC = 2500n;
  const mPriceC = priceFromTargetOutput(gainC, mPoolState.s, mPoolState.c, 24n);

  // HUH?   Why doesn't this fail?  I multiplied inputs by 10

  console.log(`${mPriceC} is not 496`);

  t.is(mPriceC, 496n, 'complain');
  t.deepEqual(mPriceC, 496n, 'complain');
  t.truthy(mPriceC === 496n, 'complain');

  const actualGainM = outputFromInputPrice(
    mPoolState.c,
    mPoolState.s,
    mPriceC,
    24n,
  );

  // The price will be deltaX + protocolFee. The user will pay this to the pool
  const expectedProtocolCharge2 = (mPriceC * 6n) / 10000n;

  const tradeDetailsC = {
    inAmount: centralTokens(mPriceC + expectedProtocolCharge2),
    outAmount: moola(actualGainM),
  };

  const expectedC = {
    c: mPoolState.c + mPriceC + expectedProtocolCharge2,
    s: mPoolState.s - actualGainM,
    l: 10000000n,
    k:
      (mPoolState.c + mPriceC + expectedProtocolCharge2) *
      (mPoolState.s - actualGainM),
    out: actualGainM,
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
