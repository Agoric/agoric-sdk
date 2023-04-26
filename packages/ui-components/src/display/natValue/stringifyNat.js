// @ts-check
import { assert } from '@agoric/assert';
import { roundToDecimalPlaces } from './helpers/roundToDecimalPlaces.js';

const CONVENTIONAL_DECIMAL_PLACES = 2;
const MAX_DECIMAL_PLACES = 100;

/**
 * @param {NatValue} value
 * @returns {number}
 */
const calcTrailingZeros = value => {
  let zeroes = 0;
  while (value > 0n && value % 10n === 0n) {
    zeroes += 1;
    value /= 10n;
  }
  return zeroes;
};

/**
 * @param {NatValue?} [natValue]
 * @param {number} [decimalPlaces]
 * @param {number} [placesToShow]
 * @returns {string}
 */
export const stringifyNat = (
  natValue = null,
  decimalPlaces = 0,
  placesToShow,
) => {
  if (natValue === null) {
    return '';
  }

  if (placesToShow === undefined) {
    placesToShow = Math.max(
      Math.min(decimalPlaces, CONVENTIONAL_DECIMAL_PLACES),
      natValue > 0n ? decimalPlaces - calcTrailingZeros(natValue) : 0,
    );
  }

  if (placesToShow > MAX_DECIMAL_PLACES) {
    placesToShow = MAX_DECIMAL_PLACES;
  }
  if (decimalPlaces > MAX_DECIMAL_PLACES) {
    natValue /= 10n ** BigInt(decimalPlaces - MAX_DECIMAL_PLACES);
    decimalPlaces = MAX_DECIMAL_PLACES;
  }

  assert.typeof(natValue, 'bigint');
  const str = `${natValue}`.padStart(decimalPlaces, '0');
  const leftOfDecimalStr = str.substring(0, str.length - decimalPlaces) || '0';
  const rightOfDecimalStr = roundToDecimalPlaces(
    `${str.substring(str.length - decimalPlaces)}`,
    placesToShow,
  );

  if (rightOfDecimalStr === '') {
    return leftOfDecimalStr;
  }

  return `${leftOfDecimalStr}.${rightOfDecimalStr}`;
};
