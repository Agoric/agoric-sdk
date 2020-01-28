import harden from '@agoric/harden';

/*
The "Storage API" is a set of functions { has, getKeys, get, set, delete } that
work on string keys and accept string values.  A lot of kernel-side code
expects to get an object which implements the Storage API, which is usually
associated with a write-back buffer wrapper.

The "HostDB API" is a different set of functions { has, getKeys, get,
applyBatch } which the host is expected to provide to the Controller in the
config object. This API allows SwingSet to deliver batches of changes to the
host-side storage medium.

buildHostDBInMemory creates hostDB objects for testing and casual hosts that
can afford to hold all state in RAM. They must arrange to call getState() at
the end of each block and save the resulting string to disk.

A more sophisticated host will build a hostDB that writes changes to disk
directly.
*/

/**
 * Create a new instance of a RAM-based implementation of the Storage API.
 *
 * In addition to the regular storage API, it provides an extra getState()
 * function that returns all the currently stored state as an object.
 *
 * @param initialState  An optional initial state object whose properties are
 *    mapped to state key/value pairs.
 *
 * @return an object: {
 *   storage,  // the storage API object itself
 *   getState, // a function that returns the current state as an object
 *   map       // the underlying map that holds the state in memory
 * }
 *
 * XXX I presume providing the underlying map is just a debug thing?  Should
 * this still be here?
 */
export function buildStorageInMemory(initialState = {}) {
  const state = new Map();

  for (const k of Object.getOwnPropertyNames(initialState)) {
    state.set(k, initialState[k]);
  }

  /**
   * Test if the state contains a value for a given key.
   *
   * @param key  The key that is of interest.
   *
   * @return true if a value is stored for the key, false if not.
   *
   * @throws if key is not a string.
   */
  function has(key) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    return state.has(key);
  }

  /**
   * Generator function that returns an iterator over all the keys within a
   * given range.  Note that this can be slow as it's only intended for use in
   * debugging.
   *
   * @param start  Start of the key range of interest (inclusive)
   * @param end  End of the key range of interest (exclusive)
   *
   * @return an iterator for the keys from start <= key < end
   *
   * @throws if either parameter is not a string.
   */
  function* getKeys(start, end) {
    if (`${start}` !== start) {
      throw new Error(`non-string start ${start}`);
    }
    if (`${end}` !== end) {
      throw new Error(`non-string end ${end}`);
    }

    const keys = Array.from(state.keys()).sort();
    for (const k of keys) {
      if (start <= k && k < end) {
        yield k;
      }
    }
  }

  /**
   * Obtain the value stored for a given key.
   *
   * @param key  The key whose value is sought.
   *
   * @return the (string) value for the given key, or undefined if there is no
   *    such value.
   *
   * @throws if key is not a string.
   */
  function get(key) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    return state.get(key);
  }

  /**
   * Store a value for a given key.  The value will replace any prior value if
   * there was one.
   *
   * @param key  The key whose value is being set.
   * @param value  The value to set the key to.
   *
   * @throws if either parameter is not a string.
   */
  function set(key, value) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    if (`${value}` !== value) {
      throw new Error(`non-string value ${value}`);
    }
    state.set(key, value);
  }

  /**
   * Remove any stored value for a given key.  It is permissible for there to
   * be no existing stored value for the key.
   *
   * @param key  The key whose value is to be deleted
   *
   * @throws if key is not a string.
   */
  function del(key) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    state.delete(key);
  }

  const storage = {
    has,
    getKeys,
    get,
    set,
    delete: del,
  };

  /**
   * Obtain an object representing all the current state, one property per
   * key/value pair.
   */
  function getState() {
    const data = {};
    for (const k of Array.from(state.keys()).sort()) {
      data[k] = state.get(k);
    }
    return data;
  }

  return { storage, getState, map: state };
}

/**
 * Create a new instance of a bare-bones implementation of the HostDB API.
 *
 * @param storage Storage object that the new HostDB object will be based on.
 *    If omitted, defaults to a new in memory store.
 */
export function buildHostDBInMemory(storage) {
  if (!storage) {
    storage = buildStorageInMemory();
  }

  /**
   * Test if the storage contains a value for a given key.
   *
   * @param key  The key that is of interest.
   *
   * @return true if a value is stored for the key, false if not.
   */
  function has(key) {
    return storage.has(key);
  }

  /**
   * Obtain an iterator over all the keys within a given range.
   *
   * @param start  Start of the key range of interest (inclusive)
   * @param end  End of the key range of interest (exclusive)
   *
   * @return an iterator for the keys from start <= key < end
   */
  function getKeys(start, end) {
    return storage.getKeys(start, end);
  }

  /**
   * Obtain the value stored for a given key.
   *
   * @param key  The key whose value is sought.
   *
   * @return the (string) value for the given key, or undefined if there is no
   *    such value.
   */
  function get(key) {
    return storage.get(key);
  }

  /**
   * Make an ordered set of changes to the state that is stored.  The changes
   * are described by a series of change description objects, each of which
   * describes a single change.  There are currently two forms:
   *
   * { op: 'set', key: <KEY>, value: <VALUE> }
   * or
   * { op: 'delete', key: <KEY> }
   *
   * which describe a set or delete operation respectively.
   *
   * @param changes  An array of the changes to be applied in order.
   *
   * @throws if any of the changes are not well formed.
   */
  function applyBatch(changes) {
    // TODO: Note that the parameter checking is done incrementally, thus a
    // malformed change descriptor later in the list will only be discovered
    // after earlier changes have actually been applied, potentially leaving
    // the store in an indeterminate state.  Problem?  I suspect so...
    for (const c of changes) {
      if (`${c.op}` !== c.op) {
        throw new Error(`non-string c.op ${c.op}`);
      }
      if (`${c.key}` !== c.key) {
        throw new Error(`non-string c.key ${c.key}`);
      }
      if (c.op === 'set') {
        if (`${c.value}` !== c.value) {
          throw new Error(`non-string c.value ${c.value}`);
        }
        storage.set(c.key, c.value);
      } else if (c.op === 'delete') {
        storage.delete(c.key);
      } else {
        throw new Error(`unknown c.op ${c.op}`);
      }
    }
  }

  const hostDB = {
    has,
    getKeys,
    get,
    applyBatch,
  };

  return harden(hostDB);
}
