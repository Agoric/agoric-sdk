/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { E } from '@agoric/eventual-send';
import { amountMath } from '@agoric/ertp';
import {
  makeTrader,
  outputFromInputPrice,
  priceFromTargetOutput,
  scaleForAddLiquidity,
  updatePoolState,
} from '../../autoswapJig';
import '../../../exported';

import { setup } from '../setupBasicMints';
import { installationPFromSource } from '../installFromSource';
import { assertOfferResult, assertPayoutAmount } from '../../zoeTestHelpers';

const autoswap = `${__dirname}/../../../src/contracts/autoswap`;

test('autoSwap API interactions, no jig', async t => {
  t.plan(20);
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
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
  );
  /** @type {AutoswapPublicFacet} */
  const publicFacet = startRecord.publicFacet;
  const liquidityIssuerP = await E(publicFacet).getLiquidityIssuer();
  const liquidityBrand = await E(liquidityIssuerP).getBrand();
  const liquidity = value => amountMath.make(value, liquidityBrand);

  // Alice adds liquidity
  // 10 moola = 5 simoleans at the time of the liquidity adding
  // aka 2 moola = 1 simolean
  const aliceProposal = harden({
    want: { Liquidity: liquidity(10) },
    give: { Central: moola(10), Secondary: simoleans(5) },
  });
  const alicePayments = {
    Central: aliceMoolaPayment,
    Secondary: aliceSimoleanPayment,
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
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(),
    {
      Central: moola(10),
      Secondary: simoleans(5),
      Liquidity: liquidity(0),
    },
    `pool allocation`,
  );

  // Bob creates an invitation for autoswap
  const bobInvitation = await E(publicFacet).makeSwapInvitation();

  // Bob claims it
  const bobExclInvitation = await invitationIssuer.claim(bobInvitation);
  const bobInstance = await E(zoe).getInstance(bobExclInvitation);
  const bobInstallation = await E(zoe).getInstallation(bobExclInvitation);
  t.is(bobInstallation, installation, `installation`);
  const bobAutoswap = E(zoe).getPublicFacet(bobInstance);

  // Bob looks up how much he can get in simoleans for 3 moola
  const simoleanAmounts = await E(bobAutoswap).getInputPrice(
    moola(3),
    simoleans(0).brand,
  );
  t.deepEqual(simoleanAmounts, simoleans(1), `currentPrice`);

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

  assertPayoutAmount(t, moolaIssuer, bobMoolaPayout1, moola(0n));
  assertPayoutAmount(t, simoleanIssuer, bobSimoleanPayout1, simoleans(1));
  t.deepEqual(
    await E(bobAutoswap).getPoolAllocation(),
    {
      Central: moola(13),
      Secondary: simoleans(4),
      Liquidity: liquidity(0),
    },
    `pool allocation after first swap`,
  );
  const liquidityOutstanding = await E(bobAutoswap).getLiquiditySupply();
  t.is(liquidityOutstanding, 10n, 'liquidity outstanding');

  // Bob looks up how much he can get for 3 simoleans
  const moolaAmounts = await E(bobAutoswap).getInputPrice(
    simoleans(3),
    moola(0n).brand,
  );
  t.deepEqual(moolaAmounts, moola(5), `price 2`);

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
      Central: moola(8),
      Secondary: simoleans(7),
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
    want: { Central: moola(0n), Secondary: simoleans(0) },
  });

  const aliceRmLiqSeat = await zoe.offer(
    aliceSecondInvitation,
    aliceRemoveLiquidityProposal,
    harden({ Liquidity: liquidityPayout }),
  );

  assertOfferResult(t, aliceRmLiqSeat, 'Liquidity successfully removed.');
  const {
    Central: aliceMoolaPayout,
    Secondary: aliceSimoleanPayout,
    Liquidity: aliceLiquidityPayout,
  } = await aliceRmLiqSeat.getPayouts();
  assertPayoutAmount(t, moolaIssuer, aliceMoolaPayout, moola(8));
  assertPayoutAmount(t, simoleanIssuer, aliceSimoleanPayout, simoleans(7));
  assertPayoutAmount(t, liquidityIssuerP, aliceLiquidityPayout, liquidity(0));

  t.deepEqual(await E(publicFacet).getPoolAllocation(), {
    Central: moola(0n),
    Secondary: simoleans(0),
    Liquidity: liquidity(10),
  });
});

test('autoSwap - thorough jig test init, add, swap', async t => {
  const {
    moolaIssuer,
    simoleanIssuer,
    moolaMint,
    simoleanMint,
    moola,
    simoleans,
    zoe,
  } = setup();
  const installation = await installationPFromSource(zoe, autoswap);

  // create an autoswap instance
  const issuerKeywordRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
  );
  /** @type {AutoswapPublicFacet} */
  const publicFacet = startRecord.publicFacet;
  const liquidityIssuer = await E(publicFacet).getLiquidityIssuer();
  let poolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };

  // Setup Alice
  const moolaPurse = moolaIssuer.makeEmptyPurse();
  moolaPurse.deposit(moolaMint.mintPayment(moola(50000)));
  const simoleanPurse = simoleanIssuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanMint.mintPayment(simoleans(50000)));

  const liquidityBrand = await E(liquidityIssuer).getBrand();
  const liquidity = value => amountMath.make(value, liquidityBrand);

  const alice = await makeTrader(
    [moolaPurse, simoleanPurse, liquidityIssuer.makeEmptyPurse()],
    zoe,
    publicFacet,
    moolaIssuer,
  );

  const issuerRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
    Liquidity: liquidityIssuer,
  });
  const initLiquidityDetails = {
    cAmount: moola(10000),
    sAmount: simoleans(10000),
    lAmount: liquidity(10000),
  };
  const initLiquidityExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutL: 10000n,
    payoutC: 0n,
    payoutS: 0n,
  };
  await alice.initLiquidityAndCheck(
    t,
    poolState,
    initLiquidityDetails,
    initLiquidityExpected,
    issuerRecord,
  );
  t.truthy(t, '..Alice added initial liquidity');
  poolState = updatePoolState(poolState, initLiquidityExpected);

  const tradeDetails = {
    inAmount: moola(1000),
    outAmount: simoleans(906),
  };
  const tradeExpected = {
    c: 11000n,
    s: 9094n,
    l: 10000n,
    k: 11000n * 9094n,
    out: 906n,
    in: 0n,
  };
  await alice.tradeAndCheck(
    t,
    true,
    poolState,
    tradeDetails,
    tradeExpected,
    issuerRecord,
  );
  t.truthy(t, '..Alice traded');
  poolState = updatePoolState(poolState, tradeExpected);

  const liqDetails1 = {
    cAmount: moola(1100),
    sAmount: simoleans(910),
    lAmount: liquidity(1000),
  };

  const deposit1 = { c: 1100n, s: 910n };
  const liqExpected1 = scaleForAddLiquidity(poolState, deposit1, false);
  await alice.addLiquidityAndCheck(
    t,
    poolState,
    liqDetails1,
    liqExpected1,
    issuerRecord,
  );
  t.truthy(t, '..Alice added more liquidity');
  poolState = updatePoolState(poolState, liqExpected1);
});

test('autoSwap jig - add liquidity in exact ratio', async t => {
  const {
    moolaIssuer,
    simoleanIssuer,
    moolaMint,
    simoleanMint,
    moola,
    simoleans,
    zoe,
  } = setup();
  const installation = await installationPFromSource(zoe, autoswap);

  // create an autoswap instance
  const issuerKeywordRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
  );
  /** @type {AutoswapPublicFacet} */
  const publicFacet = startRecord.publicFacet;
  const liquidityIssuer = await E(publicFacet).getLiquidityIssuer();
  let poolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };

  const liquidityBrand = await E(liquidityIssuer).getBrand();
  const liquidity = value => amountMath.make(value, liquidityBrand);

  // Setup Alice
  const moolaPurse = moolaIssuer.makeEmptyPurse();
  moolaPurse.deposit(moolaMint.mintPayment(moola(50000)));
  const simoleanPurse = simoleanIssuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanMint.mintPayment(simoleans(50000)));
  const alice = await makeTrader(
    [moolaPurse, simoleanPurse, liquidityIssuer.makeEmptyPurse()],
    zoe,
    publicFacet,
    moolaIssuer,
  );

  const issuerRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
    Liquidity: liquidityIssuer,
  });
  const initLiquidityDetails = {
    cAmount: moola(10000),
    sAmount: simoleans(10000),
    lAmount: liquidity(10000),
  };
  const initLiquidityExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutL: 10000n,
    payoutC: 0n,
    payoutS: 0n,
  };
  await alice.initLiquidityAndCheck(
    t,
    poolState,
    initLiquidityDetails,
    initLiquidityExpected,
    issuerRecord,
  );
  t.truthy(t, '..Alice added initial liquidity');
  poolState = updatePoolState(poolState, initLiquidityExpected);

  // Now add to the liquidity pool in an exact ratio. (The pool has
  // 12100 Moola and 11000 liquidity)
  const liqDetails1 = {
    cAmount: moola(200n),
    sAmount: simoleans(200),
    lAmount: liquidity(200),
  };

  const deposit1 = { c: 200n, s: 200n };
  const liqExpected1 = scaleForAddLiquidity(poolState, deposit1, true);
  await alice.addLiquidityAndCheck(
    t,
    poolState,
    liqDetails1,
    liqExpected1,
    issuerRecord,
  );
  poolState = updatePoolState(poolState, liqExpected1);
});

test('autoSwap - trade attempt before init, no jig', async t => {
  const {
    moolaIssuer,
    simoleanIssuer,
    moolaMint,
    moola,
    simoleans,
    zoe,
  } = setup();
  const installation = await installationPFromSource(zoe, autoswap);

  const issuerKeywordRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
  );
  /** @type {AutoswapPublicFacet} */
  const publicFacet = startRecord.publicFacet;

  const moolaPurse = moolaIssuer.makeEmptyPurse();
  moolaPurse.deposit(moolaMint.mintPayment(moola(100)));

  const inAmount = moola(100);
  const proposal = harden({
    want: { Out: simoleans(0) },
    give: { In: inAmount },
  });
  const payment = harden({ In: moolaPurse.withdraw(inAmount) });

  const seat = await zoe.offer(
    E(publicFacet).makeSwapInInvitation(),
    proposal,
    payment,
  );
  t.throwsAsync(
    seat.getOfferResult(),
    { message: /Pool not initialized/ },
    'The pool has not been initialized',
  );

  const { In: mPayout, Out: sPayout } = await seat.getPayouts();
  assertPayoutAmount(t, moolaIssuer, mPayout, moola(100));
  assertPayoutAmount(t, simoleanIssuer, sPayout, simoleans(0));

  const poolPost = await E(publicFacet).getPoolAllocation();
  t.deepEqual({}, poolPost, `empty Pool still`);

  t.is(0n, await E(publicFacet).getLiquiditySupply(), 'liquidity empty after');
});

test('autoSwap jig - swap varying amounts', async t => {
  const {
    moolaIssuer,
    simoleanIssuer,
    moolaMint,
    simoleanMint,
    moola,
    simoleans,
    zoe,
  } = setup();
  const installation = await installationPFromSource(zoe, autoswap);

  // create an autoswap instance
  const issuerKeywordRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
  );
  /** @type {AutoswapPublicFacet} */
  const publicFacet = startRecord.publicFacet;
  const liquidityIssuer = await E(publicFacet).getLiquidityIssuer();
  let poolState = {
    c: 0n,
    s: 0n,
    l: 0n,
    k: 0n,
  };

  // Setup Alice
  const moolaPurse = moolaIssuer.makeEmptyPurse();
  moolaPurse.deposit(moolaMint.mintPayment(moola(50000)));
  const simoleanPurse = simoleanIssuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanMint.mintPayment(simoleans(50000)));
  const alice = await makeTrader(
    [moolaPurse, simoleanPurse, liquidityIssuer.makeEmptyPurse()],
    zoe,
    publicFacet,
    moolaIssuer,
  );

  const liquidityBrand = await E(liquidityIssuer).getBrand();
  const liquidity = value => amountMath.make(value, liquidityBrand);

  const issuerRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
    Liquidity: liquidityIssuer,
  });
  const initLiquidityDetails = {
    cAmount: moola(10000),
    sAmount: simoleans(10000),
    lAmount: liquidity(10000),
  };
  const initLiquidityExpected = {
    c: 10000n,
    s: 10000n,
    l: 10000n,
    k: 100000000n,
    payoutL: 10000n,
    payoutC: 0n,
    payoutS: 0n,
  };
  await alice.initLiquidityAndCheck(
    t,
    poolState,
    initLiquidityDetails,
    initLiquidityExpected,
    issuerRecord,
  );
  t.truthy(t, '..Alice initialize liquidity');
  poolState = updatePoolState(poolState, initLiquidityExpected);

  // (A) trade w/out specifying output
  const tradeDetailsA = {
    inAmount: moola(1000),
    outAmount: simoleans(0),
  };

  const simPrice = outputFromInputPrice(poolState.c, poolState.s, 1000n, 30n);
  const expectedA = {
    c: poolState.c + 1000n,
    s: poolState.s - simPrice,
    l: 10000n,
    k: (poolState.c + 1000n) * (poolState.s - simPrice),
    out: simPrice,
    in: 0n,
  };
  await alice.tradeAndCheck(
    t,
    true,
    poolState,
    tradeDetailsA,
    expectedA,
    issuerRecord,
  );
  t.truthy(t, '..Alice traded A');
  poolState = updatePoolState(poolState, expectedA);

  // (B) trade specifying output
  const tradeDetailsB = {
    inAmount: moola(500),
    outAmount: simoleans(300),
  };

  const mPrice = priceFromTargetOutput(300n, poolState.s, poolState.c, 30n);
  const expectedB = {
    c: poolState.c + mPrice,
    s: poolState.s - 300n,
    l: 10000n,
    k: (poolState.c + mPrice) * (poolState.s - 300n),
    out: 300n,
    in: 500n - mPrice,
  };
  await alice.tradeAndCheck(
    t,
    false,
    poolState,
    tradeDetailsB,
    expectedB,
    issuerRecord,
  );
  t.truthy(t, '..Alice traded B');
  poolState = updatePoolState(poolState, expectedB);

  // Attempt (unsucessfully) to trade for a specified amount
  const failedSeat = await alice.offerAndTrade(simoleans(75), moola(3));

  t.throwsAsync(
    failedSeat.getOfferResult(),
    { message: /amountIn insufficient/ },
    'amountIn insufficient when want specified',
  );

  const { In: moolaReturn, Out: noSimoleans } = await failedSeat.getPayouts();
  assertPayoutAmount(t, moolaIssuer, moolaReturn, moola(3));
  assertPayoutAmount(t, simoleanIssuer, noSimoleans, simoleans(0));

  // attempt a trade with bad numbers
});

test('autoSwap price quote for zero', async t => {
  const {
    moolaIssuer,
    simoleanIssuer,
    moolaMint,
    simoleanMint,
    moola,
    simoleans,
    zoe,
  } = setup();
  const installation = await installationPFromSource(zoe, autoswap);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(10));
  // Let's assume that simoleans are worth 2x as much as moola
  const aliceSimoleanPayment = simoleanMint.mintPayment(simoleans(5));

  // Alice creates an autoswap instance
  const issuerKeywordRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
  );
  /** @type {AutoswapPublicFacet} */
  const publicFacet = startRecord.publicFacet;
  const liquidityIssuerP = await E(publicFacet).getLiquidityIssuer();
  const liquidityBrand = await E(liquidityIssuerP).getBrand();
  const liquidity = value => amountMath.make(value, liquidityBrand);

  // Alice adds liquidity
  // 10 moola = 5 simoleans at the time of the liquidity adding
  // aka 2 moola = 1 simolean
  const aliceProposal = harden({
    want: { Liquidity: liquidity(10) },
    give: { Central: moola(10), Secondary: simoleans(5) },
  });
  const alicePayments = {
    Central: aliceMoolaPayment,
    Secondary: aliceSimoleanPayment,
  };
  const aliceInvitation = await publicFacet.makeAddLiquidityInvitation();
  await zoe.offer(aliceInvitation, aliceProposal, alicePayments);

  const simoleanAmounts = await E(publicFacet).getInputPrice(
    moola(0),
    simoleans(0).brand,
  );
  t.deepEqual(simoleanAmounts, simoleans(0), `currentPrice`);

  const moolaAmounts = await E(publicFacet).getOutputPrice(
    simoleans(0),
    moola(0n).brand,
  );
  t.deepEqual(moolaAmounts, moola(0), `price 0`);
});
