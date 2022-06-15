// @ts-check

import { AmountMath, isNatValue } from '@agoric/ertp';
import { makeNotifierKit, makeSubscriptionKit } from '@agoric/notifier';

import {
  calcLiqValueToMint,
  calcSecondaryRequired,
  calcValueToRemove,
} from '@agoric/zoe/src/contractSupport/index.js';

import '@agoric/zoe/exported.js';
import { defineKindMulti } from '@agoric/vat-data';
import { Far } from '@endo/marshal';
import { makePriceAuthority } from './priceAuthority.js';
import { singlePool } from './singlePool.js';

// Pools represent a single pool of liquidity. Price calculations and trading
// happen in a wrapper class that knows whether the proposed trade involves a
// single pool or multiple hops.

export const publicPrices = prices => {
  return { amountIn: prices.swapperGives, amountOut: prices.swapperGets };
};

/**
 * @typedef {Readonly<{
 * liquidityBrand: Brand<'nat'>,
 * secondaryBrand: Brand<'nat'>,
 * centralBrand: Brand<'nat'>,
 * liquidityZcfMint: ZCFMint,
 * liquidityIssuer: Issuer<any>,
 * toCentralPriceAuthority: PriceAuthority,
 * fromCentralPriceAuthority: PriceAuthority,
 * quoteIssuerKit: IssuerKit,
 * protocolSeat: ZCFSeat,
 * zcf: ZCF,
 * timer: TimerService,
 * paramAccessor,
 * }>} ImmutableState
 *
 * @typedef {{
 * updater: IterationObserver<any>,
 * notifier: Notifier<any>,
 * metricsPublication: IterationObserver<PoolMetricsNotification>,
 * metricsSubscription: Subscription<PoolMetricsNotification>
 * poolSeat: ZCFSeat,
 * liqTokenSupply: bigint,
 * }} MutableState
 *
 * @typedef {{
 *   state: ImmutableState & MutableState,
 *   facets: {
 *     helper: import('@agoric/vat-data/src/types').KindFacet<typeof helperBehavior>,
 *     pool: import('@agoric/vat-data/src/types').KindFacet<XYKPool>,
 *     singlePool: VirtualPool,
 *   },
 * }} MethodContext
 *
 * @typedef {object} PoolMetricsNotification
 * @property {Amount} centralAmount
 * @property {Amount} secondaryAmount
 * @property {Amount} liquidityTokens - outstanding tokens
 */

export const updateUpdaterState = (updater, pool) =>
  // TODO: when governance can change the interest rate, include it here
  updater.updateState({
    central: pool.getCentralAmount(),
    secondary: pool.getSecondaryAmount(),
  });

const helperBehavior = {
  /** @type {import('@agoric/vat-data/src/types').PlusContext<MethodContext, AddLiquidityInternal>} */
  addLiquidityInternal: (
    { state },
    zcfSeat,
    secondaryAmount,
    poolCentralAmount,
    feeSeat,
  ) => {
    const { poolSeat, liquidityBrand, liquidityZcfMint, zcf } = state;
    // addLiquidity can't be called until the pool has been created. We verify
    // that the asset is NAT before creating a pool.

    const liquidityValueOut = calcLiqValueToMint(
      state.liqTokenSupply,
      // @ts-expect-error value could be not Nat
      zcfSeat.getStagedAllocation().Central.value,
      poolCentralAmount.value,
    );

    const liquidityAmountOut = AmountMath.make(
      liquidityBrand,
      liquidityValueOut,
    );
    liquidityZcfMint.mintGains(
      harden({ Liquidity: liquidityAmountOut }),
      poolSeat,
    );
    state.liqTokenSupply += liquidityValueOut;

    poolSeat.incrementBy(
      zcfSeat.decrementBy(
        harden({
          Central: zcfSeat.getStagedAllocation().Central,
          Secondary: secondaryAmount,
        }),
      ),
    );

    zcfSeat.incrementBy(
      poolSeat.decrementBy(harden({ Liquidity: liquidityAmountOut })),
    );
    if (feeSeat) {
      zcf.reallocate(poolSeat, zcfSeat, feeSeat);
    } else {
      zcf.reallocate(poolSeat, zcfSeat);
    }
  },
  /** @type {import('@agoric/vat-data/src/types').PlusContext<MethodContext, AddLiquidityActual>} */
  addLiquidityActual: (
    { state, facets },
    pool,
    zcfSeat,
    secondaryAmount,
    poolCentralAmount,
    feeSeat,
  ) => {
    const { updater } = state;
    const { helper } = facets;

    helper.addLiquidityInternal(
      zcfSeat,
      secondaryAmount,
      poolCentralAmount,
      feeSeat,
    );
    zcfSeat.exit();
    updateUpdaterState(updater, pool);
    facets.helper.updateMetrics();
    return 'Added liquidity.';
  },
  /** @param {MethodContext} context */
  updateMetrics: context => {
    const { state, facets } = context;
    const payload = harden({
      centralAmount: facets.pool.getCentralAmount(),
      secondaryAmount: facets.pool.getSecondaryAmount(),
      liquidityTokens: AmountMath.make(
        state.liquidityBrand,
        state.liqTokenSupply,
      ),
    });

    state.metricsPublication.updateState(payload);
  },
};

const poolBehavior = {
  getLiquiditySupply: ({ state: { liqTokenSupply } }) => liqTokenSupply,
  getLiquidityIssuer: ({ state: { liquidityIssuer } }) => liquidityIssuer,
  getPoolSeat: ({ state: { poolSeat } }) => poolSeat,
  getCentralAmount: ({ state: { poolSeat, centralBrand } }) =>
    poolSeat.getAmountAllocated('Central', centralBrand),
  getSecondaryAmount: ({ state }) =>
    state.poolSeat.getAmountAllocated('Secondary', state.secondaryBrand),

  /**
   * @param {MethodContext} context
   * @param {ZCFSeat} zcfSeat
   * @returns {string}
   */
  addLiquidity: ({ state, facets }, zcfSeat) => {
    const { helper, pool } = facets;
    const centralIn = zcfSeat.getStagedAllocation().Central;
    assert(isNatValue(centralIn.value), 'User Central');
    const secondaryIn = zcfSeat.getStagedAllocation().Secondary;
    assert(isNatValue(secondaryIn.value), 'User Secondary');

    if (state.liqTokenSupply === 0n) {
      return helper.addLiquidityActual(pool, zcfSeat, secondaryIn, centralIn);
    }

    const centralPoolAmount = pool.getCentralAmount();
    const secondaryPoolAmount = pool.getSecondaryAmount();
    assert(isNatValue(centralPoolAmount.value), 'Pool Central');
    assert(isNatValue(secondaryPoolAmount.value), 'Pool Secondary');

    // To calculate liquidity, we'll need to calculate alpha from the primary
    // token's value before, and the value that will be added to the pool
    const secondaryRequired = AmountMath.make(
      state.secondaryBrand,
      calcSecondaryRequired(
        centralIn.value,
        centralPoolAmount.value,
        secondaryPoolAmount.value,
        secondaryIn.value,
      ),
    );

    // Central was specified precisely so offer must provide enough secondary.
    assert(
      AmountMath.isGTE(secondaryIn, secondaryRequired),
      'insufficient Secondary deposited',
    );

    return helper.addLiquidityActual(
      pool,
      zcfSeat,
      secondaryRequired,
      centralPoolAmount,
    );
  },
  removeLiquidity: ({ state, facets }, userSeat) => {
    const { liquidityBrand, poolSeat, secondaryBrand, centralBrand } = state;
    const liquidityIn = userSeat.getAmountAllocated(
      'Liquidity',
      liquidityBrand,
    );
    if (AmountMath.isEmpty(liquidityIn)) {
      // prevent divide-by-zero. If the caller has tokens, the pool is not empty
      userSeat.exit();
      return 'request to remove zero liquidity';
    }

    const liquidityValueIn = liquidityIn.value;
    assert(isNatValue(liquidityValueIn), 'User Liquidity');
    const centralTokenAmountOut = AmountMath.make(
      centralBrand,
      calcValueToRemove(
        state.liqTokenSupply,
        facets.pool.getCentralAmount().value,
        liquidityValueIn,
      ),
    );

    const tokenKeywordAmountOut = AmountMath.make(
      secondaryBrand,
      calcValueToRemove(
        state.liqTokenSupply,
        facets.pool.getSecondaryAmount().value,
        liquidityValueIn,
      ),
    );

    poolSeat.incrementBy(
      userSeat.decrementBy(harden({ Liquidity: liquidityIn })),
    );
    userSeat.incrementBy(
      poolSeat.decrementBy(
        harden({
          Central: centralTokenAmountOut,
          Secondary: tokenKeywordAmountOut,
        }),
      ),
    );
    state.zcf.reallocate(userSeat, poolSeat);
    state.liqTokenSupply -= liquidityValueIn;

    userSeat.exit();
    updateUpdaterState(state.updater, facets.pool);
    facets.helper.updateMetrics();
    return 'Liquidity successfully removed.';
  },
  getNotifier: ({ state: { notifier } }) => notifier,
  updateState: ({ state: { updater }, facets: { pool, helper } }) => {
    helper.updateMetrics();
    return updater.updateState(pool);
  },
  getToCentralPriceAuthority: ({ state }) => state.toCentralPriceAuthority,
  getFromCentralPriceAuthority: ({ state }) => state.fromCentralPriceAuthority,
  getVPool: ({ facets }) => facets.singlePool,
  getMetrics: ({ state }) => state.metricsSubscription,
};

/** @param {MethodContext} context */
const finish = context => {
  const { notifier, secondaryBrand, centralBrand, timer, zcf } = context.state;
  const quoteIssuerKit = context.state.quoteIssuerKit;

  const getInputPriceForPA = (amountIn, brandOut) => {
    return publicPrices(
      context.facets.singlePool.getPriceForInput(
        amountIn,
        AmountMath.makeEmpty(brandOut),
      ),
    );
  };
  const getOutputPriceForPA = (brandIn, amountout) =>
    publicPrices(
      context.facets.singlePool.getPriceForOutput(
        AmountMath.makeEmpty(brandIn),
        amountout,
      ),
    );

  const toCentralPriceAuthority = makePriceAuthority(
    getInputPriceForPA,
    getOutputPriceForPA,
    secondaryBrand,
    centralBrand,
    timer,
    zcf,
    notifier,
    quoteIssuerKit,
  );
  const fromCentralPriceAuthority = makePriceAuthority(
    getInputPriceForPA,
    getOutputPriceForPA,
    centralBrand,
    secondaryBrand,
    timer,
    zcf,
    notifier,
    quoteIssuerKit,
  );

  // @ts-expect-error declared read-only, set value once
  context.state.toCentralPriceAuthority = toCentralPriceAuthority;
  // @ts-expect-error declared read-only, set value once
  context.state.fromCentralPriceAuthority = fromCentralPriceAuthority;
  context.facets.helper.updateMetrics();
};

/**
 * @param {ZCF} zcf
 * @param {Brand} centralBrand
 * @param {ERef<Timer>} timer
 * @param {IssuerKit} quoteIssuerKit
 * @param {import('./amm.js').AMMParamGetters} paramAccessor retrieve governed params
 * @param {ZCFSeat} protocolSeat seat that holds collected fees
 */
export const definePoolKind = (
  zcf,
  centralBrand,
  timer,
  quoteIssuerKit,
  paramAccessor,
  protocolSeat,
) => {
  const poolInit = (liquidityZcfMint, poolSeat, secondaryBrand) => {
    const { brand: liquidityBrand, issuer: liquidityIssuer } =
      liquidityZcfMint.getIssuerRecord();
    const { notifier, updater } = makeNotifierKit();
    const {
      publication: metricsPublication,
      subscription: metricsSubscription,
    } = makeSubscriptionKit();

    // XXX why does the paramAccessor have to be repackaged as a Far object?
    const params = Far('pool param accessor', {
      ...paramAccessor,
    });

    return {
      zcf,
      liqTokenSupply: 0n,
      liquidityIssuer,
      poolSeat,
      protocolSeat,
      centralBrand,
      liquidityBrand,
      secondaryBrand,
      liquidityZcfMint,
      updater,
      notifier,
      toCentralPriceAuthority: undefined,
      fromCentralPriceAuthority: undefined,
      quoteIssuerKit,
      timer,
      paramAccessor: params,
      metricsPublication,
      metricsSubscription,
    };
  };

  const facets = harden({
    helper: helperBehavior,
    pool: poolBehavior,
    singlePool,
  });

  // @ts-expect-error unhappy about finish's type
  return defineKindMulti('pool', poolInit, facets, { finish });
};
