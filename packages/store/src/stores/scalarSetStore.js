// @ts-check

import { Far, filterIterable } from '@agoric/marshal';
import { compareRank } from '../patterns/rankOrder.js';
import { assertScalarKey, makeCopySet } from '../keys/checkKey.js';
import { matches, fit, assertPattern } from '../patterns/patternMatchers.js';
import { makeWeakSetStoreMethods } from './scalarWeakSetStore.js';
import { makeCurrentKeysKit } from './store-utils.js';

const { quote: q } = assert;

/**
 * @template K
 * @param {Set<K>} jsset
 * @param {(k: K) => void} assertKeyOkToAdd
 * @param {((k: K) => void)=} assertKeyOkToDelete
 * @param {string=} keyName
 * @returns {SetStore<K>}
 */
export const makeSetStoreMethods = (
  jsset,
  assertKeyOkToAdd,
  assertKeyOkToDelete = undefined,
  keyName = 'key',
) => {
  const {
    assertUpdateOnAdd,
    assertUpdateOnDelete,
    iterableKeys,
  } = makeCurrentKeysKit(
    () => jsset.keys(),
    compareRank,
    assertKeyOkToAdd,
    assertKeyOkToDelete,
    keyName,
  );

  /**
   * @param {Pattern=} keyPatt
   * @returns {Iterable<K>}
   */
  const keys = (keyPatt = undefined) =>
    keyPatt === undefined
      ? iterableKeys
      : filterIterable(iterableKeys, k => matches(k, keyPatt));

  return harden({
    ...makeWeakSetStoreMethods(
      jsset,
      assertUpdateOnAdd,
      assertUpdateOnDelete,
      keyName,
    ),

    keys,

    snapshot: (keyPatt = undefined) => makeCopySet(keys(keyPatt)),

    getSize: (keyPatt = undefined) =>
      keyPatt === undefined ? jsset.size : [...keys(keyPatt)].length,

    clear: (keyPatt = undefined) => {
      if (keyPatt === undefined) {
        jsset.clear();
      }
      for (const key of keys(keyPatt)) {
        jsset.delete(key);
      }
    },
  });
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
  { keyPattern = undefined } = {},
) => {
  const jsset = new Set();
  if (keyPattern !== undefined) {
    assertPattern(keyPattern);
  }

  const assertKeyOkToAdd = key => {
    // TODO: Just a transition kludge. Remove when possible.
    // See https://github.com/Agoric/agoric-sdk/issues/3606
    harden(key);

    assertScalarKey(key);
    if (keyPattern !== undefined) {
      fit(key, keyPattern);
    }
  };

  return Far(`scalar SetStore of ${q(keyName)}`, {
    ...makeSetStoreMethods(jsset, assertKeyOkToAdd, undefined, keyName),
  });
};
harden(makeScalarSetStore);
