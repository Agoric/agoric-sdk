import { assert, details, q } from '@agoric/assert';

/**
 * @typedef {bigint|boolean|null|number|string|symbol|undefined} Primitive
 */

/**
 * @type {<T extends (Primitive|Function|{})[]>(...args: T) => T}
 */
export const tuple = (...args) => args;

/**
 * @template T
 * @template U
 * @param {T[]} array
 * @param {U[]} keys
 */
export const arrayToObj = (array, keys) => {
  assert(
    array.length === keys.length,
    details`array and keys must be of equal length`,
  );
  /** @type {{[Keyword: U]: T}} */
  const obj = {};
  keys.forEach((key, i) => (obj[key] = array[i]));
  return obj;
};

export const objToArray = (obj, keywords) => {
  const keys = Object.getOwnPropertyNames(obj);
  assert(
    keys.length === keywords.length,
    details`object keys ${q(keys)} and keywords ${q(
      keywords,
    )} must be of equal length`,
  );
  return keywords.map(keyword => obj[keyword]);
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
  const newObj = {};
  subsetKeys.forEach(key => {
    assert(
      obj[key] !== undefined,
      details`obj[key] must be defined for keyword ${q(key)}`,
    );
    newObj[key] = obj[key];
  });
  return newObj;
};

/**
 * Return a new object with only the keys in `amountMathKeywordRecord`, but fill
 * in empty amounts for any key that is undefined in the original allocation
 * @param {Allocation} allocation
 * @param {AmountMathKeywordRecord} amountMathKeywordRecord
 * @returns {Allocation}
 * */
export const filterFillAmounts = (allocation, amountMathKeywordRecord) => {
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
 * @template P, T, U
 * @param {{[P]: T}} original
 * @param {(pair: [P, T]) => [P, U]} mapPairFn
 * @returns {{[P]: U}}
 */
export const objectMap = (original, mapPairFn) =>
  Object.fromEntries(Object.entries(original).map(mapPairFn));
