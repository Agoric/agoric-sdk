// @ts-check

import '@agoric/zoe/exported.js';

import { AmountMath, isNatValue } from '@agoric/ertp';
import { makeStoredPublisherKit, makeStoredPublishKit } from '@agoric/notifier';
import { defineKindMulti } from '@agoric/vat-data';
import {
  calcLiqValueToMint,
  calcSecondaryRequired,
  calcValueToRemove,
} from '@agoric/zoe/src/contractSupport/index.js';
import { Far } from '@endo/marshal';
import { makePriceAuthority } from './priceAuthority.js';
import { singlePool } from './singlePool.js';

// Pools represent a single pool of liquidity. Price calculations and trading
// happen in a wrapper class that knows whether the proposed trade involves a
// single pool or multiple hops.

export const publicPrices = prices => {
  return harden({
    amountIn: prices.swapperGives,
    amountOut: prices.swapperGets,
  });
};

/**
 * @typedef {{ central: Amount, secondary: Amount }} NotificationState
 */

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
 * paramAccessor: import('./multipoolMarketMaker.js').AMMParamGetters,
 * publisher: Publisher<NotificationState>,
 * subscriber: Subscriber<NotificationState>,
 * metricsPublication: IterationObserver<PoolMetricsNotification>,
 * metricsSubscription: StoredSubscription<PoolMetricsNotification>
 * }>} ImmutableState
 *
 * @typedef {{
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
    { facets },
    pool,
    zcfSeat,
    secondaryAmount,
    poolCentralAmount,
    feeSeat,
  ) => {
    const { helper } = facets;

    helper.addLiquidityInternal(
      zcfSeat,
      secondaryAmount,
      poolCentralAmount,
      feeSeat,
    );
    zcfSeat.exit();
    facets.pool.updateState();
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
    facets.pool.updateState();
    return 'Liquidity successfully removed.';
  },
  getSubscriber: (/** @type {MethodContext} */ { state }) => state.subscriber,
  /**
   * Update metrics and primary state
   *
   * @param {MethodContext} context
   */
  updateState: ({ state: { publisher }, facets: { pool, helper } }) => {
    helper.updateMetrics();
    // TODO: when governance can change the interest rate, include it here
    publisher.publish({
      central: pool.getCentralAmount(),
      secondary: pool.getSecondaryAmount(),
    });
  },
  /** @param {MethodContext} context */
  getToCentralPriceAuthority: ({ state }) => state.toCentralPriceAuthority,
  /** @param {MethodContext} context */
  getFromCentralPriceAuthority: ({ state }) => state.fromCentralPriceAuthority,
  /** @param {MethodContext} context */
  getVPool: ({ facets }) => facets.singlePool,
  /** @param {MethodContext} context */
  getMetrics: ({ state }) => state.metricsSubscription,
};

/** @param {MethodContext} context */
const finish = context => {
  const { subscriber, secondaryBrand, centralBrand, timer } = context.state;
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
    subscriber,
    quoteIssuerKit,
  );
  const fromCentralPriceAuthority = makePriceAuthority(
    getInputPriceForPA,
    getOutputPriceForPA,
    centralBrand,
    secondaryBrand,
    timer,
    subscriber,
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
 * @param {import('./multipoolMarketMaker.js').AMMParamGetters} paramAccessor retrieve governed params
 * @param {ZCFSeat} protocolSeat seat that holds collected fees
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 */
export const definePoolKind = (
  zcf,
  centralBrand,
  timer,
  quoteIssuerKit,
  paramAccessor,
  protocolSeat,
  storageNode,
  marshaller,
) => {
  const poolInit = (liquidityZcfMint, poolSeat, secondaryBrand) => {
    const { brand: liquidityBrand, issuer: liquidityIssuer } =
      liquidityZcfMint.getIssuerRecord();
    const { subscriber, publisher } = makeStoredPublishKit(
      storageNode,
      marshaller,
    );
    const { publisher: metricsPublication, subscriber: metricsSubscription } =
      makeStoredPublisherKit(storageNode, marshaller, 'metrics');

    // XXX why does the paramAccessor have to be repackaged as a Far object?
    const params = Far('pool param accessor', {
      ...paramAccessor,
    });

    return harden({
      zcf,
      liqTokenSupply: 0n,
      liquidityIssuer,
      poolSeat,
      protocolSeat,
      centralBrand,
      liquidityBrand,
      secondaryBrand,
      liquidityZcfMint,
      publisher,
      subscriber,
      toCentralPriceAuthority: undefined,
      fromCentralPriceAuthority: undefined,
      quoteIssuerKit,
      timer,
      paramAccessor: params,
      metricsPublication,
      metricsSubscription,
    });
  };

  const facets = harden({
    helper: helperBehavior,
    pool: poolBehavior,
    singlePool,
  });

  // @ts-expect-error unhappy about finish's type
  return defineKindMulti('pool', poolInit, facets, { finish });
};
