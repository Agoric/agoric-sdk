/**
 * @file calculations specific to the Vault Factory contract
 * See also ../interest-math.js
 */

import { getAmountOut } from '@agoric/zoe/src/contractSupport/priceQuote.js';
import {
  addRatios,
  floorDivideBy,
} from '@agoric/zoe/src/contractSupport/ratio.js';

/**
 * Calculate the minimum collateralization given the liquidation margin and the "padding"
 * from that liquidation threshold.
 *
 * @param {Ratio} liquidationMargin
 * @param {Ratio} liquidationPadding
 * @returns {Ratio}
 */
export const calculateMinimumCollateralization = (
  liquidationMargin,
  liquidationPadding,
) => addRatios(liquidationMargin, liquidationPadding);

/**
 * Calculate the maximum debt allowed based on the price quote and the lesser of
 * the `liquidationMargin` or the `liquidationPadding`.
 *
 * @param {PriceQuote} quoteAmount
 * @param {Ratio} liquidationMargin
 * @param {Ratio} liquidationPadding
 * @returns {Amount<'nat'>}
 */
export const maxDebtForVault = (
  quoteAmount,
  liquidationMargin,
  liquidationPadding,
) => {
  const debtByQuote = getAmountOut(quoteAmount);
  const minimumCollateralization = calculateMinimumCollateralization(
    liquidationMargin,
    liquidationPadding,
  );
  // floorDivide because we want the debt ceiling lower
  return floorDivideBy(debtByQuote, minimumCollateralization);
};
