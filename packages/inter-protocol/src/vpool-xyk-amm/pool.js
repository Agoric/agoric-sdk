// @ts-check

import '@agoric/zoe/exported.js';

import { AmountMath, isNatValue } from '@agoric/ertp';
import { makeStoredPublisherKit, makeStoredPublishKit } from '@agoric/notifier';
import {
  calcLiqValueToMint,
  calcSecondaryRequired,
  calcValueToRemove,
} from '@agoric/zoe/src/contractSupport/index.js';
import { vivifyKindMulti } from '@agoric/vat-data';

import { makePriceAuthority } from './priceAuthority.js';
import { makeSinglePool } from './singlePool.js';

// Pools represent a single pool of liquidity. Price calculations and trading
// happen in a wrapper class that knows whether the proposed trade involves a
// single pool or multiple hops.

export const publicPrices = prices => {
  return { amountIn: prices.swapperGives, amountOut: prices.swapperGets };
};

/**
 * @typedef {{
 *   centralAmount: Amount,
 *   secondaryAmount: Amount,
 *   liquidityTokens: Amount,
 * }} MetricsPayload
 */

/** @typedef {{ central: Amount, secondary: Amount }} NotificationState */

/**
 * @typedef {Readonly<{
 * poolSeat: ZCFSeat,
 * secondaryBrand: Brand<'nat'>,
 * liquidityZcfMint: ZCFMint,
 * }>} ImmutableState
 */

/** @typedef {{liqTokenSupply: bigint}} MutableState */

/**
 * @typedef {{
 *   addLiquidityInternal: AddLiquidityInternal,
 *   addLiquidityActual: AddLiquidityActual,
 *   updateMetrics: () => void,
 * }} HelperFacet
 */

/**
 * @typedef {{
 *   state: ImmutableState & MutableState,
 *   facets: {
 *     helper: HelperFacet,
 *     pool: XYKPool,
 *     singlePool: VirtualPool,
 *   },
 * }} MethodContext
 *
 * @typedef {object} PoolMetricsNotification
 * @property {Amount} centralAmount
 * @property {Amount} secondaryAmount
 * @property {Amount} liquidityTokens - outstanding tokens
 */

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */
/** @typedef {import('./multipoolMarketMaker.js').AmmState} AmmState */

/**
 * @param {Baggage} baggage
 * @param {AmmState} ammState
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 */
export const definePoolKind = (baggage, ammState, storageNode, marshaller) => {
  /** @type {StoredPublishKit<NotificationState>} */
  const { subscriber, publisher } = makeStoredPublishKit(
    storageNode,
    marshaller,
  );
  /** @type {{publisher: IterationObserver<PoolMetricsNotification>,subscriber: StoredSubscription<PoolMetricsNotification>}} */
  const { publisher: metricsPublication, subscriber: metricsSubscription } =
    makeStoredPublisherKit(storageNode, marshaller, 'metrics');

  /**
   * @param {ZCFMint} liquidityZcfMint
   * @param {ZCFSeat} poolSeat
   * @param {Brand} secondaryBrand
   * @returns {ImmutableState & MutableState}
   */
  const poolInit = (liquidityZcfMint, poolSeat, secondaryBrand) => {
    /** @type {PublishKit<{secondary: Amount, central: Amount}>} */

    return {
      liqTokenSupply: 0n,
      poolSeat,
      secondaryBrand,
      liquidityZcfMint,
    };
  };

  const curryPriceGetters = context => {
    const getPAInputPrice = (amountIn, brandOut) => {
      return publicPrices(
        context.facets.singlePool.getPriceForInput(
          amountIn,
          AmountMath.makeEmpty(brandOut),
        ),
      );
    };
    const getPAOutputPrice = (brandIn, amountout) =>
      publicPrices(
        context.facets.singlePool.getPriceForOutput(
          AmountMath.makeEmpty(brandIn),
          amountout,
        ),
      );
    return { getPAInputPrice, getPAOutputPrice };
  };

  let toCentralPriceAuthority;
  const provideToCentralPriceAuthority = context => {
    if (!toCentralPriceAuthority) {
      const { getPAInputPrice, getPAOutputPrice } = curryPriceGetters(context);
      const { secondaryBrand } = context.state;
      const quoteIssuerKit = ammState.quoteIssuerKit;
      toCentralPriceAuthority = makePriceAuthority(
        getPAInputPrice,
        getPAOutputPrice,
        secondaryBrand,
        ammState.centralBrand,
        ammState.timer,
        subscriber,
        quoteIssuerKit,
      );
    }
    return toCentralPriceAuthority;
  };

  let fromCentralPriceAuthority;
  const provideFromCentralPriceAuthority = context => {
    if (!fromCentralPriceAuthority) {
      const { getPAInputPrice, getPAOutputPrice } = curryPriceGetters(context);
      const { secondaryBrand } = context.state;
      const quoteIssuerKit = ammState.quoteIssuerKit;
      fromCentralPriceAuthority = makePriceAuthority(
        getPAInputPrice,
        getPAOutputPrice,
        ammState.centralBrand,
        secondaryBrand,
        ammState.timer,
        subscriber,
        quoteIssuerKit,
      );
    }
    return fromCentralPriceAuthority;
  };

  const poolBehavior = {
    getLiquiditySupply: ({ state: { liqTokenSupply } }) => liqTokenSupply,
    getLiquidityIssuer: ({ state: { liquidityZcfMint } }) =>
      liquidityZcfMint.getIssuerRecord().issuer,
    getPoolSeat: ({ state: { poolSeat } }) => poolSeat,
    getCentralAmount: ({ state: { poolSeat } }) =>
      poolSeat.getAmountAllocated('Central', ammState.centralBrand),
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
      const { liquidityZcfMint, poolSeat, secondaryBrand } = state;
      const liquidityBrand = liquidityZcfMint.getIssuerRecord().brand;
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
        ammState.centralBrand,
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
      ammState.zcf.reallocate(userSeat, poolSeat);
      state.liqTokenSupply -= liquidityValueIn;

      userSeat.exit();
      facets.pool.updateState();
      return 'Liquidity successfully removed.';
    },
    getSubscriber: () => subscriber,
    /**
     * Update metrics and primary state
     *
     * @param {MethodContext} context
     */
    updateState: ({ facets: { pool, helper } }) => {
      helper.updateMetrics();
      // TODO: when governance can change the interest rate, include it here
      publisher.publish({
        central: pool.getCentralAmount(),
        secondary: pool.getSecondaryAmount(),
      });
    },

    // TODO(hibbert) drop these priceAuthorities. They're expensive and unneeded.
    getToCentralPriceAuthority: provideToCentralPriceAuthority,
    getFromCentralPriceAuthority: provideFromCentralPriceAuthority,

    /** @param {MethodContext} context */
    getVPool: ({ facets }) => facets.singlePool,
    getMetrics: () => metricsSubscription,
  };

  /** @param {MethodContext} context */
  const finish = context => {
    context.facets.helper.updateMetrics();
  };

  const helperBehavior = {
    /** @type {import('@agoric/vat-data/src/types').PlusContext<MethodContext, AddLiquidityInternal>} */
    addLiquidityInternal: (
      { state },
      zcfSeat,
      secondaryAmount,
      poolCentralAmount,
      feeSeat,
    ) => {
      const { poolSeat, liquidityZcfMint } = state;
      // addLiquidity can't be called until the pool has been created. We verify
      // that the asset is NAT before creating a pool.

      const liquidityValueOut = calcLiqValueToMint(
        state.liqTokenSupply,
        // @ts-expect-error value could be not Nat
        zcfSeat.getStagedAllocation().Central.value,
        poolCentralAmount.value,
      );

      const liquidityAmountOut = AmountMath.make(
        liquidityZcfMint.getIssuerRecord().brand,
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
        ammState.zcf.reallocate(poolSeat, zcfSeat, feeSeat);
      } else {
        ammState.zcf.reallocate(poolSeat, zcfSeat);
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
          state.liquidityZcfMint.getIssuerRecord().brand,
          state.liqTokenSupply,
        ),
      });

      metricsPublication.updateState(payload);
    },
  };

  const facets = harden({
    helper: helperBehavior,
    pool: poolBehavior,
    singlePool: makeSinglePool(ammState),
  });

  return vivifyKindMulti(baggage, 'pool', poolInit, facets, { finish });
};
