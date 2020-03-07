// Copyright (C) 2019 Agoric, under Apache license 2.0

import harden from '@agoric/harden';
import { assert, details, openDetail } from '@agoric/assert';

// `sameKey` is the equality comparison used by JavaScript's Map and Set
// abstractions to compare their keys. Its internal JavaScript spec name
// is "SameValueZero". It forms a proper equivalence class that is less
// precise than `Object.is`. Unlike `===`, `sameKey` is an equivalence
// class because `sameKey(NaN, NaN)`. `sameKey` is more precise than
// `Object.is` because `!sameKey(-0, 0)`.
//
// The simple `makeStore` exported by this module makes stores that
// also use `sameKey` equality to compare their keys.
//
// Marshal serializes -0 as zero, so the semantics of our distributed
// object system also does not distinguish 0 from -0.
//
// `sameValueZero` is the EcmaScript spec name for this equality comparison.
// Unlike `===`, `sameKey` is an equivalence class, since
export const sameKey = (a, b) => a === b || Object.is(a, b);

/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `get`,
 * `set` and `delete` are only allowed if the key does already exist.
 * For any of these methods, an expression like `store.get`,
 * extracting the `get` method from a store using dot (`.`), extracts
 * a function that is effectively bound to that store, which can be
 * passed and used elsewhere.
 *
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
