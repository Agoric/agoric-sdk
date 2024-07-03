// @ts-check

import { Fail } from '@endo/errors';

/**
 * Iterate over keys with a given prefix, in lexicographic order,
 * excluding an exact match of the prefix.
 *
 * @param {KVStore} kvStore
 * @param {string} prefix
 * @param {string} [exclusiveEnd]
 * @yields {string} the next key with the prefix that is not >= exclusiveEnd
 */
export function* enumeratePrefixedKeys(kvStore, prefix, exclusiveEnd) {
  /** @type {string | undefined} */
  let key = prefix;
  for (;;) {
    key = kvStore.getNextKey(key);
    if (!key || !key.startsWith(prefix)) {
      break;
    }
    if (exclusiveEnd && key >= exclusiveEnd) {
      break;
    }
    yield key;
  }
}
harden(enumeratePrefixedKeys);

/**
 * @param {KVStore} kvStore
 * @param {string} prefix
 */ // NOTE: awkward naming: the thing that returns a stream of keys is named
// "enumerate..." while the thing that returns a stream of values is named
// "get..."
function* enumerateNumericPrefixedKeys(kvStore, prefix) {
  // Return an iterator over all existing keys `${prefix}${N}`, in
  // numerical order. This is implemented with has/get rather than
  // getNextKey() to ensure that results are sorted numerically.
  for (let i = 0; true; i += 1) {
    const key = `${prefix}${i}`;
    if (kvStore.has(key)) {
      yield key;
    } else {
      return;
    }
  }
}
harden(enumerateNumericPrefixedKeys);

/**
 * @param {KVStore} kvStore
 * @param {string} prefix
 */
export function* getPrefixedValues(kvStore, prefix) {
  for (const key of enumerateNumericPrefixedKeys(kvStore, prefix)) {
    yield kvStore.get(key) || Fail`enumerate ensures get`;
  }
}
harden(getPrefixedValues);

/**
 * @param {KVStore} kvStore
 * @param {string} prefix
 */
export function deletePrefixedKeys(kvStore, prefix) {
  // this is kind of like a deleteRange() would be, but can be implemented
  // efficiently without backend DB support because it only looks at numeric
  // suffixes, in sequential order.
  for (const key of enumerateNumericPrefixedKeys(kvStore, prefix)) {
    kvStore.delete(key);
  }
}
