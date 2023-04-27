import { assert, Fail, q } from '@agoric/assert';

/**
 * @typedef {bigint|boolean|null|number|string|symbol|undefined} Primitive
 * @typedef {string|number|symbol} PropertyName
 */

/**
 * @template T
 * @template {PropertyName} U
 * @param {T[]} array
 * @param {U[]} keys
 */
export const arrayToObj = (array, keys) => {
  array.length === keys.length || Fail`array and keys must be of equal length`;
  const obj =
    /** @type {Record<U, T>} */
    ({});
  keys.forEach((key, i) => (obj[key] = array[i]));
  return harden(obj);
};

/**
 * Assert all values from `part` appear in `whole`.
 *
 * @param {string[]} whole
 * @param {string[]} part
 */
export const assertSubset = (whole, part) => {
  part.forEach(key => {
    assert.typeof(key, 'string');
    whole.includes(key) ||
      Fail`key ${q(key)} was not one of the expected keys ${q(whole)}`;
  });
};
