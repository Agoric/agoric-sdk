// Copyright (C) 2019 Agoric, under Apache license 2.0

/* global harden */
// @ts-check

import { assert, details, q } from '@agoric/assert';

/**
 * @template K,V
 * @typedef {Object} Store - A safety wrapper around a Map
 * @property {(key: K) => boolean} has - Check if a key exists
 * @property {(key: K, value: V) => void} init - Initialize the key only if it doesn't already exist
 * @property {(key: K) => V} get - Return a value for the key. Throws
 * if not found.
 * @property {(key: K, value: V) => void} set - Set the key. Throws if not found.
 * @property {(key: K) => void} delete - Remove the key. Throws if not found.
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
 * @param  {string} [keyName='key'] - the column name for the key
 * @returns {Store<K,V>}
 */
export const makeStore = harden((keyName = 'key') => {
  const map = new Map();
  const assertKeyDoesNotExist = key =>
    assert(!map.has(key), details`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(map.has(key), details`${q(keyName)} not found: ${key}`);

  // ********* Query methods ************

  // eslint-disable-next-line no-use-before-define
  const readOnlyView = () => storeReadOnlyFacet;
  // TODO snapshot, diverge
  // See https://github.com/tc39/proposal-readonly-collections

  const has = key => map.has(key);
  const get = key => {
    assertKeyExists(key);
    return map.get(key);
  };

  const keys = () => Array.from(map.keys());
  const values = () => Array.from(map.values());
  const entries = () => Array.from(map.entries());

  // ********* Update methods ************

  const init = (key, value) => {
    assertKeyDoesNotExist(key);
    map.set(key, value);
  };
  const set = (key, value) => {
    assertKeyExists(key);
    map.set(key, value);
  };
  const deleteIt = key => {
    assertKeyExists(key);
    map.delete(key);
  };

  // ********* Facets ************

  const storeReadOnlyFacet = harden({
    readOnlyView,
    has,
    get,

    keys,
    values,
    entries,
  });

  const store = harden({
    readOnlyView,
    has,
    get,

    keys,
    values,
    entries,

    init,
    set,
    delete: deleteIt,
  });
  return store;
});
