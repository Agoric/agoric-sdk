// Copyright (C) 2019 Agoric, under Apache license 2.0

/* global harden */

import { assert, details, q } from '@agoric/assert';

/**
 * @template K,V
 * @typedef {Object} WeakStore - A safety wrapper around a WeakMap
 * @property {(key: K) => boolean} has - Check if a key exists
 * @property {(key: K, value: V) => void} init - Initialize the key only if it doesn't already exist
 * @property {(key: K) => V} get - Return a value for the key. Throws
 * if not found.
 * @property {(key: K, value: V) => void} set - Set the key. Throws if not found.
 * @property {(key: K) => void} delete - Remove the key. Throws if not found.
 */

/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`,
 * `set` and `delete` are only allowed if the key does already exist.
 * @template K,V
 * @param {string} [keyName='key'] - the column name for the key
 * @returns {WeakStore<K,V>}
 */
function makeStore(keyName = 'key') {
  const wm = new WeakMap();
  const assertKeyDoesNotExist = key =>
    assert(!wm.has(key), details`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(wm.has(key), details`${q(keyName)} not found: ${key}`);
  return harden({
    has: key => wm.has(key),
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
}
harden(makeStore);
export default makeStore;
