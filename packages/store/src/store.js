// Copyright (C) 2019 Agoric, under Apache license 2.0

// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { passStyleOf, Far } from '@agoric/marshal';
import { mustBeComparable } from '../../same-structure';

const assertKey = (key, passableOnly) => {
  if (passableOnly) {
    harden(key); // TODO: Just a transition kludge. Remove when possible.
    mustBeComparable(key);
    const passStyle = passStyleOf(key);
    switch (passStyle) {
      case 'bigint':
      case 'boolean':
      case 'null':
      case 'number':
      case 'string':
      case 'symbol':
      case 'undefined':
      case 'remotable': {
        return;
      }
      case 'copyArray':
      case 'copyRecord':
      case 'copyError': {
        assert.fail(X`composite keys not yet allowed: ${key}`);
      }
      // case 'promise': is precluded by `mustBeComparable` above
      default: {
        assert.fail(X`unexpected passStyle ${passStyle}`);
      }
    }
  }
};

const assertValue = (value, passableOnly) => {
  if (passableOnly) {
    harden(value); // TODO: Just a transition kludge. Remove when possible.
    passStyleOf(value); // asserts that value is passable
  }
};

/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`,
 * `set` and `delete` are only allowed if the key does already exist.
 *
 * @template K,V
 * @param {string} [keyName='key'] - the column name for the key
 * @param {Partial<StoreOptions>=} options
 * @returns {Store<K,V>}
 */
export function makeStore(keyName = 'key', { passableOnly = true } = {}) {
  const m = new Map();
  const assertKeyDoesNotExist = key =>
    assert(!m.has(key), X`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(m.has(key), X`${q(keyName)} not found: ${key}`);
  return Far('store', {
    has: key => {
      // .has is very accepting
      return m.has(key);
    },
    init: (key, value) => {
      assertKey(key, passableOnly);
      assertValue(value, passableOnly);
      assertKeyDoesNotExist(key);
      m.set(key, value);
    },
    get: key => {
      assertKeyExists(key);
      return m.get(key);
    },
    set: (key, value) => {
      assertKeyExists(key);
      assertValue(value, passableOnly);
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
}
harden(makeStore);
