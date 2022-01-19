// @ts-check

import {
  assertChecker,
  getTag,
  makeTagged,
  passStyleOf,
} from '@agoric/marshal';
import {
  compareAntiRank,
  isRankSorted,
  makeFullOrderComparatorKit,
  sortByRank,
} from '../patterns/rankOrder.js';

/// <reference types="ses"/>

const { details: X } = assert;

/**
 * @param {FullCompare} fullCompare
 * @returns {(keys: Key[], check?: Checker) => boolean}
 */
export const makeCheckNoDuplicates = fullCompare => (keys, check = x => x) => {
  keys = sortByRank(keys, fullCompare);
  const { length } = keys;
  for (let i = 1; i < length; i += 1) {
    const k0 = keys[i - 1];
    const k1 = keys[i];
    if (fullCompare(k0, k1) === 0) {
      return check(false, X`value has duplicates: ${k0}`);
    }
  }
  return true;
};

/**
 * TODO SECURITY HAZARD: https://github.com/Agoric/agoric-sdk/issues/4261
 * This creates mutable static state that should be unobservable, since it
 * is only used by checkNoDuplicates in an internal sort algorithm whose
 * result is tested and then dropped. However, that has a bad performance
 * cost. It is not yet clear how to fix this without opening a
 * communications channel.
 */
const fullCompare = makeFullOrderComparatorKit(true).antiComparator;

const checkNoDuplicates = makeCheckNoDuplicates(fullCompare);

/**
 * @param {Passable[]} keys
 * @param {Checker=} check
 * @returns {boolean}
 */
export const checkCopySetKeys = (keys, check = x => x) => {
  if (passStyleOf(keys) !== 'copyArray') {
    return check(
      false,
      X`The keys of a copySet or copyMap must be a copyArray: ${keys}`,
    );
  }
  if (!isRankSorted(keys, compareAntiRank)) {
    return check(
      false,
      X`The keys of a copySet or copyMap must be sorted in reverse rank order: ${keys}`,
    );
  }
  return checkNoDuplicates(keys, check);
};
harden(checkCopySetKeys);

/** @type WeakSet<CopySet<Key>> */
const copySetMemo = new WeakSet();

/**
 * @param {Passable} s
 * @param {Checker=} check
 * @returns {boolean}
 */
export const checkCopySet = (s, check = x => x) => {
  if (copySetMemo.has(s)) {
    return true;
  }
  const result =
    check(
      passStyleOf(s) === 'tagged' && getTag(s) === 'copySet',
      X`Not a copySet: ${s}`,
    ) && checkCopySetKeys(s.payload, check);
  if (result) {
    copySetMemo.add(s);
  }
  return result;
};
harden(checkCopySet);

/**
 * @callback IsCopySet
 * @param {Passable} s
 * @returns {s is CopySet<Key>}
 */

/** @type {IsCopySet} */
export const isCopySet = s => checkCopySet(s);
harden(isCopySet);

/**
 * @callback AssertCopySet
 * @param {Passable} s
 * @returns {asserts s is CopySet<Key>}
 */

/** @type {AssertCopySet} */
export const assertCopySet = s => {
  checkCopySet(s, assertChecker);
};
harden(assertCopySet);

/**
 * @template K
 * @param {CopySet<K>} s
 * @returns {K[]}
 */
export const getCopySetKeys = s => {
  assertCopySet(s);
  return s.payload;
};
harden(getCopySetKeys);

/**
 * @template K
 * @param {CopySet<K>} s
 * @param {(key: K, index: number) => boolean} fn
 * @returns {boolean}
 */
export const everyCopySetKey = (s, fn) =>
  getCopySetKeys(s).every((key, index) => fn(key, index));
harden(everyCopySetKey);

/**
 * @template K
 * @param {Iterable<K>} elements
 * @returns {CopySet<K>}
 */
export const makeCopySet = elements => {
  const result = makeTagged('copySet', sortByRank(elements, compareAntiRank));
  assertCopySet(result);
  return result;
};
harden(makeCopySet);
