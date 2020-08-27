// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'tape-promise/tape';
import { E } from '@agoric/eventual-send';
import { makeLocalAmountMath } from '@agoric/ertp';
import { natSafeMath } from '../../../src/contractSupport';

import '../../../exported';

import { setup } from '../setupBasicMints';
import { installationPFromSource } from '../installFromSource';
import { assertOfferResult, assertPayoutAmount } from '../../zoeTestHelpers';

const autoswap = `${__dirname}/../../../src/contracts/autoswap`;

const { add, subtract, multiply, floorDivide } = natSafeMath;

const makeScaleFn = (xPre, xPost) => value => {
  const deltaX = xPost > xPre ? subtract(xPost, xPre) : subtract(xPre, xPost);
  return floorDivide(multiply(deltaX, value), xPre);
};

// deltaY = alpha * gamma * yPre / ( 1 + alpha * gamma )
// gamma is (10000 - fee) / 10000
// alpha is deltaX / xPre
// reducing to a single division:
//    deltaY = deltaX * gammaNum * yPre / (xPre * gammaDen + deltaX * gammaNum)
const outputFromInputPrice = (xPre, yPre, deltaX, fee) => {
  const gammaNumerator = 10000 - fee;
  return floorDivide(
    multiply(multiply(deltaX, yPre), gammaNumerator),
    add(multiply(xPre, 10000), multiply(deltaX, gammaNumerator)),
  );
};

// deltaX = beta * xPre / ( (1 - beta) * gamma )
// gamma is (10000 - fee) / 10000
// beta is deltaY / yPre
// reducing to a single division:
//    deltaX = deltaY * xPre * 10000 / (yPre - deltaY ) * gammaNum)
const priceFromTargetOutput = (deltaY, yPre, xPre, fee) => {
  const gammaNumerator = 10000 - fee;
  return floorDivide(
    multiply(multiply(deltaY, xPre), 10000),
    multiply(subtract(yPre, deltaY), gammaNumerator),
  );
};

const scaleForAddLiquidity = (poolState, deposits, exactRatio) => {
  const { c: cDeposit, s: sDeposit } = deposits;

  const poolCentralPost = add(poolState.c, cDeposit);
  const scaleByAlpha = makeScaleFn(poolState.c, poolCentralPost);
  // The test declares when it expects an exact ratio
  const deltaS = exactRatio
    ? scaleByAlpha(poolState.s)
    : add(1, scaleByAlpha(poolState.s));
  const poolSecondaryPost = add(poolState.s, deltaS);
  const liquidityPost = add(poolState.l, scaleByAlpha(poolState.l));

  return {
    c: poolCentralPost,
    s: poolSecondaryPost,
    l: liquidityPost,
    k: multiply(poolCentralPost, poolSecondaryPost),
    payoutL: subtract(liquidityPost, poolState.l),
    payoutC: 0,
    payoutS: subtract(sDeposit, deltaS),
  };
};

const updatePoolState = (oldState, newState) => ({
  ...oldState,
  c: newState.c,
  s: newState.s,
  l: newState.l,
  k: newState.k,
});

const makeTrader = async (
  purses,
  zoe,
  publicFacet,
  issuerKeywordRecord,
  liquidityIssuer,
) => {
  const purseMap = new Map();
  for (const p of purses) {
    purseMap.set(p.getAllegedBrand(), p);
  }
  const centralIssuer = issuerKeywordRecord.Central;
  const { make: central } = await makeLocalAmountMath(centralIssuer);
  const secondaryIssuer = issuerKeywordRecord.Secondary;
  const { make: secondary } = await makeLocalAmountMath(secondaryIssuer);
  const { make: liquidity } = await makeLocalAmountMath(liquidityIssuer);

  const withdrawPayment = amount => {
    return purseMap.get(amount.brand).withdraw(amount);
  };

  const trader = harden({
    offerAndTrade: async (outAmount, inAmount, swapIn) => {
      const proposal = harden({
        want: { Out: outAmount },
        give: { In: inAmount },
      });
      const payment = harden({ In: withdrawPayment(inAmount) });
      const invitation = swapIn
        ? E(publicFacet).makeSwapInInvitation()
        : E(publicFacet).makeSwapOutInvitation();
      const seat = await zoe.offer(invitation, proposal, payment);
      return seat;
    },

    tradeAndCheck: async (t, swapIn, prePoolState, tradeDetails, expected) => {
      // just check that the trade went through, and the results are as stated.
      // The test will declare fees, refunds, and figure out when the trade
      // gets less than requested

      // c: central, s: secondary, l: liquidity
      const { c: cPoolPre, s: sPoolPre, l: lPre, k: kPre } = prePoolState;
      const { inAmount, outAmount } = tradeDetails;
      const {
        c: cPost,
        s: sPost,
        l: lPost,
        k: kPost,
        in: inExpected,
        out: outExpected,
      } = expected;

      const poolPre = await E(publicFacet).getPoolAllocation();
      t.deepEquals(central(cPoolPre), poolPre.Central, `central before swap`);
      t.deepEquals(secondary(sPoolPre), poolPre.Secondary, `s before swap`);
      t.equals(
        lPre,
        await E(publicFacet).getLiquiditySupply(),
        'liquidity pool before trade',
      );
      t.equals(kPre, sPoolPre * cPoolPre);

      const seat = await trader.offerAndTrade(outAmount, inAmount, swapIn);
      assertOfferResult(t, seat, 'Swap successfully completed.');

      const [inIssuer, inMath, outIssuer, out] =
        inAmount.brand === centralIssuer.getBrand()
          ? [centralIssuer, central, secondaryIssuer, secondary]
          : [secondaryIssuer, secondary, centralIssuer, central];
      const { In: refund, Out: payout } = await seat.getPayouts();
      assertPayoutAmount(t, outIssuer, payout, out(outExpected));
      assertPayoutAmount(t, inIssuer, refund, inMath(inExpected));

      const poolPost = await E(publicFacet).getPoolAllocation();
      t.deepEquals(central(cPost), poolPost.Central, `central after swap`);
      t.deepEquals(secondary(sPost), poolPost.Secondary, `s after swap`);
      t.equals(kPost, sPost * cPost);

      await seat.getOfferResult();
      t.equals(
        lPost,
        await E(publicFacet).getLiquiditySupply(),
        'liquidity after',
      );
    },

    // This check only handles success. Failing calls should do something else.
    addLiquidityAndCheck: async (t, priorPoolState, details, expected) => {
      // just check that it went through, and the results are as stated.
      // The test will declare fees, refunds, and figure out when the trade
      // gets less than requested
      const { c: cPre, s: sPre, l: lPre, k: kPre } = priorPoolState;
      const { cAmount, sAmount, lAmount = liquidity(0) } = details;
      const {
        c: cPost,
        s: sPost,
        l: lPost,
        k: kPost,
        payoutL,
        payoutC,
        payoutS,
      } = expected;
      t.assert(payoutC === 0 || payoutS === 0, 'only refund one side');
      const scaleByAlpha = makeScaleFn(cPre, cPost);

      const poolPre = await E(publicFacet).getPoolAllocation();
      t.deepEquals(central(cPre), poolPre.Central, `central before add liq`);
      t.deepEquals(secondary(sPre), poolPre.Secondary, `s before add liq`);
      t.equals(
        lPre,
        await E(publicFacet).getLiquiditySupply(),
        'liquidity pool before add',
      );
      t.equals(kPre, sPre * cPre);

      const proposal = harden({
        give: { Central: cAmount, Secondary: sAmount },
        want: { Liquidity: lAmount },
      });
      const payment = harden({
        Central: withdrawPayment(cAmount),
        Secondary: withdrawPayment(sAmount),
      });

      const seat = await zoe.offer(
        E(publicFacet).makeAddLiquidityInvitation(),
        proposal,
        payment,
      );
      assertOfferResult(t, seat, 'Added liquidity.');

      const {
        Central: cPayout,
        Secondary: sPayout,
        Liquidity: lPayout,
      } = await seat.getPayouts();
      assertPayoutAmount(t, centralIssuer, cPayout, central(payoutC));
      assertPayoutAmount(t, secondaryIssuer, sPayout, secondary(payoutS));
      assertPayoutAmount(t, liquidityIssuer, lPayout, liquidity(payoutL));

      const poolPost = await E(publicFacet).getPoolAllocation();
      t.deepEquals(central(cPost), poolPost.Central, `central after add liq`);
      t.deepEquals(secondary(sPost), poolPost.Secondary, `s after add liq`);
      t.equals(
        lPost,
        await E(publicFacet).getLiquiditySupply(),
        'liquidity pool after',
      );
      t.equals(kPost, sPost * cPost, 'expected value of K after addLiquidity');
      t.equals(lPost, add(lPre, scaleByAlpha(lPre)), 'liquidity scales');
      const productC = multiply(cPre, sAmount.value);
      const productS = multiply(sPre, cAmount.value);
      const exact = productC === productS;
      if (exact) {
        t.equals(cPost, add(cPre, scaleByAlpha(cPre)), 'central post add');
        t.equals(sPost, add(sPre, scaleByAlpha(sPre)), 'secondary post add');
      } else {
        t.equals(cPost, add(cPre, cAmount.value), 'central post add');
        t.equals(sPost, add(1, add(sPre, scaleByAlpha(sPre))), 's post add');
      }
    },

    initLiquidityAndCheck: async (t, priorPoolState, details, expected) => {
      // just check that it went through, and the results are as stated.
      // The test will declare fees, refunds, and figure out when the trade
      // gets less than requested
      const { c: cPre, s: sPre, l: lPre, k: kPre } = priorPoolState;
      const { cAmount, sAmount, lAmount = liquidity(0) } = details;
      const {
        c: cPost,
        s: sPost,
        l: lPost,
        k: kPost,
        payoutL,
        payoutC,
        payoutS,
      } = expected;
      t.assert(payoutC === 0 || payoutS === 0, 'only refund one side');
      const poolPre = await E(publicFacet).getPoolAllocation();
      t.deepEquals({}, poolPre, `central before liquidity`);
      t.equals(0, publicFacet.getLiquiditySupply(), 'liquidity pool pre init');
      t.equals(kPre, sPre * cPre);
      t.equals(lPre, publicFacet.getLiquiditySupply(), 'liquidity pre init');

      const proposal = harden({
        give: { Central: cAmount, Secondary: sAmount },
        want: { Liquidity: lAmount },
      });
      const payment = harden({
        Central: withdrawPayment(cAmount),
        Secondary: withdrawPayment(sAmount),
      });

      const seat = await zoe.offer(
        await E(publicFacet).makeAddLiquidityInvitation(),
        proposal,
        payment,
      );
      assertOfferResult(t, seat, 'Added liquidity.');
      const {
        Central: cPayout,
        Secondary: sPayout,
        Liquidity: lPayout,
      } = await seat.getPayouts();
      assertPayoutAmount(t, centralIssuer, cPayout, central(payoutC));
      assertPayoutAmount(t, secondaryIssuer, sPayout, secondary(payoutS));
      assertPayoutAmount(t, liquidityIssuer, lPayout, liquidity(payoutL));

      const poolPost = await E(publicFacet).getPoolAllocation();
      t.deepEquals(central(cPost), poolPost.Central, `central after init`);
      t.deepEquals(secondary(sPost), poolPost.Secondary, `s after liquidity`);
      t.equals(lPost, publicFacet.getLiquiditySupply(), 'liq pool after init');
      t.assert(lPost >= lAmount.value, 'liquidity want was honored');
      t.equals(kPost, sPost * cPost, 'expected value of K after init');
      t.equals(lPost, lAmount.value, 'liquidity scales (init)');
      t.equals(cPost, cAmount.value);
      t.equals(sPost, sAmount.value);
    },
  });
  return trader;
};

test('autoSwap API interactions', async t => {
  t.plan(20);
  try {
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
    const liquidityAmountMath = await makeLocalAmountMath(liquidityIssuerP);
    const liquidity = liquidityAmountMath.make;

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
    t.deepEquals(
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
    t.equals(bobInstallation, installation, `installation`);
    const bobAutoswap = E(zoe).getPublicFacet(bobInstance);

    // Bob looks up how much he can get in simoleans for 3 moola
    const simoleanAmounts = await E(bobAutoswap).getInputPrice(
      moola(3),
      simoleans(0).brand,
    );
    t.deepEquals(simoleanAmounts, simoleans(1), `currentPrice`);

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

    assertPayoutAmount(t, moolaIssuer, bobMoolaPayout1, moola(0));
    assertPayoutAmount(t, simoleanIssuer, bobSimoleanPayout1, simoleans(1));
    t.deepEquals(
      await E(bobAutoswap).getPoolAllocation(),
      {
        Central: moola(13),
        Secondary: simoleans(4),
        Liquidity: liquidity(0),
      },
      `pool allocation after first swap`,
    );
    const liquidityOutstanding = await E(bobAutoswap).getLiquiditySupply();
    t.equals(liquidityOutstanding, 10, 'liquidity outstanding');

    // Bob looks up how much he can get for 3 simoleans
    const moolaAmounts = await E(bobAutoswap).getInputPrice(
      simoleans(3),
      moola(0).brand,
    );
    t.deepEquals(moolaAmounts, moola(5), `price 2`);

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
      want: { Central: moola(0), Secondary: simoleans(0) },
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

    t.deepEquals(await E(publicFacet).getPoolAllocation(), {
      Central: moola(0),
      Secondary: simoleans(0),
      Liquidity: liquidity(10),
    });
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});

test('autoSwap - thorough test init, add, swap', async t => {
  try {
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
    const { make: liquidity } = await makeLocalAmountMath(liquidityIssuer);
    let poolState = {
      c: 0,
      s: 0,
      l: 0,
      k: 0,
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
      issuerKeywordRecord,
      liquidityIssuer,
    );

    const initLiquidityDetails = {
      cAmount: moola(10000),
      sAmount: simoleans(10000),
      lAmount: liquidity(10000),
    };
    const initLiquidityExpected = {
      c: 10000,
      s: 10000,
      l: 10000,
      k: 100000000,
      payoutL: 10000,
      payoutC: 0,
      payoutS: 0,
    };
    await alice.initLiquidityAndCheck(
      t,
      poolState,
      initLiquidityDetails,
      initLiquidityExpected,
    );
    t.assert(t, '..Alice added initial liquidity');
    poolState = updatePoolState(poolState, initLiquidityExpected);

    const tradeDetails = {
      inAmount: moola(1000),
      outAmount: simoleans(906),
    };
    const tradeExpected = {
      c: 11000,
      s: 9094,
      l: 10000,
      k: 11000 * 9094,
      out: 906,
      in: 0,
    };
    await alice.tradeAndCheck(t, true, poolState, tradeDetails, tradeExpected);
    t.assert(t, '..Alice traded');
    poolState = updatePoolState(poolState, tradeExpected);

    const liqDetails1 = {
      cAmount: moola(1100),
      sAmount: simoleans(910),
      lAmount: liquidity(1000),
    };

    const deposit1 = { c: 1100, s: 910 };
    const liqExpected1 = scaleForAddLiquidity(poolState, deposit1, false);
    await alice.addLiquidityAndCheck(t, poolState, liqDetails1, liqExpected1);
    t.assert(t, '..Alice added more liquidity');
    poolState = updatePoolState(poolState, liqExpected1);

    t.end();
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});

test('autoSwap - add liquidity in exact ratio', async t => {
  try {
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
    const { make: liquidity } = await makeLocalAmountMath(liquidityIssuer);
    let poolState = {
      c: 0,
      s: 0,
      l: 0,
      k: 0,
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
      issuerKeywordRecord,
      liquidityIssuer,
    );

    const initLiquidityDetails = {
      cAmount: moola(10000),
      sAmount: simoleans(10000),
      lAmount: liquidity(10000),
    };
    const initLiquidityExpected = {
      c: 10000,
      s: 10000,
      l: 10000,
      k: 100000000,
      payoutL: 10000,
      payoutC: 0,
      payoutS: 0,
    };
    await alice.initLiquidityAndCheck(
      t,
      poolState,
      initLiquidityDetails,
      initLiquidityExpected,
    );
    t.assert(t, '..Alice added initial liquidity');
    poolState = updatePoolState(poolState, initLiquidityExpected);

    // Now add to the liquidity pool in an exact ratio. (The pool has
    // 12100 Moola and 11000 liquidity)
    const liqDetails1 = {
      cAmount: moola(200),
      sAmount: simoleans(200),
      lAmount: liquidity(200),
    };

    const deposit1 = { c: 200, s: 200 };
    const liqExpected1 = scaleForAddLiquidity(poolState, deposit1, true);
    await alice.addLiquidityAndCheck(t, poolState, liqDetails1, liqExpected1);
    poolState = updatePoolState(poolState, liqExpected1);
    t.end();
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});

test('autoSwap - trade attempt before init', async t => {
  try {
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
    t.rejects(
      seat.getOfferResult(),
      /Pool not initialized/,
      'The pool has not been initialized',
    );

    const { In: mPayout, Out: sPayout } = await seat.getPayouts();
    assertPayoutAmount(t, moolaIssuer, mPayout, moola(100));
    assertPayoutAmount(t, simoleanIssuer, sPayout, simoleans(0));

    const poolPost = await E(publicFacet).getPoolAllocation();
    t.deepEquals({}, poolPost, `empty Pool still`);

    t.equals(
      0,
      await E(publicFacet).getLiquiditySupply(),
      'liquidity empty after',
    );

    t.end();
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});

test('autoSwap - swap varying amounts', async t => {
  try {
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
    const { make: liquidity } = await makeLocalAmountMath(liquidityIssuer);
    let poolState = {
      c: 0,
      s: 0,
      l: 0,
      k: 0,
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
      issuerKeywordRecord,
      liquidityIssuer,
    );

    const initLiquidityDetails = {
      cAmount: moola(10000),
      sAmount: simoleans(10000),
      lAmount: liquidity(10000),
    };
    const initLiquidityExpected = {
      c: 10000,
      s: 10000,
      l: 10000,
      k: 100000000,
      payoutL: 10000,
      payoutC: 0,
      payoutS: 0,
    };
    await alice.initLiquidityAndCheck(
      t,
      poolState,
      initLiquidityDetails,
      initLiquidityExpected,
    );
    t.assert(t, '..Alice initialize liquidity');
    poolState = updatePoolState(poolState, initLiquidityExpected);

    // (A) trade w/out specifying output
    const tradeDetailsA = {
      inAmount: moola(1000),
      outAmount: simoleans(0),
    };

    const simPrice = outputFromInputPrice(poolState.c, poolState.s, 1000, 30);
    const expectedA = {
      c: poolState.c + 1000,
      s: poolState.s - simPrice,
      l: 10000,
      k: (poolState.c + 1000) * (poolState.s - simPrice),
      out: simPrice,
      in: 0,
    };
    await alice.tradeAndCheck(t, true, poolState, tradeDetailsA, expectedA);
    t.assert(t, '..Alice traded A');
    poolState = updatePoolState(poolState, expectedA);

    // (B) trade specifying output
    const tradeDetailsB = {
      inAmount: moola(500),
      outAmount: simoleans(300),
    };

    const mPrice = priceFromTargetOutput(300, poolState.s, poolState.c, 30);
    const expectedB = {
      c: poolState.c + mPrice,
      s: poolState.s - 300,
      l: 10000,
      k: (poolState.c + mPrice) * (poolState.s - 300),
      out: 300,
      in: 500 - mPrice,
    };
    await alice.tradeAndCheck(t, false, poolState, tradeDetailsB, expectedB);
    t.assert(t, '..Alice traded B');
    poolState = updatePoolState(poolState, expectedB);

    // Attempt (unsucessfully) to trade for a specified amount
    const failedSeat = await alice.offerAndTrade(simoleans(75), moola(3));

    t.rejects(
      failedSeat.getOfferResult(),
      /amountIn insufficient/,
      'amountIn insufficient when want specified',
    );

    const { In: moolaReturn, Out: noSimoleans } = await failedSeat.getPayouts();
    assertPayoutAmount(t, moolaIssuer, moolaReturn, moola(3));
    assertPayoutAmount(t, simoleanIssuer, noSimoleans, simoleans(0));

    // attempt a trade with bad numbers
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});
