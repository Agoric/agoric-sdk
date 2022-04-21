// @ts-check

import { AmountMath, isNatValue } from '@agoric/ertp';
import { makeNotifierKit } from '@agoric/notifier';

import {
  calcLiqValueToMint,
  calcSecondaryRequired,
  calcValueToRemove,
} from '@agoric/zoe/src/contractSupport/index.js';

import '@agoric/zoe/exported.js';
import { defineKindMulti } from '@agoric/vat-data/src';
import { makePriceAuthority } from './priceAuthority.js';
import { makeSinglePool } from './singlePool.js';

// Pools represent a single pool of liquidity. Price calculations and trading
// happen in a wrapper class that knows whether the proposed trade involves a
// single pool or multiple hops.

/**
 * @typedef {Readonly<{
 * liquidityBrand: Brand<'nat'>,
 * secondaryBrand: Brand<'nat'>,
 * liquidityZcfMint: Mint<any>,
 * liquidityIssuer: Issuer<any>,
 * toCentralPriceAuthority: PriceAuthority,
 * fromCentralPriceAuthority: PriceAuthority,
 * zcf: ZCF,
 * }>} ImmutableState
 */

/**
 * @typedef {{
 * updater: IterationObserver<any>,
 * notifier: Notifier<any>,
 * poolSeat: ZCFSeat,
 * liqTokenSupply: bigint,
 * }} MutableState
 */

// TODO (turadg) what are the right declaration here?
/**
 * @typedef {{
 *   state: ImmutableState & MutableState,
 *   facets: {
 *     pool, helper, vPoolInner, vPoolOuter,
 // *     helper: import('@agoric/vat-data/src/types').FunctionsMinusContext<AddLiquidityActual>,
 // *     pool: import('@agoric/vat-data/src/types').FunctionsMinusContext<typeof poolBehavior>,
 // *     vPoolInner: import('@agoric/vat-data/src/types').FunctionsMinusContext<SinglePoolInternalFacet>,
 // *     vPoolOuter: import('@agoric/vat-data/src/types').FunctionsMinusContext<VPool>,
 *   },
 * }} MethodContext
 */

/**
 * @param {ZCF} zcf
 * @param {(brand: Brand) => boolean} isInSecondaries true if brand is known secondary
 * @param {(brand: Brand, pool: PoolFacets) => void} initPool add new pool to store
 * @param {Brand} centralBrand
 * @param {ERef<Timer>} timer
 * @param {IssuerKit} quoteIssuerKit
 * @param {() => bigint} getProtocolFeeBP retrieve governed protocol fee value
 * @param {() => bigint} getPoolFeeBP retrieve governed pool fee value
 * @param {ZCFSeat} protocolSeat seat that holds collected fees
 */
export const makePoolMaker = (
  zcf,
  isInSecondaries,
  initPool,
  centralBrand,
  timer,
  quoteIssuerKit,
  getProtocolFeeBP,
  getPoolFeeBP,
  protocolSeat,
) => {
  const updateUpdaterState = (updater, pool) =>
    // TODO: when governance can change the interest rate, include it here
    updater.updateState({
      central: pool.getCentralAmount(),
      secondary: pool.getSecondaryAmount(),
    });

  // /** @type {AddLiquidityActual} */
  const addLiquidityActual = (
    { state },
    pool,
    zcfSeat,
    secondaryAmount,
    poolCentralAmount,
    feeSeat,
  ) => {
    const { poolSeat, liquidityBrand, liquidityZcfMint, updater } = state;

    // addLiquidity can't be called until the pool has been created. We verify
    // that the asset is NAT before creating a pool.

    const liquidityValueOut = calcLiqValueToMint(
      state.liqTokenSupply,
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
    zcfSeat.exit();
    updateUpdaterState(updater, pool);
    return 'Added liquidity.';
  };

  const poolInit = (liquidityZcfMint, poolSeat, secondaryBrand) => {
    const { brand: liquidityBrand, issuer: liquidityIssuer } =
      liquidityZcfMint.getIssuerRecord();
    const { notifier, updater } = makeNotifierKit();

    return {
      liqTokenSupply: 0n,
      liquidityIssuer,
      poolSeat,
      liquidityBrand,
      secondaryBrand,
      liquidityZcfMint,
      updater,
      notifier,
      toCentralPriceAuthority: undefined,
      fromCentralPriceAuthority: undefined,
    };
  };

  const poolBehavior = {
    getLiquiditySupply: ({ state: { liqTokenSupply } }) => liqTokenSupply,
    getLiquidityIssuer: ({ state: { liquidityIssuer } }) => liquidityIssuer,
    getPoolSeat: ({ state: { poolSeat } }) => poolSeat,
    getCentralAmount: ({ state: { poolSeat } }) =>
      poolSeat.getAmountAllocated('Central', centralBrand),
    getSecondaryAmount: ({ state }) =>
      state.poolSeat.getAmountAllocated('Secondary', state.secondaryBrand),

    addLiquidity: ({ state, facets: { helper, pool } }, zcfSeat) => {
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
      const { liquidityBrand, poolSeat, updater, secondaryBrand } = state;
      const liquidityIn = userSeat.getAmountAllocated(
        'Liquidity',
        liquidityBrand,
      );
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

      state.liqTokenSupply -= liquidityValueIn;

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
      zcf.reallocate(userSeat, poolSeat);

      userSeat.exit();
      updateUpdaterState(updater, facets.pool);
      return 'Liquidity successfully removed.';
    },
    getNotifier: ({ state: { notifier } }) => notifier,
    updateState: ({ state: { updater }, facets: { pool } }) => {
      return updater.updateState(pool);
    },
    getToCentralPriceAuthority: ({ state }) => state.toCentralPriceAuthority,
    getFromCentralPriceAuthority: ({ state }) =>
      state.fromCentralPriceAuthority,
    getVPool: ({ facets: { vPoolInner, vPoolOuter } }) =>
      harden({
        internalFacet: vPoolInner,
        externalFacet: vPoolOuter,
      }),
  };

  const vPool = makeSinglePool(
    zcf,
    getProtocolFeeBP,
    getPoolFeeBP,
    protocolSeat,
  );

  const facets = {
    helper: { addLiquidityActual },
    pool: poolBehavior,
    vPoolInner: vPool.internalFacet,
    vPoolOuter: vPool.externalFacet,
  };

  /** @param {MethodContext} context */
  const finish = context => {
    const { notifier, secondaryBrand } = context.state;
    const getInputPriceForPA = (amountIn, brandOut) =>
      vPool.externalFacet.getInputPrice(
        context,
        amountIn,
        AmountMath.makeEmpty(brandOut),
      );
    const getOutputPriceForPA = (brandIn, amountout) =>
      vPool.externalFacet.getInputPrice(
        context,
        AmountMath.makeEmpty(brandIn),
        amountout,
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

    // @ts-ignore declared read-only, set value once
    context.state.toCentralPriceAuthority = toCentralPriceAuthority;
    // @ts-ignore declared read-only, set value once
    context.state.fromCentralPriceAuthority = fromCentralPriceAuthority;
  };

  // @ts-ignore unhappy about finish's type
  return defineKindMulti('pool', poolInit, facets, { finish });
};
