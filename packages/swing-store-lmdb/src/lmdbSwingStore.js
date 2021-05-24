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
 * @typedef { import('@agoric/swing-store-simple').StreamStore } StreamStore
 * @typedef { import('@agoric/swing-store-simple').StreamWriter } StreamWriter
 * @typedef { import('@agoric/swing-store-simple').SwingStore } SwingStore
 */

/**
 * Do the work of `initSwingStore` and `openSwingStore`.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 * @param {boolean} forceReset  If true, initialize the database to an empty state
 *
 * @returns {SwingStore}
 */
function makeSwingStore(dirPath, forceReset = false) {
  let txn = null;

  if (forceReset) {
    fs.rmdirSync(dirPath, { recursive: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });

  let lmdbEnv = new lmdb.Env();
  lmdbEnv.open({
    path: dirPath,
    mapSize: 2 * 1024 * 1024 * 1024, // XXX need to tune this
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

  function insistStreamName(streamName) {
    assert.typeof(streamName, 'string');
    assert(
      streamName.match(/^[-\w]+$/),
      X`invalid stream name ${q(streamName)}`,
    );
  }

  /**
   * Generator function that returns an iterator over the items in a stream.
   *
   * @param {string} streamName  The stream to read
   * @param {Object} endPosition  The position of the end of the stream
   * @param {Object?} startPosition  Optional position to start reading from
   *
   * @yields {string} an iterator for the items in the named stream
   */
  function* openReadStream(streamName, endPosition, startPosition) {
    insistStreamName(streamName);
    const status = streamStatus.get(streamName);
    assert(
      status === 'unused' || !status,
      // prettier-ignore
      X`can't read stream ${q(streamName)} because it's already being used for ${q(status)}`,
    );
    let itemCount = endPosition.itemCount;
    if (endPosition.offset === 0) {
      assert(itemCount === 0);
    } else {
      assert(itemCount > 0);
      assert(endPosition.offset > 0);
      let fd;
      try {
        streamStatus.set(streamName, 'read');
        const filePath = `${dirPath}/${streamName}`;
        fs.truncateSync(filePath, endPosition.offset);
        fd = fs.openSync(filePath, 'r');
        // let startOffset = 0;
        let skipCount = 0;
        if (startPosition) {
          itemCount -= startPosition.itemCount;
          // startOffset = startPosition.offset;
          skipCount = startPosition.itemCount;
        }
        const reader = new Readlines(fd);
        // We would like to be able to seek Readlines to a particular position
        // in the file before it starts reading.  Unfortunately, it is hardcoded
        // to reset to 0 at the start and then manually walk itself through the
        // file, ignoring whatever current position that the fd is set to.
        // Investigation has revealed that giving it a 'position' option for
        // where to start reading is trivial (~4 lines of code) change, but that
        // would cause us to diverge from the official npm version.  There are
        // even a couple of forks on NPM that do this, but they have like 2
        // downloads per week so I don't trust them.  Until this is resolved,
        // the only way to realize a different starting point than 0 is to
        // simply read and ignore some number of records, which the following
        // code does.  It's ideal, but it works.
        while (skipCount > 0) {
          reader.next();
          skipCount -= 1;
        }
        // const reader = new Readlines(fd, { position: startOffset });
        while (true) {
          const line = /** @type {string|false} */ (reader.next());
          if (line) {
            itemCount -= 1;
            assert(itemCount >= 0);
            const result = line.toString();
            yield result;
          } else {
            break;
          }
        }
      } finally {
        streamStatus.set(streamName, 'unused');
        assert(itemCount === 0, X`leftover item count ${q(itemCount)}`);
      }
    }
  }

  /**
   * Obtain a writer for a stream.
   *
   * @param {string} streamName  The stream to be written
   *
   * @returns {StreamWriter} a writer for the named stream
   */
  function openWriteStream(streamName) {
    insistStreamName(streamName);
    const status = streamStatus.get(streamName);
    assert(
      status === 'unused' || !status,
      // prettier-ignore
      X`can't write stream ${q(streamName)} because it's already being used for ${q(status)}`,
    );
    streamStatus.set(streamName, 'write');

    // XXX fdTemp is a workaround for a flaw in TypeScript's type inference
    // It should be fd, which it should be changed to when and if they fix tsc.
    let fdTemp = streamFds.get(streamName);
    if (!fdTemp) {
      const filePath = `${dirPath}/${streamName}`;
      const mode = fs.existsSync(filePath) ? 'r+' : 'w';
      fdTemp = fs.openSync(filePath, mode);
      streamFds.set(streamName, fdTemp);
    }
    const fd = fdTemp;
    activeStreamFds.add(fd);

    /**
     * Write to a stream.
     *
     * @param {string} item  The item to write
     * @param {Object|null} position  The position to write the item
     *
     * @returns {Object} the new position after writing
     */
    function write(item, position) {
      assert.typeof(item, 'string');
      assert(
        streamFds.get(streamName) === fd,
        X`write to closed stream ${q(streamName)}`,
      );
      if (!position) {
        position = { offset: 0, itemCount: 0 };
      }
      const buf = encoder.encode(`${item}\n`);
      fs.writeSync(fd, buf, 0, buf.length, position.offset);
      fs.fsyncSync(fd);
      return {
        offset: position.offset + buf.length,
        itemCount: position.itemCount + 1,
      };
    }
    return write;
  }

  /**
   * Close a stream.
   *
   * @param {string} streamName  The stream to close
   */
  function closeStream(streamName) {
    insistStreamName(streamName);
    const fd = streamFds.get(streamName);
    if (fd) {
      fs.closeSync(fd);
      streamFds.delete(streamName);
      activeStreamFds.delete(fd);
      streamStatus.set(streamName, 'unused');
    }
  }

  const streamStore = { openReadStream, openWriteStream, closeStream };

  /**
   * Commit unsaved changes.
   */
  function commit() {
    if (txn) {
      for (const fd of activeStreamFds) {
        fs.closeSync(fd);
      }
      activeStreamFds.clear();
      txn.commit();
      txn = null;
    }
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
      fs.closeSync(fd);
    }
  }

  return { kvStore, streamStore, commit, close, diskUsage };
}

/**
 * Create a swingset store backed by an LMDB database.  If there is an existing
 * store at the given `dirPath`, it will be reinitialized to an empty state.
 *
 * @param {string} dirPath  Path to a directory in which database files may be kept.
 *   This directory need not actually exist yet (if it doesn't it will be
 *   created) but it is reserved (by the caller) for the exclusive use of this
 *   swing store instance.
 *
 * @returns {SwingStore}
 */
export function initSwingStore(dirPath) {
  assert.typeof(dirPath, 'string');
  return makeSwingStore(dirPath, true);
}

/**
 * Open a swingset store backed by an LMDB database.  If there is no existing
 * store at the given `dirPath`, a new, empty store will be created.
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
    const storeFile = path.resolve(dirPath, 'data.mdb');
    if (fs.existsSync(storeFile)) {
      return true;
    }
  }
  return false;
}
