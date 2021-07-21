// Copyright (C) 2019 Agoric, under Apache license 2.0

import { assert, details as X, q } from '@agoric/assert';

/**
 * @deprecated switch to ScalarMap if possible, Map otherwise
 * @param {string} [keyName='key'] - the column name for the key
 */
export const makeLegacyMap = (keyName = 'key') => {
  const m = new Map();
  const assertKeyDoesNotExist = key =>
    assert(!m.has(key), X`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(m.has(key), X`${q(keyName)} not found: ${key}`);
  const legacyMap = {
    has: key => {
      // .has is very accepting
      return m.has(key);
    },
    init: (key, value) => {
      assertKeyDoesNotExist(key);
      m.set(key, value);
    },
    get: key => {
      assertKeyExists(key);
      return m.get(key);
    },
    set: (key, value) => {
      assertKeyExists(key);
      m.set(key, value);
    },
    delete: key => {
      assertKeyExists(key);
      m.delete(key);
    },
    keys: () => Array.from(m.keys()),
    values: () => Array.from(m.values()),
    entries: () => Array.from(m.entries()),
  };
  return harden(legacyMap);
};
harden(makeLegacyMap);
