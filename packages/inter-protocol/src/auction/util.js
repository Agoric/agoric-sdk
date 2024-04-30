// @jessie-check

import {
  makeRatioFromAmounts,
  multiplyRatios,
  ratioGTE,
} from '@agoric/zoe/src/contractSupport/index.js';
import { Far } from '@endo/marshal';

/** @import {PriceAuthority, PriceDescription, PriceQuote, PriceQuoteValue, PriceQuery,} from '@agoric/zoe/tools/types.js'; */

/**
 * Constants for Auction State.
 *
 * @type {{ ACTIVE: 'active'; WAITING: 'waiting' }}
 */
export const AuctionState = {
  ACTIVE: 'active',
  WAITING: 'waiting',
};

/**
 * @param {{ brand: Brand; value: Pattern }} numeratorAmountShape
 * @param {{ brand: Brand; value: Pattern }} denominatorAmountShape
 */
export const makeBrandedRatioPattern = (
  numeratorAmountShape,
  denominatorAmountShape,
) => {
  return harden({
    numerator: numeratorAmountShape,
    denominator: denominatorAmountShape,
  });
};

/**
 * @param {Ratio} bidScaling
 * @param {Ratio} currentPrice
 * @param {Ratio} oraclePrice
 * @returns {boolean} TRUE iff the discount(/markup) applied to the price is
 *   higher than the quote.
 */
export const isScaledBidPriceHigher = (bidScaling, currentPrice, oraclePrice) =>
  ratioGTE(multiplyRatios(oraclePrice, bidScaling), currentPrice);

/** @type {(quote: PriceQuote) => Ratio} */
export const priceFrom = quote =>
  makeRatioFromAmounts(
    quote.quoteAmount.value[0].amountOut,
    quote.quoteAmount.value[0].amountIn,
  );

export const makeCancelTokenMaker = name => {
  let tokenCount = 1;

  return () => Far(`cancelToken-${name}-${(tokenCount += 1)}`, {});
};
