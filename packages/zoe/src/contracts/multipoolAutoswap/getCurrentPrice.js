/**
 *
 * @param {(brand: Brand) => boolean} isSecondary
 * @param {(brand: Brand) => boolean} isCentral
 * @param {(brand: Brand) => Pool} getPool
 */

import '../../../exported';

export const makeGetCurrentPrice = (isSecondary, isCentral, getPool) => {
  /**
   * `getCurrentPrice` calculates the result of a trade, given a certain
   * amount of digital assets in.
   * @param {Amount} amountIn - the amount of digital assets to be
   * sent in
   * @param {Brand} brandOut - the brand of the requested payment.
   */
  // eslint-disable-next-line consistent-return
  const getCurrentPrice = (amountIn, brandOut) => {
    // BrandIn could either be the central token brand, or one of
    // the secondary token brands.
    const { brand: brandIn, value: inputValue } = amountIn;

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      return getPool(brandOut).getCurrentPrice(true, inputValue);
    }

    if (isSecondary(brandIn) && isCentral(brandOut)) {
      return getPool(brandIn).getCurrentPrice(false, inputValue);
    }

    if (isSecondary(brandIn) && isSecondary(brandOut)) {
      // We must do two consecutive `getCurrentPrice` calls: from
      // the brandIn to the central token, then from the central
      // token to the brandOut.
      const centralTokenAmount = getPool(brandIn).getCurrentPrice(
        false,
        inputValue,
      );
      return getPool(brandOut).getCurrentPrice(true, centralTokenAmount.value);
    }

    throw new Error(`brands were not recognized`);
  };

  return getCurrentPrice;
};
