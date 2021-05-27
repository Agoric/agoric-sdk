// @ts-check
import fs from 'fs';
import path from 'path';
import Readlines from 'n-readlines';

import { assert, details as X, q } from '@agoric/assert';

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
 *   offset?: number,
 *   itemCount?: number,
 * }} StreamPosition
 *
 * @typedef {{
 *   writeStreamItem: (streamName: string, item: string, position: StreamPosition) => StreamPosition,
 *   readStream: (streamName: string, startPosition: StreamPosition, endPosition: StreamPosition) => Iterable<string>,
 *   closeStream: (streamName: string) => void,
 *   STREAM_START: StreamPosition,
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
    assert.typeof(key, 'string');
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
    assert.typeof(start, 'string');
    assert.typeof(end, 'string');

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
    assert.typeof(key, 'string');
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
    assert.typeof(key, 'string');
    assert.typeof(value, 'string');
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
    assert.typeof(key, 'string');
    state.delete(key);
  }

  const kvStore = {
    has,
    getKeys,
    get,
    set,
    delete: del,
  };

  return harden({ kvStore, state });
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
  /** @type {Map<string, string>} */
  const streamStatus = new Map();
  let statusCounter = 0;

  const STREAM_START = harden({ itemCount: 0 });

  function insistStreamName(streamName) {
    assert.typeof(streamName, 'string');
    assert(
      streamName.match(/^[-\w]+$/),
      X`invalid stream name ${q(streamName)}`,
    );
  }

  function insistStreamPosition(position) {
    assert.typeof(position.itemCount, 'number');
    assert(position.itemCount >= 0);
  }

  /**
   * Close a stream that's open for read or write.
   *
   * @param {string} streamName  The stream to close
   */
  function closeStream(streamName) {
    insistStreamName(streamName);
    streamStatus.delete(streamName);
  }

  /**
   * Generator function that returns an iterator over the items in a stream.
   *
   * @param {string} streamName  The stream to read
   * @param {Object} startPosition  The position to start reading from
   * @param {Object} endPosition  The position of the end of the stream
   *
   * @yields {string} an iterator for the items in the named stream
   */
  function readStream(streamName, startPosition, endPosition) {
    insistStreamName(streamName);
    const stream = streams.get(streamName) || [];
    assert(
      !streamStatus.get(streamName),
      X`can't read stream ${q(streamName)} because it's already in use`,
    );
    insistStreamPosition(startPosition);
    insistStreamPosition(endPosition);
    assert(startPosition.itemCount <= endPosition.itemCount);

    if (endPosition.itemCount === 0) {
      return [];
    } else {
      const readStatus = `read-${statusCounter}`;
      statusCounter += 1;
      streamStatus.set(streamName, readStatus);
      stream.length = endPosition.itemCount;
      let pos = startPosition.itemCount;
      function* reader() {
        while (pos < stream.length) {
          assert(
            streamStatus.get(streamName) === readStatus,
            X`can't read stream ${q(streamName)}, it's been closed`,
          );
          const result = stream[pos];
          pos += 1;
          yield result;
        }
        assert(
          streamStatus.get(streamName) === readStatus,
          X`can't read stream ${q(streamName)}, it's been closed`,
        );
        streamStatus.delete(streamName);
      }
      return reader();
    }
  }

  /**
   * Write to a stream.
   *
   * @param {string} streamName  The stream to be written
   * @param {string} item  The item to write
   * @param {Object} position  The position to write the item
   *
   * @returns {Object} the new position after writing
   */
  function writeStreamItem(streamName, item, position) {
    insistStreamName(streamName);
    insistStreamPosition(position);
    let stream = streams.get(streamName);
    if (!stream) {
      stream = [];
      streamStatus.set(streamName, 'write');
      streams.set(streamName, stream);
    } else {
      const status = streamStatus.get(streamName);
      if (!status) {
        streamStatus.set(streamName, 'write');
      } else {
        assert(
          status === 'write',
          X`can't write stream ${q(streamName)} because it's already in use`,
        );
      }
    }
    stream[position.itemCount] = item;
    return harden({ itemCount: position.itemCount + 1 });
  }

  const streamStore = harden({
    readStream,
    writeStreamItem,
    closeStream,
    STREAM_START,
  });

  return harden({ kvStore, streamStore, commit, close });
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
  assert.typeof(dirPath, 'string');
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
  assert.typeof(dirPath, 'string');
  if (fs.existsSync(dirPath)) {
    const storeFile = path.resolve(dirPath, 'swingset-kernel-state.jsonlines');
    if (fs.existsSync(storeFile)) {
      return true;
    }
  }
  return false;
}
