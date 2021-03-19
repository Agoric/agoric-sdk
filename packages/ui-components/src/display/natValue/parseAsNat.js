// @ts-check
import { assert, details } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import '@agoric/ertp/exported';

import { captureNum } from './captureNum';
import { roundToDecimalPlaces } from './roundToDecimalPlaces';

/**
 * Parse a string as a Nat, given displayInfo such as `decimalPlaces`,
 * the number of places to move the decimal over to create an integer
 *
 * @param {string} str
 * @param {number} decimalPlaces
 */
export function parseAsNat(str, decimalPlaces = 0) {
  assert.typeof(str, 'string', details`value to parse ${str} must be a string`);
  const capturedNum = captureNum(str);
  const roundedRight = roundToDecimalPlaces(capturedNum.right, decimalPlaces);
  return Nat(BigInt(`${capturedNum.left}${roundedRight}`));
}
