/**
 * @import { KVStore } from '@agoric/swing-store'
 */

// Vendor until https://github.com/endojs/endo/pull/2008 is merged
// then we can import the endo implementation.
const compareByCodePoints = (left, right) => {
  const leftIter = left[Symbol.iterator]();
  const rightIter = right[Symbol.iterator]();
  for (;;) {
    const { value: leftChar } = leftIter.next();
    const { value: rightChar } = rightIter.next();
    if (leftChar === undefined && rightChar === undefined) {
      return 0;
    } else if (leftChar === undefined) {
      // left is a prefix of right.
      return -1;
    } else if (rightChar === undefined) {
      // right is a prefix of left.
      return 1;
    }
    const leftCodepoint = /** @type {number} */ (leftChar.codePointAt(0));
    const rightCodepoint = /** @type {number} */ (rightChar.codePointAt(0));
    if (leftCodepoint < rightCodepoint) return -1;
    if (leftCodepoint > rightCodepoint) return 1;
  }
};

/**
 * @param {Map<string, string>} map
 */
export function makeKVStoreFromMap(map) {
  let sortedKeys;
  let priorKeyReturned;
  let priorKeyIndex;

  function ensureSorted() {
    if (!sortedKeys) {
      sortedKeys = [];
      for (const key of map.keys()) {
        sortedKeys.push(key);
      }
      sortedKeys.sort(compareByCodePoints);
    }
  }

  function clearGetNextKeyCache() {
    priorKeyReturned = undefined;
    priorKeyIndex = -1;
  }
  clearGetNextKeyCache();

  function clearSorted() {
    sortedKeys = undefined;
    clearGetNextKeyCache();
  }

  /** @type {KVStore} */
  const fakeStore = harden({
    has(key) {
      return map.has(key);
    },
    get(key) {
      return map.get(key);
    },
    getNextKey(priorKey) {
      assert.typeof(priorKey, 'string');
      ensureSorted();
      // TODO: binary search for priorKey (maybe missing), then get
      // the one after that. For now we go simple and slow. But cache
      // a starting point, because the main use case is a full
      // iteration. OTOH, the main use case also deletes everything,
      // which will clobber the cache on each deletion, so it might
      // not help.
      const start = priorKeyReturned === priorKey ? priorKeyIndex : 0;
      let result;
      for (let i = start; i < sortedKeys.length; i += 1) {
        const key = sortedKeys[i];
        if (compareByCodePoints(key, priorKey) > 0) {
          priorKeyReturned = key;
          priorKeyIndex = i;
          result = key;
          break;
        }
      }
      if (!result) {
        // reached end without finding the key, so clear our cache
        clearGetNextKeyCache();
      }
      return result;
    },
    set(key, value) {
      if (!map.has(key)) {
        clearSorted();
      }
      map.set(key, value);
    },
    delete(key) {
      if (map.has(key)) {
        clearSorted();
      }
      map.delete(key);
    },
  });
  return fakeStore;
}
