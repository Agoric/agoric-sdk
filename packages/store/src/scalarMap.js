// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { passStyleOf, Far, isObject, assertPassable } from '@agoric/marshal';
import { assertKey } from './keys/keyKind.js';

const isScalar = key => !isObject(key) || passStyleOf(key) === 'remotable';

const assertScalarKey = key => {
  harden(key); // TODO: Just a transition kludge #3606
  assertKey(key);
  assert(isScalar(key), X`Must be scalar: ${key}`);
};

const assertValue = value => {
  // TODO: Just a transition kludge. Remove when possible.
  // See https://github.com/Agoric/agoric-sdk/issues/3606
  harden(value);
  assertPassable(value);
};

/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`,
 * `set` and `delete` are only allowed if the key does already exist.
 *
 * This is a *scalar* map in that the keys can only be atomic values, primitives
 * or remotables. Other storeMaps will accept, for example, copyArrays and
 * copyRecords, as keys and look them up based on equality of their contents.
 *
 * @template K,V
 * @param {string} [keyName='key'] - the column name for the key
 * @param {Partial<StoreOptions>=} _options
 * @returns {Store<K,V>}
 */
export const makeScalarMap = (keyName = 'key', _options = {}) => {
  const m = new Map();
  const assertKeyDoesNotExist = key =>
    assert(!m.has(key), X`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(m.has(key), X`${q(keyName)} not found: ${key}`);
  const scalarMap = Far(`scalarMap of ${q(keyName)}`, {
    has: key => {
      // Check if a key exists. The key can be any JavaScript value,
      // though the answer will always be false for keys that cannot be found
      // in this map.
      return m.has(key);
    },
    init: (key, value) => {
      harden(key); // TODO: Just a transition kludge #3606
      assertScalarKey(key);
      assertValue(value);
      assertKeyDoesNotExist(key);
      m.set(key, value);
    },
    get: key => {
      assertKeyExists(key);
      return m.get(key);
    },
    set: (key, value) => {
      assertKeyExists(key);
      assertValue(value);
      m.set(key, value);
    },
    delete: key => {
      assertKeyExists(key);
      m.delete(key);
    },
    keys: () => Array.from(m.keys()),
    values: () => Array.from(m.values()),
    entries: () => Array.from(m.entries()),
  });
  return scalarMap;
};
harden(makeScalarMap);
