// Copyright (C) 2019 Agoric, under Apache license 2.0

import harden from '@agoric/harden';

import { insist } from '../../insist/src/insist';
/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`,
 * `set` and `delete` are only allowed if the key does already exist.
 * @param  {string} keyName - the column name for the key
 */
function makeStore(keyName = 'key') {
  const wm = new WeakMap();
  const insistKeyDoesNotExist = key =>
    insist(!wm.has(key))([`${keyName} already registered`]);
  const insistKeyExists = key =>
    insist(wm.has(key))([`${keyName} not found: `, ''], key);
  return harden({
    has: key => wm.has(key),
    init: (key, value) => {
      insistKeyDoesNotExist(key);
      wm.set(key, value);
    },
    get: key => {
      insistKeyExists(key);
      return wm.get(key);
    },
    set: (key, value) => {
      insistKeyExists(key);
      wm.set(key, value);
    },
    delete: key => {
      insistKeyExists(key);
      wm.delete(key);
    },
  });
}
harden(makeStore);
export { makeStore };
