// @ts-check

import { assert } from '@agoric/assert';
import { isNatValue } from '@agoric/ertp';

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/exported';

import { stringifyNat } from './stringifyNat';

const PLACES_TO_SHOW = 2;

/**
 * 
 * @param {Ratio} ratio 
 * @param {{ numDecimalPlaces?: number,
    numPlacesToShow?: number,
    denomDecimalPlaces?: number,
    denomPlacesToShow?: number,
    getDecimalPlaces?: Function }} [options] 
 * @returns {string}
 */
export const stringifyRatio = (ratio, options) => {
  const {
    numPlacesToShow = PLACES_TO_SHOW,
    denomPlacesToShow = PLACES_TO_SHOW,
    getDecimalPlaces = undefined,
  } = options || {};
  let { numDecimalPlaces, denomDecimalPlaces } = options || {};

  assert(isNatValue(ratio.numerator.value));
  assert(isNatValue(ratio.denominator.value));

  if (getDecimalPlaces !== undefined) {
    numDecimalPlaces = getDecimalPlaces(ratio.numerator.brand);
    denomDecimalPlaces = getDecimalPlaces(ratio.denominator.brand);
  }

  assert(numDecimalPlaces !== undefined, `numDecimalPlaces required`);
  assert(denomDecimalPlaces !== undefined, `denomDecimalPlaces required`);

  const numeratorString = stringifyNat(
    ratio.numerator.value,
    numDecimalPlaces,
    numPlacesToShow,
  );
  const denominatorString = stringifyNat(
    ratio.denominator.value,
    denomDecimalPlaces,
    denomPlacesToShow,
  );
  return `${numeratorString} / ${denominatorString}`;
};
