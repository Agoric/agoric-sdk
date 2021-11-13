// @ts-check

import { passStyleOf } from '@agoric/marshal';

/**
 * Assert that the argument is an array, or a "copyArray" in @agoric/marshal terms.
 *
 * @param {Array} array
 * @param {string=} optNameOfArray
 */
const assertArray = (array, optNameOfArray = 'Alleged array') => {
  const passStyle = passStyleOf(array);
  assert(
    passStyle === 'copyArray',
    `${optNameOfArray} ${array} must be an array, not ${passStyle}`,
  );
};
harden(assertArray);

/**
 * Assert that the argument is a pass-by-copy record, or a
 * "copyRecord" in @agoric/marshal terms
 *
 * @param {Object} record
 * @param {string=} optNameOfRecord
 * @returns {void}
 */
const assertRecord = (record, optNameOfRecord = 'Alleged record') => {
  const passStyle = passStyleOf(record);
  assert(
    passStyle === 'copyRecord',
    `${optNameOfRecord} ${record} must be a pass-by-copy record, not ${passStyle}`,
  );
};
harden(assertRecord);

const assertRemotable = (
  remotable,
  optNameOfRemotable = 'Alleged remotable',
) => {
  const passStyle = passStyleOf(remotable);
  assert(
    passStyle === 'remotable',
    `${optNameOfRemotable} ${remotable} must be a remotable, not ${passStyle}`,
  );
};
harden(assertRemotable);

export { assertRecord, assertArray, assertRemotable };
