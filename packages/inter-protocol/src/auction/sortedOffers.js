import {
  makeRatio,
  coerceToNumber,
} from '@agoric/zoe/src/contractSupport/index.js';
import { M, mustMatch } from '@agoric/store';
import { RatioShape } from '@agoric/ertp';

import { decodeNumber, encodeNumber } from '../vaultFactory/storeUtils.js';

const { Fail } = assert;

// We want earlier times to sort the same direction as higher prices, so we
// subtract the timestamp from millisecond time in the year 2286. This works for
// timestamps in seconds or millis. The alternative considered was inverting,
// but floats don't have enough resolution to convert back to the same timestamp
// This will work just fine for at least 250 years. And notice that these
// timestamps are used for sorting during an auction and don't need to be stored
// long-term. We could safely subtract from a timestamp that's now + 1 month.
const FarFuture = 10000000000000n;

/** @type {(s: bigint) => bigint} */
const encodeSequenceNumber = s => FarFuture - s;

/**
 * Return a sort key that will compare based only on price. Price is the prefix
 * of the complete sort key, which is sufficient to find offers below a cutoff.
 *
 * @param {Ratio} offerPrice
 */
export const toPartialOfferKey = offerPrice => {
  assert(offerPrice);
  const mostSignificantPart = encodeNumber(coerceToNumber(offerPrice));
  return `${mostSignificantPart}:`;
};

/**
 * Return a sort key that distinguishes by Price and sequence number
 *
 * @param {Ratio} offerPrice IST/collateral
 * @param {bigint} sequenceNumber
 * @returns {string} lexically sortable string in which highest price is first,
 *    ties will be broken by sequenceNumber of offer
 */
export const toPriceOfferKey = (offerPrice, sequenceNumber) => {
  mustMatch(offerPrice, RatioShape);
  offerPrice.numerator.brand !== offerPrice.denominator.brand ||
    Fail`offer prices must have different numerator and denominator`;
  mustMatch(sequenceNumber, M.nat());

  // until DB supports composite keys, copy its method for turning numbers to DB
  // entry keys
  const mostSignificantPart = encodeNumber(coerceToNumber(offerPrice));
  return `${mostSignificantPart}:${encodeSequenceNumber(sequenceNumber)}`;
};

const priceRatioFromFloat = (floatPrice, numBrand, denomBrand, useDecimals) => {
  const denominatorValue = 10 ** useDecimals;
  return makeRatio(
    BigInt(Math.round(decodeNumber(floatPrice) * denominatorValue)),
    numBrand,
    BigInt(denominatorValue),
    denomBrand,
  );
};

const discountRatioFromFloat = (floatDiscount, numBrand, useDecimals) => {
  const denominatorValue = 10 ** useDecimals;
  return makeRatio(
    BigInt(Math.round(decodeNumber(floatDiscount) * denominatorValue)),
    numBrand,
    BigInt(denominatorValue),
  );
};

/**
 * fromPriceOfferKey is only used for diagnostics.
 *
 * @param {string} key
 * @param {Brand} numBrand
 * @param {Brand} denomBrand
 * @param {number} useDecimals
 * @returns {[normalizedPrice: Ratio, sequenceNumber: bigint]}
 */
export const fromPriceOfferKey = (key, numBrand, denomBrand, useDecimals) => {
  const [pricePart, sequenceNumberPart] = key.split(':');
  return [
    priceRatioFromFloat(pricePart, numBrand, denomBrand, useDecimals),
    encodeSequenceNumber(BigInt(sequenceNumberPart)),
  ];
};

export const toDiscountComparator = rate => {
  assert(rate);
  const mostSignificantPart = encodeNumber(coerceToNumber(rate));
  return `${mostSignificantPart}:`;
};

/**
 * Sorts offers expressed as percentage of the current oracle price.
 *
 * @param {Ratio} rate discount/markup rate expressed as a ratio IST/IST
 * @param {bigint} sequenceNumber
 * @returns {string} lexically sortable string in which highest price is first,
 *    ties will be broken by sequenceNumber of offer
 */
export const toDiscountedRateOfferKey = (rate, sequenceNumber) => {
  mustMatch(rate, RatioShape);
  rate.numerator.brand === rate.denominator.brand ||
    Fail`discount rate must have the same numerator and denominator`;
  mustMatch(sequenceNumber, M.nat());

  // until DB supports composite keys, copy its method for turning numbers to DB
  // entry keys
  const mostSignificantPart = encodeNumber(coerceToNumber(rate));
  return `${mostSignificantPart}:${encodeSequenceNumber(sequenceNumber)}`;
};

/**
 * fromDiscountedRateOfferKey is only used for diagnostics.
 *
 * @param {string} key
 * @param {Brand} brand
 * @param {number} useDecimals
 * @returns {[normalizedPrice: Ratio, sequenceNumber: bigint]}
 */
export const fromDiscountedRateOfferKey = (key, brand, useDecimals) => {
  const [discountPart, sequenceNumberPart] = key.split(':');
  return [
    discountRatioFromFloat(discountPart, brand, useDecimals),
    encodeSequenceNumber(BigInt(sequenceNumberPart)),
  ];
};
