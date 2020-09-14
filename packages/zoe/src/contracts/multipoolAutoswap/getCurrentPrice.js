import '../../../exported';

/**
 * Build functions to calculate prices for multipoolAutoswap. Two methods are
 * returned. In one the caller specifies the amount they will pay, and in the
 * other they specify the amount they wish to receive.
 *
 * @param {(brand: Brand) => boolean} isSecondary
 * @param {(brand: Brand) => boolean} isCentral
 * @param {(brand: Brand) => Pool} getPool
 */

export const makeGetCurrentPrice = (isSecondary, isCentral, getPool) => {
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
    const { brand: brandIn, value: inputValue } = amountIn;

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      return getPool(brandOut).getCentralToSecondaryInputPrice(inputValue);
    }

    if (isSecondary(brandIn) && isCentral(brandOut)) {
      return getPool(brandIn).getSecondaryToCentralInputPrice(inputValue);
    }

    if (isSecondary(brandIn) && isSecondary(brandOut)) {
      // We must do two consecutive calls to get the price: from
      // the brandIn to the central token, then from the central
      // token to the brandOut.
      const centralTokenAmount = getPool(
        brandIn,
      ).getSecondaryToCentralInputPrice(inputValue);
      return getPool(brandOut).getCentralToSecondaryInputPrice(
        centralTokenAmount.value,
      );
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
    const { brand: brandOut, value: outputValue } = amountOut;

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      return getPool(brandOut).getCentralToSecondaryOutputPrice(outputValue);
    }

    if (isSecondary(brandIn) && isCentral(brandOut)) {
      return getPool(brandIn).getSecondaryToCentralOutputPrice(outputValue);
    }

    if (isSecondary(brandIn) && isSecondary(brandOut)) {
      // We must do two consecutive calls to get the price: from
      // the brandIn to the central token, then from the central
      // token to the brandOut.
      const centralTokenAmount = getPool(
        brandIn,
      ).getSecondaryToCentralOutputPrice(outputValue);
      return getPool(brandOut).getCentralToSecondaryOutputPrice(
        centralTokenAmount.value,
      );
    }

    throw new Error(`brands were not recognized`);
  };

  return { getOutputForGivenInput, getInputForGivenOutput };
};
