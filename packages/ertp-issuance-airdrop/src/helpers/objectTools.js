/* eslint-disable no-restricted-syntax */
// @ts-check
// @jessie-check

/** @import { ERef } from '@endo/eventual-send'; */
import { q } from '@endo/errors';

/**
 * @template T
 * @param {T | null | undefined} val
 * @param {string} [optDetails]
 * @returns {T}
 */
export const NonNullish = (val, optDetails = `unexpected ${q(val)}`) => {
  if (val != null) {
    // This `!= null` idiom checks that `val` is neither `null` nor `undefined`.
    return val;
  }
  assert.fail(optDetails);
};
harden(NonNullish);

export const compose =
  (...fns) =>
  initialValue =>
    fns.reduceRight((acc, val) => val(acc), initialValue);

const { entries, fromEntries, keys } = Object;

/** @type { <T extends Record<string, ERef<any>>>(obj: T) => Promise<{ [K in keyof T]: Awaited<T[K]>}> } */
export const allValues = async obj => {
  // await keyword below leads to "Nested`await`s are not permitted in Jessiees lint jessie.js/no-nested-await"
  // is this "fine" because allValue is used to start contract and is not present in "every day operations".
  const es = await Promise.all(
    // eslint-disable-next-line @jessie.js/no-nested-await, @jessie.js/safe-await-separator
    entries(obj).map(async ([k, v]) => [k, await v]),
  );
  return fromEntries(es);
};

/** @type { <V, U, T extends Record<string, V>>(obj: T, f: (v: V) => U) => { [K in keyof T]: U }} */
export const mapValues = (obj, f) =>
  fromEntries(
    entries(obj).map(([p, v]) => {
      const entry = [p, f(v)];
      return entry;
    }),
  );

/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
export const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

// What is <T> ?
// head :: [x, ...xs] => x
/** @type {<T>(x: T[]) => T} */
export const head = ([x, ..._xs]) => x;

export const objectToMap = (obj, baggage) =>
  keys(obj).reduce((acc, val) => {
    acc.init(val, obj[val]);
    return acc;
  }, baggage);

export const assign = (a, c) => ({ ...a, ...c });
export const constructObject = (array = []) => array.reduce(assign, {});

export const pair = (a, b) => [b, a];
export const concatenate = (a, o) => ({ ...a, ...o });
