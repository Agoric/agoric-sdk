import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { TimeMath } from '@agoric/time';

import { decodeNumber, encodeNumber } from '../vaultFactory/storeUtils.js';

// We want earlier times to sort the same direction as higher prices, so we
// subtract the timestamp from millisecond time in the year 2286. This works for
// timestamps in seconds or millis. The alternative considered was inverting,
// but floats don't have enough resolution to convert back to the same timestamp
// This will work just fine for at least 250 years. And notice that these
// timestamps are used for sorting during an auction and don't need to be stored
// long-term. We could safely subtract from a timestamp that's now + 1 month.
const FarFuture = 10000000000000n;
const encodeTimestamp = t => FarFuture - t;

/**
 * Prices might be more or less than one.
 *
 * @param {Ratio} price price quote in IST/Collateral
 * @returns {number}
 */
const priceAsFloat = price => {
  const n = Number(price.numerator.value);
  const d = Number(price.denominator.value);
  return n / d;
};

/**
 * Prices might be more or less than one.
 *
 * @param {Ratio} discount price quote in IST/IST
 * @returns {number}
 */
const rateAsFloat = discount => {
  const n = Number(discount.numerator.value);
  const d = Number(discount.denominator.value);
  return n / d;
};

export const toPriceComparator = offerPrice => {
  assert(offerPrice);
  const mostSignificantPart = encodeNumber(priceAsFloat(offerPrice));
  return `${mostSignificantPart}:`;
};

/**
 * Sorts by ratio in descending price.
 *
 * @param {Ratio} offerPrice IST/collateral
 * @param {Timestamp} offerTime
 * @returns {string} lexically sortable string in which highest price is first,
 *    ties will be broken by time of offer
 */
export const toPriceOfferKey = (offerPrice, offerTime) => {
  assert(offerPrice);
  assert(offerTime);
  // until DB supports composite keys, copy its method for turning numbers to DB
  // entry keys
  const mostSignificantPart = encodeNumber(priceAsFloat(offerPrice));
  return `${mostSignificantPart}:${encodeTimestamp(offerTime)}`;
};

const priceRatioFromFloat = (floatPrice, numBrand, denomBrand, useDecimals) => {
  const denominatorValue = 10 ** useDecimals;
  return makeRatio(
    BigInt(Math.trunc(decodeNumber(floatPrice) * denominatorValue)),
    numBrand,
    BigInt(denominatorValue),
    denomBrand,
  );
};

const discountRatioFromFloat = (
  floatDiscount,
  numBrand,
  denomBrand,
  useDecimals,
) => {
  const denominatorValue = 10 ** useDecimals;
  return makeRatio(
    BigInt(Math.trunc(decodeNumber(floatDiscount) * denominatorValue)),
    numBrand,
    BigInt(denominatorValue),
    denomBrand,
  );
};

/**
 * fromPriceOfferKey is only used for diagnostics.
 *
 * @param {string} key
 * @param {Brand} numBrand
 * @param {Brand} denomBrand
 * @param {number} useDecimals
 * @returns {[normalizedPrice: Ratio, offerTime: Timestamp]}
 */
export const fromPriceOfferKey = (key, numBrand, denomBrand, useDecimals) => {
  const [pricePart, timePart] = key.split(':');
  return [
    priceRatioFromFloat(pricePart, numBrand, denomBrand, useDecimals),
    BigInt(encodeTimestamp(BigInt(timePart))),
  ];
};

export const toDiscountComparator = rate => {
  assert(rate);
  const mostSignificantPart = encodeNumber(rateAsFloat(rate));
  return `${mostSignificantPart}:`;
};

/**
 * Sorts offers expressed as percentage of the current oracle price.
 *
 * @param {Ratio} rate
 * @param {Timestamp} offerTime
 * @returns {string} lexically sortable string in which highest price is first,
 *    ties will be broken by time of offer
 */
export const toDiscountedRateOfferKey = (rate, offerTime) => {
  assert(rate);
  assert(offerTime);
  // until DB supports composite keys, copy its method for turning numbers to DB
  // entry keys
  const mostSignificantPart = encodeNumber(rateAsFloat(rate));
  return `${mostSignificantPart}:${encodeTimestamp(offerTime)}`;
};

/**
 * fromDiscountedRateOfferKey is only used for diagnostics.
 *
 * @param {string} key
 * @param {Brand} brand
 * @param {number} useDecimals
 * @returns {[normalizedPrice: Ratio, offerTime: Timestamp]}
 */
export const fromDiscountedRateOfferKey = (key, brand, useDecimals) => {
  const [discountPart, timePart] = key.split(':');
  return [
    discountRatioFromFloat(discountPart, brand, brand, useDecimals),
    BigInt(encodeTimestamp(BigInt(timePart))),
  ];
};

export const keyToTime = key => TimeMath.toAbs(Number(key.split(':')[1]));
