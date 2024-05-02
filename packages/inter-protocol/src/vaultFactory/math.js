// @jessie-check

/**
 * @file calculations specific to the Vault Factory contract See also
 *   ../interest-math.js
 */

import { AmountMath } from '@agoric/ertp';
import { getAmountOut } from '@agoric/zoe/src/contractSupport/priceQuote.js';
import {
  addRatios,
  ceilMultiplyBy,
  floorDivideBy,
  ratioGTE,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { priceFrom } from '../auction/util.js';
import { addSubtract } from '../contractSupport.js';

/** @import {PriceAuthority, PriceDescription, PriceQuote, PriceQuoteValue, PriceQuery,} from '@agoric/zoe/tools/types.js'; */

/**
 * Calculate the minimum collateralization given the liquidation margin and the
 * "padding" from that liquidation threshold.
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
 * Calculate the lesser price of the given quotes.
 *
 * @param {PriceQuote} quoteA
 * @param {PriceQuote} [quoteB]
 * @returns {Ratio}
 */
export const minimumPrice = (quoteA, quoteB) => {
  const priceA = priceFrom(quoteA);
  if (quoteB === undefined) {
    return priceA;
  }
  const priceB = priceFrom(quoteB);
  if (ratioGTE(priceA, priceB)) {
    return priceB;
  } else {
    return priceA;
  }
};
harden(minimumPrice);

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
 * Calculate the fee, the amount to mint and the resulting debt. The give and
 * the want together reflect a delta, where typically one is zero because they
 * come from the gave/want of an offer proposal. If the `want` is zero, the
 * `fee` will also be zero, so the simple math works.
 *
 * @param {Amount<'nat'>} currentDebt
 * @param {Amount<'nat'>} give excess of currentDebt is returned in 'surplus'
 * @param {Amount<'nat'>} want
 * @param {Ratio} debtFee
 */
export const calculateDebtCosts = (currentDebt, give, want, debtFee) => {
  const maxGive = AmountMath.min(currentDebt, give);
  const surplus = AmountMath.subtract(give, maxGive);
  const fee = ceilMultiplyBy(want, debtFee);
  const toMint = AmountMath.add(want, fee);
  const newDebt = addSubtract(currentDebt, toMint, maxGive);
  return { newDebt, toMint, fee, surplus };
};
