import { initSwingStore } from '@agoric/swing-store-simple';

import { assert, details as X } from '@agoric/assert';

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
 * Create a new instance of a bare-bones implementation of the HostDB API.
 *
 * @param {Storage} storage Storage object that the new HostDB object will be based on.
 *    If omitted, defaults to a new in memory store.
 */
export function buildHostDBInMemory(storage) {
  if (!storage) {
    storage = initSwingStore().store;
  }

  /**
   * Test if the storage contains a value for a given key.
   *
   * @param {string} key  The key that is of interest.
   *
   * @returns {boolean} true if a value is stored for the key, false if not.
   */
  function has(key) {
    return storage.has(key);
  }

  /**
   * Obtain an iterator over all the keys within a given range.
   *
   * @param {string} start  Start of the key range of interest (inclusive)
   * @param {string} end  End of the key range of interest (exclusive)
   *
   * @returns {Iterable<string>} an iterator for the keys from start <= key < end
   */
  function getKeys(start, end) {
    return storage.getKeys(start, end);
  }

  /**
   * Obtain the value stored for a given key.
   *
   * @param {string} key  The key whose value is sought.
   *
   * @returns {string=} the (string) value for the given key, or undefined if there is no
   *    such value.
   */
  function get(key) {
    return storage.get(key);
  }

  /**
   * @typedef {Object} SetOperation
   * @property {'set'} op
   * @property {string} key
   * @property {string} value
   */

  /**
   * @typedef {Object} DeleteOperation
   * @property {'delete'} op
   * @property {string} key
   */

  /**
   * Make an ordered set of changes to the state that is stored.  The changes
   * are described by a series of change description objects, each of which
   * describes a single change.  There are currently two forms:
   *
   * { op: 'set', key: <KEY>, value: <VALUE> }
   * or
   * { op: 'delete', key: <KEY> }
   * which describe a set or delete operation respectively.
   *
   * @param {Array<SetOperation|DeleteOperation>} changes  An array of the changes to be applied in order.
   * @throws {Error} if any of the changes are not well formed.
   */
  function applyBatch(changes) {
    // TODO: Note that the parameter checking is done incrementally, thus a
    // malformed change descriptor later in the list will only be discovered
    // after earlier changes have actually been applied, potentially leaving
    // the store in an indeterminate state.  Problem?  I suspect so...
    for (const c of changes) {
      assert(`${c.op}` === c.op, X`non-string c.op ${c.op}`);
      assert(`${c.key}` === c.key, X`non-string c.key ${c.key}`);
      if (c.op === 'set') {
        assert(`${c.value}` === c.value, X`non-string c.value ${c.value}`);
        storage.set(c.key, c.value);
      } else if (c.op === 'delete') {
        storage.delete(c.key);
      } else {
        assert.fail(X`unknown c.op ${c.op}`);
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
