// @ts-check
import fs from 'fs';
import os from 'os';
import path from 'path';
import util from 'util';
import Readlines from 'n-readlines';

import lmdb from 'node-lmdb';

import { assert, details as X, q } from '@agoric/assert';

const encoder = new util.TextEncoder();

/**
 * @typedef { import('@agoric/swing-store-simple').KVStore } KVStore
 * @typedef { import('@agoric/swing-store-simple').StreamPosition } StreamPosition
 * @typedef { import('@agoric/swing-store-simple').StreamStore } StreamStore
 * @typedef { import('@agoric/swing-store-simple').SwingStore } SwingStore
 */

/**
 * Do the work of `initLMDBSwingStore` and `openLMDBSwingStore`.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 * @param {boolean} forceReset  If true, initialize the database to an empty state
 * @param {Object} options  Configuration options
 *
 * @returns {SwingStore}
 */
function makeLMDBSwingStore(dirPath, forceReset, options) {
  let txn = null;

  if (forceReset) {
    fs.rmdirSync(dirPath, { recursive: true });
  }
  fs.mkdirSync(`${dirPath}/streams`, { recursive: true });

  const { mapSize = 2 * 1024 * 1024 * 1024 } = options;
  let lmdbEnv = new lmdb.Env();
  lmdbEnv.open({
    path: dirPath,
    mapSize,
    // Turn off useWritemap on the Mac.  The userWritemap option is currently
    // required for LMDB to function correctly on Linux running under WSL, but
    // we don't yet have a convenient recipe to probe our environment at
    // runtime to distinguish that species of Linux from the others.  For now
    // we're running our benchmarks on Mac, so this will do for the time being.
    useWritemap: os.platform() !== 'darwin',
  });

  let dbi = lmdbEnv.openDbi({
    name: 'swingset-kernel-state',
    create: true,
  });

  function ensureTxn() {
    if (!txn) {
      txn = lmdbEnv.beginTxn();
    }
  }

  function diskUsage() {
    const dataFilePath = `${dirPath}/data.mdb`;
    const stat = fs.statSync(dataFilePath);
    return stat.size;
  }

  /**
   * Obtain the value stored for a given key.
   *
   * @param {string} key  The key whose value is sought.
   *
   * @returns {string | undefined} the (string) value for the given key, or undefined if there is no
   *    such value.
   *
   * @throws if key is not a string.
   */
  function get(key) {
    assert.typeof(key, 'string');
    ensureTxn();
    let result = txn.getString(dbi, key);
    if (result === null) {
      result = undefined;
    }
    return result;
  }

  /**
   * Generator function that returns an iterator over all the keys within a
   * given range.  Note that this can be slow as it's only intended for use in
   * debugging.
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

    ensureTxn();
    const cursor = new lmdb.Cursor(txn, dbi);
    let key = start === '' ? cursor.goToFirst() : cursor.goToRange(start);
    while (key && (end === '' || key < end)) {
      yield key;
      key = cursor.goToNext();
    }
    cursor.close();
  }

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
    return get(key) !== undefined;
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
    ensureTxn();
    txn.putString(dbi, key, value);
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
    if (has(key)) {
      ensureTxn();
      txn.del(dbi, key);
    }
  }

  const kvStore = {
    has,
    getKeys,
    get,
    set,
    delete: del,
  };

  /** @type {Set<number>} */
  const activeStreamFds = new Set();
  /** @type {Map<string, number>} */
  const streamFds = new Map();
  /** @type {Map<string, string>} */
  const streamStatus = new Map();
  let statusCounter = 0;

  const STREAM_START = harden({ offset: 0, itemCount: 0 });

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
    assert.typeof(position.offset, 'number');
    assert(position.offset >= 0);
  }

  function closefd(fd) {
    try {
      fs.closeSync(fd);
    } catch (e) {
      // closing an already closed fd is OK, but any other errors are probably bad
      if (e.code !== 'EBADF') {
        throw e;
      }
    }
  }

  /**
   * Close a stream that's open for read or write.
   *
   * @param {string} streamName  The stream to close
   */
  function closeStream(streamName) {
    insistStreamName(streamName);
    const fd = streamFds.get(streamName);
    if (fd) {
      closefd(fd);
      streamFds.delete(streamName);
      activeStreamFds.delete(fd);
      streamStatus.delete(streamName);
    }
  }

  /**
   * Generator function that returns an iterator over the items in a stream.
   *
   * @param {string} streamName  The stream to read
   * @param {Object} startPosition  The position to start reading from
   * @param {Object} endPosition  The position of the end of the stream
   *
   * @returns {Iterable<string>} an iterator for the items in the named stream
   */
  function readStream(streamName, startPosition, endPosition) {
    insistStreamName(streamName);
    assert(
      !streamStatus.get(streamName),
      X`can't read stream ${q(streamName)} because it's already in use`,
    );
    insistStreamPosition(startPosition);
    insistStreamPosition(endPosition);
    assert(startPosition.itemCount <= endPosition.itemCount);

    let itemCount = endPosition.itemCount;
    if (endPosition.offset === 0) {
      assert(itemCount === 0);
      return [];
    } else {
      const filePath = `${dirPath}/streams/${streamName}.sss`;
      fs.truncateSync(filePath, endPosition.offset);
      const fd = fs.openSync(filePath, 'r');
      streamFds.set(streamName, fd);
      activeStreamFds.add(fd);

      const readStatus = `read-${statusCounter}`;
      statusCounter += 1;
      streamStatus.set(streamName, readStatus);
      // let startOffset = 0;
      let skipCount = startPosition.itemCount;

      // itemCount -= startPosition.itemCount;
      // startOffset = startPosition.offset;

      // We would like to be able to seek Readlines to a particular position
      // in the file before it starts reading.  Unfortunately, it is hardcoded
      // to reset to 0 at the start and then manually walk itself through the
      // file, ignoring whatever current position the fd is set to.
      // Investigation has revealed that giving the Readlines constructor a
      // 'position' option for where to start reading is a trivial (~4 lines
      // of code) change, but that would cause us to diverge from the official
      // npm version.  There are even a couple of forks on NPM that do this,
      // but they have like 2 downloads per week so I don't trust them.  Until
      // this is resolved, the only way to realize a different starting point
      // than 0 is to simply ignore records that are read until we catch up to
      // where we really want to start, which the following code does.  It's
      // not ideal, but it works.
      //
      // const innerReader = new Readlines(fd, { position: startOffset });
      const innerReader = new Readlines(fd);
      function* reader() {
        try {
          while (true) {
            assert(
              streamStatus.get(streamName) === readStatus,
              X`can't read stream ${q(streamName)}, it's been closed`,
            );
            const line = /** @type {string|false} */ (innerReader.next());
            // N.b.: since uncommitted writes may leave an overhang of data in
            // the stream file, the itemCount is the true indicator of the end
            // of the stream, not the point at which the line reader reaches the
            // end-of-file.
            if (line && itemCount > 0) {
              itemCount -= 1;
              const result = line.toString();
              if (skipCount > 0) {
                skipCount -= 1;
              } else {
                yield result;
              }
            } else {
              closefd(fd);
              break;
            }
          }
        } catch (e) {
          console.log(e);
        } finally {
          assert(
            streamStatus.get(streamName) === readStatus,
            X`can't read stream ${q(streamName)}, it's been closed`,
          );
          closeStream(streamName);
          assert(itemCount === 0, X`leftover item count ${q(itemCount)}`);
        }
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

    let fd = streamFds.get(streamName);
    if (!fd) {
      const filePath = `${dirPath}/streams/${streamName}.sss`;
      const mode = fs.existsSync(filePath) ? 'r+' : 'w';
      fd = fs.openSync(filePath, mode);
      streamFds.set(streamName, fd);
      streamStatus.set(streamName, 'write');
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
    activeStreamFds.add(fd);

    const buf = encoder.encode(`${item}\n`);
    fs.writeSync(fd, buf, 0, buf.length, position.offset);
    return harden({
      offset: position.offset + buf.length,
      itemCount: position.itemCount + 1,
    });
  }

  const streamStore = harden({
    readStream,
    writeStreamItem,
    closeStream,
    STREAM_START,
  });

  /**
   * Commit unsaved changes.
   */
  function commit() {
    if (txn) {
      txn.commit();
      txn = null;
    }
    for (const fd of activeStreamFds) {
      fs.fsyncSync(fd);
    }
    activeStreamFds.clear();
  }

  /**
   * Close the database, abandoning any changes made since the last commit (if you want to save them, call
   * commit() first).
   */
  function close() {
    if (txn) {
      txn.abort();
      txn = null;
    }
    dbi.close();
    dbi = null;
    lmdbEnv.close();
    lmdbEnv = null;

    for (const fd of streamFds.values()) {
      closefd(fd);
    }
    streamFds.clear();
    activeStreamFds.clear();
  }

  return harden({ kvStore, streamStore, commit, close, diskUsage });
}

/**
 * Create a swingset store backed by an LMDB database.  If there is an existing
 * store at the given `dirPath`, it will be reinitialized to an empty state.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 *   This directory need not actually exist yet (if it doesn't it will be
 *   created) but it is reserved (by the caller) for the exclusive use of this
 *   swing store instance.
 * @param {Object?} options  Optional configuration options
 *
 * @returns {SwingStore}
 */
export function initLMDBSwingStore(dirPath, options = {}) {
  assert.typeof(dirPath, 'string');
  return makeLMDBSwingStore(dirPath, true, options);
}

/**
 * Open a swingset store backed by an LMDB database.  If there is no existing
 * store at the given `dirPath`, a new, empty store will be created.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 *   This directory need not actually exist yet (if it doesn't it will be
 *   created) but it is reserved (by the caller) for the exclusive use of this
 *   swing store instance.
 * @param {Object?} options  Optional configuration options
 *
 * @returns {SwingStore}
 */
export function openLMDBSwingStore(dirPath, options = {}) {
  assert.typeof(dirPath, 'string');
  return makeLMDBSwingStore(dirPath, false, options);
}

/**
 * Is this directory a compatible swing store?
 *
 * @param {string} dirPath  Path to a directory in which database files might be present.
 *   This directory need not actually exist
 *
 * @returns {boolean}
 *   If the directory is present and contains the files created by initLMDBSwingStore
 *   or openLMDBSwingStore, returns true. Else returns false.
 *
 */
export function isSwingStore(dirPath) {
  assert.typeof(dirPath, 'string');
  if (fs.existsSync(dirPath)) {
    const storeFile = path.resolve(dirPath, 'data.mdb');
    if (fs.existsSync(storeFile)) {
      return true;
    }
  }
  return false;
}
