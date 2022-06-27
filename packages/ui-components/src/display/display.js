// @ts-check
import { AssetKind } from '@agoric/ertp';
import '@agoric/ertp/exported.js';

import { parseAsNat } from './natValue/parseAsNat.js';
import { stringifyNat } from './natValue/stringifyNat.js';
import { parseAsSet } from './setValue/parseAsSet.js';
import { stringifySet } from './setValue/stringifySet.js';

const { details } = assert;

/**
 *
 * @param {string} str - string to parse as a value
 * @param {AssetKind} [assetKind] - assetKind of the value
 * @param {number} [decimalPlaces] - places to move the decimal to the left
 * @returns {AmountValue}
 */
export const parseAsValue = (
  str,
  assetKind = AssetKind.NAT,
  decimalPlaces = 0,
) => {
  if (assetKind === AssetKind.NAT) {
    return parseAsNat(str, decimalPlaces);
  }
  if (assetKind === AssetKind.SET) {
    return parseAsSet(str);
  }
  assert.fail(details`AssetKind ${assetKind} must be NAT or SET`);
};

/**
 * @param {string} str - string to parse as a value
 * @param {Brand} brand - brand to use in the amount
 * @param {AssetKind} [assetKind] - assetKind of the value
 * @param {number} [decimalPlaces] - places to move the decimal to the left
 * @returns {Amount}
 */
export const parseAsAmount = (
  str,
  brand,
  assetKind = AssetKind.NAT,
  decimalPlaces = 0,
) => {
  return { brand, value: parseAsValue(str, assetKind, decimalPlaces) };
};

/**
 *
 * @param {AmountValue} value - value to stringify
 * @param {AssetKind} [assetKind] - assetKind of the value
 * @param {number} [decimalPlaces] - places to move the decimal to the
 * right in the string
 * @param {number} [placesToShow] - places after the decimal to show
 * @returns {string}
 */
export const stringifyValue = (
  value,
  assetKind = AssetKind.NAT,
  decimalPlaces = 0,
  placesToShow = 2,
) => {
  if (assetKind === AssetKind.NAT) {
    // @ts-expect-error AmountValue is a Nat
    return stringifyNat(value, decimalPlaces, placesToShow);
  }
  if (assetKind === AssetKind.SET) {
    return stringifySet(value);
  }
  assert.fail(details`AssetKind ${assetKind} must be NAT or SET`);
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
    purse.displayInfo.assetKind,
    purse.displayInfo.decimalPlaces,
  );
};

/**
 * Stringify the value in an amount
 *
 * @param {Amount} amount
 * @param {AssetKind} [assetKind] - assetKind of the value
 * @param {number} [decimalPlaces] - places to move the decimal to the
 * right in the string
 * @param {number} [placesToShow] - places after the decimal to show
 * @returns {string}
 */
export function stringifyAmountValue(
  amount,
  assetKind,
  decimalPlaces,
  placesToShow,
) {
  if (!amount) {
    return '0';
  }
  return stringifyValue(amount.value, assetKind, decimalPlaces, placesToShow);
}
