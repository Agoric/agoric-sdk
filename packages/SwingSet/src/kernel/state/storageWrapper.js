// @ts-check

import { assert } from '@agoric/assert';
import { insistStorageAPI, makeBufferedStorage } from '../../lib/storageAPI.js';

/**
 * @typedef { import('../../types-external.js').KVStore } KVStore
 */

// We wrap a provided object implementing StorageAPI methods { has, getKeys,
// get, set, delete } (cf. packages/SwingSet/docs/state.md#transactions) and
// add some convenience methods.

// NOTE: There's a lot of suspenders-and-belt paranoia here because we have to
// be vewy, vewy careful with host-realm objects.  This raises a question
// whether ad hoc paranoia is the best engineering practice.  Also, if it's
// important for users of a parameter to be aware of the potentially suspect
// nature of that parameter, perhaps we should establish some naming convention
// that signals that the object could be foreign and thus deserving of
// xenophobia.

/**
 * Create and return a crank buffer, which wraps a storage object with logic
 * that buffers any mutations until told to commit them.
 *
 * @param {KVStore} kvStore  The StorageAPI object that this crank buffer will be based on.
 * @param {import('../../lib-nodejs/hasher.js').CreateSHA256}  createSHA256
 * @param {(key: string) => 'consensus' | 'local' | 'invalid'} getKeyType
 * @returns {*} an object {
 * crankBuffer,  // crank buffer as described, wrapping `kvStore`
 * commitCrank,  // function to save buffered mutations to `kvStore`
 * abortCrank,   // function to discard buffered mutations
 * }
 */
export function buildCrankBuffer(
  kvStore,
  createSHA256,
  getKeyType = () => 'consensus',
) {
  insistStorageAPI(kvStore);
  let crankhasher;
  function resetCrankhash() {
    crankhasher = createSHA256();
  }
  resetCrankhash();

  const {
    kvStore: crankBuffer,
    commit,
    abort,
  } = makeBufferedStorage(kvStore, {
    onPendingSet(key, value) {
      const keyType = getKeyType(key);
      assert(keyType !== 'invalid');
      if (keyType === 'consensus') {
        crankhasher.add('add');
        crankhasher.add('\n');
        crankhasher.add(key);
        crankhasher.add('\n');
        crankhasher.add(value);
        crankhasher.add('\n');
      }
    },
    onPendingDelete(key) {
      const keyType = getKeyType(key);
      assert(keyType !== 'invalid');
      if (keyType === 'consensus') {
        crankhasher.add('delete');
        crankhasher.add('\n');
        crankhasher.add(key);
        crankhasher.add('\n');
      }
    },
    onAbort: resetCrankhash,
  });

  /**
   * Flush any buffered mutations to the underlying storage, and update the
   * activityhash.
   *
   * @returns {{ crankhash: string, activityhash: string }}
   */
  function commitCrank() {
    // Flush the buffered operations.
    commit();

    // Calculate the resulting crankhash and reset for the next crank.
    const crankhash = crankhasher.finish();
    resetCrankhash();

    // Get the old activityhash directly from (unbuffered) backing storage.
    let oldActivityhash = kvStore.get('activityhash');
    if (oldActivityhash === undefined) {
      oldActivityhash = '';
    }

    // Digest the old activityhash and new crankhash into the new activityhash.
    const hasher = createSHA256();
    hasher.add('activityhash');
    hasher.add('\n');
    hasher.add(oldActivityhash);
    hasher.add('\n');
    hasher.add(crankhash);
    hasher.add('\n');

    // Store the new activityhash directly into (unbuffered) backing storage.
    const activityhash = hasher.finish();
    kvStore.set('activityhash', activityhash);

    return { crankhash, activityhash };
  }

  return harden({ crankBuffer, commitCrank, abortCrank: abort });
}

/**
 * @param {KVStore} kvStore
 */
export function addHelpers(kvStore) {
  insistStorageAPI(kvStore);

  // NOTE: awkward naming: the thing that returns a stream of keys is named
  // "enumerate..." while the thing that returns a stream of values is named
  // "get..."
  function* enumeratePrefixedKeys(prefix, start = 0) {
    // Return an iterator over all existing keys `${prefix}${N}`, for N
    // starting at `start`, in numeric order. This is implemented with
    // has/get rather than any hypothetical DB-specific getRange(start, end)
    // to ensure that results are sorted numerically.
    for (let i = start; true; i += 1) {
      const key = `${prefix}${i}`;
      if (kvStore.has(key)) {
        yield key;
      } else {
        return;
      }
    }
  }

  function* getPrefixedValues(prefix, start = 0) {
    for (const key of enumeratePrefixedKeys(prefix, start)) {
      yield kvStore.get(key) || assert.fail('enumerate ensures get');
    }
  }

  function deletePrefixedKeys(prefix, start = 0) {
    // this is kind of like a deleteRange() would be, but can be implemented
    // efficiently without backend DB support because it only looks at
    // numeric suffixes, in sequential order.
    for (const key of enumeratePrefixedKeys(prefix, start)) {
      kvStore.delete(key);
    }
  }

  return harden({
    enumeratePrefixedKeys,
    getPrefixedValues,
    deletePrefixedKeys,
    ...kvStore,
  });
}

// The "KeeperStorage" API is a set of functions { has, get, set, delete,
// enumeratePrefixedKeys, getPrefixedValues, deletePrefixedKeys }. The Kernel
// Keeper manipulates the saved kernel state through an object that
// implements the KeeperStorage API. That object is usually associated with a
// write-back buffer wrapper (the CrankBuffer), but the keeper is unaware of
// that.

export function wrapStorage(kvStore, createSHA256, getKeyType) {
  insistStorageAPI(kvStore);
  const { crankBuffer, commitCrank, abortCrank } = buildCrankBuffer(
    kvStore,
    createSHA256,
    getKeyType,
  );
  const enhancedCrankBuffer = addHelpers(crankBuffer);
  return { enhancedCrankBuffer, commitCrank, abortCrank };
}
