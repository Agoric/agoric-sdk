// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { assert, q } from '@agoric/assert';
import fakeVatAdmin from '../../../../tools/fakeVatAdmin.js';

// noinspection ES6PreferShortImport
import { makeZoeKit } from '../../../../src/zoeService/zoe.js';
import { setup } from '../../setupBasicMints.js';
import {
  makeTrader,
  updatePoolState,
  priceFromTargetOutput,
  outputFromInputPrice,
} from '../../../autoswapJig.js';
import buildManualTimer from '../../../../tools/manualTimer.js';
import {
  getAmountOut,
  multiplyBy,
  makeRatio,
} from '../../../../src/contractSupport/index.js';
import {
  assertAmountsEqual,
  assertPayoutAmount,
} from '../../../zoeTestHelpers.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const newSwapRoot = `${dirname}/../../../../src/contracts/newSwap/multipoolAutoswap.js`;

test('newSwap with valid offers', async t => {
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);
  const invitationIssuer = zoe.getInvitationIssuer();
  const invitationBrand = await E(invitationIssuer).getBrand();

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(value, centralR.brand);

  // Setup Alice
  const aliceMoolaPayment = moolaR.mint.mintPayment(moola(100000));
  // Let's assume that central tokens are worth 2x as much as moola
  const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(50000));
  const aliceSimoleanPayment = simoleanR.mint.mintPayment(simoleans(398));

  // Setup Bob
  const bobMoolaPayment = moolaR.mint.mintPayment(moola(17000));

  // Alice creates an autoswap instance

  // Pack the contract.
  const bundle = await bundleSource(newSwapRoot);

  const installation = await zoe.install(bundle);
  // This timer is only used to build quotes. Let's make it non-zero
  const fakeTimer = buildManualTimer(console.log, 30n);
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
    AmountMath.make(
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
  const moolaLiquidity = value => AmountMath.make(value, moolaLiquidityBrand);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(value, simoleanLiquidityBrand);

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
    want: { Liquidity: moolaLiquidity(50000) },
    give: { Secondary: moola(100000), Central: centralTokens(50000) },
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
    moolaLiquidity(50000),
  );
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(moolaR.brand),
    harden({
      Secondary: moola(100000),
      Central: centralTokens(50000),
      Liquidity: moolaLiquidity(0),
    }),
    `The poolAmounts record should contain the new liquidity`,
  );

  // Bob creates a swap invitation for himself
  const bobSwapInvitation1 = await E(publicFacet).makeSwapInInvitation();

  const { value } = await invitationIssuer.getAmountOf(bobSwapInvitation1);
  assert(Array.isArray(value));
  const [bobInvitationValue] = value;
  const bobPublicFacet = await zoe.getPublicFacet(bobInvitationValue.instance);

  t.is(
    bobInvitationValue.installation,
    installation,
    `installation is as expected`,
  );

  // Bob looks up the price of 17000 moola in central tokens
  const { amountOut: priceInCentrals } = await E(
    bobPublicFacet,
  ).getPriceGivenAvailableInput(moola(17000), centralR.brand);

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {});

  const bobMoolaForCentralProposal = harden({
    want: { Out: priceInCentrals },
    give: { In: moola(17000) },
  });
  const bobMoolaForCentralPayments = harden({ In: bobMoolaPayment });

  // Bob swaps
  const bobSeat = await zoe.offer(
    bobSwapInvitation1,
    bobMoolaForCentralProposal,
    bobMoolaForCentralPayments,
  );

  const protocolFeeRatio = makeRatio(6n, centralR.brand, 10000);
  /** @type {Amount} */
  let runningFees = multiplyBy(priceInCentrals, protocolFeeRatio);
  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    RUN: runningFees,
  });

  const quoteGivenBob = await E(priceAuthority).quoteGiven(
    moola(5000),
    centralR.brand,
  );
  assertAmountsEqual(
    t,
    getAmountOut(quoteGivenBob),
    AmountMath.make(centralR.brand, 1747n),
    `expected amount of 1747, but saw ${q(getAmountOut(quoteGivenBob))}`,
  );

  t.is(await E(bobSeat).getOfferResult(), 'Swap successfully completed.');

  const bobMoolaPayout1 = await bobSeat.getPayout('In');
  const bobCentralPayout1 = await bobSeat.getPayout('Out');

  assertAmountsEqual(
    t,
    await moolaR.issuer.getAmountOf(bobMoolaPayout1),
    moola(0n),
    `bob gets no moola back`,
  );
  assertAmountsEqual(
    t,
    await centralR.issuer.getAmountOf(bobCentralPayout1),
    centralTokens(7246),
    `bob gets the same price as when he called the getInputPrice method`,
  );
  t.deepEqual(
    await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
    {
      Secondary: moola(117000),
      Central: centralTokens(42750),
      Liquidity: moolaLiquidity(0),
    },
    `pool allocation added the moola and subtracted the central tokens`,
  );

  const bobCentralPurse = await E(centralR.issuer).makeEmptyPurse();
  await E(bobCentralPurse).deposit(bobCentralPayout1);

  // Bob looks up the price of 700 central tokens in moola
  const moolaAmounts = await E(bobPublicFacet).getInputPrice(
    centralTokens(700),
    moolaR.brand,
  );
  t.deepEqual(
    moolaAmounts,
    moola(1880),
    `the fee was one moola over the two trades`,
  );

  // Bob makes another offer and swaps
  const bobSwapInvitation2 = await E(bobPublicFacet).makeSwapInInvitation();
  const bobCentralForMoolaProposal = harden({
    want: { Out: moola(1880) },
    give: { In: centralTokens(700) },
  });
  const centralForMoolaPayments = harden({
    In: await E(bobCentralPurse).withdraw(centralTokens(700)),
  });

  const bobSeat2 = await zoe.offer(
    bobSwapInvitation2,
    bobCentralForMoolaProposal,
    centralForMoolaPayments,
  );

  runningFees = AmountMath.add(
    runningFees,
    multiplyBy(centralTokens(700), protocolFeeRatio),
  );
  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    RUN: runningFees,
  });

  t.is(
    await bobSeat2.getOfferResult(),
    'Swap successfully completed.',
    `second swap successful`,
  );

  const quoteBob2 = await E(priceAuthority).quoteGiven(
    moola(5000),
    centralR.brand,
  );
  assertAmountsEqual(
    t,
    getAmountOut(quoteBob2),
    AmountMath.make(centralR.brand, 1803n),
  );

  const bobMoolaPayout2 = await bobSeat2.getPayout('Out');
  const bobCentralPayout2 = await bobSeat2.getPayout('In');

  t.deepEqual(
    await moolaR.issuer.getAmountOf(bobMoolaPayout2),
    moola(1880),
    `bob gets 1880 moola back`,
  );
  t.deepEqual(
    await centralR.issuer.getAmountOf(bobCentralPayout2),
    centralTokens(0),
    `bob gets no central tokens back`,
  );
  t.deepEqual(
    await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
    {
      Secondary: moola(115120),
      Central: centralTokens(43450),
      Liquidity: moolaLiquidity(0),
    },
    `fee added to liquidity pool`,
  );

  // Alice adds simoleans and central tokens to the simolean
  // liquidity pool. 398 simoleans = 43 central tokens at the time of
  // the liquidity adding
  //
  const aliceSimCentralLiquidityInvitation = E(
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
    moola(5000),
    centralR.brand,
  );
  // a simolean trade had no effect on moola prices
  assertAmountsEqual(
    t,
    getAmountOut(quoteLiquidation2),
    AmountMath.make(centralR.brand, 1803n),
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
});

test('newSwap doubleSwap', async t => {
  const { moolaR, simoleanR, moola, simoleans } = setup();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(value, centralR.brand);

  // Setup Alice
  const aliceMoolaPayment = moolaR.mint.mintPayment(moola(100000));
  // Let's assume that central tokens are worth 2x as much as moola
  const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(50000));
  const aliceSimoleanPayment = simoleanR.mint.mintPayment(simoleans(39800));

  // Setup Bob
  const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(4000));
  const bobMoolaPayment = moolaR.mint.mintPayment(moola(5000));

  // Alice creates an autoswap instance
  const bundle = await bundleSource(newSwapRoot);

  const installation = await zoe.install(bundle);
  // This timer is only used to build quotes. Let's make it non-zero
  const fakeTimer = buildManualTimer(console.log, 30n);
  const {
    instance,
    publicFacet,
    creatorFacet,
  } = await zoe.startInstance(
    installation,
    harden({ Central: centralR.issuer }),
    { timer: fakeTimer, poolFee: 24n, protocolFee: 6n },
  );
  const aliceAddLiquidityInvitation = E(
    publicFacet,
  ).makeAddLiquidityInvitation();

  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(value, moolaLiquidityBrand);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(value, simoleanLiquidityBrand);

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

  // Alice adds liquidity for moola
  // 10 moola = 5 central tokens at the time of the liquidity adding
  // aka 2 moola = 1 central token
  const aliceProposal = harden({
    want: { Liquidity: moolaLiquidity(50000) },
    give: { Secondary: moola(100000), Central: centralTokens(50000) },
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
  await addLiquiditySeat.getPayout('Liquidity');

  // Alice adds simoleans and central tokens to the simolean
  // liquidity pool. 398 simoleans = 43 central tokens at the time of
  // the liquidity adding
  //
  const aliceSimLiquidityInvitation = E(
    publicFacet,
  ).makeAddLiquidityInvitation();
  const aliceSimCentralProposal = harden({
    want: { Liquidity: simoleanLiquidity(430) },
    give: { Secondary: simoleans(39800), Central: centralTokens(43000) },
  });
  const aliceCentralPayment2 = await centralR.mint.mintPayment(
    centralTokens(43000),
  );
  const aliceSimCentralPayments = {
    Secondary: aliceSimoleanPayment,
    Central: aliceCentralPayment2,
  };

  const aliceSeat2 = await zoe.offer(
    aliceSimLiquidityInvitation,
    aliceSimCentralProposal,
    aliceSimCentralPayments,
  );

  t.is(
    await aliceSeat2.getOfferResult(),
    'Added liquidity.',
    `Alice added simoleans and central liquidity`,
  );

  // Bob swaps moola for simoleans

  // Bob looks up the value of 4000 simoleans in moola
  const { amountOut: priceInMoola } = await E(
    publicFacet,
  ).getPriceGivenAvailableInput(simoleans(4000), moolaR.brand);

  const bobInvitation = await E(publicFacet).makeSwapInInvitation();
  const bobSimsForMoolaProposal = harden({
    want: { Out: priceInMoola },
    give: { In: simoleans(4000) },
  });
  const simsForMoolaPayments = harden({
    In: bobSimoleanPayment,
  });

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {});

  const bobSeat1 = await zoe.offer(
    bobInvitation,
    bobSimsForMoolaProposal,
    simsForMoolaPayments,
  );
  const bobMoolaPayout = await bobSeat1.getPayout('Out');

  t.deepEqual(
    await moolaR.issuer.getAmountOf(bobMoolaPayout),
    moola(7261),
    `bob gets 7261 moola`,
  );

  let runningFees = AmountMath.make(centralR.brand, 2n);
  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    RUN: runningFees,
  });

  // Bob swaps simoleans for moola

  // Bob looks up the value of 5000 moola in simoleans
  const { amountOut: priceInSimoleans } = await E(
    publicFacet,
  ).getPriceGivenAvailableInput(moola(5000), simoleanR.brand);

  const bobInvitation2 = await E(publicFacet).makeSwapInInvitation();
  const bobMoolaForSimsProposal = harden({
    want: { Out: priceInSimoleans },
    give: { In: moola(5000) },
  });
  const moolaForSimsPayments = harden({
    In: bobMoolaPayment,
  });

  const bobSeat2 = await zoe.offer(
    bobInvitation2,
    bobMoolaForSimsProposal,
    moolaForSimsPayments,
  );
  const bobSimoleanPayout = await bobSeat2.getPayout('Out');

  t.deepEqual(
    await simoleanR.issuer.getAmountOf(bobSimoleanPayout),
    simoleans(2880),
    `bob gets 2880 simoleans`,
  );

  runningFees = AmountMath.add(
    runningFees,
    AmountMath.make(centralR.brand, 1n),
  );
  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    RUN: runningFees,
  });

  const collectFeesInvitation = E(creatorFacet).makeCollectFeesInvitation();
  const collectFeesSeat = await zoe.offer(
    collectFeesInvitation,
    undefined,
    undefined,
  );

  const payout = await E(collectFeesSeat).getPayout('RUN');

  await assertPayoutAmount(t, centralR.issuer, payout, runningFees);

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    RUN: AmountMath.makeEmpty(centralR.brand),
  });
});

test('newSwap with some invalid offers', async t => {
  const { moolaR, moola } = setup();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);
  const invitationIssuer = zoe.getInvitationIssuer();

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(value, centralR.brand);

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

  const { value } = await invitationIssuer.getAmountOf(bobSwapInvitation1);
  assert(Array.isArray(value));
  const [bobInvitationValue] = value;
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

test('newSwap jig - swapOut uneven', async t => {
  const { moolaR, moola, simoleanR, simoleans } = setup();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  // Pack the contract.
  const bundle = await bundleSource(newSwapRoot);
  const installation = await zoe.install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(value, centralR.brand);

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
    creatorFacet,
  } = startRecord;
  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(value, moolaLiquidityBrand);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(value, simoleanLiquidityBrand);
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

  // trade for central specifying 30000 output: moola price 15082
  // Notice that it takes half as much moola as the desired Central
  const cGain = 30000n;
  // The pool will be charged the protocol fee on top of deltaY
  const protocolFee = (cGain * 6n) / (10000n - 6n);
  const deltaY = priceFromTargetOutput(
    cGain + protocolFee,
    mPoolState.c,
    mPoolState.s,
    24n,
  );
  const deltaX = outputFromInputPrice(mPoolState.s, mPoolState.c, deltaY, 24n);

  // overpay
  const moolaIn = 16000n;
  const tradeDetailsB = {
    inAmount: moola(moolaIn),
    outAmount: centralTokens(deltaX - protocolFee),
  };

  const expectedB = {
    c: mPoolState.c - deltaX,
    s: mPoolState.s + deltaY,
    l: 10000000n,
    k: (mPoolState.c - deltaX) * (mPoolState.s + deltaY),
    out: deltaX - protocolFee,
    in: moolaIn - deltaY,
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

  let expectedPoolBalance = protocolFee;
  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    RUN: AmountMath.make(centralR.brand, expectedPoolBalance),
  });

  // trade for moola specifying 2500 moola output: central price: 496, roughly double.
  const gainM = 25000n;
  const mPriceC = priceFromTargetOutput(gainM, mPoolState.s, mPoolState.c, 24n);

  t.is(mPriceC, 50070n);
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
    c: mPoolState.c + mPriceC,
    s: mPoolState.s - actualGainM,
    l: 10000000n,
    k: (mPoolState.c + mPriceC) * (mPoolState.s - actualGainM),
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

  expectedPoolBalance += expectedProtocolCharge2;
  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    RUN: AmountMath.make(centralR.brand, expectedPoolBalance),
  });

  mPoolState = updatePoolState(mPoolState, expectedC);

  const collectFeesInvitation = E(creatorFacet).makeCollectFeesInvitation();
  const collectFeesSeat = await zoe.offer(
    collectFeesInvitation,
    undefined,
    undefined,
  );

  const payout = await E(collectFeesSeat).getPayout('RUN');

  await assertPayoutAmount(
    t,
    centralR.issuer,
    payout,
    AmountMath.make(centralR.brand, expectedPoolBalance),
  );

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    RUN: AmountMath.makeEmpty(centralR.brand),
  });
});

test('newSwap jig - breaking scenario', async t => {
  const { moolaR, moola, simoleanR } = setup();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  // Pack the contract.
  const bundle = await bundleSource(newSwapRoot);
  const installation = await zoe.install(bundle);

  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(value, centralR.brand);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(
    centralTokens(55825056949339n),
  );
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(2396247730468n + 4145005n)));

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
  const moolaLiquidity = value => AmountMath.make(value, moolaLiquidityBrand);

  const simoleanLiquidityIssuer = await E(publicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const mIssuerKeywordRecord = {
    Secondary: moolaR.issuer,
    Liquidity: moolaLiquidityIssuer,
  };
  const purses = [
    moolaPurse,
    moolaLiquidityIssuer.makeEmptyPurse(),
    centralPurse,
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
    cAmount: centralTokens(50825056949339n),
    sAmount: moola(2196247730468n),
    lAmount: moolaLiquidity(50825056949339n),
  };
  const initMoolaLiquidityExpected = {
    c: 50825056949339n,
    s: 2196247730468n,
    l: 50825056949339n,
    k: 50825056949339n * 2196247730468n,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: 50825056949339n,
  };
  await alice.initLiquidityAndCheck(
    t,
    mPoolState,
    initMoolaLiquidityDetails,
    initMoolaLiquidityExpected,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, initMoolaLiquidityExpected);

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {});

  const quoteFromRun = await E(publicFacet).getPriceGivenAvailableInput(
    centralTokens(73000000n),
    moolaR.brand,
  );
  t.deepEqual(quoteFromRun, {
    amountIn: centralTokens(72999997n),
    amountOut: moola(3145007n),
  });

  const newQuoteFromRun = await E(publicFacet).getPriceGivenAvailableInput(
    quoteFromRun.amountIn,
    moolaR.brand,
  );

  t.truthy(AmountMath.isGTE(quoteFromRun.amountIn, newQuoteFromRun.amountIn));
  t.truthy(AmountMath.isGTE(newQuoteFromRun.amountOut, quoteFromRun.amountOut));

  const quoteToRun = await E(publicFacet).getPriceGivenRequiredOutput(
    moolaR.brand,
    centralTokens(370000000n),
  );
  const newQuoteToRun = await E(publicFacet).getPriceGivenRequiredOutput(
    moolaR.brand,
    quoteToRun.amountOut,
  );
  t.deepEqual(quoteToRun.amountIn, newQuoteToRun.amountIn);
  t.deepEqual(newQuoteToRun.amountOut, quoteToRun.amountOut);
});

// This demonstrates that Zoe can reallocate empty amounts. i.e. that
// https://github.com/Agoric/agoric-sdk/issues/3033 stays fixed
test('zoe allow empty reallocations', async t => {
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  // Set up central token
  const { issuer, brand } = makeIssuerKit('central');

  // Alice creates an autoswap instance
  const bundle = await bundleSource(newSwapRoot);

  const installation = await zoe.install(bundle);
  // This timer is only used to build quotes. Let's make it non-zero
  const fakeTimer = buildManualTimer(console.log, 30n);
  const { creatorFacet } = await zoe.startInstance(
    installation,
    harden({ Central: issuer }),
    { timer: fakeTimer, poolFee: 24n, protocolFee: 6n },
  );

  const collectFeesInvitation2 = E(creatorFacet).makeCollectFeesInvitation();
  const collectFeesSeat2 = await zoe.offer(
    collectFeesInvitation2,
    undefined,
    undefined,
  );

  const payout = await E(collectFeesSeat2).getPayout('RUN');
  const result = await E(collectFeesSeat2).getOfferResult();

  t.deepEqual(result, 'paid out 0');
  await assertPayoutAmount(t, issuer, payout, AmountMath.makeEmpty(brand));
});
