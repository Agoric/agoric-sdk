// Copyright (C) 2019 Agoric, under Apache license 2.0

// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { passStyleOf } from '@agoric/marshal';
import './types.js';

const assertKey = key => {
  harden(key); // TODO: Just a transition kludge. Remove when possible.
  assert.equal(
    passStyleOf(key),
    'remotable',
    X`WeakStores accept only identity-based keys: ${key}`,
  );
};

const assertValue = value => {
  harden(value); // TODO: Just a transition kludge. Remove when possible.
  passStyleOf(value); // asserts that value is passable
};

/**
 * @template K,V
 * @param {string} [keyName='key']
 * @param {Partial<StoreOptions>=} options
 * @returns {StoreWeakMap<K, V>}
 */
export const makeScalarWeakMap = (
  keyName = 'key',
  { longLived = true } = {},
) => {
  const wm = new (longLived ? WeakMap : Map)();
  const assertKeyDoesNotExist = key =>
    assert(!wm.has(key), X`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(wm.has(key), X`${q(keyName)} not found: ${key}`);
  const scalarWeakMap = {
    has: key => {
      // .has is very accepting
      return wm.has(key);
    },
    init: (key, value) => {
      assertKey(key);
      assertValue(value);
      assertKeyDoesNotExist(key);
      wm.set(key, value);
    },
    get: key => {
      assertKeyExists(key);
      return wm.get(key);
    },
    set: (key, value) => {
      assertKeyExists(key);
      assertValue(value);
      wm.set(key, value);
    },
    delete: key => {
      assertKeyExists(key);
      wm.delete(key);
    },
  };
  return harden(scalarWeakMap);
};
harden(makeScalarWeakMap);
