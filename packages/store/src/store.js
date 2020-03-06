// Copyright (C) 2019 Agoric, under Apache license 2.0

import harden from '@agoric/harden';
import { assert, details, openDetail } from '@agoric/assert';

// This is the equality used by JavaScript maps to compare their
// keys. NaN is equal to NaN and -0 is equal to 0.
// The simple store exported by this module uses the same
// equality.
export const mapKeyEqual = (a, b) => a === b || Object.is(a, b);

/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`,
 * `set` and `delete` are only allowed if the key does already exist.
 * @param  {string} keyName - the column name for the key
 */
function makeStore(keyName = 'key') {
  const map = new Map();
  const assertKeyNotBound = key =>
    assert(
      !map.has(key),
      details`${openDetail(keyName)} already registered: ${key}`,
    );
  const assertKeyBound = key =>
    assert(map.has(key), details`${openDetail(keyName)} not found: ${key}`);

  // /////// Methods /////////

  const has = key => map.has(key);
  const init = (key, value) => {
    assertKeyNotBound(key);
    map.set(key, value);
  };
  const get = key => {
    assertKeyBound(key);
    return map.get(key);
  };
  const set = (key, value) => {
    assertKeyBound(key);
    map.set(key, value);
  };
  const deleteIt = key => {
    assertKeyBound(key);
    map.delete(key);
  };
  const keys = () => [...map.keys()];
  const values = () => [...map.values()];
  const entries = () => [...map.entries()];

  const diverge = () => {
    const result = makeStore(keyName);
    for (const [k, v] of entries()) {
      result.init(k, v);
    }
    return result;
  };

  // eslint-disable-next-line no-use-before-define
  const readOnly = () => readOnlyStore;

  const snapshot = () => {
    const snapshotStore = harden({
      ...diverge().readOnly(),
      snapshot: () => snapshotStore,
    });
    return snapshotStore;
  };

  const readOnlyStore = harden({
    diverge,
    readOnly,
    snapshot,
    has,
    get,
    keys,
    values,
    entries,
    [Symbol.iterator]: entries,
  });

  return harden({
    diverge,
    readOnly,
    snapshot,
    has,
    init,
    get,
    set,
    delete: deleteIt,
    keys,
    values,
    entries,
    [Symbol.iterator]: entries,
  });
}
harden(makeStore);
export default makeStore;
