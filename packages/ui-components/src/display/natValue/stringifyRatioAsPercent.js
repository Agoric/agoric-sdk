// @ts-check

import { captureNum } from './helpers/captureNum.js';
import { roundToDecimalPlaces } from './helpers/roundToDecimalPlaces.js';

const { details } = assert;

const PERCENT_BASE = 100n;
const PLACES_TO_SHOW = 0;

/**
 * @typedef {object} Ratio
 * @property {import('@agoric/ertp/src/types.js').Amount<'nat'>} numerator
 * @property {import('@agoric/ertp/src/types.js').Amount<'nat'>} denominator
 */

/**
 * @param {Ratio} ratio
 * @param {(brand: import('@agoric/ertp/src/types.js').Brand) => number | undefined } getDecimalPlaces
 * @param {number} [placesToShow]
 * @returns {string}
 */
export const stringifyRatioAsPercent = (
  ratio,
  getDecimalPlaces,
  placesToShow = PLACES_TO_SHOW,
) => {
  if (ratio === null || ratio === undefined) {
    return '0';
  }
  assert(
    ratio && ratio.numerator,
    details`Ratio ${ratio} did not look like a ratio`,
  );

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
  const denomPower = 10n ** BigInt(denomDecimalPlaces);
  const numPower = 10n ** BigInt(numDecimalPlaces);
  const numerator = ratio.numerator.value * denomPower * PERCENT_BASE;
  const denominator = ratio.denominator.value * numPower;
  const str = `${Number(numerator) / Number(denominator)}`;
  const capturedNum = captureNum(str);
  const right = roundToDecimalPlaces(capturedNum.right, placesToShow);
  if (right === '') {
    return `${capturedNum.left}`;
  }
  return `${capturedNum.left}.${right}`;
};
