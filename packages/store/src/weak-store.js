// Copyright (C) 2019 Agoric, under Apache license 2.0

// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { isEmptyNonRemotableObject } from './helpers';
import './types';

/**
 * @template {Record<any, any>} K
 * @template {any} V
 * @param {string} [keyName='key']
 * @returns {WeakStore<K, V>}
 */
export function makeWeakStore(keyName = 'key') {
  const wm = new WeakMap();
  const assertKeyDoesNotExist = key =>
    assert(!wm.has(key), X`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(wm.has(key), X`${q(keyName)} not found: ${key}`);
  const assertNotBadKey = key =>
    assert(!isEmptyNonRemotableObject(key), X`${q(keyName)} bad key: ${key}`);
  return harden({
    has: key => {
      assertNotBadKey(key);
      return wm.has(key);
    },
    init: (key, value) => {
      assertNotBadKey(key);
      assertKeyDoesNotExist(key);
      wm.set(key, value);
    },
    get: key => {
      assertNotBadKey(key);
      assertKeyExists(key);
      return wm.get(key);
    },
    set: (key, value) => {
      assertNotBadKey(key);
      assertKeyExists(key);
      wm.set(key, value);
    },
    delete: key => {
      assertNotBadKey(key);
      assertKeyExists(key);
      wm.delete(key);
    },
  });
}
harden(makeWeakStore);
