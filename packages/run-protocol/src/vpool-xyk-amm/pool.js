// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { AssetKind, AmountMath, isNatValue } from '@agoric/ertp';
import { makeNotifierKit } from '@agoric/notifier';

import {
  calcLiqValueToMint,
  calcValueToRemove,
  calcSecondaryRequired,
} from '@agoric/zoe/src/contractSupport/index.js';

import '@agoric/zoe/exported.js';
import { makeKind } from '@agoric/swingset-vat/src/storeModule';
import { makePriceAuthority } from './priceAuthority.js';
import { makeSinglePool } from './singlePool.js';

const { details: X } = assert;

// Pools represent a single pool of liquidity. Price calculations and trading
// happen in a wrapper class that knows whether the proposed trade involves a
// single pool or multiple hops.

/**
 * @param {ContractFacet} zcf
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
  const makePool = makeKind(state => {
    const init = (liquidityZcfMint, poolSeat, secondaryBrand) => {
      const liqTokenSupply = 0n;

      const { brand: liquidityBrand, issuer: liquidityIssuer } =
        liquidityZcfMint.getIssuerRecord();
      const { notifier, updater } = makeNotifierKit();

      state.liqTokenSupply = liqTokenSupply;
      state.liquidityBrand = liquidityBrand;
      state.liquidityIssuer = liquidityIssuer;
      state.poolSeat = poolSeat;
      state.secondaryBrand = secondaryBrand;
      state.notifier = notifier;
      state.updater = updater;
    };
    const updateState = pool =>
      // TODO: when governance can change the interest rate, include it here
      state.updater.updateState({
        central: pool.getCentralAmount(),
        secondary: pool.getSecondaryAmount(),
      });
    const addLiquidityActual = (pool, zcfSeat, secondaryAmount) => {
      // addLiquidity can't be called until the pool has been created. We verify
      // that the asset is NAT before creating a pool.

      const liquidityValueOut = calcLiqValueToMint(
        state.liqTokenSupply,
        zcfSeat.getAmountAllocated('Central').value,
        pool.getCentralAmount().value,
      );

      const liquidityAmountOut = AmountMath.make(
        state.liquidityBrand,
        liquidityValueOut,
      );
      state.liquidityZcfMint.mintGains(
        harden({ Liquidity: liquidityAmountOut }),
        state.poolSeat,
      );
      state.liqTokenSupply += liquidityValueOut;

      state.poolSeat.incrementBy(
        zcfSeat.decrementBy(
          harden({
            Central: zcfSeat.getCurrentAllocation().Central,
            Secondary: secondaryAmount,
          }),
        ),
      );

      zcfSeat.incrementBy(
        state.poolSeat.decrementBy(harden({ Liquidity: liquidityAmountOut })),
      );
      zcf.reallocate(state.poolSeat, zcfSeat);
      zcfSeat.exit();
      updateState(pool);
      return 'Added liquidity.';
    };
    /** @type {XYKPool} */
    const self = Far('pool', {
      getLiquiditySupply: () => state.liqTokenSupply,
      getLiquidityIssuer: () => state.liquidityIssuer,
      getPoolSeat: () => state.poolSeat,
      getCentralAmount: () =>
        state.poolSeat.getAmountAllocated('Central', centralBrand),
      getSecondaryAmount: () => {
        if (state.poolSeat === undefined) {
          debugger;
        }
        return state.poolSeat.getAmountAllocated(
          'Secondary',
          state.secondaryBrand,
        );
      },

      addLiquidity: zcfSeat => {

        if (state.liqTokenSupply === 0n) {
          const userAllocation = zcfSeat.getCurrentAllocation();
          return addLiquidityActual(self, zcfSeat, userAllocation.Secondary);
        }

        const userAllocation = zcfSeat.getCurrentAllocation();
        const secondaryIn = userAllocation.Secondary;
        const centralAmount = self.getCentralAmount();
        const secondaryAmount = self.getSecondaryAmount();
        assert(isNatValue(userAllocation.Central.value), 'User Central');
        assert(isNatValue(centralAmount.value), 'Pool Central');
        assert(isNatValue(secondaryAmount.value), 'Pool Secondary');
        assert(isNatValue(secondaryIn.value), 'User Secondary');

        // To calculate liquidity, we'll need to calculate alpha from the primary
        // token's value before, and the value that will be added to the pool
        const secondaryOut = AmountMath.make(
          state.secondaryBrand,
          calcSecondaryRequired(
            userAllocation.Central.value,
            centralAmount.value,
            secondaryAmount.value,
            secondaryIn.value,
          ),
        );

        // Central was specified precisely so offer must provide enough secondary.
        assert(
          AmountMath.isGTE(secondaryIn, secondaryOut),
          'insufficient Secondary deposited',
        );

        return addLiquidityActual(self, zcfSeat, secondaryOut);
      },
      removeLiquidity: userSeat => {
        const liquidityIn = userSeat.getAmountAllocated(
          'Liquidity',
          state.liquidityBrand,
        );
        const liquidityValueIn = liquidityIn.value;
        assert(isNatValue(liquidityValueIn), 'User Liquidity');
        const centralTokenAmountOut = AmountMath.make(
          centralBrand,
          calcValueToRemove(
            state.liqTokenSupply,
            self.getCentralAmount().value,
            liquidityValueIn,
          ),
        );

        const tokenKeywordAmountOut = AmountMath.make(
          state.secondaryBrand,
          calcValueToRemove(
            state.liqTokenSupply,
            self.getSecondaryAmount().value,
            liquidityValueIn,
          ),
        );

        state.liqTokenSupply -= liquidityValueIn;

        state.poolSeat.incrementBy(
          userSeat.decrementBy(harden({ Liquidity: liquidityIn })),
        );
        userSeat.incrementBy(
          state.poolSeat.decrementBy(
            harden({
              Central: centralTokenAmountOut,
              Secondary: tokenKeywordAmountOut,
            }),
          ),
        );
        zcf.reallocate(userSeat, state.poolSeat);

        userSeat.exit();
        updateState(self);
        return 'Liquidity successfully removed.';
      },
      getNotifier: () => state.notifier,
      updateState: () => updateState(self),
      // eslint-disable-next-line no-use-before-define
      getToCentralPriceAuthority: () => toCentralPriceAuthority,
      // eslint-disable-next-line no-use-before-define
      getFromCentralPriceAuthority: () => fromCentralPriceAuthority,
      // eslint-disable-next-line no-use-before-define
      getVPool: () => vPool,
    });
    const vPool = makeSinglePool(
      zcf,
      self,
      getProtocolFeeBP,
      getPoolFeeBP,
      protocolSeat,
    );

    const getInputPriceForPA = (amountIn, brandOut) =>
      vPool.getInputPrice(amountIn, AmountMath.makeEmpty(brandOut));
    const getOutputPriceForPA = (brandIn, amountout) =>
      vPool.getInputPrice(AmountMath.makeEmpty(brandIn), amountout);

    const toCentralPriceAuthority = makePriceAuthority(
      getInputPriceForPA,
      getOutputPriceForPA,
      state.secondaryBrand,
      centralBrand,
      timer,
      zcf,
      state.notifier,
      quoteIssuerKit,
    );
    const fromCentralPriceAuthority = makePriceAuthority(
      getInputPriceForPA,
      getOutputPriceForPA,
      centralBrand,
      state.secondaryBrand,
      timer,
      zcf,
      state.notifier,
      quoteIssuerKit,
    );

    return {
      init,
      self,
    };
  });

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
