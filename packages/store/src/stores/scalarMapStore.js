// @ts-check

import { Far, assertPassable } from '@agoric/marshal';
import { compareRank } from '../patterns/rankOrder.js';
import { assertScalarKey } from '../keys/checkKey.js';
import { makeCopyMap } from '../keys/copyMap.js';
import { fit, assertPattern } from '../patterns/patternMatchers.js';
import { makeWeakMapStoreMethods } from './scalarWeakMapStore.js';
import { makeCursorKit } from './store-utils.js';

const { details: X, quote: q } = assert;

/**
 * @template K,V
 * @param {Map<K,V>} jsmap
 * @param {(k: K, v: V) => void} assertKVOkToWrite
 * @param {((k: K) => void)=} assertKeyOkToDelete
 * @param {string=} keyName
 * @returns {MapStore<K,V>}
 */
export const makeMapStoreMethods = (
  jsmap,
  assertKVOkToWrite,
  assertKeyOkToDelete = undefined,
  keyName = 'key',
) => {
  const {
    assertUpdateOnWrite,
    assertUpdateOnDelete,
    makeCursor,
    makeArray,
  } = makeCursorKit(
    compareRank,
    assertKVOkToWrite,
    assertKeyOkToDelete,
    keyName,
  );

  const methods = harden({
    ...makeWeakMapStoreMethods(
      jsmap,
      assertUpdateOnWrite,
      assertUpdateOnDelete,
      keyName,
    ),

    cursor: (entryPatt = undefined, direction = 'forward') => {
      assert.equal(
        direction,
        'forward',
        X`Non-forward cursors are not yet implemented: map ${q(keyName)}`,
      );
      return makeCursor(jsmap.entries(), entryPatt);
    },

    keys: (keyPatt = undefined) => makeArray(jsmap.keys(), keyPatt),
    values: (valPatt = undefined) => makeArray(jsmap.values(), valPatt),
    entries: (entryPatt = undefined) => makeArray(jsmap.entries(), entryPatt),

    snapshot: (entryPatt = undefined) => makeCopyMap(methods.cursor(entryPatt)),

    addAll: copyMap => {
      const {
        payload: { keys, values },
      } = copyMap;
      const { length } = keys;
      for (let i = 0; i < length; i += 1) {
        const key = keys[i];
        const value = values[i];
        // Don't assert that the key either does or does not exist.
        assertUpdateOnWrite(key, value);
        jsmap.set(key, value);
      }
    },
  });
  return methods;
};

/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`,
 * `set` and `delete` are only allowed if the key does already exist.
 *
 * This is a *scalar* map in that the keys can only be atomic values, primitives
 * or remotables. Other storeMaps will accept, for example, copyArrays and
 * copyRecords, as keys and look them up based on equality of their contents.
 *
 * @template K,V
 * @param {string} [keyName='key'] - the column name for the key
 * @param {Partial<StoreOptions>=} options
 * @returns {MapStore<K,V>}
 */
export const makeScalarMapStore = (
  keyName = 'key',
  { schema = undefined } = {},
) => {
  const jsmap = new Map();
  if (schema) {
    assertPattern(schema);
  }
  const assertKVOkToWrite = (key, value) => {
    // TODO: Just a transition kludge. Remove when possible.
    // See https://github.com/Agoric/agoric-sdk/issues/3606
    harden(key);
    harden(value);

    assertScalarKey(key);
    assertPassable(value);
    if (schema) {
      fit(harden([key, value]), schema);
    }
  };
  const mapStore = Far(`scalar MapStore of ${q(keyName)}`, {
    ...makeMapStoreMethods(jsmap, assertKVOkToWrite, undefined, keyName),
  });
  return mapStore;
};
harden(makeScalarMapStore);
