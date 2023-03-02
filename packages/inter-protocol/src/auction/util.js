import {
  makeRatioFromAmounts,
  multiplyRatios,
  ratioGTE,
} from '@agoric/zoe/src/contractSupport/index.js';

/**
 * Constants for Auction State.
 *
 * @type {{ ACTIVE: 'active', WAITING: 'waiting' }}
 */
export const AuctionState = {
  ACTIVE: 'active',
  WAITING: 'waiting',
};

/**
 * @param {Pattern} numeratorAmountShape
 * @param {Pattern} denominatorAmountShape
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
 * TRUE if the discount(/markup) applied to the price is higher than the quote.
 *
 * @param {Ratio} bidScaling
 * @param {Ratio} currentPrice
 * @param {Ratio} oraclePrice
 */
export const isScaledBidPriceHigher = (bidScaling, currentPrice, oraclePrice) =>
  ratioGTE(multiplyRatios(oraclePrice, bidScaling), currentPrice);

/** @type {(PriceQuote) => Ratio} */
export const priceFrom = quote =>
  makeRatioFromAmounts(
    quote.quoteAmount.value[0].amountOut,
    quote.quoteAmount.value[0].amountIn,
  );
