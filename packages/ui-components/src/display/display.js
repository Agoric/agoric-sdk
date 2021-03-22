// @ts-check
import { assert, details } from '@agoric/assert';
import { MathKind } from '@agoric/ertp';
import '@agoric/ertp/exported';

import { parseAsNat } from './natValue/parseAsNat';
import { stringifyNat } from './natValue/stringifyNat';
import { parseAsSet } from './setValue/parseAsSet';
import { stringifySet } from './setValue/stringifySet';

/**
 *
 * @param {string} str - string to parse as a value
 * @param {AmountMathKind} [mathKind] - mathKind of the value
 * @param {number} [decimalPlaces] - places to move the decimal to the left
 * @returns {Value}
 */
export const parseAsValue = (
  str,
  mathKind = MathKind.NAT,
  decimalPlaces = 0,
) => {
  if (mathKind === MathKind.NAT) {
    return parseAsNat(str, decimalPlaces);
  }
  if (mathKind === MathKind.SET) {
    return parseAsSet(str);
  }
  assert.fail(details`MathKind ${mathKind} must be NAT or SET`);
};

/**
 * @param {string} str - string to parse as a value
 * @param {Brand} brand - brand to use in the amount
 * @param {AmountMathKind} [mathKind] - mathKind of the value
 * @param {number} [decimalPlaces] - places to move the decimal to the left
 * @returns {Amount}
 */
export const parseAsAmount = (
  str,
  brand,
  mathKind = MathKind.NAT,
  decimalPlaces = 0,
) => {
  return { brand, value: parseAsValue(str, mathKind, decimalPlaces) };
};

/**
 *
 * @param {Value} value - value to stringify
 * @param {AmountMathKind} [mathKind] - mathKind of the value
 * @param {number} [decimalPlaces] - places to move the decimal to the
 * right in the string
 * @param {number} [placesToShow] - places after the decimal to show
 * @returns {string}
 */
export const stringifyValue = (
  value,
  mathKind = MathKind.NAT,
  decimalPlaces = 0,
  placesToShow = 2,
) => {
  if (mathKind === MathKind.NAT) {
    // @ts-ignore Value is a Nat
    return stringifyNat(value, decimalPlaces, placesToShow);
  }
  if (mathKind === MathKind.SET) {
    // @ts-ignore Value is a SetValue
    return stringifySet(value);
  }
  assert.fail(details`MathKind ${mathKind} must be NAT or SET`);
};

/**
 * Stringify the value of a purse
 *
 * @param {any} purse
 * @returns {string}
 */
export const stringifyPurseValue = purse => {
  if (!purse) {
    return '0';
  }
  return stringifyValue(
    purse.value,
    purse.displayInfo.mathKind,
    purse.displayInfo.decimalPlaces,
  );
};

/**
 * Stringify the value in an amount
 *
 * @param {Amount} amount
 * @param {AmountMathKind} [mathKind] - mathKind of the value
 * @param {number} [decimalPlaces] - places to move the decimal to the
 * right in the string
 * @param {number} [placesToShow] - places after the decimal to show
 * @returns {string}
 */
export function stringifyAmountValue(
  amount,
  mathKind,
  decimalPlaces,
  placesToShow,
) {
  if (!amount) {
    return '0';
  }
  return stringifyValue(amount.value, mathKind, decimalPlaces, placesToShow);
}
