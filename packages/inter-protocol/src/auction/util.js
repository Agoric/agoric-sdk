import { M } from '@agoric/store';
import {
  makeRatioFromAmounts,
  multiplyRatios,
  ratioGTE,
} from '@agoric/zoe/src/contractSupport/index.js';

export const BASIS_POINTS = 10000n;

/**
 * Constants for Auction State.
 *
 * @type {{ ACTIVE: 'active', WAITING: 'waiting' }}
 */
export const AuctionState = {
  ACTIVE: 'active',
  WAITING: 'waiting',
};

export const makeBrandedRatioPattern = (nBrand, dBrand) => {
  return harden({
    numerator: { brand: nBrand, value: M.nat() },
    denominator: { brand: dBrand, value: M.nat() },
  });
};

/**
 * TRUE if the discount(/markup) applied to the price is higher than the quote.
 *
 * @param {Ratio} discount
 * @param {Ratio} currentPrice
 * @param {Ratio} oraclePrice
 */
export const isDiscountedPriceHigher = (discount, currentPrice, oraclePrice) =>
  ratioGTE(multiplyRatios(oraclePrice, discount), currentPrice);

/** @type {(PriceQuote) => Ratio} */
export const priceFrom = quote =>
  makeRatioFromAmounts(
    quote.quoteAmount.value[0].amountOut,
    quote.quoteAmount.value[0].amountIn,
  );
