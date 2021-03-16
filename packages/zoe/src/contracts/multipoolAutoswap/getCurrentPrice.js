// @ts-check

import '../../../exported';

import { assert, details as X } from '@agoric/assert';

/**
 * Build functions to calculate prices for multipoolAutoswap. Four methods are
 * returned, as two complementary pairs. In one pair of methods the caller
 * specifies the amount they will pay, and in the other they specify the amount
 * they wish to receive. The two with shorter names (getOutputForGivenInput,
 * getInputForGivenOutput) are consistent with the uniswap interface. They each
 * return a single amount. The other two return { amountIn, centralAmount,
 * amountOut }, which specifies the best exchange consistent with the request.
 * centralAmount is omitted from these methods' results in the publicFacet.
 *
 * @param {(brand: Brand) => boolean} isSecondary
 * @param {(brand: Brand) => boolean} isCentral
 * @param {(brand: Brand) => Pool} getPool
 * @param {Brand} centralBrand
 */

export const makeGetCurrentPrice = (
  isSecondary,
  isCentral,
  getPool,
  centralBrand,
) => {
  const getPriceGivenAvailableInput = (amountIn, brandOut) => {
    const { brand: brandIn } = amountIn;

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      return getPool(brandOut).getPriceGivenAvailableInput(amountIn, brandOut);
    } else if (isSecondary(brandIn) && isCentral(brandOut)) {
      return getPool(brandIn).getPriceGivenAvailableInput(amountIn, brandOut);
    } else if (isSecondary(brandIn) && isSecondary(brandOut)) {
      // We must do two consecutive getPriceGivenAvailableInput() calls,
      // followed by a call to getPriceGivenRequiredOutput().
      // 1) from amountIn to the central token, which tells us how much central
      // would be provided for amountIn (centralAmount)
      // 2) from centralAmount to brandOut, which tells us how much of brandOut
      // will be provided (amountOut) as well as the minimum price in central
      // tokens (reducedCentralAmount), then finally
      // 3) call getPriceGivenRequiredOutput() to see if the same proceeds can
      // be purchased for less (reducedAmountIn).

      const brandInPool = getPool(brandIn);
      const brandOutPool = getPool(brandOut);
      const {
        amountOut: centralAmount,
      } = brandInPool.getPriceGivenAvailableInput(amountIn, centralBrand);
      const {
        amountIn: reducedCentralAmount,
        amountOut,
      } = brandOutPool.getPriceGivenAvailableInput(centralAmount, brandOut);

      // propagate reduced prices back to the first pool
      const {
        amountIn: reducedAmountIn,
      } = brandInPool.getPriceGivenRequiredOutput(
        brandIn,
        reducedCentralAmount,
      );
      return {
        amountIn: reducedAmountIn,
        amountOut,
        centralAmount: reducedCentralAmount,
      };
    }

    assert.fail(X`brands were not recognized`);
  };

  const getPriceGivenRequiredOutput = (brandIn, amountOut) => {
    const { brand: brandOut } = amountOut;

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      return getPool(brandOut).getPriceGivenRequiredOutput(brandIn, amountOut);
    } else if (isSecondary(brandIn) && isCentral(brandOut)) {
      return getPool(brandIn).getPriceGivenRequiredOutput(brandIn, amountOut);
    } else if (isSecondary(brandIn) && isSecondary(brandOut)) {
      // We must do two consecutive getPriceGivenRequiredOutput() calls,
      // followed by a call to getPriceGivenAvailableInput().
      // 1) from amountOut to the central token, which tells us how much central
      // is required to obtain amountOut (centralAmount)
      // 2) from centralAmount to brandIn, which tells us how much of brandIn
      // is required (amountIn) as well as the max proceeds in central
      // tokens (improvedCentralAmount), then finally
      // 3) call getPriceGivenAvailableInput() to see if improvedCentralAmount
      // produces a larger amount (improvedAmountOut)

      const brandInPool = getPool(brandIn);
      const brandOutPool = getPool(brandOut);

      const {
        amountIn: centralAmount,
      } = brandOutPool.getPriceGivenRequiredOutput(centralBrand, amountOut);
      const {
        amountIn,
        amountOut: improvedCentralAmount,
      } = brandInPool.getPriceGivenRequiredOutput(brandIn, centralAmount);

      // propagate improved prices
      const {
        amountOut: improvedAmountOut,
      } = brandOutPool.getPriceGivenAvailableInput(
        improvedCentralAmount,
        brandOut,
      );
      return {
        amountIn,
        amountOut: improvedAmountOut,
        centralAmount: improvedCentralAmount,
      };
    }

    assert.fail(X`brands were not recognized`);
  };

  /**
   * `getOutputForGivenInput` calculates the result of a trade, given a certain
   * amount of digital assets in.
   *
   * @param {Amount} amountIn - the amount of digital
   * assets to be sent in
   * @param {Brand} brandOut - The brand of asset desired
   * @returns {Amount} the amount that would be paid out at the current price.
   */
  const getOutputForGivenInput = (amountIn, brandOut) => {
    return getPriceGivenAvailableInput(amountIn, brandOut).amountOut;
  };

  /**
   * `getInputForGivenOutput` calculates the amount of assets required to be
   * provided in order to obtain a specified gain.
   *
   * @param {Amount} amountOut - the amount of digital assets desired
   * @param {Brand} brandIn - The brand of asset desired
   * @returns {Amount} The amount required to be paid in order to gain amountOut
   */
  const getInputForGivenOutput = (amountOut, brandIn) => {
    return getPriceGivenRequiredOutput(brandIn, amountOut).amountIn;
  };

  return {
    getOutputForGivenInput,
    getInputForGivenOutput,
    getPriceGivenRequiredOutput,
    getPriceGivenAvailableInput,
  };
};
