// Copyright (C) 2019 Agoric, under Apache license 2.0

import harden from '@agoric/harden';
import { assert, details, openDetail } from '@agoric/assert';
import makeWeakStore from '@agoric/weak-store';
import makeStrongStore, { sameKey } from './store';

// The key equality used by the stores exported by this module
// is to compare to arrays element by element using normal
// JavaScript map equality.
// ```js
// sameTrieKey([NaN, 0], [NaN, -0]);
// ```
export const sameTrieKey = (a, b) =>
  a.length === b.length && a.every((v, i) => sameKey(v, b[i]));

// The Pumpkin must not escape. It must be distinct from any value that
// could be passed into this module.
const Pumpkin = harden({});

// Not intended for export; just for internal use.
// `enumerable` should only be true if the `makeStore` argument
// makes enumerable stores.
function makeTrieStoreMaker(makeStore, enumerable = false) {
  /**
   * A trieStore is a *store* (as defined in store.js) whose keys are arrays
   * that are compared and looked up based on element-by-element equality.
   * Internally it uses a trie made of a tree of stores.
   *
   * @param  {string} keyName - the column name for the key
   */
  function makeTrieStore(keyName = 'key') {
    const root = makeStore(keyName);

    // This caches lastStore keyed by the key *identity*.
    // That way, once a given key is dropped, the cache entry gets collected.
    // If the same key identity is reused, such as by a .has followed by a
    // .get, it's fast. Should have no observable effect.
    //
    // Since the cache is *only* for speed, if it actually makes things slower
    // because of WeakMap collection memory pressure, get rid of the cache.
    const lastStoreCache = new WeakMap();

    // If the key is already bound, return the last store in the trie which
    // binds the Pumpkin to the key's current value. Otherwise, return
    // undefined.
    function finalStoreIfKeyBound(key) {
      let cursor;
      if (lastStoreCache.has(key) === key) {
        cursor = lastStoreCache.get(key);
      } else {
        assert(Array.isArray(key), details`trie key must be an array: ${key}`);

        cursor = root;
        for (const element of key) {
          // A "can never happen" that should abort rather than throw
          assert(element !== Pumpkin, details`internal: Pumpkin leaked!`);
          if (!cursor.has(element)) {
            return undefined;
          }
          // cannot error because of .has test
          cursor = cursor.get(element);
        }
        lastStoreCache.set(key, cursor);
      }
      if (!cursor.has(Pumpkin)) {
        return undefined;
      }
      return cursor;
    }

    // Assert that the key is already bound, like assertKeyBound of store.js.
    // Return the last store in the trie which binds the Pumpkin to the key's
    // current value.
    function finalStoreAssertKeyBound(key) {
      const result = finalStoreIfKeyBound(key);
      assert(
        result !== undefined,
        details`${openDetail(keyName)} not found: ${key}`,
      );
      return result;
    }

    // Assert that the key is not already bound, like assertKeyNotBound of
    // store.js.
    // Return the last store in the trie for this key, making it if
    // necessary, in which there is not yet a binding from the Pumpkin to
    // this key's value.
    function finalStoreAssertKeyNotBound(key) {
      let cursor;
      if (lastStoreCache.has(key) === key) {
        cursor = lastStoreCache.get(key);
      } else {
        assert(Array.isArray(key), details`trie key must be an array: ${key}`);

        cursor = root;
        for (const element of key) {
          // A "can never happen" that should abort rather than throw
          assert(element !== Pumpkin, details`internal: Pumpkin leaked!`);
          if (cursor.has(element)) {
            // cannot error because of .has test
            cursor = cursor.get(element);
          } else {
            const nextCursor = makeStore(keyName);
            // cannot error because of .has test
            cursor.init(element, nextCursor);
            cursor = nextCursor;
          }
        }
        lastStoreCache.set(key, cursor);
      }
      assert(
        !cursor.has(Pumpkin),
        details`${openDetail(keyName)} already registered: ${key}`,
      );
      return cursor;
    }

    // /////// Methods /////////

    const has = key => finalStoreIfKeyBound(key) !== undefined;
    const init = (key, value) => {
      const lastStore = finalStoreAssertKeyNotBound(key);
      lastStore.init(Pumpkin, value);
    };
    const get = key => {
      const lastStore = finalStoreAssertKeyBound(key);
      return lastStore.get(Pumpkin);
    };
    const set = (key, value) => {
      const lastStore = finalStoreAssertKeyBound(key);
      lastStore.set(Pumpkin, value);
    };
    const deleteIt = key => {
      const lastStore = finalStoreAssertKeyBound(key);
      lastStore.delete(Pumpkin);
    };

    // eslint-disable-next-line no-use-before-define
    const readOnly = () => readOnlyTrieStore;

    let readOnlyEnumerators = {};
    if (enumerable) {
      const entries = () => {
        const result = [];
        const walk = (prefix, node) => {
          for (const [k, v] of node) {
            if (k === Pumpkin) {
              result.push([prefix, v]);
            } else {
              walk([...prefix, k], v);
            }
          }
        };
        walk([], root);
        return result;
      };
      const keys = () => entries.map(([k, _]) => k);
      const values = () => entries.map(([_, v]) => v);

      const diverge = () => {
        const result = makeTrieStore(keyName);
        for (const [k, v] of entries()) {
          result.init(k, v);
        }
        return result;
      };

      const snapshot = () => {
        const snapshotStore = harden({
          ...diverge().readOnly(),
          snapshot: () => snapshotStore,
        });
        return snapshotStore;
      };

      readOnlyEnumerators = {
        diverge,
        snapshot,
        keys,
        values,
        entries,
        [Symbol.iterator]: entries,
      };
    }

    const readOnlyTrieStore = harden({
      readOnly,
      has,
      get,
      ...readOnlyEnumerators,
    });

    return harden({
      readOnly,
      has,
      init,
      get,
      set,
      delete: deleteIt,
      ...readOnlyEnumerators,
    });
  }
  harden(makeTrieStore);
  return makeTrieStore;
}

export const makeStrongTrieStore = makeTrieStoreMaker(makeStrongStore, true);
// Is this ever useful?
// export const makeWeakTrieStore = makeTrieStoreMaker(makeWeakStore, false);

// A simple store that holds objects weakly and everything else strongly.
// Beware of memory leaks.
function makeMixedStore(keyName = 'key') {
  const strongStore = makeStrongStore(keyName);
  const weakStore = makeWeakStore(keyName);
  const storeFor = key => (Object(key) === key ? weakStore : strongStore);

  return harden({
    has: key => storeFor(key).has(key),
    init: (key, value) => storeFor(key).init(key, value),
    get: key => storeFor(key).get(key),
    set: (key, value) => storeFor(key).set(key, value),
    delete: key => storeFor(key).delete(key),
  });
}

// A trieStore in which each element, if it is an object, is held weakly.
// If the element disappears, so does the subtree rooted in that element.
const makeTrieStore = makeTrieStoreMaker(makeMixedStore, false);
export default makeTrieStore;
