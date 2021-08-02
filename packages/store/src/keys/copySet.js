// @ts-check

import {
  assertChecker,
  getTag,
  isRankSorted,
  makeRankSorted,
  makeTagged,
  passStyleOf,
} from '@agoric/marshal';

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

const { details: X } = assert;

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
  const reverseKeys = harden([...keys].reverse());
  if (!isRankSorted(reverseKeys)) {
    return check(
      false,
      X`The keys of a copySet or copyMap must be sorted in reverse rank order: ${keys}`,
    );
  }
  return true;
};
harden(checkCopySetKeys);

/** @type WeakSet<CopySet> */
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

export const isCopySet = s => checkCopySet(s);
harden(isCopySet);

export const assertCopySet = s => checkCopySet(s, assertChecker);
harden(assertCopySet);

/**
 * @param {CopySet} s
 * @param {(v: Passable, i: number) => boolean} fn
 * @returns {boolean}
 */
export const everyCopySetKey = (s, fn) => {
  assertCopySet(s);
  return s.payload.every((v, i) => fn(v, i));
};
harden(everyCopySetKey);

/**
 * @param {Iterable<Passable>} elements
 * @returns {CopySet}
 */
export const makeCopySet = elements =>
  makeTagged('copySet', [...makeRankSorted(elements)].reverse());
harden(makeCopySet);
