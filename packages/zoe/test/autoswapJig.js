import { E } from '@endo/eventual-send';
import { Remotable } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';

import { natSafeMath } from '../src/contractSupport/index.js';
import { assertOfferResult, assertPayoutAmount } from './zoeTestHelpers.js';

const { add, subtract, multiply, floorDivide, ceilDivide } = natSafeMath;

// A test Harness that simplifies tests of autoswap and constant product AMM. The
// main component is the Trader, which can be instructed to make various offers
// to the contracts, and will validate pre- and post-conditions, instructed by
// a description of the expected previous state, the details of the offer and
// the expected results. This leaves the tests with the responsibility to
// clearly specify what changes should be expected. Helper methods calculate the
// changes expected with various successful requests, so the test code only
// needs additional detail when the expected outcome varies from common cases.

const makeScaleFn = (xPre, xPost) => value => {
  const deltaX = xPost > xPre ? subtract(xPost, xPre) : subtract(xPre, xPost);
  return floorDivide(multiply(deltaX, value), xPre);
};

// deltaY = alpha * gamma * yPre / ( 1 + alpha * gamma )
// gamma is (10000 - fee) / 10000
// alpha is deltaX / xPre
// reducing to a single division:
//    deltaY = deltaX * gammaNum * yPre / (xPre * gammaDen + deltaX * gammaNum)
export const outputFromInputPrice = (xPre, yPre, deltaX, fee) => {
  const gammaNumerator = 10000n - fee;
  return floorDivide(
    multiply(multiply(deltaX, yPre), gammaNumerator),
    add(multiply(xPre, 10000n), multiply(deltaX, gammaNumerator)),
  );
};

// deltaX = (beta * xPre / ( (1 - beta) * gamma )) + 1
// gamma is (10000 - fee) / 10000
// beta is deltaY / yPre
// reducing to a single division:
//    deltaX = (deltaY * xPre * 10000 / (yPre - deltaY ) * gammaNum)) + 1
export const priceFromTargetOutput = (deltaY, yPre, xPre, fee) => {
  const gammaNumerator = 10000n - fee;
  return ceilDivide(
    multiply(multiply(deltaY, xPre), 10000n),
    multiply(subtract(yPre, deltaY), gammaNumerator),
  );
};

// calculation of next state for a successful addLiquidity offer. Doesn't apply
// to initial liquidity.
export const scaleForAddLiquidity = (poolState, deposits, exactRatio) => {
  const { c: cDeposit, s: sDeposit } = deposits;

  const poolCentralPost = add(poolState.c, cDeposit);
  const scaleByAlpha = makeScaleFn(poolState.c, poolCentralPost);
  // The test declares when it expects an exact ratio
  const deltaS = exactRatio
    ? scaleByAlpha(poolState.s)
    : add(1n, scaleByAlpha(poolState.s));
  const poolSecondaryPost = add(poolState.s, deltaS);
  const liquidityPost = add(poolState.l, scaleByAlpha(poolState.l));

  return {
    c: poolCentralPost,
    s: poolSecondaryPost,
    l: liquidityPost,
    k: multiply(poolCentralPost, poolSecondaryPost),
    payoutL: subtract(liquidityPost, poolState.l),
    payoutC: 0n,
    payoutS: subtract(sDeposit, deltaS),
  };
};

// calculation of next state for a successful removeLiquidity offer.
export const scaleForRemoveLiquidity = (poolState, withdrawal) => {
  const scaleByAlpha = makeScaleFn(poolState.l, poolState.l - withdrawal.l);
  const cWithdraw = scaleByAlpha(poolState.c);
  const sWithdraw = scaleByAlpha(poolState.s);
  const poolCentralPost = subtract(poolState.c, cWithdraw);
  const poolSecondaryPost = subtract(poolState.s, sWithdraw);
  const liquidityPost = subtract(poolState.l, scaleByAlpha(poolState.l));

  return {
    c: poolCentralPost,
    s: poolSecondaryPost,
    l: liquidityPost,
    k: multiply(poolCentralPost, poolSecondaryPost),
    payoutL: 0n,
    payoutC: cWithdraw,
    payoutS: sWithdraw,
  };
};

// The state of the pool at the start of a transaction. The values of central,
// and secondary pools, the liquidity outstanding, and K (the product of c and
// s). K may turn out to always be redundant, but it was helpful in clarifying
// which operations change K.
export const updatePoolState = (oldState, newState) => ({
  ...oldState,
  c: newState.c,
  s: newState.s,
  l: newState.l,
  k: newState.k,
});

export const makeTrader = async (purses, zoe, publicFacet, centralIssuer) => {
  const purseMap = new Map();
  const brands = await Promise.all(purses.map(p => E(p).getAllegedBrand()));
  for (let i = 0; i < purses.length; i += 1) {
    purseMap.set(brands[i], purses[i]);
  }

  const withdrawPayment = amount => {
    return E(purseMap.get(amount.brand)).withdraw(amount);
  };

  // autoswap ignores issuer, constant product AMM needs to know which pool
  const getLiquidity = issuer =>
    E(publicFacet).getLiquiditySupply(issuer.getBrand());
  const getPoolAllocation = issuer =>
    E(publicFacet).getPoolAllocation(issuer.getBrand());

  const liquidityPreCheck = async (
    t,
    secondaryIssuer,
    liquidityIssuer,
    priorPoolState,
    details,
    expected,
  ) => {
    const centralBrand = await E(centralIssuer).getBrand();
    const secondaryBrand = await E(secondaryIssuer).getBrand();
    const liquidityBrand = await E(liquidityIssuer).getBrand();
    const central = value => AmountMath.make(centralBrand, value);
    const secondary = value => AmountMath.make(secondaryBrand, value);
    const liquidity = value => AmountMath.make(liquidityBrand, value);

    const { c: cPre, s: sPre, l: lPre, k: kPre } = priorPoolState;
    const { cAmount, sAmount, lAmount = liquidity(0n) } = details;
    const { payoutC, payoutS } = expected;
    t.truthy(payoutC === 0n || payoutS === 0n, 'only refund one side');

    const poolPre = await getPoolAllocation(secondaryIssuer);
    t.deepEqual(poolPre.Central, central(cPre), `central before add liq`);
    t.deepEqual(poolPre.Secondary, secondary(sPre), `s before add liq`);
    t.is(
      await getLiquidity(secondaryIssuer),
      lPre,
      'liquidity pool before add',
    );
    t.is(kPre, sPre * cPre);
    return {
      cAmount,
      sAmount,
      lAmount,
    };
  };

  const liquidityPostCheck = async (
    t,
    seat,
    secondaryIssuer,
    liquidityIssuer,
    expected,
    priorPoolState,
    cAmount,
    specifyRate,
  ) => {
    const centralBrand = await E(centralIssuer).getBrand();
    const secondaryBrand = await E(secondaryIssuer).getBrand();
    const liquidityBrand = await E(liquidityIssuer).getBrand();
    const central = value => AmountMath.make(centralBrand, value);
    const secondary = value => AmountMath.make(secondaryBrand, value);
    const liquidity = value => AmountMath.make(liquidityBrand, value);
    const {
      c: cPost,
      s: sPost,
      l: lPost,
      k: kPost,
      payoutL,
      payoutC,
      payoutS,
    } = expected;
    const { c: cPre, s: sPre, l: lPre } = priorPoolState;

    const scaleByAlpha = makeScaleFn(cPre, cPost);
    const {
      Central: cPayout,
      Secondary: sPayout,
      Liquidity: lPayout,
    } = await E(seat).getPayouts();
    await assertPayoutAmount(t, centralIssuer, cPayout, central(payoutC), '+c');
    await assertPayoutAmount(
      t,
      secondaryIssuer,
      sPayout,
      secondary(payoutS),
      '+s',
    );
    await assertPayoutAmount(
      t,
      liquidityIssuer,
      lPayout,
      liquidity(payoutL),
      '+l',
    );

    const poolPost = await getPoolAllocation(secondaryIssuer);
    t.deepEqual(poolPost.Central, central(cPost), `central after add liq`);
    t.deepEqual(poolPost.Secondary, secondary(sPost), `s after add liq`);
    t.is(await getLiquidity(secondaryIssuer), lPost, 'liquidity pool after');
    t.is(kPost, sPost * cPost, 'expected value of K after addLiquidity');

    if (!specifyRate) {
      t.is(add(lPre, scaleByAlpha(lPre)), lPost, 'liquidity scales');

      const productC = multiply(cPre, scaleByAlpha(sPre));
      const productS = multiply(sPre, cAmount.value);
      const exact = productC === productS;
      if (exact) {
        t.is(add(cPre, scaleByAlpha(cPre)), cPost, 'central post add');
        t.is(add(sPre, scaleByAlpha(sPre)), sPost, 'secondary post add');
      } else {
        t.is(add(cPre, cAmount.value), cPost, 'central post add');
        t.is(add(1n, add(sPre, scaleByAlpha(sPre))), sPost, 's post add');
      }
    }
  };

  const trader = Remotable('Alleged: trader', undefined, {
    // Using Remotable rather than Far because the methods accept
    // an ava ExecutionContext as `t`, which is not a passable.
    offerAndTrade: async (outAmount, inAmount, swapIn) => {
      const proposal = harden({
        want: { Out: outAmount },
        give: { In: inAmount },
      });
      const payment = harden({ In: withdrawPayment(inAmount) });
      const invitation = swapIn
        ? E(publicFacet).makeSwapInInvitation()
        : E(publicFacet).makeSwapOutInvitation();
      const seat = await E(zoe).offer(invitation, proposal, payment);
      return seat;
    },

    tradeAndCheck: async (
      t,
      swapIn,
      prePoolState,
      tradeDetails,
      expected,
      { Secondary: secondaryIssuer },
    ) => {
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

      const centralBrand = await E(centralIssuer).getBrand();
      const secondaryBrand = await E(secondaryIssuer).getBrand();
      const central = value => AmountMath.make(centralBrand, value);
      const secondary = value => AmountMath.make(secondaryBrand, value);

      const poolPre = await getPoolAllocation(secondaryIssuer);
      t.deepEqual(poolPre.Central, central(cPoolPre), `central before swap`);
      t.deepEqual(poolPre.Secondary, secondary(sPoolPre), `s before swap`);
      t.is(
        await getLiquidity(secondaryIssuer),
        lPre,
        'liquidity pool before trade',
      );
      t.is(kPre, sPoolPre * cPoolPre);

      const seat = await trader.offerAndTrade(outAmount, inAmount, swapIn);
      assertOfferResult(t, seat, 'Swap successfully completed.');
      const [inIssuer, inMath, outIssuer, out] =
        inAmount.brand === centralIssuer.getBrand()
          ? [centralIssuer, central, secondaryIssuer, secondary]
          : [secondaryIssuer, secondary, centralIssuer, central];
      const { In: refund, Out: payout } = await E(seat).getPayouts();
      await assertPayoutAmount(
        t,
        outIssuer,
        payout,
        out(outExpected),
        'trade out',
      );
      await assertPayoutAmount(
        t,
        inIssuer,
        refund,
        inMath(inExpected),
        'trade in',
      );

      const poolPost = await getPoolAllocation(secondaryIssuer);
      t.deepEqual(poolPost.Central, central(cPost), `central after swap`);
      t.deepEqual(poolPost.Secondary, secondary(sPost), `s after swap`);
      t.is(kPost, sPost * cPost);

      await E(seat).getOfferResult();
      t.is(await getLiquidity(secondaryIssuer), lPost, 'liquidity after');
    },

    // This check only handles success. Failing calls should do something else.
    addLiquidityAndCheck: async (
      t,
      priorPoolState,
      details,
      expected,
      { Liquidity: liquidityIssuer, Secondary: secondaryIssuer },
    ) => {
      // just check that it went through, and the results are as stated.
      // The test will declare fees, refunds, and figure out when the trade
      // gets less than requested
      const { cAmount, sAmount, lAmount } = await liquidityPreCheck(
        t,
        secondaryIssuer,
        liquidityIssuer,
        priorPoolState,
        details,
        expected,
      );

      const proposal = harden({
        give: { Central: cAmount, Secondary: sAmount },
        want: { Liquidity: lAmount },
      });
      const payment = harden({
        Central: withdrawPayment(cAmount),
        Secondary: withdrawPayment(sAmount),
      });

      const seat = await E(zoe).offer(
        E(publicFacet).makeAddLiquidityInvitation(),
        proposal,
        payment,
      );
      assertOfferResult(t, seat, 'Added liquidity.');

      return liquidityPostCheck(
        t,
        seat,
        secondaryIssuer,
        liquidityIssuer,
        expected,
        priorPoolState,
        cAmount,
        false,
      );
    },

    // This check only handles success. Failing calls should do something else.
    addLiquidityAtRateAndCheck: async (
      t,
      priorPoolState,
      details,
      expected,
      { Liquidity: liquidityIssuer, Secondary: secondaryIssuer },
    ) => {
      // just check that it went through, and the results are as stated.
      // The test will declare fees, refunds, and figure out when the trade
      // gets less than requested
      const { cAmount, sAmount, lAmount } = await liquidityPreCheck(
        t,
        secondaryIssuer,
        liquidityIssuer,
        priorPoolState,
        details,
        expected,
      );

      const proposal = harden({
        give: { Central: cAmount, Secondary: sAmount },
        want: { Liquidity: lAmount },
      });
      const payment = harden({
        Central: withdrawPayment(cAmount),
        Secondary: withdrawPayment(sAmount),
      });

      const seat = await E(zoe).offer(
        E(publicFacet).makeAddLiquidityAtRateInvitation(),
        proposal,
        payment,
      );
      assertOfferResult(t, seat, 'Added liquidity.');

      return liquidityPostCheck(
        t,
        seat,
        secondaryIssuer,
        liquidityIssuer,
        expected,
        priorPoolState,
        cAmount,
        true,
      );
    },

    // This check only handles success. Failing calls should test manually.
    removeLiquidityAndCheck: async (
      t,
      priorPoolState,
      details,
      expected,
      { Liquidity: liquidityIssuer, Secondary: secondaryIssuer },
    ) => {
      const centralBrand = await E(centralIssuer).getBrand();
      const secondaryBrand = await E(secondaryIssuer).getBrand();
      const liquidityBrand = await E(liquidityIssuer).getBrand();
      const central = value => AmountMath.make(centralBrand, value);
      const secondary = value => AmountMath.make(secondaryBrand, value);
      const liquidity = value => AmountMath.make(liquidityBrand, value);

      const { c: cPre, s: sPre, l: lPre, k: kPre } = priorPoolState;
      const { cAmount, sAmount, lAmount = liquidity(0n) } = details;
      const {
        c: cPost,
        s: sPost,
        l: lPost,
        k: kPost,
        payoutL,
        payoutC,
        payoutS,
      } = expected;
      const scaleByAlpha = makeScaleFn(lPre, lPost);

      const poolPre = await getPoolAllocation(secondaryIssuer);
      t.deepEqual(poolPre.Central, central(cPre), `central before add liq`);
      t.deepEqual(poolPre.Secondary, secondary(sPre), `s before add liq`);
      t.deepEqual(payoutL, 0n, 'no liquidity refund');
      t.is(
        await getLiquidity(secondaryIssuer),
        lPre,
        'liquidity pool before remove',
      );
      t.is(kPre, sPre * cPre);

      const proposal = harden({
        give: { Liquidity: lAmount },
        want: { Central: cAmount, Secondary: sAmount },
      });
      const payment = harden({
        Liquidity: withdrawPayment(lAmount),
      });

      const seat = await E(zoe).offer(
        E(publicFacet).makeRemoveLiquidityInvitation(),
        proposal,
        payment,
      );
      assertOfferResult(t, seat, 'Liquidity successfully removed.');

      const { Central: cPayout, Secondary: sPayout } = await seat.getPayouts();
      await assertPayoutAmount(
        t,
        centralIssuer,
        cPayout,
        central(payoutC),
        '+c',
      );
      await assertPayoutAmount(
        t,
        secondaryIssuer,
        sPayout,
        secondary(payoutS),
        '+s',
      );

      const poolPost = await getPoolAllocation(secondaryIssuer);
      t.deepEqual(poolPost.Central, central(cPost), `central after add liq`);
      t.deepEqual(poolPost.Secondary, secondary(sPost), `s after add liq`);
      t.is(await getLiquidity(secondaryIssuer), lPost, 'liquidity pool after');
      t.is(kPost, sPost * cPost, 'expected value of K after addLiquidity');
      t.is(subtract(lPre, scaleByAlpha(lPre)), lPost, 'liquidity scales down');
      t.is(subtract(cPre, scaleByAlpha(cPre)), cPost, 'central post reduced');
      t.is(subtract(sPre, scaleByAlpha(sPre)), sPost, 'secondary post reduced');
    },

    initLiquidityAndCheck: async (
      t,
      priorPoolState,
      details,
      expected,
      { Liquidity: liquidityIssuer, Secondary: secondaryIssuer },
    ) => {
      // just check that it went through, and the results are as stated.
      // The test will declare fees, refunds, and figure out when the trade
      // gets less than requested

      const centralBrand = await E(centralIssuer).getBrand();
      const secondaryBrand = await E(secondaryIssuer).getBrand();
      const liquidityBrand = await E(liquidityIssuer).getBrand();
      const central = value => AmountMath.make(centralBrand, value);
      const secondary = value => AmountMath.make(secondaryBrand, value);
      const liquidity = value => AmountMath.make(liquidityBrand, value);

      const { c: cPre, s: sPre, l: lPre, k: kPre } = priorPoolState;
      const { cAmount, sAmount, lAmount = liquidity(0n) } = details;
      const {
        c: cPost,
        s: sPost,
        l: lPost,
        k: kPost,
        payoutL,
        payoutC,
        payoutS,
      } = expected;
      t.truthy(payoutC === 0n || payoutS === 0n, 'only refund one side');
      const poolPre = await getPoolAllocation(secondaryIssuer);
      t.deepEqual(poolPre, {}, `central before liquidity`);
      t.is(await getLiquidity(secondaryIssuer), 0n, 'liquidity pool pre init');
      t.is(kPre, sPre * cPre);
      t.is(await getLiquidity(secondaryIssuer), lPre, 'liquidity pre init');

      const proposal = harden({
        give: { Central: cAmount, Secondary: sAmount },
        want: { Liquidity: lAmount },
      });
      const payment = harden({
        Central: withdrawPayment(cAmount),
        Secondary: withdrawPayment(sAmount),
      });

      const seat = await E(zoe).offer(
        await E(publicFacet).makeAddLiquidityInvitation(),
        proposal,
        payment,
      );
      assertOfferResult(t, seat, 'Added liquidity.');
      const {
        Central: cPayout,
        Secondary: sPayout,
        Liquidity: lPayout,
      } = await E(seat).getPayouts();
      await assertPayoutAmount(
        t,
        centralIssuer,
        cPayout,
        central(payoutC),
        'init c',
      );
      const secondaryAmt = secondary(payoutS);
      await assertPayoutAmount(
        t,
        secondaryIssuer,
        sPayout,
        secondaryAmt,
        'init s',
      );
      const liquidityAmt = liquidity(payoutL);
      await assertPayoutAmount(
        t,
        liquidityIssuer,
        lPayout,
        liquidityAmt,
        'init l',
      );

      const poolPost = await getPoolAllocation(secondaryIssuer);
      t.deepEqual(poolPost.Central, central(cPost), `central after init`);
      t.deepEqual(poolPost.Secondary, secondary(sPost), `s after liquidity`);
      t.is(await getLiquidity(secondaryIssuer), lPost, 'liq pool after init');
      t.truthy(lPost >= lAmount.value, 'liquidity want was honored');
      t.is(sPost * cPost, kPost, 'expected value of K after init');
      t.is(lAmount.value, lPost, 'liquidity scales (init)');
      t.is(cAmount.value, cPost);
      t.is(sAmount.value, sPost);
      return { central: cPayout, secondary: sPayout, liquidity: lPayout };
    },

    async addLiquidPoolAndCheck(t, details, expected, secondaryIssuer, kwd) {
      const { cAmount, sAmount, liquidityValue } = details;
      const liquidityIssuer = E(publicFacet).addIssuer(secondaryIssuer, kwd);
      const liquidityBrand = await E(liquidityIssuer).getBrand();
      const addPoolInvitation = await E(publicFacet).addPoolInvitation();

      const proposal = harden({
        give: { Secondary: sAmount, Central: cAmount },
        want: { Liquidity: AmountMath.make(liquidityBrand, liquidityValue) },
      });
      const payments = {
        Secondary: withdrawPayment(sAmount),
        Central: withdrawPayment(cAmount),
      };

      const addLiquiditySeat = E(zoe).offer(
        addPoolInvitation,
        proposal,
        payments,
      );
      t.is(
        await E(addLiquiditySeat).getOfferResult(),
        'Added liquidity.',
        `Added Secondary and Central Liquidity`,
      );

      const centralBrand = await E(centralIssuer).getBrand();
      const secondaryBrand = await E(secondaryIssuer).getBrand();
      const central = value => AmountMath.make(centralBrand, value);
      const secondary = value => AmountMath.make(secondaryBrand, value);
      const liquidity = value => AmountMath.make(liquidityBrand, value);

      const { c: cPost, s: sPost, l: lPost, k: kPost } = expected;
      const poolPost = await getPoolAllocation(secondaryIssuer);
      t.deepEqual(poolPost.Central, central(cPost), `central after init`);
      t.deepEqual(poolPost.Secondary, secondary(sPost), `s after liquidity`);
      t.deepEqual(poolPost.Liquidity, liquidity(0n), `l after liquidity`);
      t.is(await getLiquidity(secondaryIssuer), lPost, 'liq pool after init');
      t.is(sPost * cPost, kPost, 'expected value of K after init');
      t.is(cAmount.value, cPost);
      t.is(sAmount.value, sPost);

      return { seat: addLiquiditySeat, liquidityIssuer };
    },
  });
  return trader;
};
