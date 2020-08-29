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
    } = liquidityZcfMint.getIssuerRecord();

    const addLiquidityActual = (pool, userSeat, secondaryAmount) => {
      const liquidityValueOut = calcLiqValueToMint(
        harden({
          liqTokenSupply,
          inputValue: userSeat.getAmountAllocated('Central').value,
          inputReserve: pool.getCentralAmount().value,
        }),
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

    /**
     * @typedef {Object} Pool
     * @property {(inputValue: Value) => Amount } getCurrentPrice
     * @property {(inputValue: Value) => Amount } getSecondaryToCentralInputPrice
     * @property {(inputValue: Value) => Amount } getCentralToSecondaryInputPrice
     * @property {(inputValue: Value) => Amount } getSecondaryToCentralOutputPrice
     * @property {(inputValue: Value) => Amount } getCentralToSecondaryOutputPrice
     * @property {() => number} getLiquiditySupply
     * @property {(seat: ZCFSeat) => string} addLiquidity
     * @property {(seat: ZCFSeat) => string} removeLiquidity
     * @property {() => ZCFSeat} getPoolSeat
     * @property {() => AmountMath} getAmountMath - get the amountMath for this
     * pool's secondary brand
     * @property {() => AmountMath} getCentralAmountMath
     * @property {() => Amount} getSecondaryAmount
     * @property {() => Amount} getCentralAmount
     */

    function checkForZero(value) {
      if (value === 0) {
        throw new Error('pool not initialized');
      }
      return value;
    }

    /** @type {Pool} */
    const pool = {
      getLiquiditySupply: () => liqTokenSupply,
      getPoolSeat: () => poolSeat,
      getAmountMath: () => zcf.getAmountMath(secondaryBrand),
      getCentralAmountMath: () => zcf.getAmountMath(centralBrand),
      getCentralAmount: () =>
        poolSeat.getAmountAllocated('Central', centralBrand),
      getSecondaryAmount: () =>
        poolSeat.getAmountAllocated('Secondary', secondaryBrand),
      getCentralToSecondaryInputPrice: inputValue => {
        const result = getInputPrice({
          inputValue,
          inputReserve: pool.getCentralAmount().value,
          outputReserve: pool.getSecondaryAmount().value,
        });
        return pool.getAmountMath().make(checkForZero(result));
      },
      getSecondaryToCentralInputPrice: inputValue => {
        const result = getInputPrice({
          inputValue,
          inputReserve: pool.getSecondaryAmount().value,
          outputReserve: pool.getCentralAmount().value,
        });
        return pool.getCentralAmountMath().make(checkForZero(result));
      },
      getCentralToSecondaryOutputPrice: outputValue => {
        const result = getOutputPrice({
          outputValue,
          inputReserve: pool.getCentralAmount().value,
          outputReserve: pool.getSecondaryAmount().value,
        });
        return pool.getAmountMath().make(checkForZero(result));
      },
      getSecondaryToCentralOutputPrice: outputValue => {
        const result = getOutputPrice({
          outputValue,
          inputReserve: pool.getSecondaryAmount().value,
          outputReserve: pool.getCentralAmount().value,
        });
        return pool.getCentralAmountMath().make(checkForZero(result));
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
        const secondaryOut = pool.getAmountMath().make(
          calcSecondaryRequired({
            centralIn: userAllocation.Central.value,
            centralPool: pool.getCentralAmount().value,
            secondaryPool: pool.getSecondaryAmount().value,
            secondaryIn: secondaryIn.value,
          }),
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
        const centralTokenAmountOut = pool.getCentralAmountMath().make(
          calcValueToRemove(
            harden({
              liqTokenSupply,
              poolValue: pool.getCentralAmount().value,
              liquidityValueIn,
            }),
          ),
        );

        const tokenKeywordAmountOut = pool.getAmountMath().make(
          calcValueToRemove(
            harden({
              liqTokenSupply,
              poolValue: pool.getSecondaryAmount().value,
              liquidityValueIn,
            }),
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

  // substitute for assertUsesNatMath, because we want to check before
  // adding the issuer, not after
  const assertIssuerUsesNatMath = issuer =>
    assert(issuer.getAmountMathKind() === MathKind.NAT);

  /**
   * Allows users to add new liquidity pools. `secondaryIssuer` and
   * its keyword must not have been already used
   * @param {Issuer} secondaryIssuer
   * @param {Keyword} keyword - will be used in the
   * terms.issuers for the contract, but not used otherwise
   */
  const addPool = async (secondaryIssuer, keyword) => {
    zcf.assertUniqueKeyword(keyword);
    const liquidityKeyword = `${keyword}Liquidity`;
    zcf.assertUniqueKeyword(liquidityKeyword);
    const secondaryBrand = await E(secondaryIssuer).getBrand();
    const brandMatches = await E(secondaryBrand).isMyIssuer(secondaryIssuer);
    assert(
      brandMatches,
      `The provided issuer was using another issuer's brand`,
    );
    assert(
      !isSecondary(secondaryBrand),
      details`issuer ${secondaryIssuer} already has a pool`,
    );

    assertIssuerUsesNatMath(secondaryIssuer);
    await zcf.saveIssuer(secondaryIssuer, keyword);
    const liquidityZCFMint = await zcf.makeZCFMint(liquidityKeyword);
    const { zcfSeat: poolSeatP } = zcf.makeEmptySeatKit();
    const poolSeat = await poolSeatP;
    const pool = makePool(liquidityZCFMint, poolSeat, secondaryBrand);
    initPool(secondaryBrand, pool);
    return liquidityZCFMint.getIssuerRecord().issuer;
  };

  return addPool;
};
