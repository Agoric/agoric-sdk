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
 * Return a new object with only the keys in subsetKeys.
 * `obj` must have values for all the `subsetKeys`.
 * @template T
 * @template {(keyof T)[]} U
 * @param {T} obj
 * @param {U} subsetKeys
 * @returns {Pick<T,U[number]>}
 */
export const filterObj = (obj, subsetKeys) => {
  /** @type {Partial<Pick<T,U[number]>>} */
  const newObj = {};
  subsetKeys.forEach(key => {
    assert(
      obj[key] !== undefined,
      details`obj[key] must be defined for keyword ${q(key)}`,
    );
    newObj[key] = obj[key];
  });

  const picked = /** @type {Pick<T,U[number]>} */ (newObj);
  return picked;
};

/**
 * Return a new object with only the keys in `amountMathKeywordRecord`, but fill
 * in empty amounts for any key that is undefined in the original allocation
 * @param {Allocation} allocation
 * @param {AmountMathKeywordRecord} amountMathKeywordRecord
 * @returns {Allocation}
 * */
export const filterFillAmounts = (allocation, amountMathKeywordRecord) => {
  /** @type {Allocation} */
  const filledAllocation = {};
  const subsetKeywords = Object.getOwnPropertyNames(amountMathKeywordRecord);
  subsetKeywords.forEach(keyword => {
    if (allocation[keyword] === undefined) {
      filledAllocation[keyword] = amountMathKeywordRecord[keyword].getEmpty();
    } else {
      filledAllocation[keyword] = allocation[keyword];
    }
  });
  return filledAllocation;
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
