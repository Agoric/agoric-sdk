// Copyright (C) 2019 Agoric, under Apache license 2.0

// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { passStyleOf, Far } from '@agoric/marshal';
import './types.js';

const assertKey = (key, passableOnly) => {
  if (passableOnly) {
    harden(key); // TODO: Just a transition kludge. Remove when possible.
    assert.equal(
      passStyleOf(key),
      'remotable',
      X`WeakStores accept only identity-based keys: ${key}`,
    );
  }
};

const assertValue = (value, passableOnly) => {
  if (passableOnly) {
    harden(value); // TODO: Just a transition kludge. Remove when possible.
    passStyleOf(value); // asserts that value is passable
  }
};

/**
 * @template {Record<any, any>} K
 * @template {any} V
 * @param {string} [keyName='key']
 * @param {Partial<WeakStoreOptions>=} options
 * @returns {WeakStore<K, V>}
 */
export function makeWeakStore(
  keyName = 'key',
  { longLived = true, passableOnly = true } = {},
) {
  const wm = new (longLived ? WeakMap : Map)();
  const assertKeyDoesNotExist = key =>
    assert(!wm.has(key), X`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(wm.has(key), X`${q(keyName)} not found: ${key}`);
  return Far('weakStore', {
    has: key => {
      // .has is very accepting
      return wm.has(key);
    },
    init: (key, value) => {
      assertKey(key, passableOnly);
      assertValue(value, passableOnly);
      assertKeyDoesNotExist(key);
      wm.set(key, value);
    },
    get: key => {
      assertKeyExists(key);
      return wm.get(key);
    },
    set: (key, value) => {
      assertKeyExists(key);
      assertValue(value, passableOnly);
      wm.set(key, value);
    },
    delete: key => {
      assertKeyExists(key);
      wm.delete(key);
    },
  });
}
harden(makeWeakStore);
