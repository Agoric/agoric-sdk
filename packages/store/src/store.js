// Copyright (C) 2019 Agoric, under Apache license 2.0

import harden from '@agoric/harden';
import { insist } from '@agoric/insist';
/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`,
 * `set` and `delete` are only allowed if the key does already exist.
 * @param  {string} keyName - the column name for the key
 */
function makeStore(keyName = 'key') {
  const store = new Map();
  const insistKeyDoesNotExist = key =>
    insist(!store.has(key))([`${keyName} already registered`]);
  const insistKeyExists = key =>
    insist(store.has(key))([`${keyName} not found: `, ''], key);
  return harden({
    has: key => store.has(key),
    init: (key, value) => {
      insistKeyDoesNotExist(key);
      store.set(key, value);
    },
    get: key => {
      insistKeyExists(key);
      return store.get(key);
    },
    set: (key, value) => {
      insistKeyExists(key);
      store.set(key, value);
    },
    delete: key => {
      insistKeyExists(key);
      store.delete(key);
    },
    keys: () => Array.from(store.keys()),
    values: () => Array.from(store.values()),
  });
}
harden(makeStore);
export default makeStore;
