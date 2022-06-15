import { assert, details as X } from '@agoric/assert';

// XXX Do these "StorageAPI" functions belong in their own package?

/**
 * Assert function to ensure that an object implements the StorageAPI
 * interface: methods { has, getKeys, get, set, delete }
 * (cf. packages/SwingSet/docs/state.md#transactions).
 *
 * @param {*} kvStore  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export function insistStorageAPI(kvStore) {
  for (const n of ['has', 'getKeys', 'get', 'set', 'delete']) {
    assert(n in kvStore, X`kvStore.${n} is missing, cannot use`);
  }
}

/**
 * Assert function to ensure that an object implements the enhanced storage API.
 * (StorageAPI plus methods { enumeratePrefixedKeys, getPrefixedValues,
 * deletePrefixedKeys }), also known as "KVStorePlus".
 *
 * @param {*} kvStore  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export function insistEnhancedStorageAPI(kvStore) {
  insistStorageAPI(kvStore);
  for (const n of [
    'enumeratePrefixedKeys',
    'getPrefixedValues',
    'deletePrefixedKeys',
  ]) {
    assert(n in kvStore, X`kvStore.${n} is missing, cannot use`);
  }
}

/**
 * Given two iterators over sequences of unique strings sorted in ascending
 * order lexicographically by UTF-16 code unit, produce a new iterator that will
 * output the ascending sequence of unique strings from their merged output.
 *
 * @param {Iterator} it1
 * @param {Iterator} it2
 *
 * @yields any
 */
function* mergeUtf16SortedIterators(it1, it2) {
  /** @type {IteratorResult<any> | null} */
  let v1 = null;
  /** @type {IteratorResult<any> | null} */
  let v2 = null;
  /** @type {IteratorResult<any> | null} */
  let vrest = null;
  /** @type {Iterator<any> | null} */
  let itrest = null;

  try {
    v1 = it1.next();
    v2 = it2.next();
    while (!v1.done && !v2.done) {
      if (v1.value < v2.value) {
        const result = v1.value;
        v1 = it1.next();
        yield result;
      } else if (v1.value > v2.value) {
        const result = v2.value;
        v2 = it2.next();
        yield result;
      } else {
        // Each iterator produced the same value; consume it from both.
        const result = v1.value;
        v1 = it1.next();
        v2 = it2.next();
        yield result;
      }
    }

    itrest = v1.done ? it2 : it1;
    vrest = v1.done ? v2 : v1;
    v1 = null;
    v2 = null;

    while (!vrest.done) {
      const result = vrest.value;
      vrest = itrest.next();
      yield result;
    }
  } finally {
    const errors = [];
    try {
      if (vrest && !vrest.done && itrest && itrest.return) {
        itrest.return();
      }
    } catch (e) {
      errors.push(e);
    }
    try {
      if (v1 && !v1.done && it1.return) {
        it1.return();
      }
    } catch (e) {
      errors.push(e);
    }
    try {
      if (v2 && !v2.done && it2.return) {
        it2.return();
      }
    } catch (e) {
      errors.push(e);
    }
    if (errors.length) {
      const err = assert.error(X`Merged iterator failed to close cleanly`);
      for (const e of errors) {
        assert.note(err, X`Caused by ${e}`);
      }
    }
  }
}

/**
 * Create a StorageAPI object that buffers writes to a wrapped StorageAPI object
 * until told to commit (or abort) them.
 *
 * @param {KVStore} kvStore  The StorageAPI object to wrap
 * @param {{
 *   onGet?: (key: string, value: string) => void, // a callback invoked after getting a value from kvStore
 *   onPendingSet?: (key: string, value: string) => void, // a callback invoked after a new uncommitted value is set
 *   onPendingDelete?: (key: string) => void, // a callback invoked after a new uncommitted delete
 *   onCommit?: () => void, // a callback invoked after pending operations have been committed
 *   onAbort?: () => void, // a callback invoked after pending operations have been aborted
 * }?} listeners  Optional callbacks to be invoked when respective events occur
 *
 * @returns {{kvStore: KVStore, commit: () => void, abort: () => void}}
 */
export function makeBufferedStorage(kvStore, listeners = {}) {
  insistStorageAPI(kvStore);

  const { onGet, onPendingSet, onPendingDelete, onCommit, onAbort } = listeners;

  // To avoid confusion, additions and deletions are prevented from sharing
  // the same key at any given time.
  const additions = new Map();
  const deletions = new Set();

  const buffered = {
    has(key) {
      assert.typeof(key, 'string');
      if (additions.has(key)) return true;
      if (deletions.has(key)) return false;
      return kvStore.has(key);
    },
    get(key) {
      assert.typeof(key, 'string');
      if (additions.has(key)) return additions.get(key);
      if (deletions.has(key)) return undefined;
      const value = kvStore.get(key);
      if (onGet !== undefined) onGet(key, value);
      return value;
    },
    set(key, value) {
      assert.typeof(key, 'string');
      additions.set(key, value);
      deletions.delete(key);
      if (onPendingSet !== undefined) onPendingSet(key, value);
    },
    delete(key) {
      assert.typeof(key, 'string');
      additions.delete(key);
      deletions.add(key);
      if (onPendingDelete !== undefined) onPendingDelete(key);
    },

    /**
     * Generator function that returns an iterator over all the keys within a
     * given range, in lexicographical order by UTF-16 code unit.
     *
     * Warning: this function introduces consistency risks that callers must
     * take into account. Results do not include include keys added during
     * iteration.  This layer of abstraction lacks the knowledge necessary to
     * protect callers, as the nature of the risks varies depending on what a
     * caller is trying to do.  This API should not be made available to user
     * vat code.  Rather, it is intended as a low-level mechanism to use in
     * implementating higher level storage abstractions that are expected to
     * provide their own consistency protections as appropriate to their own
     * circumstances.
     *
     * @param {string} start  Start of the key range of interest (inclusive).  An empty
     *    string indicates a range from the beginning of the key set.
     * @param {string} end  End of the key range of interest (exclusive).  An empty string
     *    indicates a range through the end of the key set.
     *
     * @yields {string} an iterator for the keys from start <= key < end
     *
     * @throws if either parameter is not a string.
     */
    *getKeys(start, end) {
      assert.typeof(start, 'string');
      assert.typeof(end, 'string');

      // Merge keys reported by the backing store and a snapshot of in-range
      // additions into a single duplicate-free iterator.
      const added = [];
      for (const k of additions.keys()) {
        if ((start === '' || start <= k) && (end === '' || k < end)) {
          added.push(k);
        }
      }
      // Note that this implicitly compares keys lexicographically by UTF-16
      // code unit (e.g., "\u{1D306}" _precedes_ "\u{FFFD}").
      // If kvStore.getKeys() results are not in ascending order subject to the
      // same comparison, then output may include duplicates.
      added.sort();
      const merged = mergeUtf16SortedIterators(
        added.values(),
        kvStore.getKeys(start, end),
      );

      for (const k of merged) {
        if (!deletions.has(k)) {
          yield k;
        }
      }
    },
  };
  function commit() {
    for (const [key, value] of additions) {
      kvStore.set(key, value);
    }
    for (const key of deletions) {
      kvStore.delete(key);
    }
    additions.clear();
    deletions.clear();
    if (onCommit !== undefined) onCommit();
  }
  function abort() {
    additions.clear();
    deletions.clear();
    if (onAbort !== undefined) onAbort();
  }
  return { kvStore: buffered, commit, abort };
}
