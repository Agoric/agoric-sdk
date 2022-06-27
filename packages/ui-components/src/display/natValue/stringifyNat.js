import { roundToDecimalPlaces } from './helpers/roundToDecimalPlaces.js';

const CONVENTIONAL_DECIMAL_PLACES = 2;
const MAX_DECIMAL_PLACES = 100;

/**
 * @param {NatValue} natValue
 * @param {number} [decimalPlaces]
 * @param {number} [placesToShow]
 * @returns {string}
 */
export const stringifyNat = (
  natValue = null,
  decimalPlaces = 0,
  placesToShow = CONVENTIONAL_DECIMAL_PLACES,
) => {
  if (natValue === null) {
    return '';
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
