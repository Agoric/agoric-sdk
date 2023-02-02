/**
 * @file calculations specific to the Vault Factory contract
 * See also ../interest-math.js
 */

import { getAmountOut } from '@agoric/zoe/src/contractSupport/priceQuote.js';
import { floorDivideBy } from '@agoric/zoe/src/contractSupport/ratio.js';

/**
 * Calculate the maximum debt allowed based on the price quote and the lesser of
 * the `liquidationMargin` or the `minimumCollateralization`.
 *
 * @param {PriceQuote} quoteAmount
 * @param {Ratio} liquidationMargin
 * @returns {Amount<'nat'>}
 */
export const maxDebtForVault = (quoteAmount, liquidationMargin) => {
  // floorDivide because we want the debt ceiling lower
  return floorDivideBy(getAmountOut(quoteAmount), liquidationMargin);
};
