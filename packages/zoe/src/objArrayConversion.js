// @ts-check

import { assert, details, q } from '@agoric/assert';

/**
 * @typedef {bigint|boolean|null|number|string|symbol|undefined} Primitive
 */

/**
 * @template T
 * @template {string | number | symbol} U
 * @param {T[]} array
 * @param {U[]} keys
 */
export const arrayToObj = (array, keys) => {
  assert(
    array.length === keys.length,
    details`array and keys must be of equal length`,
  );
  const obj =
    /** @type {Record<U, T>} */
    ({});
  keys.forEach((key, i) => (obj[key] = array[i]));
  return obj;
};

export const assertSubset = (whole, part) => {
  part.forEach(key => {
    assert.typeof(key, 'string');
    assert(
      whole.includes(key),
      details`key ${q(key)} was not one of the expected keys ${q(whole)}`,
    );
  });
};

/**
 * @template T, U
 * @template {keyof T} K
 * @param {Record<K, T>} original
 * @param {(pair: [K, T]) => [K, U]} mapPairFn
 * @returns {Record<K, U>}
 */
export const objectMap = (original, mapPairFn) => {
  const ents = /** @type {[K, T][]} */ (Object.entries(original));
  const mapEnts = ents.map(ent => mapPairFn(ent));
  return /** @type {Record<K, U>} */ (Object.fromEntries(mapEnts));
};
