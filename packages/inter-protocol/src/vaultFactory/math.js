/**
 * @file calculations specific to the Vault Factory contract
 * See also ../interest-math.js
 */

import { AmountMath } from '@agoric/ertp';
import { getAmountOut } from '@agoric/zoe/src/contractSupport/priceQuote.js';
import {
  addRatios,
  ceilMultiplyBy,
  floorDivideBy,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { addSubtract } from '../contractSupport.js';

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

/**
 * Calculate the fee, the amount to mint and the resulting debt.
 * The give and the want together reflect a delta, where typically
 * one is zero because they come from the gave/want of an offer
 * proposal. If the `want` is zero, the `fee` will also be zero,
 * so the simple math works.
 *
 * @param {Amount<'nat'>} currentDebt
 * @param {Amount<'nat'>} give
 * @param {Amount<'nat'>} want
 * @param {Ratio} loanFee
 */
export const calculateLoanCosts = (currentDebt, give, want, loanFee) => {
  const fee = ceilMultiplyBy(want, loanFee);
  const toMint = AmountMath.add(want, fee);
  const newDebt = addSubtract(currentDebt, toMint, give);
  return { newDebt, toMint, fee };
};
