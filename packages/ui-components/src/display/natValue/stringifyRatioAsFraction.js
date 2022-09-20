// @ts-check

import { assert } from '@agoric/assert';
import { isNatValue } from '@agoric/ertp';

import { stringifyNat } from './stringifyNat.js';

const PLACES_TO_SHOW = 2;

/**
 * @param {import('./stringifyRatioAsPercent.js').Ratio} ratio
 * @param {(brand: import('@agoric/ertp/src/types.js').Brand) => number | undefined } getDecimalPlaces
 * @param {number} [numPlacesToShow]
 * @param {number} [denomPlacesToShow]
 * @returns {string}
 */
export const stringifyRatioAsFraction = (
  ratio,
  getDecimalPlaces,
  numPlacesToShow = PLACES_TO_SHOW,
  denomPlacesToShow = PLACES_TO_SHOW,
) => {
  assert(isNatValue(ratio.numerator.value));
  assert(isNatValue(ratio.denominator.value));

  const numDecimalPlaces = getDecimalPlaces(ratio.numerator.brand);
  const denomDecimalPlaces = getDecimalPlaces(ratio.denominator.brand);

  assert(
    numDecimalPlaces,
    `decimalPlaces for numerator ${ratio.numerator} must be provided`,
  );
  assert(
    denomDecimalPlaces,
    `decimalPlaces for denominator ${ratio.denominator} must be provided`,
  );
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
