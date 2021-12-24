// @ts-check

import {
  assertChecker,
  getTag,
  makeTagged,
  passStyleOf,
} from '@agoric/marshal';
import { compareAntiRank, sortByRank } from '../patterns/rankOrder.js';
import { checkCopySetKeys } from './copySet.js';

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

const { details: X } = assert;
const { ownKeys } = Reflect;

/** @type WeakSet<CopyMap<any,any>> */
const copyMapMemo = new WeakSet();

/**
 * @param {Passable} m
 * @param {Checker=} check
 * @returns {boolean}
 */
export const checkCopyMap = (m, check = x => x) => {
  if (copyMapMemo.has(m)) {
    return true;
  }
  if (!(passStyleOf(m) === 'tagged' && getTag(m) === 'copyMap')) {
    return check(false, X`Not a copyMap: ${m}`);
  }
  const { payload } = m;
  if (passStyleOf(payload) !== 'copyRecord') {
    return check(false, X`A copyMap's payload must be a record: ${m}`);
  }
  const { keys, values, ...rest } = payload;
  const result =
    check(
      ownKeys(rest).length === 0,
      X`A copyMap's payload must only have .keys and .values: ${m}`,
    ) &&
    checkCopySetKeys(keys, check) &&
    check(
      passStyleOf(values) === 'copyArray',
      X`A copyMap's .values must be a copyArray: ${m}`,
    ) &&
    check(
      keys.length === values.length,
      X`A copyMap must have the same number of keys and values: ${m}`,
    );
  if (result) {
    copyMapMemo.add(m);
  }
  return result;
};
harden(checkCopyMap);

export const isCopyMap = m => checkCopyMap(m);
harden(isCopyMap);

export const assertCopyMap = m => checkCopyMap(m, assertChecker);
harden(assertCopyMap);

/**
 * @template K,V
 * @param {CopyMap<K,V>} m
 * @returns {K[]}
 */
export const getCopyMapKeys = m => {
  assertCopyMap(m);
  return m.payload.keys;
};
harden(getCopyMapKeys);

/**
 * @template K,V
 * @param {CopyMap<K,V>} m
 * @returns {V[]}
 */
export const getCopyMapValues = m => {
  assertCopyMap(m);
  return m.payload.values;
};
harden(getCopyMapValues);

/**
 * @template K,V
 * @param {CopyMap<K,V>} m
 * @returns {Iterable<[K,V]>}
 */
export const getCopyMapEntries = m => {
  assertCopyMap(m);
  const {
    payload: { keys, values },
  } = m;
  const { length } = keys;
  return harden({
    [Symbol.iterator]: () => {
      let i = 0;
      return harden({
        next: () => {
          /** @type {IteratorResult<[K,V],void>} */
          let result;
          if (i < length) {
            result = harden({ done: false, value: [keys[i], values[i]] });
            i += 1;
            return result;
          } else {
            result = harden({ done: true, value: undefined });
          }
          return result;
        },
      });
    },
  });
};
harden(getCopyMapEntries);

/**
 * @template K,V
 * @param {CopyMap<K,V>} m
 * @param {(key: K, index: number) => boolean} fn
 * @returns {boolean}
 */
export const everyCopyMapKey = (m, fn) =>
  getCopyMapKeys(m).every((key, index) => fn(key, index));
harden(everyCopyMapKey);

/**
 * @template K,V
 * @param {CopyMap<K,V>} m
 * @param {(value: V, index: number) => boolean} fn
 * @returns {boolean}
 */
export const everyCopyMapValue = (m, fn) =>
  getCopyMapValues(m).every((value, index) => fn(value, index));
harden(everyCopyMapValue);

/**
 * @template K,V
 * @param {CopyMap<K,V>} m
 * @returns {CopySet<K>}
 */
export const copyMapKeySet = m =>
  // A copyMap's keys are already in the internal form used by copySets.
  makeTagged('copySet', m.payload.keys);
harden(copyMapKeySet);

/**
 * @template K,V
 * @param {Iterable<[K, V]>} entries
 * @returns {CopyMap<K,V>}
 */
export const makeCopyMap = entries => {
  // This is weird, but reverse rank sorting the entries is a good first step
  // for getting the rank sorted keys together with the values
  // organized by those keys. Also, among values associated with
  // keys in the same equivalence class, those are rank sorted.
  // TODO This
  // could solve the copyMap cover issue explained in patternMatchers.js.
  // But only if we include this criteria in our validation of copyMaps,
  // which we currently do not.
  const sortedEntries = sortByRank(entries, compareAntiRank);
  const keys = sortedEntries.map(([k, _v]) => k);
  const values = sortedEntries.map(([_k, v]) => v);
  return makeTagged('copyMap', { keys, values });
};
harden(makeCopyMap);
