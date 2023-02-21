// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import {
  ceilMultiplyBy,
  getAmountOut,
  makeRatio,
  natSafeMath,
} from '@agoric/zoe/src/contractSupport/index.js';
import {
  makeTrader,
  outputFromInputPrice,
  priceFromTargetOutput,
  updatePoolState,
} from '@agoric/zoe/test/autoswapJig.js';
import {
  assertAmountsEqual,
  assertPayoutAmount,
} from '@agoric/zoe/test/zoeTestHelpers.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import { BASIS_POINTS } from '../../../src/vpool-xyk-amm/constantProduct/defaults.js';
import { subscriptionTracker } from '../../metrics.js';
import { subscriptionKey } from '../../supports.js';
import { setupAmmServices } from './setup.js';

const { quote: q } = assert;
const { ceilDivide } = natSafeMath;

test.before(async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  t.context = { bundleCache };
});

const initPoolCentral = 1_500_000_000n;
const initPoolSecondary = 300_000_000n;

const makePoolWithLiquidity = async (t, zoe, amm, secondR, centralR, kwd) => {
  const moola = value => AmountMath.make(secondR.brand, value);
  const c = value => AmountMath.make(centralR.brand, value);

  const liquidityIssuer = await E(amm.ammPublicFacet).addIssuer(
    secondR.issuer,
    kwd,
  );
  const liquidityBrand = await E(liquidityIssuer).getBrand();
  const addPoolInvitation = await E(amm.ammPublicFacet).addPoolInvitation();

  const proposal = harden({
    give: {
      Secondary: moola(initPoolSecondary),
      Central: c(initPoolCentral),
    },
    want: { Liquidity: AmountMath.make(liquidityBrand, 1000n) },
  });
  const payments = {
    Secondary: secondR.mint.mintPayment(moola(initPoolSecondary)),
    Central: centralR.mint.mintPayment(c(initPoolCentral)),
  };

  const addLiquiditySeat = await E(zoe).offer(
    addPoolInvitation,
    proposal,
    payments,
  );
  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Added Secondary and Central Liquidity`,
  );

  return { seat: addLiquiditySeat, liquidityIssuer };
};

/**
 * @param {IssuerKit} issuerRecord
 * @param {bigint} value
 */
const makePurseWith = (issuerRecord, value) => {
  const purse = issuerRecord.issuer.makeEmptyPurse();
  const amount = AmountMath.make(issuerRecord.brand, value);
  purse.deposit(issuerRecord.mint.mintPayment(amount));
  return purse;
};

test('amm with non-fungible central token', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central', AssetKind.SET);
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(t.log, 30n);

  await t.throwsAsync(
    () => setupAmmServices(t, electorateTerms, centralR, timer),
    {
      message: `Central must be of kind ${q(AssetKind.NAT)}, not ${q(
        AssetKind.SET,
      )}`,
    },
    'test AssetKind.SET as central brand',
  );
});

test('amm with valid offers', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  /** @param {NatValue} value */
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaKit = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaKit.brand, value);
  const simoleanKit = makeIssuerKit('simoleans');
  const simoleans = value => AmountMath.make(simoleanKit.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };

  const timer = buildManualTimer(t.log, 30n);
  const protocolFeeRatio = makeRatio(6n, centralR.brand, BASIS_POINTS);

  const { zoe, amm } = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
  );
  const publicFacet = amm.ammPublicFacet;
  const alicePurses = [
    makePurseWith(moolaKit, 100_000n),
    makePurseWith(centralR, 50_000n + 4300n),
    makePurseWith(simoleanKit, 39800n),
  ];
  const alice = await makeTrader(
    alicePurses,
    zoe,
    publicFacet,
    centralR.issuer,
  );

  const cAmount = centralTokens(50_000n);
  const sAmount = moola(100_000n);
  const aliceDetails = { cAmount, sAmount, liquidityValue: 49_000n };
  const aliceExpected = {
    c: 50_000n,
    s: 100_000n,
    l: 50_000n,
    k: 50_000n * 100_000n,
  };
  const { liquidityIssuer } = await alice.addLiquidPoolAndCheck(
    t,
    aliceDetails,
    aliceExpected,
    moolaKit.issuer,
    'Moola',
  );

  const moolaLiquidityBrand = await E(liquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const moolaPools = {
    Secondary: 100_000n,
    Central: 50000n,
  };

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {});

  const bobStartingMoola = 17_000n;
  const bobPurses = [
    makePurseWith(moolaKit, bobStartingMoola),
    makePurseWith(centralR, 700n),
  ];
  const bob = await makeTrader(bobPurses, zoe, publicFacet, centralR.issuer);

  // Bob looks up what 17000 moola is worth in central tokens
  const { amountOut: priceInCentrals, amountIn: costInMoola } = await E(
    publicFacet,
  ).getInputPrice(
    moola(bobStartingMoola),
    AmountMath.makeEmpty(centralR.brand),
  );

  const bobSeat = await bob.offerAndTrade(
    priceInCentrals,
    moola(bobStartingMoola),
    true,
  );

  let runningFees = ceilMultiplyBy(priceInCentrals, protocolFeeRatio);
  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    Fee: runningFees,
  });

  const bobMoolaPayout1 = await E(bobSeat).getPayout('In');
  const bobCentralPayout1 = await E(bobSeat).getPayout('Out');

  assertAmountsEqual(
    t,
    await E(moolaKit.issuer).getAmountOf(bobMoolaPayout1),
    AmountMath.subtract(moola(bobStartingMoola), costInMoola),
    `bob might get moola back`,
  );

  assertAmountsEqual(
    t,
    await E(centralR.issuer).getAmountOf(bobCentralPayout1),
    priceInCentrals,
    `bob gets the same price as when he called the getInputPrice method`,
  );

  moolaPools.Secondary += costInMoola.value;
  moolaPools.Central -= AmountMath.add(priceInCentrals, runningFees).value;

  t.deepEqual(
    await E(publicFacet).getPoolAllocation(moolaKit.brand),
    {
      Secondary: moola(moolaPools.Secondary),
      Central: centralTokens(moolaPools.Central),
      Liquidity: moolaLiquidity(0n),
    },
    `pool allocation added the moola and subtracted the central tokens`,
  );

  const bobCentralPurse = await E(centralR.issuer).makeEmptyPurse();
  await E(bobCentralPurse).deposit(bobCentralPayout1);

  // Bob looks up how much 700 central tokens are worth in moola
  const priceFor700 = await E(publicFacet).getInputPrice(
    centralTokens(700n),
    AmountMath.makeEmpty(moolaKit.brand),
  );
  t.deepEqual(
    priceFor700,
    {
      amountOut: moola(1877n),
      amountIn: centralTokens(700n),
    },
    `the fee was one moola over the two trades`,
  );

  // Bob makes another offer and swaps
  const bobSeat2 = await bob.offerAndTrade(
    moola(1877n),
    centralTokens(700n),
    true,
  );

  runningFees = AmountMath.add(
    runningFees,
    ceilMultiplyBy(centralTokens(700n), protocolFeeRatio),
  );
  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    Fee: runningFees,
  });

  t.is(
    await E(bobSeat2).getOfferResult(),
    'Swap successfully completed.',
    `second swap successful`,
  );

  const { toCentral: priceAuthority } = await E(
    publicFacet,
  ).getPriceAuthorities(moolaKit.brand);

  const quoteBob2 = await E(priceAuthority).quoteGiven(
    moola(5000n),
    centralR.brand,
  );
  assertAmountsEqual(
    t,
    getAmountOut(quoteBob2),
    AmountMath.make(centralR.brand, 1801n),
  );

  const bobMoolaPayout2 = await E(bobSeat2).getPayout('Out');
  const bobCentralPayout2 = await E(bobSeat2).getPayout('In');

  t.deepEqual(
    await E(moolaKit.issuer).getAmountOf(bobMoolaPayout2),
    moola(1877n),
    `bob gets 1877 moola back`,
  );
  t.deepEqual(
    await E(centralR.issuer).getAmountOf(bobCentralPayout2),
    centralTokens(0n),
    `bob gets no central tokens back`,
  );
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(moolaKit.brand),
    {
      Secondary: moola(115121n),
      Central: centralTokens(43453n),
      Liquidity: moolaLiquidity(0n),
    },
    `fee added to liquidity pool`,
  );

  // Alice adds simoleans and central tokens to the simolean
  // liquidity pool. 39800 simoleans = 4300 central tokens at the time of
  // the liquidity adding

  const simoleanLiquidityDetail = {
    cAmount: centralTokens(4300n),
    sAmount: simoleans(39800n),
    liquidityValue: 3300n,
  };
  const simoleanLiquidityExpected = {
    c: 4300n,
    s: 39800n,
    l: 4300n,
    k: 4300n * 39800n,
  };
  const { liquidityIssuer: simoleanLiquidityIssuer, seat: aliceSeat2 } =
    await alice.addLiquidPoolAndCheck(
      t,
      simoleanLiquidityDetail,
      simoleanLiquidityExpected,
      simoleanKit.issuer,
      'Simoleans',
    );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(simoleanLiquidityBrand, value);
  const quoteLiquidation2 = await E(priceAuthority).quoteGiven(
    moola(5000n),
    centralR.brand,
  );
  // a simolean trade had no effect on moola prices
  assertAmountsEqual(
    t,
    getAmountOut(quoteLiquidation2),
    AmountMath.make(centralR.brand, 1801n),
  );
  t.is(
    await E(aliceSeat2).getOfferResult(),
    'Added liquidity.',
    `Alice added simoleans and central liquidity`,
  );

  const simoleanLiquidityPayout = await E(aliceSeat2).getPayout('Liquidity');

  t.deepEqual(
    await E(simoleanLiquidityIssuer).getAmountOf(simoleanLiquidityPayout),
    simoleanLiquidity(3300n),
    `simoleanLiquidity minted was equal to the amount of central tokens added to pool`,
  );
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(simoleanKit.brand),
    harden({
      Secondary: simoleans(39800n),
      Central: centralTokens(4300n),
      Liquidity: simoleanLiquidity(0n),
    }),
    `The poolAmounts record should contain the new liquidity`,
  );
});

test('amm doubleSwap', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaKit = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaKit.brand, value);
  const simoleanKit = makeIssuerKit('simoleans');
  const simoleans = value => AmountMath.make(simoleanKit.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  // This timer is only used to build quotes. Let's make it non-zero
  const timer = buildManualTimer(t.log, 30n);

  const { zoe, amm } = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
  );

  // Setup Alice
  const aliceMoolaPayment = moolaKit.mint.mintPayment(moola(100000n));
  // Let's assume that central tokens are worth 2x as much as moola
  const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(50000n));
  const aliceSimoleanPayment = simoleanKit.mint.mintPayment(simoleans(39800n));

  // Setup Bob
  const bobSimoleanPayment = simoleanKit.mint.mintPayment(simoleans(4000n));
  const bobMoolaPayment = moolaKit.mint.mintPayment(moola(5000n));

  const ammInstance = await amm.instance;

  const metricsSub = await E(amm.ammPublicFacet).getMetrics();
  const m = await subscriptionTracker(t, metricsSub);
  await m.assertInitial({ XYK: [] });

  const aliceAddLiquidityInvitation = E(
    amm.ammPublicFacet,
  ).makeAddLiquidityInvitation();

  const { liquidityIssuer: moolaLiquidityIssuer } = await makePoolWithLiquidity(
    t,
    zoe,
    amm,
    moolaKit,
    centralR,
    'Moola',
  );

  await m.assertChange({ XYK: { 0: moolaKit.brand } });

  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const { liquidityIssuer: simoleanLiquidityIssuer } =
    await makePoolWithLiquidity(t, zoe, amm, simoleanKit, centralR, 'Simolean');

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(simoleanLiquidityBrand, value);

  await m.assertChange({ XYK: { 1: simoleanKit.brand } });

  const issuerKeywordRecord = await E(zoe).getIssuers(ammInstance);
  t.deepEqual(
    issuerKeywordRecord,
    harden({
      Central: centralR.issuer,
      Moola: moolaKit.issuer,
      MoolaLiquidity: moolaLiquidityIssuer,
      Simolean: simoleanKit.issuer,
      SimoleanLiquidity: simoleanLiquidityIssuer,
    }),
    `There are keywords for central token and two additional tokens and liquidity`,
  );
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    {
      Central: centralTokens(initPoolCentral),
      Liquidity: moolaLiquidity(0n),
      Secondary: moola(initPoolSecondary),
    },
    `The pool for moola should be initalized`,
  );
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(simoleanKit.brand),
    {
      Central: centralTokens(initPoolCentral),
      Liquidity: simoleanLiquidity(0n),
      Secondary: simoleans(initPoolSecondary),
    },
    `The pool for simoleans should be initalized`,
  );

  // Alice adds liquidity for moola
  // 10 moola = 5 central tokens at the time of the liquidity adding
  // aka 2 moola = 1 central token
  const aliceProposal = harden({
    want: { Liquidity: moolaLiquidity(50000n) },
    give: { Secondary: moola(100000n), Central: centralTokens(50000n) },
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
  await E(addLiquiditySeat).getPayout('Liquidity');

  // Alice adds simoleans and central tokens to the simolean
  // liquidity pool. 398 simoleans = 43 central tokens at the time of
  // the liquidity adding
  //
  const aliceSimLiquidityInvitation = E(
    amm.ammPublicFacet,
  ).makeAddLiquidityInvitation();
  const aliceSimCentralProposal = harden({
    want: { Liquidity: simoleanLiquidity(430n) },
    give: { Secondary: simoleans(39800n), Central: centralTokens(43000n) },
  });
  const aliceCentralPayment2 = await centralR.mint.mintPayment(
    centralTokens(43000n),
  );
  const aliceSimCentralPayments = {
    Secondary: aliceSimoleanPayment,
    Central: aliceCentralPayment2,
  };

  const aliceSeat2 = await E(zoe).offer(
    aliceSimLiquidityInvitation,
    aliceSimCentralProposal,
    aliceSimCentralPayments,
  );

  t.is(
    await E(aliceSeat2).getOfferResult(),
    'Added liquidity.',
    `Alice added simoleans and central liquidity`,
  );

  // Bob swaps moola for simoleans

  // Bob looks up the value of 4000 simoleans in moola
  const { amountOut: priceInMoola } = await E(amm.ammPublicFacet).getInputPrice(
    simoleans(4000n),
    AmountMath.makeEmpty(moolaKit.brand),
  );

  const bobInvitation = await E(amm.ammPublicFacet).makeSwapInInvitation();
  const bobSimsForMoolaProposal = harden({
    want: { Out: priceInMoola },
    give: { In: simoleans(4000n) },
  });
  const simsForMoolaPayments = harden({
    In: bobSimoleanPayment,
  });

  t.deepEqual(await E(amm.ammPublicFacet).getProtocolPoolBalance(), {});

  const bobSeat1 = await E(zoe).offer(
    bobInvitation,
    bobSimsForMoolaProposal,
    simsForMoolaPayments,
  );
  const bobMoolaPayout = await E(bobSeat1).getPayout('Out');
  console.log('payout', await moolaKit.issuer.getAmountOf(bobMoolaPayout));
  t.deepEqual(
    await moolaKit.issuer.getAmountOf(bobMoolaPayout),
    moola(3975n),
    `bob gets 3975 moola`,
  );

  let runningFees = AmountMath.make(centralR.brand, 25n);
  t.deepEqual(await E(amm.ammPublicFacet).getProtocolPoolBalance(), {
    Fee: runningFees,
  });

  // Bob swaps simoleans for moola

  // Bob looks up the value of 5000 moola in simoleans
  const { amountOut: priceInSimoleans } = await E(
    amm.ammPublicFacet,
  ).getInputPrice(moola(5000n), AmountMath.makeEmpty(simoleanKit.brand));

  const bobInvitation2 = await E(amm.ammPublicFacet).makeSwapInInvitation();
  const bobMoolaForSimsProposal = harden({
    want: { Out: priceInSimoleans },
    give: { In: moola(5000n) },
  });
  const moolaForSimsPayments = harden({
    In: bobMoolaPayment,
  });

  const prices = await E(amm.ammPublicFacet).getOutputPrice(
    AmountMath.makeEmpty(moolaKit.brand),
    simoleans(4000n),
  );
  t.deepEqual(
    prices,
    {
      amountIn: moola(4025n),
      amountOut: simoleans(4000n),
    },
    'near parity',
  );

  const bobSeat2 = await E(zoe).offer(
    bobInvitation2,
    bobMoolaForSimsProposal,
    moolaForSimsPayments,
  );
  const bobSimoleanPayout = await E(bobSeat2).getPayout('Out');

  t.deepEqual(
    await simoleanKit.issuer.getAmountOf(bobSimoleanPayout),
    simoleans(4970n),
    `bob gets 4970 simoleans`,
  );

  runningFees = AmountMath.add(
    runningFees,
    AmountMath.make(centralR.brand, 30n),
  );
  t.deepEqual(await E(amm.ammPublicFacet).getProtocolPoolBalance(), {
    Fee: runningFees,
  });

  const collectFeesInvitation = E(
    amm.ammCreatorFacet,
  ).makeCollectFeesInvitation();
  const collectFeesSeat = await E(zoe).offer(
    collectFeesInvitation,
    undefined,
    undefined,
  );

  const payout = await E(collectFeesSeat).getPayout('Fee');

  await assertPayoutAmount(t, centralR.issuer, payout, runningFees);

  t.deepEqual(await E(amm.ammPublicFacet).getProtocolPoolBalance(), {
    Fee: AmountMath.makeEmpty(centralR.brand),
  });
});

test('amm jig - swapOut uneven', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaKit = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaKit.brand, value);
  const simoleanKit = makeIssuerKit('simoleans');
  const simoleans = value => AmountMath.make(simoleanKit.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };

  const timer = buildManualTimer(t.log);

  const { zoe, amm } = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
  );

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(30000000n));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaKit.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaKit.mint.mintPayment(moola(20000000n)));
  const simoleanPurse = simoleanKit.issuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanKit.mint.mintPayment(simoleans(20000000n)));

  /** @type {XYKAMMPublicFacet} */
  // @ts-expect-error xxx 'amount' param can't type the brand
  const publicFacet = amm.ammPublicFacet;
  const creatorFacet = amm.ammCreatorFacet;

  const { liquidityIssuer: moolaLiquidityIssuer } = await makePoolWithLiquidity(
    t,
    zoe,
    amm,
    moolaKit,
    centralR,
    'Moola',
  );

  const { liquidityIssuer: simoleanLiquidityIssuer } =
    await makePoolWithLiquidity(
      t,
      zoe,
      amm,
      simoleanKit,
      centralR,
      'Simoleans',
    );

  const mIssuerKeywordRecord = {
    Secondary: moolaKit.issuer,
    Liquidity: moolaLiquidityIssuer,
  };
  const purses = [
    moolaPurse,
    E(moolaLiquidityIssuer).makeEmptyPurse(),
    centralPurse,
    simoleanPurse,
    E(simoleanLiquidityIssuer).makeEmptyPurse(),
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
  const initmoolaLiquidityExpected = {
    c: initPoolCentral,
    s: initPoolSecondary,
    l: initPoolCentral,
    k: initPoolCentral * initPoolSecondary,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: initPoolCentral,
  };
  mPoolState = updatePoolState(mPoolState, initmoolaLiquidityExpected);

  const sPoolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };
  const initSimLiqExpected = {
    c: initPoolCentral,
    s: initPoolSecondary,
    l: initPoolCentral,
    k: initPoolCentral * initPoolSecondary,
    payoutC: 0n,
    payoutS: 0n,
    payoutL: initPoolCentral,
  };
  updatePoolState(sPoolState, initSimLiqExpected);

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {});

  // trade for central specifying 30000 output: moola price 15092
  // Notice that it takes ~ half as much moola as the desired Central
  const cGain = 30000n;
  // The pool will be charged the protocol fee on top of deltaY
  const protocolFee1 = ceilDivide(cGain * 6n, 10000n - 6n);
  const deltaY = priceFromTargetOutput(
    cGain + protocolFee1,
    mPoolState.c,
    mPoolState.s,
    0n, // no fee calculation
  );
  const poolFee1 = ceilDivide(deltaY * 24n, 10000n);
  const yChange1 = deltaY + poolFee1;
  const deltaX = outputFromInputPrice(mPoolState.s, mPoolState.c, deltaY, 0n);

  // overpay
  const moolaIn = 16000n;
  const tradeDetailsB = {
    inAmount: moola(moolaIn),
    outAmount: centralTokens(deltaX - protocolFee1),
  };

  const expectedB = {
    c: mPoolState.c - deltaX,
    s: mPoolState.s + yChange1,
    l: initPoolCentral,
    k: (mPoolState.c - deltaX) * (mPoolState.s + yChange1),
    out: deltaX - protocolFee1,
    in: moolaIn - yChange1,
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

  let expectedPoolBalance = protocolFee1;
  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    Fee: AmountMath.make(centralR.brand, expectedPoolBalance),
  });

  // trade to get 25000 moola: central price: 49949, approximately double.
  const gainM = 25000n;
  const mPriceC = priceFromTargetOutput(gainM, mPoolState.s, mPoolState.c, 0n);

  t.is(mPriceC, 125_006n);
  const actualGainM = outputFromInputPrice(
    mPoolState.c,
    mPoolState.s,
    mPriceC,
    0n,
  );
  const poolFee2 = ceilDivide(mPriceC * 24n, 10000n);

  // The price will be deltaX + protocolFee. The user will pay this to the pool
  const expectedProtocolCharge2 = ceilDivide(mPriceC * 6n, 10_000n);
  const alicePays = mPriceC + expectedProtocolCharge2 + poolFee2;

  const tradeDetailsC = {
    inAmount: centralTokens(alicePays),
    outAmount: moola(gainM),
  };

  const expectedC = {
    c: mPoolState.c + mPriceC + poolFee2,
    s: mPoolState.s - actualGainM,
    l: initPoolCentral,
    k: (mPoolState.c + mPriceC + poolFee2) * (mPoolState.s - actualGainM),
    out: actualGainM,
    in: gainM - actualGainM,
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
    Fee: AmountMath.make(centralR.brand, expectedPoolBalance),
  });

  const collectFeesInvitation = E(creatorFacet).makeCollectFeesInvitation();
  const collectFeesSeat = await E(zoe).offer(
    collectFeesInvitation,
    undefined,
    undefined,
  );

  const payout = await E(collectFeesSeat).getPayout('Fee');

  await assertPayoutAmount(
    t,
    centralR.issuer,
    payout,
    AmountMath.make(centralR.brand, expectedPoolBalance),
    'payout of collectFeesSeat',
  );

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {
    Fee: AmountMath.makeEmpty(centralR.brand),
  });
});

test('amm jig - breaking scenario', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaKit = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaKit.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };

  const timer = buildManualTimer(t.log);

  const { zoe, amm } = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
  );

  const publicFacet = amm.ammPublicFacet;

  // set up purses
  const centralPayment = centralR.mint.mintPayment(
    centralTokens(55825056949339n),
  );
  const centralPurse = E(centralR.issuer).makeEmptyPurse();
  await E(centralPurse).deposit(centralPayment);
  const moolaPurse = moolaKit.issuer.makeEmptyPurse();
  moolaPurse.deposit(
    moolaKit.mint.mintPayment(moola(2396247730468n + 4145005n)),
  );

  const purses = [moolaPurse, centralPurse];
  const alice = await makeTrader(purses, zoe, publicFacet, centralR.issuer);

  const initMoolaLiquidityDetails = {
    cAmount: centralTokens(50825056949339n),
    sAmount: moola(2196247730468n),
    liquidityValue: 50825056948339n,
  };
  const initMoolaLiquidityExpected = {
    c: 50825056949339n,
    s: 2196247730468n,
    l: 50825056949339n,
    k: 50825056949339n * 2196247730468n,
  };
  const { liquidityIssuer: moolaLiquidityIssuer } =
    await alice.addLiquidPoolAndCheck(
      t,
      initMoolaLiquidityDetails,
      initMoolaLiquidityExpected,
      moolaKit.issuer,
      'Moola',
    );

  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const displayInfo = await E(moolaLiquidityBrand).getDisplayInfo();
  t.is(displayInfo.decimalPlaces, 6);

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {});

  const quoteFromRun = await E(publicFacet).getInputPrice(
    centralTokens(73000000n),
    AmountMath.makeEmpty(moolaKit.brand),
  );
  t.deepEqual(quoteFromRun, {
    amountIn: centralTokens(72999997n),
    amountOut: moola(3145001n),
  });

  const newQuoteFromRun = await E(publicFacet).getInputPrice(
    quoteFromRun.amountIn,
    AmountMath.makeEmpty(moolaKit.brand),
  );

  t.truthy(AmountMath.isGTE(quoteFromRun.amountIn, newQuoteFromRun.amountIn));
  t.truthy(AmountMath.isGTE(newQuoteFromRun.amountOut, quoteFromRun.amountOut));

  const quoteToRun = await E(publicFacet).getOutputPrice(
    AmountMath.makeEmpty(moolaKit.brand),
    centralTokens(370000000n),
  );
  const newQuoteToRun = await E(publicFacet).getOutputPrice(
    AmountMath.makeEmpty(moolaKit.brand),
    quoteToRun.amountOut,
  );
  t.deepEqual(quoteToRun.amountIn, newQuoteToRun.amountIn);
  t.deepEqual(newQuoteToRun.amountOut, quoteToRun.amountOut);
});

// This demonstrates that Zoe can reallocate empty amounts. i.e. that
// https://github.com/Agoric/agoric-sdk/issues/3033 stays fixed
test('zoe allow empty reallocations', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };

  // This timer is only used to build quotes. Let's make it non-zero
  const timer = buildManualTimer(t.log, 30n);

  const { zoe, amm } = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
  );

  const collectFeesInvitation2 = E(
    amm.ammCreatorFacet,
  ).makeCollectFeesInvitation();
  const collectFeesSeat2 = await E(zoe).offer(
    collectFeesInvitation2,
    undefined,
    undefined,
  );

  const payout = await E(collectFeesSeat2).getPayout('Fee');
  const result = await E(collectFeesSeat2).getOfferResult();

  t.deepEqual(result, 'paid out 0');
  await assertPayoutAmount(
    t,
    centralR.issuer,
    payout,
    AmountMath.makeEmpty(centralR.brand),
  );
});

const makeAddInitialLiquidity = (t, zoe, amm, moolaKit, centralR) => {
  return async (moola, central) => {
    const centralTokens = value => AmountMath.make(centralR.brand, value);
    const makeMoola = value => AmountMath.make(moolaKit.brand, value);

    const purses = [
      makePurseWith(moolaKit, moola),
      makePurseWith(centralR, central),
    ];
    const alice = await makeTrader(
      purses,
      zoe,
      amm.ammPublicFacet,
      centralR.issuer,
    );
    const details = {
      cAmount: centralTokens(central),
      sAmount: makeMoola(moola),
      liquidityValue: central - 1000n,
    };
    const aliceExpected = {
      c: central,
      s: moola,
      l: 50000n,
      k: central * moola,
    };
    const { seat, liquidityIssuer } = await alice.addLiquidPoolAndCheck(
      t,
      details,
      aliceExpected,
      moolaKit.issuer,
      'Moola',
    );

    t.is(
      await E(seat).getOfferResult(),
      'Added liquidity.',
      `Alice added moola and central liquidity`,
    );

    return liquidityIssuer;
  };
};

const makeAddLiquidity = (t, zoe, amm, moolaKit, centralR, moolaLiqIssuer) => {
  return async (moola, central, priorState, expected) => {
    const centralTokens = value => AmountMath.make(centralR.brand, value);
    const makeMoola = value => AmountMath.make(moolaKit.brand, value);

    const purses = [
      makePurseWith(moolaKit, moola),
      makePurseWith(centralR, central),
    ];
    const alice = await makeTrader(
      purses,
      zoe,
      amm.ammPublicFacet,
      centralR.issuer,
    );
    const details = {
      cAmount: centralTokens(central),
      sAmount: makeMoola(moola),
      liquidityValue: central - 1000n,
    };

    await alice.addLiquidityAtRateAndCheck(t, priorState, details, expected, {
      Liquidity: moolaLiqIssuer,
      Secondary: moolaKit.issuer,
    });
  };
};

test('amm adding liquidity', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const moolaKit = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaKit.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  // This timer is only used to build quotes. Let's make it non-zero
  const timer = buildManualTimer(t.log, 30n);
  const { zoe, amm } = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
  );

  const metricsSub = await E(amm.ammPublicFacet).getMetrics();
  const m = await subscriptionTracker(t, metricsSub);
  await m.assertInitial({ XYK: [] });

  await t.throwsAsync(
    () => E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    { message: /"secondaryBrandToPool" not found: / },
    "The pool hasn't been created yet",
  );

  const addInitialLiquidity = await makeAddInitialLiquidity(
    t,
    zoe,
    amm,
    moolaKit,
    centralR,
  );
  // add initial liquidity at 10000:50000
  const liquidityIssuer = await addInitialLiquidity(10000n, 50000n);
  const liquidityBrand = await E(liquidityIssuer).getBrand();
  await m.assertChange({ XYK: { 0: moolaKit.brand } });

  const poolMetricsSub = await E(amm.ammPublicFacet).getPoolMetrics(
    moolaKit.brand,
  );
  const p = await subscriptionTracker(t, poolMetricsSub);
  await p.assertInitial({
    centralAmount: AmountMath.makeEmpty(centralR.brand),
    secondaryAmount: moola(0n),
    liquidityTokens: AmountMath.makeEmpty(liquidityBrand),
  });

  const allocation = (c, l, s) => ({
    Central: AmountMath.make(centralR.brand, c),
    Liquidity: AmountMath.make(liquidityBrand, l),
    Secondary: moola(s),
  });

  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    allocation(50000n, 0n, 10000n),
    `poolAllocation after initialization`,
  );

  const expected0 = {
    c: 50_000n,
    s: 10_000n,
    l: 50_000n,
    k: 500_000_000n,
    payoutL: 84_115n,
    payoutC: 0n,
    payoutS: 11n,
  };

  await p.assertState({
    centralAmount: AmountMath.make(centralR.brand, expected0.c),
    secondaryAmount: moola(expected0.s),
    liquidityTokens: AmountMath.make(liquidityBrand, expected0.l),
  });

  const poolState1 = {
    c: 50_000n,
    s: 10_000n,
    l: 50_000n,
    k: 500_000_000n,
  };
  const expected1 = {
    c: 119996n,
    s: 29989n,
    l: 134115n,
    k: 119996n * 29989n,
    payoutL: 84_115n,
    payoutC: 0n,
    payoutS: 11n,
  };

  const addLiquidity = makeAddLiquidity(
    t,
    zoe,
    amm,
    moolaKit,
    centralR,
    liquidityIssuer,
  );

  // Add liquidity. Offer 20_000:70_000.
  await addLiquidity(20_000n, 70_000n, poolState1, expected1);
  // After the trade, this will increase the pool by about 150%

  await p.assertState({
    centralAmount: AmountMath.make(centralR.brand, expected1.c),
    secondaryAmount: moola(expected1.s),
    liquidityTokens: AmountMath.make(liquidityBrand, expected1.l),
  });

  // The pool will have 10K + 20K and 50K + 70K after
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    allocation(119_996n, 0n, 29_989n),
    `poolAllocation after initialization`,
  );

  const poolState2 = {
    c: expected1.c,
    s: expected1.s,
    l: expected1.l,
    k: expected1.k,
  };
  // await assertPayouts(l3, 80_680n, c3, 0n, s3, 16n);
  const expected2 = {
    c: 219_985n,
    s: 41_973n,
    l: 214_795n,
    k: 219_985n * 41_973n,
    payoutL: 80_680n,
    payoutC: 0n,
    payoutS: 16n,
  };

  // Add liquidity. Offer 12_000:100_000.
  await addLiquidity(12_000n, 100_000n, poolState2, expected2);
  await p.assertState({
    centralAmount: AmountMath.make(centralR.brand, expected2.c),
    secondaryAmount: moola(expected2.s),
    liquidityTokens: AmountMath.make(liquidityBrand, expected2.l),
  });

  // The pool should now have just under 50K + 70K + 60K and 10K + 14K + 12K
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaKit.brand),
    allocation(219985n, 0n, 41973n),
    `poolAllocation after initialization`,
  );
});

test('storage', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const moolaR = makeIssuerKit('moola');

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  // This timer is only used to build quotes. Let's make it non-zero
  const timer = buildManualTimer(t.log, 30n);
  const { zoe, amm, mockChainStorage } = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
  );
  t.is(
    await subscriptionKey(E(amm.ammPublicFacet).getSubscription()),
    'mockChainStorageRoot.amm.governance',
  );
  t.like(mockChainStorage.getBody('mockChainStorageRoot.amm.governance'), {
    current: {
      Electorate: { type: 'invitation' },
      MinInitialPoolLiquidity: { type: 'amount' },
      PoolFee: { type: 'nat' },
      ProtocolFee: { type: 'nat' },
    },
  });

  t.is(
    await subscriptionKey(E(amm.ammPublicFacet).getMetrics()),
    'mockChainStorageRoot.amm.metrics',
  );
  t.deepEqual(mockChainStorage.getBody('mockChainStorageRoot.amm.metrics'), {
    XYK: [],
  });

  const addInitialLiquidity = await makeAddInitialLiquidity(
    t,
    zoe,
    amm,
    moolaR,
    centralR,
  );
  await addInitialLiquidity(10000n, 50000n);
  t.like(mockChainStorage.getBody('mockChainStorageRoot.amm.pool0.init'), {
    liquidityIssuerRecord: {
      assetKind: 'nat',
      brand: { iface: 'Alleged: MoolaLiquidity brand' },
      displayInfo: {
        assetKind: 'nat',
      },
      issuer: {
        iface: 'Alleged: MoolaLiquidity issuer',
      },
    },
  });

  t.is(
    await subscriptionKey(E(amm.ammPublicFacet).getPoolMetrics(moolaR.brand)),
    'mockChainStorageRoot.amm.pool0.metrics',
  );
  t.like(mockChainStorage.getBody('mockChainStorageRoot.amm.pool0.metrics'), {
    centralAmount: {
      brand: { iface: 'Alleged: central brand' },
      value: 50000n,
    },
    liquidityTokens: {
      brand: { iface: 'Alleged: MoolaLiquidity brand' },
      value: 50000n,
    },
    secondaryAmount: {
      brand: { iface: 'Alleged: moola brand' },
      value: 10000n,
    },
  });
});
