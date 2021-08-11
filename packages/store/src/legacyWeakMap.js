// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import './types.js';

/**
 * See doccomment in the closely related `legacyMap.js` module.
 *
 * @deprecated switch to ScalarWeakMap if possible, WeakMap otherwise
 * @param {string} [keyName='key'] - the column name for the key
 */
export const makeLegacyWeakMap = (keyName = 'key') => {
  const wm = new WeakMap();
  const assertKeyDoesNotExist = key =>
    assert(!wm.has(key), X`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(wm.has(key), X`${q(keyName)} not found: ${key}`);
  const legacyWeakMap = harden({
    has: key => {
      // Check if a key exists. The key can be any JavaScript value,
      // though the answer will always be false for keys that cannot be found
      // in this map.
      return wm.has(key);
    },
    init: (key, value) => {
      assertKeyDoesNotExist(key);
      wm.set(key, value);
    },
    get: key => {
      assertKeyExists(key);
      return wm.get(key);
    },
    set: (key, value) => {
      assertKeyExists(key);
      wm.set(key, value);
    },
    delete: key => {
      assertKeyExists(key);
      wm.delete(key);
    },
  });
  return legacyWeakMap;
};
harden(makeLegacyWeakMap);
