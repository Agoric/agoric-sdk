import { q } from '@endo/errors';
import { Far, filterIterable } from '@endo/pass-style';
import { compareRank } from '@endo/marshal';
import {
  assertScalarKey,
  makeCopySet,
  matches,
  mustMatch,
  assertPattern,
} from '@endo/patterns';
import { makeWeakSetStoreMethods } from './scalarWeakSetStore.js';
import { makeCurrentKeysKit } from './store-utils.js';

/**
 * @import {Key, Pattern} from '@endo/patterns';
 * @import {SetStore, SetStoreMethods, StoreOptions} from '../types.js';
 */

/**
 * @template {Key} K
 * @param {Set<K>} jsset
 * @param {(k: K) => void} assertKeyOkToAdd
 * @param {(k: K) => void} [assertKeyOkToDelete]
 * @param {string} [keyName]
 * @returns {SetStoreMethods<K>}
 */
export const makeSetStoreMethods = (
  jsset,
  assertKeyOkToAdd,
  assertKeyOkToDelete = undefined,
  keyName = 'key',
) => {
  const { assertUpdateOnAdd, assertUpdateOnDelete, iterableKeys } =
    makeCurrentKeysKit(
      () => jsset.keys(),
      k => jsset.has(k),
      compareRank,
      assertKeyOkToAdd,
      assertKeyOkToDelete,
      keyName,
    );

  /**
   * @param {Pattern} [keyPatt]
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

    values: keys,

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
 * Distinguishes between adding a new key (init) and updating or referencing a
 * key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`, `set` and
 * `delete` are only allowed if the key does already exist.
 *
 * This is a _scalar_ set in that the keys can only be atomic values, primitives
 * or remotables. Other storeSets will accept, for example, copyArrays and
 * copyRecords, as keys and look them up based on equality of their contents.
 *
 * @template K
 * @param {string} [tag] - tag for debugging
 * @param {StoreOptions} [options]
 * @returns {SetStore<K>}
 */
export const makeScalarSetStore = (
  tag = 'key',
  { keyShape = undefined } = {},
) => {
  const jsset = new Set();
  if (keyShape !== undefined) {
    assertPattern(keyShape);
  }

  const assertKeyOkToAdd = key => {
    // TODO: Just a transition kludge. Remove when possible.
    // See https://github.com/Agoric/agoric-sdk/issues/3606
    harden(key);

    assertScalarKey(key);
    if (keyShape !== undefined) {
      mustMatch(key, keyShape, 'setStore key');
    }
  };

  return Far(`scalar SetStore of ${q(tag)}`, {
    ...makeSetStoreMethods(jsset, assertKeyOkToAdd, undefined, tag),
  });
};
harden(makeScalarSetStore);
