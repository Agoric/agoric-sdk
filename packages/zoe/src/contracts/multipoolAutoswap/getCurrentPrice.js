import '../../../exported';

/**
 * Build functions to calculate prices for multipoolAutoswap. Two methods are
 * returned. In one the caller specifies the amount they will pay, and in the
 * other they specify the amount they wish to receive.
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
    const { brand: brandIn } = amountIn;

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      return getPool(brandOut).getPriceGivenAvailableInput(amountIn, brandOut)
        .amountOut;
    }

    if (isSecondary(brandIn) && isCentral(brandOut)) {
      return getPool(brandIn).getPriceGivenAvailableInput(amountIn, brandOut)
        .amountOut;
    }

    if (isSecondary(brandIn) && isSecondary(brandOut)) {
      // We must do two consecutive calls to get the price: from
      // the brandIn to the central token, then from the central
      // token to the brandOut.
      const { amountOut: centralTokenAmount } = getPool(
        brandIn,
      ).getPriceGivenAvailableInput(amountIn, centralBrand);
      return getPool(brandOut).getPriceGivenAvailableInput(
        centralTokenAmount,
        brandOut,
      ).amountOut;
    }

    throw new Error(`brands were not recognized`);
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
    const { brand: brandOut } = amountOut;

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      return getPool(brandOut).getPriceGivenRequiredOutput(brandIn, amountOut)
        .amountIn;
    }

    if (isSecondary(brandIn) && isCentral(brandOut)) {
      return getPool(brandIn).getPriceGivenRequiredOutput(brandIn, amountOut)
        .amountIn;
    }

    if (isSecondary(brandIn) && isSecondary(brandOut)) {
      // We must do two consecutive calls to get the price: from
      // the brandIn to the central token, then from the central
      // token to the brandOut.
      const { amountIn: centralTokenAmount } = getPool(
        brandIn,
      ).getPriceGivenRequiredOutput(brandIn, amountOut);
      return getPool(brandOut).getPriceGivenRequiredOutput(
        centralBrand,
        centralTokenAmount,
      ).amountIn;
    }

    throw new Error(`brands were not recognized`);
  };

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

    throw new Error(`brands were not recognized`);
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

      const brandInPool = getPool(brandOut);
      const brandOutPool = getPool(brandIn);

      const {
        amountIn: centralAmount,
      } = brandInPool.getPriceGivenRequiredOutput(centralBrand, amountOut);
      const {
        amountIn,
        amountOut: improvedCentralAmount,
      } = brandOutPool.getPriceGivenRequiredOutput(brandIn, centralAmount);

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

    throw new Error(`brands were not recognized`);
  };

  return {
    getOutputForGivenInput,
    getInputForGivenOutput,
    getPriceGivenRequiredOutput,
    getPriceGivenAvailableInput,
  };
};
