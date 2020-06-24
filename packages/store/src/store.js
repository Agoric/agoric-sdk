// Copyright (C) 2019 Agoric, under Apache license 2.0
// @ts-check

import rawHarden from '@agoric/harden';
import { assert, details, q } from '@agoric/assert';

const harden = /** @type {<T>(x: T) => T} */ (rawHarden);

/**
 * @template K,V
 * @typedef {Object} Store - A wrapper around a Map
 * @property {(key: K) => boolean} has - Check if a key exists
 * @property {(key: K, value: V) => void} init - Initialize the key only if it doesn't already exist
 * @property {(key: K) => V} get - Return a value for the key. Throws
 * if not found.
 * @property {(key: K, value: V) => void} set - Unconditionally set the key
 * @property {(key: K) => void} delete - Remove the key
 * @property {() => K[]} keys - Return an array of keys
 * @property {() => V[]} values - Return an array of values
 * @property {() => [K, V][]} entries - Return an array of entries
 */

/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`,
 * `set` and `delete` are only allowed if the key does already exist.
 * @template K,V
 * @param  {string} keyName - the column name for the key
 * @returns {Store.<K,V>}
 */
function makeStore(keyName = 'key') {
  const store = new Map();
  const assertKeyDoesNotExist = key =>
    assert(!store.has(key), details`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(store.has(key), details`${q(keyName)} not found: ${key}`);
  return harden({
    has: key => store.has(key),
    init: (key, value) => {
      assertKeyDoesNotExist(key);
      store.set(key, value);
    },
    get: key => {
      assertKeyExists(key);
      return store.get(key);
    },
    set: (key, value) => {
      assertKeyExists(key);
      store.set(key, value);
    },
    delete: key => {
      assertKeyExists(key);
      store.delete(key);
    },
    keys: () => Array.from(store.keys()),
    values: () => Array.from(store.values()),
    entries: () => Array.from(store.entries()),
  });
}
harden(makeStore);
export default makeStore;
