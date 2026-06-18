/**
 * @file Utility functions that are compatible with SES.
 */

import { Fail, bare, q } from '@endo/errors';

/**
 * @typedef {object} ParseBigIntOptions
 * @property {number} [fixedPlaces]
 * @property {string} [label]
 * @property {boolean} [natural]
 * @property {boolean} [safeInteger]
 */

/**
 * @param {unknown} value
 * @param {ParseBigIntOptions} [options]
 * @returns {bigint}
 */
export const parseBigInt = (
  value,
  {
    fixedPlaces = 0,
    label = 'value',
    natural = false,
    safeInteger = false,
  } = {},
) => {
  const bareLabel = bare(label);

  if (
    typeof fixedPlaces !== 'number' ||
    fixedPlaces < 0 ||
    !Number.isInteger(fixedPlaces)
  ) {
    throw Fail`${bareLabel} parse options has invalid fixedPlaces ${q(fixedPlaces)}`;
  }

  const match = /^([-+]?)(\d+)([.](\d*)?)?$/.exec(String(value));
  if (!match) {
    throw Fail`${bareLabel} ${value} is not a decimal real`;
  }

  const [, sign, units, pointDecimal, decimal = ''] = match;
  if (pointDecimal && !fixedPlaces) {
    throw Fail`${bareLabel} ${value} has a decimal point but fixedPlaces is not set`;
  }
  if (decimal.length > fixedPlaces) {
    throw Fail`${bareLabel} ${value} has more than ${fixedPlaces} decimal places`;
  }

  let fixedString;
  try {
    fixedString = `${sign}${units}${decimal.padEnd(fixedPlaces, '0')}`;
  } catch (e) {
    throw Fail`${bareLabel} ${value} fixed string builder failed: ${e}`;
  }

  let fixed;
  try {
    fixed = BigInt(fixedString);
  } catch (e) {
    throw Fail`${bareLabel} ${value} output failure: ${e}`;
  }

  if (natural && !(fixed >= 0n)) {
    throw Fail`${bareLabel} ${value} output is not a natural integer`;
  }

  if (safeInteger && !Number.isSafeInteger(Number(fixed))) {
    throw Fail`${bareLabel} ${value} output cannot be casted to a safe integer`;
  }
  return fixed;
};
