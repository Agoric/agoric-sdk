// @ts-check

import { E } from '@endo/eventual-send';
import { AssetKind, AmountMath, isNatValue } from '@agoric/ertp';
import { makeNotifierKit } from '@agoric/notifier';
import { defineKind } from '@agoric/swingset-vat/src/storeModule.js';

import {
  calcLiqValueToMint,
  calcValueToRemove,
  calcSecondaryRequired,
} from '@agoric/zoe/src/contractSupport/index.js';

import '@agoric/zoe/exported.js';
import { makePriceAuthority } from './priceAuthority.js';
import { makeSinglePool } from './singlePool.js';

const { details: X } = assert;

// Pools represent a single pool of liquidity. Price calculations and trading
// happen in a wrapper class that knows whether the proposed trade involves a
// single pool or multiple hops.

/**
 * @param {ZCF} zcf
 * @param {(brand: Brand) => boolean} isInSecondaries
 * @param {(brand: Brand, pool: XYKPool) => void} initPool
 * @param {Brand} centralBrand
 * @param {ERef<Timer>} timer
 * @param {IssuerKit} quoteIssuerKit
 * @param {() => bigint} getProtocolFeeBP - retrieve governed protocol fee value
 * @param {() => bigint} getPoolFeeBP - retrieve governed pool fee value
 * @param {ZCFSeat} protocolSeat
 */
export const makeAddPool = (
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

  const addLiquidityActualToState = (
    state,
    pool,
    zcfSeat,
    secondaryAmount,
    poolCentralAmount,
    feeSeat,
  ) => {
    const { poolSeat, liquidityBrand, liquidityZcfMint, updater } = state;

    // addLiquidity can't be called until the pool has been created. We
    // verify that the asset is NAT before creating a pool.

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

  const makePool = defineKind(
    'pool',
    (liquidityZcfMint, poolSeat, secondaryBrand) => {
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
        vPool: undefined,
        toCentralPriceAuthority: undefined,
        fromCentralPriceAuthority: undefined,
      };
    },

    state => {
      const {
        liquidityIssuer,
        poolSeat,
        liquidityBrand,
        secondaryBrand,
        updater,
        notifier,
      } = state;

      /** @type {XYKPool} */
      const pool = {
        getLiquiditySupply: () => state.liqTokenSupply,
        getLiquidityIssuer: () => liquidityIssuer,
        getPoolSeat: () => poolSeat,
        getCentralAmount: () =>
          poolSeat.getAmountAllocated('Central', centralBrand),
        getSecondaryAmount: () =>
          poolSeat.getAmountAllocated('Secondary', secondaryBrand),

        addLiquidity: zcfSeat => {
          const centralIn = zcfSeat.getStagedAllocation().Central;
          assert(isNatValue(centralIn.value), 'User Central');
          const secondaryIn = zcfSeat.getStagedAllocation().Secondary;
          assert(isNatValue(secondaryIn.value), 'User Secondary');

          if (state.liqTokenSupply === 0n) {
            return addLiquidityActualToState(
              state,
              pool,
              zcfSeat,
              secondaryIn,
              centralIn,
            );
          }

          const centralPoolAmount = pool.getCentralAmount();
          const secondaryPoolAmount = pool.getSecondaryAmount();
          assert(isNatValue(centralPoolAmount.value), 'Pool Central');
          assert(isNatValue(secondaryPoolAmount.value), 'Pool Secondary');

          // To calculate liquidity, we'll need to calculate alpha from the
          // primary token's value before, and the value that will be added to
          // the pool
          const secondaryRequired = AmountMath.make(
            secondaryBrand,
            calcSecondaryRequired(
              centralIn.value,
              centralPoolAmount.value,
              secondaryPoolAmount.value,
              secondaryIn.value,
            ),
          );

          // Central was specified precisely so offer must provide enough
          // secondary.
          assert(
            AmountMath.isGTE(secondaryIn, secondaryRequired),
            'insufficient Secondary deposited',
          );

          return addLiquidityActualToState(
            state,
            pool,
            zcfSeat,
            secondaryRequired,
            centralIn,
          );
        },
        removeLiquidity: userSeat => {
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
              pool.getCentralAmount().value,
              liquidityValueIn,
            ),
          );

          const tokenKeywordAmountOut = AmountMath.make(
            secondaryBrand,
            calcValueToRemove(
              state.liqTokenSupply,
              pool.getSecondaryAmount().value,
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
          updateUpdaterState(updater, pool);
          return 'Liquidity successfully removed.';
        },
        getNotifier: () => notifier,
        updateState: () => updateUpdaterState(updater, pool),
        getToCentralPriceAuthority: () => state.toCentralPriceAuthority,
        getFromCentralPriceAuthority: () => state.fromCentralPriceAuthority,
        // eslint-disable-next-line no-use-before-define
        getVPool: () => {
          return state.vPool;
        },
      };
      return pool;
    },

    (state, pool) => {
      const { secondaryBrand, notifier } = state;

      const vPool = makeSinglePool(
        zcf,
        pool,
        getProtocolFeeBP,
        getPoolFeeBP,
        protocolSeat,
        (...args) => addLiquidityActualToState(state, ...args),
      );
      state.vPool = vPool;

      const getInputPriceForPA = (amountIn, brandOut) =>
        vPool.externalFacet.getInputPrice(
          amountIn,
          AmountMath.makeEmpty(brandOut),
        );
      const getOutputPriceForPA = (brandIn, amountout) =>
        vPool.externalFacet.getInputPrice(
          AmountMath.makeEmpty(brandIn),
          amountout,
        );

      state.toCentralPriceAuthority = makePriceAuthority(
        getInputPriceForPA,
        getOutputPriceForPA,
        secondaryBrand,
        centralBrand,
        timer,
        zcf,
        notifier,
        quoteIssuerKit,
      );
      state.fromCentralPriceAuthority = makePriceAuthority(
        getInputPriceForPA,
        getOutputPriceForPA,
        centralBrand,
        secondaryBrand,
        timer,
        zcf,
        notifier,
        quoteIssuerKit,
      );
    },
  );

  /**
   * Allows users to add new liquidity pools. `secondaryIssuer` and
   * its keyword must not have been already used
   *
   * @param {Issuer} secondaryIssuer
   * @param {Keyword} keyword - will be used in the
   * terms.issuers for the contract, but not used otherwise
   */
  const addPool = async (secondaryIssuer, keyword) => {
    const liquidityKeyword = `${keyword}Liquidity`;
    zcf.assertUniqueKeyword(liquidityKeyword);

    const [secondaryAssetKind, secondaryBrand] = await Promise.all([
      E(secondaryIssuer).getAssetKind(),
      E(secondaryIssuer).getBrand(),
    ]);

    assert(
      !isInSecondaries(secondaryBrand),
      X`issuer ${secondaryIssuer} already has a pool`,
    );
    assert(
      secondaryAssetKind === AssetKind.NAT,
      X`${keyword} asset not fungible (must use NAT math)`,
    );

    // COMMIT POINT
    // We've checked all the foreseeable exceptions (except
    // zcf.assertUniqueKeyword(keyword), which will be checked by saveIssuer()
    // before proceeding), so we can do the work now.
    await zcf.saveIssuer(secondaryIssuer, keyword);
    const liquidityZCFMint = await zcf.makeZCFMint(
      liquidityKeyword,
      AssetKind.NAT,
      harden({ decimalPlaces: 6 }),
    );
    const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
    const pool = makePool(liquidityZCFMint, poolSeat, secondaryBrand);
    initPool(secondaryBrand, pool);
    return liquidityZCFMint.getIssuerRecord().issuer;
  };

  return addPool;
};
harden(makeAddPool);
