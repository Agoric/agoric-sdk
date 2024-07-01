import { q, Fail } from '@endo/errors';
import { Far, assertPassable, passStyleOf } from '@endo/pass-style';
import {
  getCopyMapEntries,
  mustMatch,
  assertPattern,
  isCopyMap,
} from '@endo/patterns';

/**
 * @import {Key} from '@endo/patterns';
 * @import {Passable, RemotableObject} from '@endo/pass-style';
 * @import {WeakMapStore, StoreOptions} from '../types.js';
 */

/**
 * @template {Key} K
 * @template {Passable} V
 * @param {WeakMap<K & object, V>} jsmap
 * @param {(k: K, v: V) => void} assertKVOkToAdd
 * @param {(k: K, v: V) => void} assertKVOkToSet
 * @param {(k: K) => void} [assertKeyOkToDelete]
 * @param {string} [keyName]
 * @returns {WeakMapStore<K, V>}
 */
export const makeWeakMapStoreMethods = (
  jsmap,
  assertKVOkToAdd,
  assertKVOkToSet,
  assertKeyOkToDelete = undefined,
  keyName = 'key',
) => {
  const assertKeyDoesNotExist = key =>
    !jsmap.has(key) || Fail`${q(keyName)} already registered: ${key}`;

  const assertKeyExists = key =>
    jsmap.has(key) || Fail`${q(keyName)} not found: ${key}`;

  return harden({
    has: key => {
      // Check if a key exists. The key can be any JavaScript value,
      // though the answer will always be false for keys that cannot be found
      // in this map.
      return jsmap.has(key);
    },
    get: key => {
      assertKeyExists(key);
      // How to tell typescript I believe the `get` will succeed.
      return /** @type {V} */ (jsmap.get(key));
    },

    init: (key, value) => {
      assertKeyDoesNotExist(key);
      assertKVOkToAdd(key, value);
      jsmap.set(key, value);
    },
    set: (key, value) => {
      assertKeyExists(key);
      assertKVOkToSet(key, value);
      jsmap.set(key, value);
    },
    delete: key => {
      assertKeyExists(key);
      if (assertKeyOkToDelete !== undefined) {
        assertKeyOkToDelete(key);
      }
      jsmap.delete(key);
    },

    addAll: entries => {
      if (typeof entries[Symbol.iterator] !== 'function') {
        if (Object.isFrozen(entries) && isCopyMap(entries)) {
          // @ts-expect-error XXX
          entries = getCopyMapEntries(entries);
        } else {
          Fail`provided data source is not iterable: ${entries}`;
        }
      }
      for (const [key, value] of /** @type {Iterable<[K, V]>} */ (entries)) {
        // Don't assert that the key either does or does not exist.
        assertKVOkToAdd(key, value);
        jsmap.set(key, value);
      }
    },
  });
};

/**
 * This is a _scalar_ mapStore in that the keys can only be atomic values:
 * primitives or remotables. Other mapStores will accept, for example,
 * copyArrays and copyRecords as keys and look them up based on equality of
 * their contents.
 *
 * TODO For now, this scalarWeakMap accepts only remotables, reflecting the
 * constraints of the underlying JavaScript WeakMap it uses internally. But it
 * should accept the primitives as well, storing them in a separate internal
 * map. What makes it "weak" is that it provides no API for enumerating what's
 * there. Though note that this would only enables collection of the remotables,
 * since the other primitives may always reappear.
 *
 * @template K,V
 * @param {string} [tag] - tag for debugging
 * @param {StoreOptions} [options]
 * @returns {RemotableObject & WeakMapStore<K, V>}
 */
export const makeScalarWeakMapStore = (
  tag = 'key',
  { longLived = true, keyShape = undefined, valueShape = undefined } = {},
) => {
  const jsmap = new (longLived ? WeakMap : Map)();
  if (keyShape !== undefined) {
    assertPattern(keyShape);
  }
  if (valueShape !== undefined) {
    assertPattern(valueShape);
  }

  const assertKVOkToSet = (_key, value) => {
    // TODO: Just a transition kludge. Remove when possible.
    // See https://github.com/Agoric/agoric-sdk/issues/3606
    harden(value);

    assertPassable(value);
    if (valueShape !== undefined) {
      mustMatch(value, valueShape, 'weakMapStore value');
    }
  };

  const assertKVOkToAdd = (key, value) => {
    // TODO: Just a transition kludge. Remove when possible.
    // See https://github.com/Agoric/agoric-sdk/issues/3606
    harden(key);
    passStyleOf(key) === 'remotable' ||
      Fail`Only remotables can be keys of scalar WeakMapStores: ${key}`;
    if (keyShape !== undefined) {
      mustMatch(key, keyShape, 'weakMapStore key');
    }
    assertKVOkToSet(key, value);
  };

  return Far(`scalar WeakMapStore of ${q(tag)}`, {
    ...makeWeakMapStoreMethods(
      jsmap,
      assertKVOkToAdd,
      assertKVOkToSet,
      undefined,
      tag,
    ),
  });
};
harden(makeScalarWeakMapStore);
