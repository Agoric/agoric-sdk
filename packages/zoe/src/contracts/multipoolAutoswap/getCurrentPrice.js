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
      );
    }

    throw new Error(`brands were not recognized`);
  };

  return { getOutputForGivenInput, getInputForGivenOutput };
};
