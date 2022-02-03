// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

import {
  makeTrader,
  updatePoolState,
  priceFromTargetOutput,
  outputFromInputPrice,
} from '@agoric/zoe/test/autoswapJig.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import {
  getAmountOut,
  makeRatio,
  ceilMultiplyBy,
  natSafeMath,
} from '@agoric/zoe/src/contractSupport/index.js';
import {
  assertAmountsEqual,
  assertPayoutAmount,
} from '@agoric/zoe/test/zoeTestHelpers.js';
import { BASIS_POINTS } from '../../../src/vpool-xyk-amm/constantProduct/defaults.js';
import { setupAmmServices } from './setup.js';

const { quote: q } = assert;
const { ceilDivide } = natSafeMath;

test('amm with valid offers', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  /** @param {NatValue} value */
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);
  const simoleanR = makeIssuerKit('simoleans');
  const simoleans = value => AmountMath.make(simoleanR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };

  const timer = buildManualTimer(console.log, 30n);
  const protocolFeeRatio = makeRatio(6n, centralR.brand, BASIS_POINTS);

  const { zoe, amm, installs } = await setupAmmServices(
    electorateTerms,
    centralR,
    timer,
  );
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitationBrand = await E(invitationIssuer).getBrand();

  // Setup Alice
  const aliceMoolaPayment = moolaR.mint.mintPayment(moola(100000n));
  // Let's assume that central tokens are worth 2x as much as moola
  const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(50000n));
  const aliceSimoleanPayment = simoleanR.mint.mintPayment(simoleans(398n));

  // Setup Bob
  const bobMoolaPayment = moolaR.mint.mintPayment(moola(17000n));

  const aliceAddLiquidityInvitation = E(
    amm.ammPublicFacet,
  ).makeAddLiquidityInvitation();

  const aliceInvitationAmount = await E(invitationIssuer).getAmountOf(
    aliceAddLiquidityInvitation,
  );
  const ammInstance = await amm.instance;
  t.deepEqual(
    aliceInvitationAmount,
    AmountMath.make(
      invitationBrand,
      harden([
        {
          description: 'multipool amm add liquidity',
          instance: ammInstance,
          installation: installs.amm,
          handle: aliceInvitationAmount.value[0].handle,
        },
      ]),
    ),
    `invitation value is as expected`,
  );

  const moolaLiquidityIssuer = await E(amm.ammPublicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  /** @param {NatValue} value */
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const simoleanLiquidityIssuer = await E(amm.ammPublicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(simoleanLiquidityBrand, value);

  const { toCentral: priceAuthority } = await E(
    amm.ammPublicFacet,
  ).getPriceAuthorities(moolaR.brand);

  const issuerKeywordRecord = await E(zoe).getIssuers(ammInstance);
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
    await E(amm.ammPublicFacet).getPoolAllocation(moolaR.brand),
    {},
    `The poolAllocation object values for moola should be empty`,
  );
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(simoleanR.brand),
    {},
    `The poolAllocation object values for simoleans should be empty`,
  );

  // Alice adds liquidity
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

  const liquidityPayout = await E(addLiquiditySeat).getPayout('Liquidity');

  t.deepEqual(
    await E(moolaLiquidityIssuer).getAmountOf(liquidityPayout),
    moolaLiquidity(50000n),
  );
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(moolaR.brand),
    harden({
      Secondary: moola(100000n),
      Central: centralTokens(50000n),
      Liquidity: moolaLiquidity(0n),
    }),
    `The poolAmounts record should contain the new liquidity`,
  );

  // Bob creates a swap invitation for himself
  const bobSwapInvitation1 = await E(amm.ammPublicFacet).makeSwapInInvitation();

  const { value } = await E(invitationIssuer).getAmountOf(bobSwapInvitation1);
  assert(Array.isArray(value)); // non-fungible
  const [bobInvitationValue] = value;
  const bobPublicFacet = await E(zoe).getPublicFacet(
    bobInvitationValue.instance,
  );

  t.is(
    bobInvitationValue.installation,
    installs.amm,
    `installation is as expected`,
  );

  // Bob looks up the price of 17000 moola in central tokens
  const { amountOut: priceInCentrals } = await E(bobPublicFacet).getInputPrice(
    moola(17000n),
    AmountMath.makeEmpty(centralR.brand),
  );

  t.deepEqual(await E(amm.ammPublicFacet).getProtocolPoolBalance(), {});

  const bobMoolaForCentralProposal = harden({
    want: { Out: priceInCentrals },
    give: { In: moola(17000n) },
  });
  const bobMoolaForCentralPayments = harden({ In: bobMoolaPayment });

  // Bob swaps
  const bobSeat = await E(zoe).offer(
    bobSwapInvitation1,
    bobMoolaForCentralProposal,
    bobMoolaForCentralPayments,
  );

  /** @type {Amount} */
  let runningFees = ceilMultiplyBy(priceInCentrals, protocolFeeRatio);
  t.deepEqual(await E(amm.ammPublicFacet).getProtocolPoolBalance(), {
    RUN: runningFees,
  });

  const quoteGivenBob = await E(priceAuthority).quoteGiven(
    moola(5000n),
    centralR.brand,
  );
  assertAmountsEqual(
    t,
    getAmountOut(quoteGivenBob),
    AmountMath.make(centralR.brand, 1745n),
    `expected amount of 1747, but saw ${q(getAmountOut(quoteGivenBob))}`,
  );

  t.is(await E(bobSeat).getOfferResult(), 'Swap successfully completed.');

  const bobMoolaPayout1 = await E(bobSeat).getPayout('In');
  const bobCentralPayout1 = await E(bobSeat).getPayout('Out');

  assertAmountsEqual(
    t,
    await E(moolaR.issuer).getAmountOf(bobMoolaPayout1),
    moola(2n),
    `bob gets 2 moola back`,
  );
  assertAmountsEqual(
    t,
    await E(centralR.issuer).getAmountOf(bobCentralPayout1),
    centralTokens(7241n),
    `bob gets the same price as when he called the getInputPrice method`,
  );
  t.deepEqual(
    await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
    {
      Secondary: moola(117000n - 2n),
      Central: centralTokens(42750n + 4n),
      Liquidity: moolaLiquidity(0n),
    },
    `pool allocation added the moola and subtracted the central tokens`,
  );

  const bobCentralPurse = await E(centralR.issuer).makeEmptyPurse();
  await E(bobCentralPurse).deposit(bobCentralPayout1);

  // Bob looks up the price of 700 central tokens in moola
  const priceFor700 = await E(bobPublicFacet).getInputPrice(
    centralTokens(700n),
    AmountMath.makeEmpty(moolaR.brand),
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
  const bobSwapInvitation2 = await E(bobPublicFacet).makeSwapInInvitation();
  const bobCentralForMoolaProposal = harden({
    want: { Out: moola(1877n) },
    give: { In: centralTokens(700n) },
  });
  const centralForMoolaPayments = harden({
    In: await E(bobCentralPurse).withdraw(centralTokens(700n)),
  });

  const bobSeat2 = await E(zoe).offer(
    bobSwapInvitation2,
    bobCentralForMoolaProposal,
    centralForMoolaPayments,
  );

  runningFees = AmountMath.add(
    runningFees,
    ceilMultiplyBy(centralTokens(700n), protocolFeeRatio),
  );
  t.deepEqual(await E(amm.ammPublicFacet).getProtocolPoolBalance(), {
    RUN: runningFees,
  });

  t.is(
    await E(bobSeat2).getOfferResult(),
    'Swap successfully completed.',
    `second swap successful`,
  );

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
    await E(moolaR.issuer).getAmountOf(bobMoolaPayout2),
    moola(1877n),
    `bob gets 1877 moola back`,
  );
  t.deepEqual(
    await E(centralR.issuer).getAmountOf(bobCentralPayout2),
    centralTokens(0n),
    `bob gets no central tokens back`,
  );
  t.deepEqual(
    await E(bobPublicFacet).getPoolAllocation(moolaR.brand),
    {
      Secondary: moola(115121n),
      Central: centralTokens(43453n),
      Liquidity: moolaLiquidity(0n),
    },
    `fee added to liquidity pool`,
  );

  // Alice adds simoleans and central tokens to the simolean
  // liquidity pool. 398 simoleans = 43 central tokens at the time of
  // the liquidity adding
  //
  const aliceSimCentralLiquidityInvitation = E(
    amm.ammPublicFacet,
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
    simoleanLiquidity(43n),
    `simoleanLiquidity minted was equal to the amount of central tokens added to pool`,
  );
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(simoleanR.brand),
    harden({
      Secondary: simoleans(398n),
      Central: centralTokens(43n),
      Liquidity: simoleanLiquidity(0n),
    }),
    `The poolAmounts record should contain the new liquidity`,
  );
});

test('amm doubleSwap', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);
  const simoleanR = makeIssuerKit('simoleans');
  const simoleans = value => AmountMath.make(simoleanR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  // This timer is only used to build quotes. Let's make it non-zero
  const timer = buildManualTimer(console.log, 30n);

  const { zoe, amm } = await setupAmmServices(electorateTerms, centralR, timer);

  // Setup Alice
  const aliceMoolaPayment = moolaR.mint.mintPayment(moola(100000n));
  // Let's assume that central tokens are worth 2x as much as moola
  const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(50000n));
  const aliceSimoleanPayment = simoleanR.mint.mintPayment(simoleans(39800n));

  // Setup Bob
  const bobSimoleanPayment = simoleanR.mint.mintPayment(simoleans(4000n));
  const bobMoolaPayment = moolaR.mint.mintPayment(moola(5000n));

  const ammInstance = await amm.instance;

  const aliceAddLiquidityInvitation = E(
    amm.ammPublicFacet,
  ).makeAddLiquidityInvitation();

  const moolaLiquidityIssuer = await E(amm.ammPublicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const simoleanLiquidityIssuer = await E(amm.ammPublicFacet).addPool(
    simoleanR.issuer,
    'Simoleans',
  );

  const simoleanLiquidityBrand = await E(simoleanLiquidityIssuer).getBrand();
  const simoleanLiquidity = value =>
    AmountMath.make(simoleanLiquidityBrand, value);

  const issuerKeywordRecord = await E(zoe).getIssuers(ammInstance);
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
    await E(amm.ammPublicFacet).getPoolAllocation(moolaR.brand),
    {},
    `The poolAllocation object values for moola should be empty`,
  );
  t.deepEqual(
    await E(amm.ammPublicFacet).getPoolAllocation(simoleanR.brand),
    {},
    `The poolAllocation object values for simoleans should be empty`,
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
    AmountMath.makeEmpty(moolaR.brand),
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

  t.deepEqual(
    await moolaR.issuer.getAmountOf(bobMoolaPayout),
    moola(7234n),
    `bob gets 7234 moola`,
  );

  let runningFees = AmountMath.make(centralR.brand, 6n);
  t.deepEqual(await E(amm.ammPublicFacet).getProtocolPoolBalance(), {
    RUN: runningFees,
  });

  // Bob swaps simoleans for moola

  // Bob looks up the value of 5000 moola in simoleans
  const { amountOut: priceInSimoleans } = await E(
    amm.ammPublicFacet,
  ).getInputPrice(moola(5000n), AmountMath.makeEmpty(simoleanR.brand));

  const bobInvitation2 = await E(amm.ammPublicFacet).makeSwapInInvitation();
  const bobMoolaForSimsProposal = harden({
    want: { Out: priceInSimoleans },
    give: { In: moola(5000n) },
  });
  const moolaForSimsPayments = harden({
    In: bobMoolaPayment,
  });

  const bobSeat2 = await E(zoe).offer(
    bobInvitation2,
    bobMoolaForSimsProposal,
    moolaForSimsPayments,
  );
  const bobSimoleanPayout = await E(bobSeat2).getPayout('Out');

  t.deepEqual(
    await simoleanR.issuer.getAmountOf(bobSimoleanPayout),
    simoleans(2868n),
    `bob gets 2880 simoleans`,
  );

  runningFees = AmountMath.add(
    runningFees,
    AmountMath.make(centralR.brand, 4n),
  );
  t.deepEqual(await E(amm.ammPublicFacet).getProtocolPoolBalance(), {
    RUN: runningFees,
  });

  const collectFeesInvitation = E(
    amm.ammCreatorFacet,
  ).makeCollectFeesInvitation();
  const collectFeesSeat = await E(zoe).offer(
    collectFeesInvitation,
    undefined,
    undefined,
  );

  const payout = await E(collectFeesSeat).getPayout('RUN');

  await assertPayoutAmount(t, centralR.issuer, payout, runningFees);

  t.deepEqual(await E(amm.ammPublicFacet).getProtocolPoolBalance(), {
    RUN: AmountMath.makeEmpty(centralR.brand),
  });
});

test('amm with some invalid offers', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };

  // This timer is only used to build quotes. Let's make it non-zero
  const timer = buildManualTimer(console.log);

  const { zoe, amm } = await setupAmmServices(electorateTerms, centralR, timer);
  const invitationIssuer = await E(zoe).getInvitationIssuer();

  // Setup Bob
  const bobMoolaPayment = moolaR.mint.mintPayment(moola(17n));

  await E(amm.ammPublicFacet).addPool(moolaR.issuer, 'Moola');
  // Bob creates a swap invitation for himself
  const bobSwapInvitation1 = await E(amm.ammPublicFacet).makeSwapInInvitation();

  const { value } = await E(invitationIssuer).getAmountOf(bobSwapInvitation1);
  assert(Array.isArray(value)); // non-fungible
  const [bobInvitationValue] = value;
  const bobPublicFacet = E(zoe).getPublicFacet(bobInvitationValue.instance);

  // Bob tries to look up prices, but the pool isn't initiailzed
  await t.throwsAsync(
    () =>
      E(bobPublicFacet).getInputPrice(
        moola(5n),
        AmountMath.makeEmpty(centralR.brand),
      ),
    {
      message:
        '"poolAllocation.Central" must be greater than 0: {"brand":"[Alleged: central brand]","value":"[0n]"}',
    },
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
    () => E(failedSeat).getOfferResult(),
    {
      message:
        '"poolAllocation.Central" must be greater than 0: {"brand":"[Alleged: central brand]","value":"[0n]"}',
    },
    'pool not initialized',
  );

  t.deepEqual(await E(amm.ammPublicFacet).getAllPoolBrands(), [moolaR.brand]);
});

test('amm jig - swapOut uneven', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);
  const simoleanR = makeIssuerKit('simoleans');
  const simoleans = value => AmountMath.make(simoleanR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };

  const timer = buildManualTimer(console.log);

  const { zoe, amm } = await setupAmmServices(electorateTerms, centralR, timer);

  // set up purses
  const centralPayment = centralR.mint.mintPayment(centralTokens(30000000n));
  const centralPurse = centralR.issuer.makeEmptyPurse();
  await centralPurse.deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(20000000n)));
  const simoleanPurse = simoleanR.issuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanR.mint.mintPayment(simoleans(20000000n)));

  /** @type {XYKAMMPublicFacet} */
  const publicFacet = amm.ammPublicFacet;
  const creatorFacet = amm.ammCreatorFacet;

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
  const initmoolaLiquidityDetails = {
    cAmount: centralTokens(10000000n),
    sAmount: moola(5000000n),
    lAmount: moolaLiquidity(10000000n),
  };
  const initmoolaLiquidityExpected = {
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
    cAmount: centralTokens(10000000n),
    sAmount: simoleans(10000000n),
    lAmount: simoleanLiquidity(10000000n),
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
    initsimoleanLiquidityDetails,
    initSimLiqExpected,
    sIssuerKeywordRecord,
  );
  sPoolState = updatePoolState(sPoolState, initSimLiqExpected);

  // @ts-ignore
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
    l: 10000000n,
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
    RUN: AmountMath.make(centralR.brand, expectedPoolBalance),
  });

  // trade to get 25000 moola: central price: 49949, approximately double.
  const gainM = 25000n;
  const mPriceC = priceFromTargetOutput(gainM, mPoolState.s, mPoolState.c, 0n);

  t.is(mPriceC, 49949n);
  const actualGainM = outputFromInputPrice(
    mPoolState.c,
    mPoolState.s,
    mPriceC,
    0n,
  );
  const poolFee2 = ceilDivide(mPriceC * 24n, 10000n);

  // The price will be deltaX + protocolFee. The user will pay this to the pool
  const expectedProtocolCharge2 = ceilDivide(mPriceC * 6n, 10000n);
  const alicePays = mPriceC + expectedProtocolCharge2 + poolFee2;

  const tradeDetailsC = {
    inAmount: centralTokens(alicePays),
    outAmount: moola(gainM),
  };

  const expectedC = {
    c: mPoolState.c + mPriceC + poolFee2,
    s: mPoolState.s - actualGainM,
    l: 10000000n,
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
    RUN: AmountMath.make(centralR.brand, expectedPoolBalance),
  });

  mPoolState = updatePoolState(mPoolState, expectedC);

  const collectFeesInvitation = E(creatorFacet).makeCollectFeesInvitation();
  const collectFeesSeat = await E(zoe).offer(
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

test('amm jig - breaking scenario', async t => {
  // Set up central token
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };

  const timer = buildManualTimer(console.log);

  const { zoe, amm } = await setupAmmServices(electorateTerms, centralR, timer);

  const publicFacet = amm.ammPublicFacet;

  // set up purses
  const centralPayment = centralR.mint.mintPayment(
    centralTokens(55825056949339n),
  );
  const centralPurse = E(centralR.issuer).makeEmptyPurse();
  await E(centralPurse).deposit(centralPayment);
  const moolaPurse = moolaR.issuer.makeEmptyPurse();
  moolaPurse.deposit(moolaR.mint.mintPayment(moola(2396247730468n + 4145005n)));

  const moolaLiquidityIssuer = await E(publicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);
  const displayInfo = await E(moolaLiquidityBrand).getDisplayInfo();
  t.is(displayInfo.decimalPlaces, 6);

  const mIssuerKeywordRecord = {
    Secondary: moolaR.issuer,
    Liquidity: moolaLiquidityIssuer,
  };
  const purses = [
    moolaPurse,
    E(moolaLiquidityIssuer).makeEmptyPurse(),
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
    cAmount: centralTokens(50825056949339n),
    sAmount: moola(2196247730468n),
    lAmount: moolaLiquidity(50825056949339n),
  };
  const initmoolaLiquidityExpected = {
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
    initmoolaLiquidityDetails,
    initmoolaLiquidityExpected,
    mIssuerKeywordRecord,
  );
  mPoolState = updatePoolState(mPoolState, initmoolaLiquidityExpected);

  t.deepEqual(await E(publicFacet).getProtocolPoolBalance(), {});

  const quoteFromRun = await E(publicFacet).getInputPrice(
    centralTokens(73000000n),
    AmountMath.makeEmpty(moolaR.brand),
  );
  t.deepEqual(quoteFromRun, {
    amountIn: centralTokens(72999997n),
    amountOut: moola(3145001n),
  });

  const newQuoteFromRun = await E(publicFacet).getInputPrice(
    quoteFromRun.amountIn,
    AmountMath.makeEmpty(moolaR.brand),
  );

  t.truthy(AmountMath.isGTE(quoteFromRun.amountIn, newQuoteFromRun.amountIn));
  t.truthy(AmountMath.isGTE(newQuoteFromRun.amountOut, quoteFromRun.amountOut));

  const quoteToRun = await E(publicFacet).getOutputPrice(
    AmountMath.makeEmpty(moolaR.brand),
    centralTokens(370000000n),
  );
  const newQuoteToRun = await E(publicFacet).getOutputPrice(
    AmountMath.makeEmpty(moolaR.brand),
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
  const timer = buildManualTimer(console.log, 30n);

  const { zoe, amm } = await setupAmmServices(electorateTerms, centralR, timer);

  const collectFeesInvitation2 = E(
    amm.ammCreatorFacet,
  ).makeCollectFeesInvitation();
  const collectFeesSeat2 = await E(zoe).offer(
    collectFeesInvitation2,
    undefined,
    undefined,
  );

  const payout = await E(collectFeesSeat2).getPayout('RUN');
  const result = await E(collectFeesSeat2).getOfferResult();

  t.deepEqual(result, 'paid out 0');
  await assertPayoutAmount(
    t,
    centralR.issuer,
    payout,
    AmountMath.makeEmpty(centralR.brand),
  );
});
