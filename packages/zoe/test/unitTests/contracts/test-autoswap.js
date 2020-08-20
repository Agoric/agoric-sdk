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
// reducing to a single division: deltaY =
//    deltaX * gammaNum * yPre / (xPre * gammaDen + deltaX * gammaNum)
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
// reducing to a single division: deltaX =
//    deltaY * xPre * 10000 / (yPre - deltaY ) * gammaNum)
const priceFromTargetOutput = (deltaY, yPre, xPre, fee) => {
  const gammaNumerator = 10000 - fee;
  return floorDivide(
    multiply(multiply(deltaY, xPre), 10000),
    multiply(subtract(yPre, deltaY), gammaNumerator),
  );
};

const scaleForAdd = (poolState, deposits) => {
  const { m: mDeposit, s: sDeposit } = deposits;

  let scaleByAlpha;
  let poolMoolaPost;
  let poolSimoleansPost;
  let payoutM;
  let payoutS;
  let liquidityPost;
  // When (mdeposit / poolState.m > sDeposit / poolState.s), we'll use s as
  // primary and vice versa. When they are exactly equal, we won't add 1 to the
  // required secondary contribution. (because L calculated according to the spec
  // is exact. Here we
  const productM = multiply(mDeposit, poolState.s);
  const productS = multiply(sDeposit, poolState.m);
  const exact = productM === productS;
  if (productM < productS) {
    poolMoolaPost = add(poolState.m, mDeposit);
    scaleByAlpha = makeScaleFn(poolState.m, poolMoolaPost);
    const deltaS = exact
      ? scaleByAlpha(poolState.s)
      : add(1, scaleByAlpha(poolState.s));
    poolSimoleansPost = add(poolState.s, deltaS);
    liquidityPost = add(poolState.l, scaleByAlpha(poolState.l));
    payoutS = subtract(sDeposit, deltaS);
    payoutM = 0;
  } else {
    poolSimoleansPost = poolState.s + sDeposit;
    scaleByAlpha = makeScaleFn(poolState.s, poolSimoleansPost);
    const deltaM = exact
      ? scaleByAlpha(poolState.m)
      : add(1, scaleByAlpha(poolState.m));
    poolMoolaPost = add(poolState.m, deltaM);
    liquidityPost = add(poolState.l, scaleByAlpha(poolState.l));
    payoutS = 0;
    payoutM = subtract(mDeposit, deltaM);
  }

  return {
    m: poolMoolaPost,
    s: poolSimoleansPost,
    l: liquidityPost,
    k: multiply(poolMoolaPost, poolSimoleansPost),
    payoutL: subtract(liquidityPost, poolState.l),
    payoutM,
    payoutS,
  };
};

const updatePoolState = (oldState, newState) => ({
  ...oldState,
  m: newState.m,
  s: newState.s,
  l: newState.l,
  k: newState.k,
});

const makeTrader = (mPurse, sPurse, lPurse, kits, publicFacet) => {
  const {
    liquidityIssuer,
    moolaIssuer,
    simoleanIssuer,
    moola,
    simoleans,
    liquidity,
    zoe,
  } = kits;

  const withdrawPayment = amount => {
    return amount.brand === moolaIssuer.getBrand()
      ? mPurse.withdraw(amount)
      : sPurse.withdraw(amount);
  };

  const trader = harden({
    offerAndTrade: async (outAmount, inAmount) => {
      const proposal = harden({
        want: { Out: outAmount },
        give: { In: inAmount },
      });
      const payment = harden({ In: withdrawPayment(inAmount) });
      const seat = await zoe.offer(
        E(publicFacet).makeSwapInvitation(),
        proposal,
        payment,
      );
      return seat;
    },

    tradeAndCheck: async (t, mIsA, priorPoolState, tradeDetails, expected) => {
      // just check that the trade went through, and the results are as stated.
      // The test will declare fees, refunds, and figure out when the trade
      // gets less than requested
      const { m: mPoolPre, s: sPoolPre, l: lPre, k: kPre } = priorPoolState;
      const { inAmount, outAmount } = tradeDetails;
      const {
        m: mPost,
        s: sPost,
        l: lPost,
        k: kPost,
        payout,
        refund,
      } = expected;
      const moolaIsInput = inAmount.brand === moolaIssuer.getBrand();

      const poolPre = await E(publicFacet).getPoolAllocation();
      if (mIsA) {
        t.deepEquals(moola(mPoolPre), poolPre.Central, `moola before swap`);
        t.deepEquals(
          simoleans(sPoolPre),
          poolPre.Secondary,
          `simoleans before swap`,
        );
      } else {
        t.deepEquals(moola(mPoolPre), poolPre.Secondary, `moola before swap`);
        t.deepEquals(
          simoleans(sPoolPre),
          poolPre.Central,
          `simoleans before swap`,
        );
      }
      t.equals(
        lPre,
        await E(publicFacet).getLiquidityTokens(),
        'liquidity pool before trade',
      );
      t.equals(kPre, sPoolPre * mPoolPre);
      const seat = await trader.offerAndTrade(outAmount, inAmount);
      assertOfferResult(t, seat, 'Swap successfully completed.');

      if (moolaIsInput) {
        const { In: mPayout, Out: sPayout } = await seat.getPayouts();
        assertPayoutAmount(t, moolaIssuer, mPayout, moola(refund));
        assertPayoutAmount(t, simoleanIssuer, sPayout, simoleans(payout));
      } else {
        const { In: sPayout, Out: mPayout } = await seat.getPayouts();
        assertPayoutAmount(t, moolaIssuer, mPayout, moola(payout));
        assertPayoutAmount(t, simoleanIssuer, sPayout, simoleans(refund));
      }

      const poolPost = await E(publicFacet).getPoolAllocation();
      if (mIsA) {
        t.deepEquals(moola(mPost), poolPost.Central, `moola after swap`);
        t.deepEquals(simoleans(sPost), poolPost.Secondary, `s after swap`);
      } else {
        t.deepEquals(moola(mPost), poolPost.Secondary, `moola after swap`);
        t.deepEquals(simoleans(sPost), poolPost.Central, `s after swap`);
      }
      t.equals(kPost, sPost * mPost);

      seat
        .getOfferResult()
        .then(async () =>
          t.equals(
            lPost,
            await E(publicFacet).getLiquidityTokens(),
            'liquidity after',
          ),
        );
    },

    addLiquidityAndCheck: async (t, priorPoolState, details, expected) => {
      // just check that it went through, and the results are as stated.
      // The test will declare fees, refunds, and figure out when the trade
      // gets less than requested
      const { m: mPre, s: sPre, l: lPre, k: kPre } = priorPoolState;
      const { mAmount, sAmount, lAmount = 0 } = details;
      const {
        m: mPost,
        s: sPost,
        l: lPost,
        k: kPost,
        payoutL,
        payoutM,
        payoutS,
      } = expected;
      t.assert(payoutM === 0 || payoutS === 0, 'only refund one side');
      const mIsBasis =
        multiply(mAmount.value, sPre) <= multiply(sAmount.value, mPre);
      const scaleByAlpha = mIsBasis
        ? makeScaleFn(mPre, mPost)
        : makeScaleFn(sPre, sPost);

      const poolPre = await E(publicFacet).getPoolAllocation();
      t.deepEquals(moola(mPre), poolPre.Central, `moola before add liq`);
      t.deepEquals(simoleans(sPre), poolPre.Secondary, `s before add liq`);
      t.equals(
        lPre,
        await E(publicFacet).getLiquidityTokens(),
        'liquidity pool before add',
      );
      t.equals(kPre, sPre * mPre);

      const proposal = harden({
        give: { Central: mAmount, Secondary: sAmount },
        want: { Liquidity: liquidity(lAmount) },
      });
      const payment = harden({
        Central: withdrawPayment(mAmount),
        Secondary: withdrawPayment(sAmount),
      });

      const seat = await zoe.offer(
        E(publicFacet).makeAddLiquidityInvitation(),
        proposal,
        payment,
      );
      assertOfferResult(t, seat, 'Added liquidity.');

      const {
        Central: mPayout,
        Secondary: sPayout,
        Liquidity: lPayout,
      } = await seat.getPayouts();
      assertPayoutAmount(t, moolaIssuer, mPayout, moola(payoutM));
      assertPayoutAmount(t, simoleanIssuer, sPayout, simoleans(payoutS));
      assertPayoutAmount(t, liquidityIssuer, lPayout, liquidity(payoutL));

      const poolPost = await E(publicFacet).getPoolAllocation();
      t.deepEquals(moola(mPost), poolPost.Central, `moola after add liq`);
      t.deepEquals(simoleans(sPost), poolPost.Secondary, `s after add liq`);
      t.equals(
        lPost,
        await E(publicFacet).getLiquidityTokens(),
        'liquidity pool after',
      );
      t.equals(kPost, sPost * mPost, 'expected value of K after addLiquidity');
      t.equals(lPost, add(lPre, scaleByAlpha(lPre)), 'liquidity scales');
      const productM = multiply(mPre, details.sAmount.value);
      const productS = multiply(sPre, details.mAmount.value);
      const exact = productM === productS;
      if (exact) {
        t.equals(mPost, add(mPre, scaleByAlpha(mPre)), 'moola post add');
        t.equals(sPost, add(sPre, scaleByAlpha(sPre)), 'simolean post add');
      } else if (mIsBasis) {
        t.equals(mPost, add(mPre, details.mAmount.value), 'moola post add');
        t.equals(sPost, add(1, add(sPre, scaleByAlpha(sPre))), 's post add');
      } else {
        t.equals(mPost, add(1, add(mPre, scaleByAlpha(mPre))), 'm post add');
        t.equals(sPost, add(sPre, details.smAmount.value), 'simolean post add');
      }
    },

    initLiquidityAndCheck: async (t, priorPoolState, details, expected) => {
      // just check that it went through, and the results are as stated.
      // The test will declare fees, refunds, and figure out when the trade
      // gets less than requested
      const { m: mPre, s: sPre, l: lPre, k: kPre } = priorPoolState;
      const { mAmount, sAmount, lAmount = 0 } = details;
      const {
        m: mPost,
        s: sPost,
        l: lPost,
        k: kPost,
        payoutL,
        payoutM,
        payoutS,
      } = expected;
      t.assert(payoutM === 0 || payoutS === 0, 'only refund one side');
      const poolPre = await E(publicFacet).getPoolAllocation();
      t.deepEquals({}, poolPre, `moola before liquidity`);
      t.equals(0, publicFacet.getLiquidityTokens(), 'liquidity pool pre init');
      t.equals(kPre, sPre * mPre);
      t.equals(lPre, publicFacet.getLiquidityTokens(), 'liquidity pre init');

      const proposal = harden({
        give: { Central: mAmount, Secondary: sAmount },
        want: { Liquidity: liquidity(lAmount) },
      });
      const payment = harden({
        Central: withdrawPayment(mAmount),
        Secondary: withdrawPayment(sAmount),
      });

      const seat = await zoe.offer(
        await E(publicFacet).makeAddLiquidityInvitation(),
        proposal,
        payment,
      );
      assertOfferResult(t, seat, 'Added liquidity.');
      const {
        Central: mPayout,
        Secondary: sPayout,
        Liquidity: lPayout,
      } = await seat.getPayouts();
      assertPayoutAmount(t, moolaIssuer, mPayout, moola(payoutM));
      assertPayoutAmount(t, simoleanIssuer, sPayout, simoleans(payoutS));
      assertPayoutAmount(t, liquidityIssuer, lPayout, liquidity(payoutL));

      const poolPost = await E(publicFacet).getPoolAllocation();
      t.deepEquals(moola(mPost), poolPost.Central, `moola after init`);
      t.deepEquals(
        simoleans(sPost),
        poolPost.Secondary,
        `simolean after liquidity`,
      );
      t.equals(lPost, publicFacet.getLiquidityTokens(), 'liq pool after init');
      t.assert(lPost >= lAmount, 'liquidity want was honored');
      t.equals(kPost, sPost * mPost, 'expected value of K after init');
      t.equals(lPost, mAmount.value, 'liquidity scales (init)');
      t.equals(mPost, mAmount.value);
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
    const bobMoolaPayment = moolaMint.mintPayment(moola(15));
    const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(3));

    // Alice creates an autoswap instance
    const issuerKeywordRecord = harden({
      Central: moolaIssuer,
      Secondary: simoleanIssuer,
    });
    const { publicFacet } = await zoe.startInstance(
      installation,
      issuerKeywordRecord,
    );
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

    // Alice creates an invitation for autoswap and sends it to Bob
    const bobInvitation = await E(publicFacet).makeSwapInvitation();

    // Bob claims it
    const bobExclInvitation = await invitationIssuer.claim(bobInvitation);
    const bobInstance = await E(zoe).getInstance(bobExclInvitation);
    const bobInstallation = await E(zoe).getInstallation(bobExclInvitation);
    t.equals(bobInstallation, installation, `installation`);
    const bobAutoswap = E(zoe).getPublicFacet(bobInstance);

    // Bob looks up the price of 3 moola in simoleans
    const simoleanAmounts = await E(bobAutoswap).getPriceForOutput(
      simoleans(3),
      moola(0).brand,
    );
    t.deepEquals(simoleanAmounts, moola(15), `currentPrice`);

    // Bob escrows
    const bobMoolaForSimProposal = harden({
      want: { Out: simoleans(3) },
      give: { In: moola(15) },
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
    assertPayoutAmount(t, simoleanIssuer, bobSimoleanPayout1, simoleans(3));
    t.deepEquals(
      await E(bobAutoswap).getPoolAllocation(),
      {
        Central: moola(25),
        Secondary: simoleans(2),
        Liquidity: liquidity(0),
      },
      `pool allocation after first swap`,
    );
    const liquidityOutstanding = await E(bobAutoswap).getLiquidityTokens();
    t.equals(liquidityOutstanding, 10, 'liquidity outstanding');

    // Bob looks up how much he can get for 3 simoleans
    const moolaAmounts = await E(bobAutoswap).getCurrentPrice(
      simoleans(3),
      moola(0).brand,
    );
    t.deepEquals(moolaAmounts, moola(14), `price 2`);

    // Bob makes another offer and swaps
    const bobSecondInvitation = E(bobAutoswap).makeSwapInvitation();
    const bobSimsForMoolaProposal = harden({
      want: { Out: moola(0) },
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
    assertPayoutAmount(t, moolaIssuer, bobMoolaPayout2, moola(14));
    assertPayoutAmount(t, simoleanIssuer, bobSimoleanPayout2, simoleans(0));

    t.deepEqual(
      await E(bobAutoswap).getPoolAllocation(),
      {
        Central: moola(11),
        Secondary: simoleans(5),
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
    assertPayoutAmount(t, moolaIssuer, aliceMoolaPayout, moola(11));
    assertPayoutAmount(t, simoleanIssuer, aliceSimoleanPayout, simoleans(5));
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
    const { publicFacet } = await zoe.startInstance(
      installation,
      issuerKeywordRecord,
    );
    const liquidityIssuer = await E(publicFacet).getLiquidityIssuer();
    const liquidity = (await makeLocalAmountMath(liquidityIssuer)).make;
    const kits = {
      moolaIssuer,
      simoleanIssuer,
      liquidityIssuer,
      moola,
      simoleans,
      liquidity,
      zoe,
    };
    let poolState = {
      m: 0,
      s: 0,
      l: 0,
      k: 0,
    };

    // Setup Alice
    const moolaPurse = moolaIssuer.makeEmptyPurse();
    moolaPurse.deposit(moolaMint.mintPayment(moola(50000)));
    const simoleanPurse = simoleanIssuer.makeEmptyPurse();
    simoleanPurse.deposit(simoleanMint.mintPayment(simoleans(50000)));
    const alice = makeTrader(
      moolaPurse,
      simoleanPurse,
      liquidityIssuer.makeEmptyPurse(),
      kits,
      publicFacet,
    );

    const initLiquidityDetails = {
      mAmount: moola(10000),
      sAmount: simoleans(10000),
    };
    const initLiquidityExpected = {
      m: 10000,
      s: 10000,
      l: 10000,
      k: 100000000,
      payoutL: 10000,
      payoutM: 0,
      payoutS: 0,
    };
    await alice.initLiquidityAndCheck(
      t,
      poolState,
      initLiquidityDetails,
      initLiquidityExpected,
    );
    t.assert(t, '..Alice added liquidity');
    poolState = updatePoolState(poolState, initLiquidityExpected);

    const tradeDetails = {
      inAmount: moola(1000),
      outAmount: simoleans(0),
    };
    const tradeExpected = {
      m: 11000,
      s: 9094,
      l: 10000,
      k: 11000 * 9094,
      payout: 906,
      refund: 0,
    };
    await alice.tradeAndCheck(t, true, poolState, tradeDetails, tradeExpected);
    t.assert(t, '..Alice traded');
    poolState = updatePoolState(poolState, tradeExpected);

    const liqDetails1 = {
      mAmount: moola(1100),
      sAmount: simoleans(910),
    };

    const liqExpected1 = scaleForAdd(poolState, { m: 1100, s: 910 }, true);
    await alice.addLiquidityAndCheck(t, poolState, liqDetails1, liqExpected1);
    t.assert(t, '..Carol added liquidity');
    poolState = updatePoolState(poolState, liqExpected1);

    // Now add to the liquidity pool in an exact ratio. (The pool has
    // 12100 Moola and 11000 simoleans)
    const liqDetails2 = {
      mAmount: moola(121),
      sAmount: simoleans(110),
    };
    const addLiqExpect2 = scaleForAdd(poolState, { m: 121, s: 110 });
    alice.addLiquidityAndCheck(t, poolState, liqDetails2, addLiqExpect2);
    poolState = updatePoolState(poolState, addLiqExpect2);
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
    const { publicFacet } = await zoe.startInstance(
      installation,
      issuerKeywordRecord,
    );

    const moolaPurse = moolaIssuer.makeEmptyPurse();
    moolaPurse.deposit(moolaMint.mintPayment(moola(100)));

    const inAmount = moola(100);
    const proposal = harden({
      want: { Out: simoleans(0) },
      give: { In: inAmount },
    });
    const payment = harden({ In: moolaPurse.withdraw(inAmount) });

    const seat = await zoe.offer(
      E(publicFacet).makeSwapInvitation(),
      proposal,
      payment,
    );
    assertOfferResult(t, seat, 'Pool not initialized');

    const { In: mPayout, Out: sPayout } = await seat.getPayouts();
    assertPayoutAmount(t, moolaIssuer, mPayout, moola(100));
    assertPayoutAmount(t, simoleanIssuer, sPayout, simoleans(0));

    const poolPost = await E(publicFacet).getPoolAllocation();
    t.deepEquals({}, poolPost, `empty Pool still`);

    seat
      .getOfferResult()
      .then(async () =>
        t.equals(
          0,
          await E(publicFacet).getLiquidityTokens(),
          'liquidity empty after',
        ),
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
    const { publicFacet } = await zoe.startInstance(
      installation,
      issuerKeywordRecord,
    );
    const liquidityIssuer = await E(publicFacet).getLiquidityIssuer();
    const liquidity = (await makeLocalAmountMath(liquidityIssuer)).make;
    const kits = {
      moolaIssuer,
      simoleanIssuer,
      liquidityIssuer,
      moola,
      simoleans,
      liquidity,
      zoe,
    };
    let poolState = {
      m: 0,
      s: 0,
      l: 0,
      k: 0,
    };

    // Setup Alice
    const moolaPurse = moolaIssuer.makeEmptyPurse();
    moolaPurse.deposit(moolaMint.mintPayment(moola(50000)));
    const simoleanPurse = simoleanIssuer.makeEmptyPurse();
    simoleanPurse.deposit(simoleanMint.mintPayment(simoleans(50000)));
    const alice = makeTrader(
      moolaPurse,
      simoleanPurse,
      liquidityIssuer.makeEmptyPurse(),
      kits,
      publicFacet,
    );

    const initLiquidityDetails = {
      mAmount: moola(10000),
      sAmount: simoleans(10000),
    };
    const initLiquidityExpected = {
      m: 10000,
      s: 10000,
      l: 10000,
      k: 100000000,
      payoutL: 10000,
      payoutM: 0,
      payoutS: 0,
    };
    await alice.initLiquidityAndCheck(
      t,
      poolState,
      initLiquidityDetails,
      initLiquidityExpected,
    );
    t.assert(t, '..Alice added liquidity');
    poolState = updatePoolState(poolState, initLiquidityExpected);

    // (A) trade w/out specifying output
    const tradeDetailsA = {
      inAmount: moola(1000),
      outAmount: simoleans(0),
    };

    const simPrice = outputFromInputPrice(poolState.m, poolState.s, 1000, 30);
    const expectedA = {
      m: poolState.m + 1000,
      s: poolState.s - simPrice,
      l: 10000,
      k: (poolState.m + 1000) * (poolState.s - simPrice),
      payout: simPrice,
      refund: 0,
    };
    await alice.tradeAndCheck(t, true, poolState, tradeDetailsA, expectedA);
    t.assert(t, '..Alice traded A');
    poolState = updatePoolState(poolState, expectedA);

    // (B) trade specifying output
    const tradeDetailsB = {
      inAmount: moola(500),
      outAmount: simoleans(300),
    };

    const mPrice = priceFromTargetOutput(300, poolState.s, poolState.m, 30);
    const expectedB = {
      m: poolState.m + mPrice,
      s: poolState.s - 300,
      l: 10000,
      k: (poolState.m + mPrice) * (poolState.s - 300),
      payout: 300,
      refund: 500 - mPrice,
    };
    await alice.tradeAndCheck(t, true, poolState, tradeDetailsB, expectedB);
    t.assert(t, '..Alice traded B');
    poolState = updatePoolState(poolState, expectedB);

    // Attempt (unsucessfully) to trade for a specified amount
    const failedSeat = await alice.offerAndTrade(simoleans(75), moola(3));
    assertOfferResult(t, failedSeat, 'amountIn insufficient');
    const { In: moolaReturn, Out: noSimoleans } = await failedSeat.getPayouts();
    assertPayoutAmount(t, moolaIssuer, moolaReturn, moola(3));
    assertPayoutAmount(t, simoleanIssuer, noSimoleans, simoleans(0));

    // attempt a trade with bad numbers
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});
