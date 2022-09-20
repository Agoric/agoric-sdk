// @ts-check
import { AssetKind } from '@agoric/ertp';
import { parseAsCopyBag } from './copyBagValue/parseAsCopyBag.js';
import { stringifyCopyBag } from './copyBagValue/stringifyCopyBag.js';
import { parseAsNat } from './natValue/parseAsNat.js';
import { stringifyNat } from './natValue/stringifyNat.js';
import { parseAsSet } from './setValue/parseAsSet.js';
import { stringifySet } from './setValue/stringifySet.js';

const { details } = assert;

/**
 *
 * @param {string} str - string to parse as a value
 * @param {import('@agoric/ertp/src/types.js').AssetKind} [assetKind] - assetKind of the value
 * @param {number} [decimalPlaces] - places to move the decimal to the left
 * @returns {import('@agoric/ertp/src/types.js').AmountValue}
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
  if (assetKind === AssetKind.COPY_BAG) {
    return parseAsCopyBag(str);
  }
  assert.fail(details`AssetKind ${assetKind} must be NAT or SET or COPY_BAG`);
};

/**
 * @param {string} str - string to parse as a value
 * @param {import('@agoric/ertp/src/types.js').Brand} brand - brand to use in the amount
 * @param {import('@agoric/ertp/src/types.js').AssetKind} [assetKind] - assetKind of the value
 * @param {number} [decimalPlaces] - places to move the decimal to the left
 * @returns {import('@agoric/ertp/src/types.js').Amount}
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
 * @param {import('@agoric/ertp/src/types.js').AmountValue} value - value to stringify
 * @param {import('@agoric/ertp/src/types.js').AssetKind} [assetKind] - assetKind of the value
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
    return stringifyNat(value, decimalPlaces, placesToShow);
  }
  if (assetKind === AssetKind.SET) {
    return stringifySet(value);
  }
  if (assetKind === AssetKind.COPY_BAG) {
    return stringifyCopyBag(value);
  }
  assert.fail(details`AssetKind ${assetKind} must be NAT or SET or COPY_BAG`);
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
 * @param {import('@agoric/ertp/src/types.js').Amount} amount
 * @param {import('@agoric/ertp/src/types.js').AssetKind} [assetKind] - assetKind of the value
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
