// @ts-check

import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';
import { MathKind } from '@agoric/ertp/src/amountMath';

import {
  getInputPrice,
  getOutputPrice,
  calcLiqValueToMint,
  calcValueToRemove,
  trade,
  calcSecondaryRequired,
} from '../../contractSupport';

import '../../../exported';

/**
 * @param {ContractFacet} zcf
 * @param {(brand: Brand) => boolean} isSecondary
 * @param {(brand: Brand, pool: Pool) => void} initPool
 * @param {Brand} centralBrand
 */
export const makeAddPool = (zcf, isSecondary, initPool, centralBrand) => {
  const makePool = (liquidityZcfMint, poolSeat, secondaryBrand) => {
    let liqTokenSupply = 0;
    const {
      brand: liquidityBrand,
      amountMath: liquidityAmountMath,
      issuer: liquidityIssuer,
    } = liquidityZcfMint.getIssuerRecord();

    const addLiquidityActual = (pool, userSeat, secondaryAmount) => {
      const liquidityValueOut = calcLiqValueToMint(
        liqTokenSupply,
        userSeat.getAmountAllocated('Central').value,
        pool.getCentralAmount().value,
      );

      const liquidityAmountOut = liquidityAmountMath.make(liquidityValueOut);
      liquidityZcfMint.mintGains({ Liquidity: liquidityAmountOut }, poolSeat);
      liqTokenSupply += liquidityValueOut;

      trade(
        zcf,
        {
          seat: poolSeat,
          gains: {
            Central: userSeat.getCurrentAllocation().Central,
            Secondary: secondaryAmount,
          },
        },
        {
          seat: userSeat,
          gains: { Liquidity: liquidityAmountOut },
        },
      );
      userSeat.exit();
      return 'Added liquidity.';
    };

    const assertPoolInitialized = pool =>
      assert(
        !pool.getAmountMath().isEmpty(pool.getSecondaryAmount()),
        details`pool not initialized`,
      );

    /** @type {Pool} */
    const pool = {
      getLiquiditySupply: () => liqTokenSupply,
      getLiquidityIssuer: () => liquidityIssuer,
      getPoolSeat: () => poolSeat,
      getAmountMath: () => zcf.getAmountMath(secondaryBrand),
      getCentralAmountMath: () => zcf.getAmountMath(centralBrand),
      getCentralAmount: () =>
        poolSeat.getAmountAllocated('Central', centralBrand),
      getSecondaryAmount: () =>
        poolSeat.getAmountAllocated('Secondary', secondaryBrand),
      getCentralToSecondaryInputPrice: inputValue => {
        assertPoolInitialized(pool);
        const result = getInputPrice(
          inputValue,
          pool.getCentralAmount().value,
          pool.getSecondaryAmount().value,
        );
        return pool.getAmountMath().make(result);
      },
      getSecondaryToCentralInputPrice: inputValue => {
        assertPoolInitialized(pool);
        const result = getInputPrice(
          inputValue,
          pool.getSecondaryAmount().value,
          pool.getCentralAmount().value,
        );
        return pool.getCentralAmountMath().make(result);
      },
      // price in central tokens required to gain outputValue secondary units
      getCentralToSecondaryOutputPrice: outputValue => {
        assertPoolInitialized(pool);
        const result = getOutputPrice(
          outputValue,
          pool.getCentralAmount().value,
          pool.getSecondaryAmount().value,
        );
        return pool.getCentralAmountMath().make(result);
      },
      // price in secondary units required to gain outputValue in central tokens
      getSecondaryToCentralOutputPrice: outputValue => {
        assertPoolInitialized(pool);
        const result = getOutputPrice(
          outputValue,
          pool.getSecondaryAmount().value,
          pool.getCentralAmount().value,
        );
        return pool.getAmountMath().make(result);
      },
      addLiquidity: userSeat => {
        if (liqTokenSupply === 0) {
          const userAllocation = userSeat.getCurrentAllocation();
          return addLiquidityActual(pool, userSeat, userAllocation.Secondary);
        }

        const userAllocation = userSeat.getCurrentAllocation();
        const secondaryIn = userAllocation.Secondary;

        // To calculate liquidity, we'll need to calculate alpha from the primary
        // token's value before, and the value that will be added to the pool
        const secondaryOut = pool
          .getAmountMath()
          .make(
            calcSecondaryRequired(
              userAllocation.Central.value,
              pool.getCentralAmount().value,
              pool.getSecondaryAmount().value,
              secondaryIn.value,
            ),
          );

        // Central was specified precisely so offer must provide enough secondary.
        assert(
          pool.getAmountMath().isGTE(secondaryIn, secondaryOut),
          'insufficient Secondary deposited',
        );

        return addLiquidityActual(pool, userSeat, secondaryOut);
      },
      removeLiquidity: userSeat => {
        const liquidityIn = userSeat.getAmountAllocated(
          'Liquidity',
          liquidityBrand,
        );
        const liquidityValueIn = liquidityIn.value;
        const centralTokenAmountOut = pool
          .getCentralAmountMath()
          .make(
            calcValueToRemove(
              liqTokenSupply,
              pool.getCentralAmount().value,
              liquidityValueIn,
            ),
          );

        const tokenKeywordAmountOut = pool
          .getAmountMath()
          .make(
            calcValueToRemove(
              liqTokenSupply,
              pool.getSecondaryAmount().value,
              liquidityValueIn,
            ),
          );

        liqTokenSupply -= liquidityValueIn;

        trade(
          zcf,
          {
            seat: poolSeat,
            gains: { Liquidity: liquidityIn },
          },
          {
            seat: userSeat,
            gains: {
              Central: centralTokenAmountOut,
              Secondary: tokenKeywordAmountOut,
            },
          },
        );

        userSeat.exit();
        return 'Liquidity successfully removed.';
      },
    };
    return pool;
  };

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

    const [secondaryMathKind, secondaryBrand] = await Promise.all([
      E(secondaryIssuer).getAmountMathKind(),
      E(secondaryIssuer).getBrand(),
    ]);

    assert(
      !isSecondary(secondaryBrand),
      details`issuer ${secondaryIssuer} already has a pool`,
    );
    assert(
      secondaryMathKind === MathKind.NAT,
      details`${keyword} issuer must use NAT math`,
    );

    // We've checked all the foreseeable exceptions (except
    // zcf.assertUniqueKeyword(keyword), which will be checked by saveIssuer()
    // before proceeding), so we can do the work now.
    await zcf.saveIssuer(secondaryIssuer, keyword);
    const liquidityZCFMint = await zcf.makeZCFMint(liquidityKeyword);
    const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
    const pool = makePool(liquidityZCFMint, poolSeat, secondaryBrand);
    initPool(secondaryBrand, pool);
    return liquidityZCFMint.getIssuerRecord().issuer;
  };

  return addPool;
};
