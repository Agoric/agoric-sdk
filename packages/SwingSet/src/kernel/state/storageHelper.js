// @ts-check

import { assert } from '@agoric/assert';

export function* enumeratePrefixedKeys(kvStore, prefix) {
  // return an iterator of all existing keys that start with
  // ${prefix}, in lexicographic order, excluding ${prefix} itself
  let key = prefix;
  for (;;) {
    key = kvStore.getNextKey(key);
    if (!key || !key.startsWith(prefix)) {
      break;
    }
    yield key;
  }
}

// NOTE: awkward naming: the thing that returns a stream of keys is named
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

export function* getPrefixedValues(kvStore, prefix) {
  for (const key of enumerateNumericPrefixedKeys(kvStore, prefix)) {
    yield kvStore.get(key) || assert.fail('enumerate ensures get');
  }
}

export function deletePrefixedKeys(kvStore, prefix) {
  // this is kind of like a deleteRange() would be, but can be implemented
  // efficiently without backend DB support because it only looks at numeric
  // suffixes, in sequential order.
  for (const key of enumerateNumericPrefixedKeys(kvStore, prefix)) {
    kvStore.delete(key);
  }
}
