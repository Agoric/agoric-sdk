// @ts-check

import { deeplyFulfilled } from '@endo/marshal';

// const { entries, fromEntries, keys, values } = Object;
const { entries, fromEntries } = Object;

// Why the `Collect` object? In any case, it was missing a `harden` or `Far`.
// But why not just export the useful functions directly?

// Huh. I didn't know you could put the @template at the bottom.
// See `objectMap` in objArrayConversion.js
// Read the qualifiers in the comment!
/**
 * @param {Record<string, V>} obj
 * @param {(v: V) => U} f
 * @returns {Record<string, U>}
 * @template V
 * @template U
 */
export const mapValues = (obj, f) =>
  harden(fromEntries(entries(obj).map(([p, v]) => [p, f(v)])));
harden(mapValues);

/**
 * @param {X[]} xs
 * @param {Y[]} ys
 * @returns {[X, Y][]}
 * @template X
 * @template Y
 */
export const zip = (xs, ys) => harden(xs.map((x, i) => [x, ys[i]]));
harden(zip);

// Are you sure you only want one level?
// See deeplyFulfilled in deeplyFulfilled.js
// /**
//  * @param {Record<string, ERef<V>>} obj
//  * @returns {Promise<Record<string, V>>}
//  * @template V
//  */
// export const allValues = async obj => {
//   // Get both keys and values before the `await`, so they're consistent
//   // (assuming that `obj` is not a proxy, which we don't validate)
//   const ks = keys(obj);
//   const vs = await Promise.all(values(obj));
//   return harden(fromEntries(zip(ks, vs)));
// };
// harden(allValues);

// This should have worked, but was passed something non-hardened
// export const allValues = deeplyFulfilled;
// So I tried the following instead
export const allValues = obj => deeplyFulfilled(harden(obj));
harden(allValues);

// This didn't work either. Investigating why led to a
// missing `harden` in endo, in the last line of `bundleZipBase64`.
// ```js
//   return { endoZipBase64, moduleFormat: 'endoZipBase64' };
// ```
// should be
// ```js
//   return harden({ endoZipBase64, moduleFormat: 'endoZipBase64' });
// ```
// With this fixed, the second replacement of `allValues` above does
// work.
