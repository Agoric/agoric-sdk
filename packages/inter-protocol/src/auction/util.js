import { M } from '@agoric/store';
import {
  multiplyRatios,
  ratioGTE,
} from '@agoric/zoe/src/contractSupport/index.js';

export const DiscountOfferShape = M.any();
export const PriceOfferShape = M.any();

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

export const makeRatioPattern = (nBrand, dBrand) => {
  return harden({
    numerator: { brand: nBrand, value: M.nat() },
    denominator: { brand: dBrand, value: M.nat() },
  });
};

export const isDiscountedPriceHigher = (discount, currentPrice, oracleQuote) =>
  ratioGTE(multiplyRatios(oracleQuote, discount), currentPrice);
