import { q } from '@endo/errors';
import {
  Far,
  assertPassable,
  filterIterable,
  mapIterable,
} from '@endo/pass-style';
import { compareRank } from '@endo/marshal';
import {
  assertScalarKey,
  makeCopyMap,
  matches,
  mustMatch,
  assertPattern,
} from '@endo/patterns';
import { makeWeakMapStoreMethods } from './scalarWeakMapStore.js';
import { makeCurrentKeysKit } from './store-utils.js';

/**
 * @import {Passable} from '@endo/pass-style';
 * @import {Key, Pattern} from '@endo/patterns';
 * @import {MapStore, MapStoreMethods, StoreOptions} from '../types.js';
 */

/**
 * @template {Key} K
 * @template {Passable} V
 * @param {Map<K, V>} jsmap
 * @param {(k: K, v: V) => void} assertKVOkToAdd
 * @param {(k: K, v: V) => void} assertKVOkToSet
 * @param {(k: K) => void} [assertKeyOkToDelete]
 * @param {string} [tag]
 * @returns {MapStoreMethods<K, V>}
 */
export const makeMapStoreMethods = (
  jsmap,
  assertKVOkToAdd,
  assertKVOkToSet,
  assertKeyOkToDelete = undefined,
  tag = 'key',
) => {
  const { assertUpdateOnAdd, assertUpdateOnDelete, iterableKeys } =
    makeCurrentKeysKit(
      () => jsmap.keys(),
      k => jsmap.has(k),
      compareRank,
      assertKVOkToAdd,
      assertKeyOkToDelete,
      tag,
    );

  /**
   * @param {Pattern} [keyPatt]
   * @param {Pattern} [valuePatt]
   * @returns {Iterable<K>}
   */
  const keys = (keyPatt = undefined, valuePatt = undefined) => {
    if (keyPatt === undefined && valuePatt === undefined) {
      return iterableKeys;
    }
    const filter = k => {
      if (keyPatt !== undefined && !matches(k, keyPatt)) {
        return false;
      }
      // Uses the current jsmap value, since the iteratator survives `.set`
      if (valuePatt !== undefined && !matches(jsmap.get(k), valuePatt)) {
        return false;
      }
      return true;
    };
    return filterIterable(iterableKeys, filter);
  };

  /**
   * @param {Pattern} [keyPatt]
   * @param {Pattern} [valuePatt]
   * @returns {Iterable<V>}
   */
  const values = (keyPatt = undefined, valuePatt = undefined) =>
    mapIterable(keys(keyPatt, valuePatt), k => /** @type {V} */ (jsmap.get(k)));

  /**
   * @param {Pattern} [keyPatt]
   * @param {Pattern} [valuePatt]
   * @returns {Iterable<[K, V]>}
   */
  const entries = (keyPatt = undefined, valuePatt = undefined) =>
    mapIterable(keys(keyPatt, valuePatt), k => [
      k,
      /** @type {V} */ (jsmap.get(k)),
    ]);

  return harden({
    ...makeWeakMapStoreMethods(
      jsmap,
      /** @type {(k: K, v: V) => void} */ (assertUpdateOnAdd),
      assertKVOkToSet,
      assertUpdateOnDelete,
      tag,
    ),
    keys,
    values,
    entries,

    snapshot: (keyPatt = undefined, valuePatt = undefined) =>
      makeCopyMap(entries(keyPatt, valuePatt)),

    getSize: (keyPatt = undefined, valuePatt = undefined) =>
      keyPatt === undefined && valuePatt === undefined
        ? jsmap.size
        : [...keys(keyPatt, valuePatt)].length,

    clear: (keyPatt = undefined, valuePatt = undefined) => {
      if (keyPatt === undefined && valuePatt === undefined) {
        jsmap.clear();
      }
      for (const key of keys(keyPatt, valuePatt)) {
        jsmap.delete(key);
      }
    },
  });
};

/**
 * Distinguishes between adding a new key (init) and updating or referencing a
 * key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`, `set` and
 * `delete` are only allowed if the key does already exist.
 *
 * This is a _scalar_ map in that the keys can only be atomic values, primitives
 * or remotables. Other storeMaps will accept, for example, copyArrays and
 * copyRecords, as keys and look them up based on equality of their contents.
 *
 * @param {string} [tag] - the column name for the key
 * @param {StoreOptions} [options]
 * @returns {MapStore<any, any>}
 */
export const makeScalarMapStore = (
  tag = 'key',
  { keyShape = undefined, valueShape = undefined } = {},
) => {
  const jsmap = new Map();
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
      mustMatch(value, valueShape, 'mapStore value');
    }
  };

  const assertKVOkToAdd = (key, value) => {
    // TODO: Just a transition kludge. Remove when possible.
    // See https://github.com/Agoric/agoric-sdk/issues/3606
    harden(key);

    assertScalarKey(key);
    if (keyShape !== undefined) {
      mustMatch(key, keyShape, 'mapStore key');
    }
    assertKVOkToSet(key, value);
  };

  return Far(`scalar MapStore of ${q(tag)}`, {
    ...makeMapStoreMethods(
      jsmap,
      assertKVOkToAdd,
      assertKVOkToSet,
      undefined,
      tag,
    ),
  });
};
harden(makeScalarMapStore);
