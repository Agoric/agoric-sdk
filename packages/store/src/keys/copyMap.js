// @ts-check

import {
  assertChecker,
  compareRank,
  getTag,
  sortByRank,
  makeTagged,
  passStyleOf,
} from '@agoric/marshal';
import { checkCopySetKeys } from './copySet.js';

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

const { details: X } = assert;
const { ownKeys } = Reflect;

/** @type WeakSet<CopyMap> */
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
 * @param {CopyMap} m
 * @param {(v: Passable, i: number) => boolean} fn
 * @returns {boolean}
 */
export const everyCopyMapKey = (m, fn) => {
  assertCopyMap(m);
  return m.payload.keys.every((v, i) => fn(v, i));
};
harden(everyCopyMapKey);

/**
 * @param {CopyMap} m
 * @param {(v: Passable, i: number) => boolean} fn
 * @returns {boolean}
 */
export const everyCopyMapValue = (m, fn) => {
  assertCopyMap(m);
  return m.payload.values.every((v, i) => fn(v, i));
};
harden(everyCopyMapValue);

/**
 * @param {CopyMap} m
 * @returns {CopySet}
 */
export const copyMapKeySet = m =>
  // A copyMap's keys are already in the internal form used by copySets.
  makeTagged('copySet', m.payload.keys);
harden(copyMapKeySet);

/**
 * @param {Iterable<[Passable, Passable]>} entries
 * @returns {CopyMap}
 */
export const makeCopyMap = entries => {
  // This is weird, but reverse rank sorting the entries is a good first step
  // for getting the rank sorted keys together with the values
  // organized by those keys. Also, among values associated with
  // keys in the same equivalence class, those are rank sorted. This
  // could solve the copyMap cover issue explained in patternMatchers.js.
  // But only if we include this criteria in our validation of copyMaps,
  // which we currently do not.
  const sortedEntries = [...sortByRank(entries, compareRank)].reverse();
  const keys = sortedEntries.map(([k, _v]) => k);
  const values = sortedEntries.map(([_k, v]) => v);
  return makeTagged('copyMap', { keys, values });
};
harden(makeCopyMap);
