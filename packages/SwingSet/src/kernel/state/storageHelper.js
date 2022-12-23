// @ts-check

import { assert } from '@agoric/assert';

// NOTE: awkward naming: the thing that returns a stream of keys is named
// "enumerate..." while the thing that returns a stream of values is named
// "get..."
function* enumeratePrefixedKeys(kvStore, prefix) {
  // Return an iterator over all existing keys `${prefix}${N}`. This is
  // implemented with has/get rather than any hypothetical DB-specific
  // getRange(start, end) to ensure that results are sorted numerically.
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
  for (const key of enumeratePrefixedKeys(kvStore, prefix)) {
    yield kvStore.get(key) || assert.fail('enumerate ensures get');
  }
}

export function deletePrefixedKeys(kvStore, prefix) {
  // this is kind of like a deleteRange() would be, but can be implemented
  // efficiently without backend DB support because it only looks at numeric
  // suffixes, in sequential order.
  for (const key of enumeratePrefixedKeys(kvStore, prefix)) {
    kvStore.delete(key);
  }
}
