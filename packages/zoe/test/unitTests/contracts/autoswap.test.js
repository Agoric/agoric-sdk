import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';
import { claim } from '@agoric/ertp/src/legacy-payment-helpers.js';

import {
  makeTrader,
  outputFromInputPrice,
  priceFromTargetOutput,
  scaleForAddLiquidity,
  updatePoolState,
} from '../../autoswapJig.js';
import { setup } from '../setupBasicMints.js';
import { installationPFromSource } from '../installFromSource.js';
import { assertOfferResult, assertPayoutAmount } from '../../zoeTestHelpers.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const autoswap = `${dirname}/../../../src/contracts/autoswap.js`;

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
    vatAdminState,
  } = setup();
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const installation = await installationPFromSource(
    zoe,
    vatAdminState,
    autoswap,
  );

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(10n));
  // Let's assume that simoleans are worth 2x as much as moola
  const aliceSimoleanPayment = simoleanMint.mintPayment(simoleans(5n));

  // Setup Bob
  const bobMoolaPayment = moolaMint.mintPayment(moola(3n));
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(3n));

  // Alice creates an autoswap instance
  const issuerKeywordRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
  );
  /** @type {AutoswapPublicFacet} */
  const publicFacet = startRecord.publicFacet;
  const liquidityIssuerP = await E(publicFacet).getLiquidityIssuer();
  const liquidityBrand = await E(liquidityIssuerP).getBrand();
  const liquidity = value => AmountMath.make(liquidityBrand, value);

  // Alice adds liquidity
  // 10 moola = 5 simoleans at the time of the liquidity adding
  // aka 2 moola = 1 simolean
  const aliceProposal = harden({
    want: { Liquidity: liquidity(10n) },
    give: { Central: moola(10n), Secondary: simoleans(5n) },
  });
  const alicePayments = {
    Central: aliceMoolaPayment,
    Secondary: aliceSimoleanPayment,
  };
  const aliceInvitation = await publicFacet.makeAddLiquidityInvitation();
  const aliceSeat = await E(zoe).offer(
    aliceInvitation,
    aliceProposal,
    alicePayments,
  );

  assertOfferResult(t, aliceSeat, 'Added liquidity.');
  const liquidityPayout = await aliceSeat.getPayout('Liquidity');
  await assertPayoutAmount(
    t,
    liquidityIssuerP,
    liquidityPayout,
    liquidity(10n),
  );
  t.deepEqual(
    await E(publicFacet).getPoolAllocation(),
    {
      Central: moola(10n),
      Secondary: simoleans(5n),
      Liquidity: liquidity(0n),
    },
    `pool allocation`,
  );

  // Bob creates an invitation for autoswap
  const bobInvitation = await E(publicFacet).makeSwapInvitation();

  // Bob claims it
  const bobExclInvitation = await claim(
    E(invitationIssuer).makeEmptyPurse(),
    bobInvitation,
  );
  const bobInstance = await E(zoe).getInstance(bobExclInvitation);
  const bobInstallation = await E(zoe).getInstallation(bobExclInvitation);
  t.is(bobInstallation, installation, `installation`);
  const bobAutoswap = E(zoe).getPublicFacet(bobInstance);

  // Bob looks up how much he can get in simoleans for 3 moola
  const simoleanAmounts = await E(bobAutoswap).getInputPrice(
    moola(3n),
    simoleans(0n).brand,
  );
  t.deepEqual(simoleanAmounts, simoleans(1n), `currentPrice`);

  // Bob escrows
  const bobMoolaForSimProposal = harden({
    want: { Out: simoleans(1n) },
    give: { In: moola(3n) },
  });
  const bobMoolaForSimPayments = harden({ In: bobMoolaPayment });

  const bobSeat = await E(zoe).offer(
    bobExclInvitation,
    bobMoolaForSimProposal,
    bobMoolaForSimPayments,
  );

  // Bob swaps
  assertOfferResult(t, bobSeat, 'Swap successfully completed.');

  const { In: bobMoolaPayout1, Out: bobSimoleanPayout1 } =
    await bobSeat.getPayouts();

  await assertPayoutAmount(t, moolaIssuer, bobMoolaPayout1, moola(0n));
  await assertPayoutAmount(
    t,
    simoleanIssuer,
    bobSimoleanPayout1,
    simoleans(1n),
  );
  t.deepEqual(
    await E(bobAutoswap).getPoolAllocation(),
    {
      Central: moola(13n),
      Secondary: simoleans(4n),
      Liquidity: liquidity(0n),
    },
    `pool allocation after first swap`,
  );
  const liquidityOutstanding = await E(bobAutoswap).getLiquiditySupply();
  t.is(liquidityOutstanding, 10n, 'liquidity outstanding');

  // Bob looks up how much he can get for 3 simoleans
  const moolaAmounts = await E(bobAutoswap).getInputPrice(
    simoleans(3n),
    moola(0n).brand,
  );
  t.deepEqual(moolaAmounts, moola(5n), `price 2`);

  // Bob makes another offer and swaps
  const bobSecondInvitation = E(bobAutoswap).makeSwapInvitation();
  const bobSimsForMoolaProposal = harden({
    want: { Out: moola(5n) },
    give: { In: simoleans(3n) },
  });
  const simsForMoolaPayments = harden({ In: bobSimoleanPayment });

  const bobSecondSeat = await E(zoe).offer(
    bobSecondInvitation,
    bobSimsForMoolaProposal,
    simsForMoolaPayments,
  );

  assertOfferResult(t, bobSeat, 'Swap successfully completed.');

  const { Out: bobMoolaPayout2, In: bobSimoleanPayout2 } =
    await bobSecondSeat.getPayouts();
  await assertPayoutAmount(t, moolaIssuer, bobMoolaPayout2, moola(5n));
  await assertPayoutAmount(
    t,
    simoleanIssuer,
    bobSimoleanPayout2,
    simoleans(0n),
  );

  t.deepEqual(
    await E(bobAutoswap).getPoolAllocation(),
    {
      Central: moola(8n),
      Secondary: simoleans(7n),
      Liquidity: liquidity(0n),
    },
    `pool allocation after swap`,
  );

  // Alice removes her liquidity
  const aliceSecondInvitation =
    await E(publicFacet).makeRemoveLiquidityInvitation();
  // She's not picky...
  const aliceRemoveLiquidityProposal = harden({
    give: { Liquidity: liquidity(10n) },
    want: { Central: moola(0n), Secondary: simoleans(0n) },
  });

  const aliceRmLiqSeat = await E(zoe).offer(
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
  await assertPayoutAmount(t, moolaIssuer, aliceMoolaPayout, moola(8n));
  await assertPayoutAmount(
    t,
    simoleanIssuer,
    aliceSimoleanPayout,
    simoleans(7n),
  );
  await assertPayoutAmount(
    t,
    liquidityIssuerP,
    aliceLiquidityPayout,
    liquidity(0n),
  );

  t.deepEqual(await E(publicFacet).getPoolAllocation(), {
    Central: moola(0n),
    Secondary: simoleans(0n),
    Liquidity: liquidity(10n),
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
    vatAdminState,
  } = setup();
  const installation = await installationPFromSource(
    zoe,
    vatAdminState,
    autoswap,
  );

  // create an autoswap instance
  const issuerKeywordRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await E(zoe).startInstance(
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
  moolaPurse.deposit(moolaMint.mintPayment(moola(50000n)));
  const simoleanPurse = simoleanIssuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanMint.mintPayment(simoleans(50000n)));

  const liquidityBrand = await E(liquidityIssuer).getBrand();
  const liquidity = value => AmountMath.make(liquidityBrand, value);

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
    cAmount: moola(10000n),
    sAmount: simoleans(10000n),
    lAmount: liquidity(10000n),
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
    inAmount: moola(1000n),
    outAmount: simoleans(906n),
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
    cAmount: moola(1100n),
    sAmount: simoleans(910n),
    lAmount: liquidity(1000n),
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
    vatAdminState,
  } = setup();
  const installation = await installationPFromSource(
    zoe,
    vatAdminState,
    autoswap,
  );

  // create an autoswap instance
  const issuerKeywordRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await E(zoe).startInstance(
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
  const liquidity = value => AmountMath.make(liquidityBrand, value);

  // Setup Alice
  const moolaPurse = moolaIssuer.makeEmptyPurse();
  moolaPurse.deposit(moolaMint.mintPayment(moola(50000n)));
  const simoleanPurse = simoleanIssuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanMint.mintPayment(simoleans(50000n)));
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
    cAmount: moola(10000n),
    sAmount: simoleans(10000n),
    lAmount: liquidity(10000n),
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
    sAmount: simoleans(200n),
    lAmount: liquidity(200n),
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
    vatAdminState,
  } = setup();
  const installation = await installationPFromSource(
    zoe,
    vatAdminState,
    autoswap,
  );

  const issuerKeywordRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
  );
  /** @type {AutoswapPublicFacet} */
  const publicFacet = startRecord.publicFacet;

  const moolaPurse = moolaIssuer.makeEmptyPurse();
  moolaPurse.deposit(moolaMint.mintPayment(moola(100n)));

  const inAmount = moola(100n);
  const proposal = harden({
    want: { Out: simoleans(0n) },
    give: { In: inAmount },
  });
  const payment = harden({ In: moolaPurse.withdraw(inAmount) });

  const seat = await E(zoe).offer(
    E(publicFacet).makeSwapInInvitation(),
    proposal,
    payment,
  );
  await t.throwsAsync(
    seat.getOfferResult(),
    { message: /Pool not initialized/ },
    'The pool has not been initialized',
  );

  const { In: mPayout, Out: sPayout } = await seat.getPayouts();
  await assertPayoutAmount(t, moolaIssuer, mPayout, moola(100n));
  await assertPayoutAmount(t, simoleanIssuer, sPayout, simoleans(0n));

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
    vatAdminState,
  } = setup();
  const installation = await installationPFromSource(
    zoe,
    vatAdminState,
    autoswap,
  );

  // create an autoswap instance
  const issuerKeywordRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await E(zoe).startInstance(
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
  moolaPurse.deposit(moolaMint.mintPayment(moola(50000n)));
  const simoleanPurse = simoleanIssuer.makeEmptyPurse();
  simoleanPurse.deposit(simoleanMint.mintPayment(simoleans(50000n)));
  const alice = await makeTrader(
    [moolaPurse, simoleanPurse, liquidityIssuer.makeEmptyPurse()],
    zoe,
    publicFacet,
    moolaIssuer,
  );

  const liquidityBrand = await E(liquidityIssuer).getBrand();
  const liquidity = value => AmountMath.make(liquidityBrand, value);

  const issuerRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
    Liquidity: liquidityIssuer,
  });
  const initLiquidityDetails = {
    cAmount: moola(10000n),
    sAmount: simoleans(10000n),
    lAmount: liquidity(10000n),
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
    inAmount: moola(1000n),
    outAmount: simoleans(0n),
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
    inAmount: moola(500n),
    outAmount: simoleans(300n),
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

  // Attempt (unsuccessfully) to trade for a specified amount
  const failedSeat = await alice.offerAndTrade(simoleans(75n), moola(3n));

  await t.throwsAsync(
    failedSeat.getOfferResult(),
    { message: /amountIn insufficient/ },
    'amountIn insufficient when want specified',
  );

  const { In: moolaReturn, Out: noSimoleans } = await failedSeat.getPayouts();
  await assertPayoutAmount(t, moolaIssuer, moolaReturn, moola(3n));
  await assertPayoutAmount(t, simoleanIssuer, noSimoleans, simoleans(0n));

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
    vatAdminState,
  } = setup();
  const installation = await installationPFromSource(
    zoe,
    vatAdminState,
    autoswap,
  );

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(10n));
  // Let's assume that simoleans are worth 2x as much as moola
  const aliceSimoleanPayment = simoleanMint.mintPayment(simoleans(5n));

  // Alice creates an autoswap instance
  const issuerKeywordRecord = harden({
    Central: moolaIssuer,
    Secondary: simoleanIssuer,
  });
  const startRecord = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
  );
  /** @type {AutoswapPublicFacet} */
  const publicFacet = startRecord.publicFacet;
  const liquidityIssuerP = await E(publicFacet).getLiquidityIssuer();
  const liquidityBrand = await E(liquidityIssuerP).getBrand();
  const liquidity = value => AmountMath.make(liquidityBrand, value);

  // Alice adds liquidity
  // 10 moola = 5 simoleans at the time of the liquidity adding
  // aka 2 moola = 1 simolean
  const aliceProposal = harden({
    want: { Liquidity: liquidity(10n) },
    give: { Central: moola(10n), Secondary: simoleans(5n) },
  });
  const alicePayments = {
    Central: aliceMoolaPayment,
    Secondary: aliceSimoleanPayment,
  };
  const aliceInvitation = await publicFacet.makeAddLiquidityInvitation();
  await E(zoe).offer(aliceInvitation, aliceProposal, alicePayments);

  const simoleanAmounts = await E(publicFacet).getInputPrice(
    moola(0n),
    simoleans(0n).brand,
  );
  t.deepEqual(simoleanAmounts, simoleans(0n), `currentPrice`);

  const moolaAmounts = await E(publicFacet).getOutputPrice(
    simoleans(0n),
    moola(0n).brand,
  );
  t.deepEqual(moolaAmounts, moola(0n), `price 0`);
});
