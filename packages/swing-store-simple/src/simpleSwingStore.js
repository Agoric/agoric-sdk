// @ts-check
import fs from 'fs';
import path from 'path';
import Readlines from 'n-readlines';

import { assert, details as X } from '@agoric/assert';

/**
 * @typedef {{
 *   has: (key: string) => boolean,
 *   getKeys: (start: string, end: string) => Iterable<string>,
 *   get: (key: string) => string | undefined,
 *   set: (key: string, value: string) => void,
 *   delete: (key: string) => void,
 * }} KVStore
 *
 * @typedef {{
 *   appendItem: (name: string, item: string) => void,
 *   readStream: (name: string) => Iterable<string>,
 * }} StreamStore
 *
 * @typedef {{
 *   kvStore: KVStore, // a key-value storage API object to load and store data
 *   streamStore: StreamStore, // a stream-oriented API object to append and read streams of data
 *   commit: () => void,  // commit changes made since the last commit
 *   close: () => void,   // shutdown the store, abandoning any uncommitted changes
 *   diskUsage?: () => number, // optional stats method
 * }} SwingStore
 */

function safeUnlink(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
}

/**
 * Create a new instance of a RAM-based implementation of the Storage API.
 *
 * The "Storage API" is a set of functions { has, getKeys, get, set, delete }
 * that work on string keys and accept string values.  A lot of kernel-side
 * code expects to get an object that implements the Storage API.
 *
 * @returns {{
 *   kvStore: KVStore,  // the storage API object itself
 *   state: any,     // the underlying map that holds the state in memory
 * }}
 */
function makeStorageInMemory() {
  const state = new Map();

  /**
   * Test if the state contains a value for a given key.
   *
   * @param {string} key  The key that is of interest.
   *
   * @returns {boolean} true if a value is stored for the key, false if not.
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
   * given range, in lexicographical order.
   *
   * Note that this can be slow as it's only intended for use in debugging and
   * test result verification.
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
  function* getKeys(start, end) {
    if (`${start}` !== start) {
      throw new Error(`non-string start ${start}`);
    }
    if (`${end}` !== end) {
      throw new Error(`non-string end ${end}`);
    }

    const keys = Array.from(state.keys()).sort();
    for (const k of keys) {
      if ((start === '' || start <= k) && (end === '' || k < end)) {
        yield k;
      }
    }
  }

  /**
   * Obtain the value stored for a given key.
   *
   * @param {string} key  The key whose value is sought.
   *
   * @returns {string|undefined} the (string) value for the given key, or undefined if there is no
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
   * @param {string} key  The key whose value is being set.
   * @param {string} value  The value to set the key to.
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
   * @param {string} key  The key whose value is to be deleted
   *
   * @throws if key is not a string.
   */
  function del(key) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    state.delete(key);
  }

  const kvStore = {
    has,
    getKeys,
    get,
    set,
    delete: del,
  };

  return { kvStore, state };
}

/**
 * Do the work of `initSwingStore` and `openSwingStore`.
 *
 * @param {string} [dirPath]  Path to a directory in which database files may be kept, or
 *   null.
 * @param {boolean} [forceReset]  If true, initialize the database to an empty state
 *
 * @returns {SwingStore}
 */
function makeSwingStore(dirPath, forceReset = false) {
  const { kvStore, state } = makeStorageInMemory();

  let storeFile;
  if (dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
    storeFile = path.resolve(dirPath, 'swingset-kernel-state.jsonlines');
    if (forceReset) {
      safeUnlink(storeFile);
    } else {
      let lines;
      try {
        lines = new Readlines(storeFile);
      } catch (e) {
        // storeFile will be missing the first time we try to use it.  That's OK;
        // commit will create it.
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }
      if (lines) {
        let line = lines.next();
        while (line) {
          // @ts-ignore JSON.parse can take a Buffer
          const [key, value] = JSON.parse(line);
          kvStore.set(key, value);
          line = lines.next();
        }
      }
    }
  }

  /**
   * Commit unsaved changes.
   */
  function commit() {
    if (dirPath) {
      const tempFile = `${storeFile}.tmp`;
      const fd = fs.openSync(tempFile, 'w');

      for (const [key, value] of state.entries()) {
        const line = JSON.stringify([key, value]);
        fs.writeSync(fd, line);
        fs.writeSync(fd, '\n');
      }
      fs.closeSync(fd);
      fs.renameSync(tempFile, storeFile);
    }
  }

  /**
   * Close the "database", abandoning any changes made since the last commit
   * (if you want to save them, call commit() first).
   */
  function close() {
    // Nothing to do here.
  }

  /** @type {Map<string, Array<string>>} */
  const streams = new Map();

  /**
   * Generator function that returns an iterator over the items in a stream.
   *
   * @param {string} streamName  The stream to read
   *
   * @yields {string} an iterator for the items in the named stream
   */
  function* readStream(streamName) {
    /** @type {Array<string>|undefined} */
    const stream = streams.get(streamName);
    if (stream) {
      let pos = 0;
      while (pos < stream.length) {
        const result = stream[pos];
        pos += 1;
        yield result;
      }
    }
  }

  /**
   * Append an item to a stream.
   *
   * @param {string} streamName  The stream to append to
   * @param {string} item  The item to append to it
   */
  function appendItem(streamName, item) {
    assert.typeof(
      streamName,
      'string',
      X`non-string stream name ${streamName}`,
    );
    assert(streamName.match(/^[-\w]+$/));
    let stream = streams.get(streamName);
    if (!stream) {
      stream = [];
      streams.set(streamName, stream);
    }
    stream.push(item);
  }

  const streamStore = { appendItem, readStream };

  return { kvStore, streamStore, commit, close };
}

/**
 * Create a swingset store that is an in-memory map, normally backed by JSON
 * serialized to a text file.  If there is an existing store at the given
 * `dirPath`, it will be reinitialized to an empty state.
 *
 * @param {string=} dirPath  Path to a directory in which database files may be kept.
 *   This directory need not actually exist yet (if it doesn't it will be
 *   created) but it is reserved (by the caller) for the exclusive use of this
 *   swing store instance.  If this is nullish, the swing store created will
 *   have no backing store and thus be non-persistent.
 *
 * @returns {SwingStore}
 */
export function initSwingStore(dirPath) {
  if (dirPath !== null && dirPath !== undefined && `${dirPath}` !== dirPath) {
    throw new Error('dirPath must be a string or nullish');
  }
  return makeSwingStore(dirPath, true);
}

/**
 * Open a swingset store that is an in-memory map, backed by JSON serialized to
 * a text file.  If there is no existing store at the given `dirPath`, a new,
 * empty store will be created.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 *   This directory need not actually exist yet (if it doesn't it will be
 *   created) but it is reserved (by the caller) for the exclusive use of this
 *   swing store instance.
 *
 * @returns {SwingStore}
 */
export function openSwingStore(dirPath) {
  if (`${dirPath}` !== dirPath) {
    throw new Error('dirPath must be a string');
  }
  return makeSwingStore(dirPath, false);
}

/**
 * Produce a representation of all the state found in a swing store.
 *
 * WARNING: This is a helper function intended for use in testing and
 * debugging.  It extracts *everything*, and does so in the simplest and
 * stupidest possible way, hence it is likely to be a performance and memory
 * hog if you attempt to use it on anything real.
 *
 * @param {KVStore} kvStore  The swing storage whose state is to be extracted.
 *
 * @returns {Record<string, string>} an array representing all the current state in `kvStore`, one
 *    element of the form [key, value] per key/value pair.
 */
export function getAllState(kvStore) {
  /** @type { Record<string, string> } */
  const stuff = {};
  for (const key of Array.from(kvStore.getKeys('', ''))) {
    // @ts-ignore get(key) of key from getKeys() is not undefined
    stuff[key] = kvStore.get(key);
  }
  return stuff;
}

/**
 * Stuff a bunch of state into a swing store.
 *
 * WARNING: This is intended to support testing and should not be used as a
 * general store initialization mechanism.  In particular, note that it does
 * not bother to remove any existing state in the store that it is given.
 *
 * @param {KVStore} kvStore  The swing storage whose state is to be set.
 * @param {Array<[string, string]>} stuff  An array of key/value pairs, each element of the form [key, value]
 */
export function setAllState(kvStore, stuff) {
  for (const k of Object.getOwnPropertyNames(stuff)) {
    kvStore.set(k, stuff[k]);
  }
}

/**
 * Is this directory a compatible swing store?
 *
 * @param {string} dirPath  Path to a directory in which database files might be present.
 *   This directory need not actually exist
 *
 * @returns {boolean}
 *   If the directory is present and contains the files created by initSwingStore
 *   or openSwingStore, returns true. Else returns false.
 *
 */
export function isSwingStore(dirPath) {
  if (`${dirPath}` !== dirPath) {
    throw new Error('dirPath must be a string');
  }
  if (fs.existsSync(dirPath)) {
    const storeFile = path.resolve(dirPath, 'swingset-kernel-state.jsonlines');
    if (fs.existsSync(storeFile)) {
      return true;
    }
  }
  return false;
}
