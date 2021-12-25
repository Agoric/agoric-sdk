// @ts-check

import { Far } from '@agoric/marshal';
import { compareRank } from '../patterns/rankOrder.js';
import { assertScalarKey } from '../keys/checkKey.js';
import { makeCopySet } from '../keys/copySet.js';
import { fit, assertPattern } from '../patterns/patternMatchers.js';
import { makeWeakSetStoreMethods } from './scalarWeakSetStore.js';
import { makeCursorKit } from './store-utils.js';

const { details: X, quote: q } = assert;

/**
 * @template K
 * @param {Set<K>} jsset
 * @param {(k: K) => void} assertKeyOkToWrite
 * @param {((k: K) => void)=} assertKeyOkToDelete
 * @param {string=} keyName
 * @returns {SetStore<K>}
 */
export const makeSetStoreMethods = (
  jsset,
  assertKeyOkToWrite,
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
    assertKeyOkToWrite,
    assertKeyOkToDelete,
    keyName,
  );

  const methods = harden({
    ...makeWeakSetStoreMethods(
      jsset,
      assertUpdateOnWrite,
      assertUpdateOnDelete,
      keyName,
    ),

    cursor: (keyPatt = undefined, direction = 'forward') => {
      assert.equal(
        direction,
        'forward',
        X`Non-forward cursors are not yet implemented: map ${q(keyName)}`,
      );
      return makeCursor(jsset.keys(), keyPatt);
    },

    keys: (keyPatt = undefined) => makeArray(jsset.keys(), keyPatt),

    snapshot: (keyPatt = undefined) => makeCopySet(methods.cursor(keyPatt)),

    addAll: copySet => {
      const { payload: keys } = copySet;
      const { length } = keys;
      for (let i = 0; i < length; i += 1) {
        const key = keys[i];
        // Don't assert that the key either does or does not exist.
        assertKeyOkToWrite(key);
        jsset.add(key);
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
 * This is a *scalar* set in that the keys can only be atomic values, primitives
 * or remotables. Other storeSets will accept, for example, copyArrays and
 * copyRecords, as keys and look them up based on equality of their contents.
 *
 * @template K
 * @param {string} [keyName='key'] - the column name for the key
 * @param {Partial<StoreOptions>=} options
 * @returns {SetStore<K>}
 */
export const makeScalarSetStore = (
  keyName = 'key',
  { schema = undefined } = {},
) => {
  const jsset = new Set();
  if (schema) {
    assertPattern(schema);
  }
  const assertKeyOkToWrite = key => {
    // TODO: Just a transition kludge. Remove when possible.
    // See https://github.com/Agoric/agoric-sdk/issues/3606
    harden(key);

    assertScalarKey(key);
    if (schema) {
      fit(key, schema);
    }
  };
  const setStore = Far(`scalar SetStore of ${q(keyName)}`, {
    ...makeSetStoreMethods(jsset, assertKeyOkToWrite, undefined, keyName),
  });
  return setStore;
};
harden(makeScalarSetStore);
