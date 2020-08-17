import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';

import {
  getInputPrice,
  calcLiqValueToMint,
  calcValueToRemove,
  trade,
  assertUsesNatMath,
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

    /**
     * @typedef {Object} Pool
     * @property {(centralToSecondary: boolean, inputValue: Value) => Amount } getCurrentPrice
     * @property {(seat: ZCFSeat) => string} addLiquidity
     * @property {(seat: ZCFSeat) => string} removeLiquidity
     * @property {() => ZCFSeat} getPoolSeat
     * @property {() => AmountMath} getAmountMath
     * @property {() => Amount} getSecondaryAmount
     * @property {() => Amount} getCentralAmount
     */

    /** @type {Pool} */
    const pool = {
      getPoolSeat: () => poolSeat,
      getAmountMath: () => zcf.getAmountMath(secondaryBrand),
      getCentralAmountMath: () => zcf.getAmountMath(centralBrand),
      getCentralAmount: () =>
        poolSeat.getAmountAllocated('Central', centralBrand),
      getSecondaryAmount: () =>
        poolSeat.getAmountAllocated('Secondary', secondaryBrand),
      getCurrentPrice: (centralToSecondary, inputValue) => {
        if (centralToSecondary) {
          const outputValue = getInputPrice({
            inputValue,
            inputReserve: pool.getCentralAmount().value,
            outputReserve: pool.getSecondaryAmount().value,
          });
          return pool.getAmountMath().make(outputValue);
        }
        const outputValue = getInputPrice({
          inputValue,
          inputReserve: pool.getSecondaryAmount().value,
          outputReserve: pool.getCentralAmount().value,
        });
        return pool.getCentralAmountMath().make(outputValue);
      },
      addLiquidity: userSeat => {
        // Calculate how many liquidity tokens we should be minting.
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
            gains: userSeat.getCurrentAllocation(),
          },
          {
            seat: userSeat,
            gains: { Liquidity: liquidityAmountOut },
          },
        );
        userSeat.exit();
        return 'Added liquidity.';
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

    await zcf.saveIssuer(secondaryIssuer, keyword);
    assertUsesNatMath(zcf, secondaryBrand);
    const liquidityZCFMint = await zcf.makeZCFMint(liquidityKeyword);
    const { zcfSeat: poolSeatP } = zcf.makeEmptySeatKit(zcf);
    const poolSeat = await poolSeatP;
    const pool = makePool(liquidityZCFMint, poolSeat, secondaryBrand);
    initPool(secondaryBrand, pool);
    return liquidityZCFMint.getIssuerRecord().issuer;
  };

  return addPool;
};
