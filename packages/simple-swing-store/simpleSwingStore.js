import fs from 'fs';
import path from 'path';
import Readlines from 'n-readlines';

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
 * @return an object: {
 *   storage,  // the storage API object itself
 *   state     // the underlying map that holds the state in memory
 * }
 */
function makeStorageInMemory() {
  const state = new Map();

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
   * given range, in lexicographical order.
   *
   * Note that this can be slow as it's only intended for use in debugging and
   * test result verification.
   *
   * @param start  Start of the key range of interest (inclusive).  An empty
   *    string indicates a range from the beginning of the key set.
   * @param end  End of the key range of interest (exclusive).  An empty string
   *    indicates a range through the end of the key set.
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
      if ((start === '' || start <= k) && (end === '' || k < end)) {
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

  return { storage, state };
}

/**
 * Create a swingset store instance that exists strictly as an in-memory map with no persistent backing.
 *
 * @return an object: {
 *   storage, // a storage API object to load and store data
 *   commit,  // a function to commit changes made since the last commit (a no-op in this case)
 *   close    // a function to shutdown the store, abandoning any uncommitted changes (also a no-op)
 * }
 */
export function makeMemorySwingStore(_basedir, _dbName, _forceReset) {
  return {
    storage: makeStorageInMemory().storage,
    commit: () => {},
    close: () => {},
  };
}

/**
 * Create a swingset store instance that is an in-memory map backed by JSON serialized to a text file.
 *
 * @param basedir  Directory in which database files will be kept
 * @param dbName   Name for the database
 * @param forceReset  If true, initialize the database to an empty state
 *
 * @return an object: {
 *   storage, // a storage API object to load and store data
 *   commit,  // a function to commit changes made since the last commit
 *   close    // a function to shutdown the store, abandoning any uncommitted changes
 * }
 */
export function makeSimpleSwingStore(basedir, dbName, forceReset = false) {
  const { storage, state } = makeStorageInMemory();

  const storeFile = path.resolve(basedir, `${dbName}.jsonlines`);
  if (forceReset) {
    safeUnlink(storeFile);
  } else {
    let lines;
    try {
      lines = new Readlines(storeFile);
    } catch (e) {
      // storeFile will be missing the first time we try to use it.  That's OK; commit will create it.
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
    if (lines) {
      let line = lines.next();
      while (line) {
        const [key, value] = JSON.parse(line);
        storage.set(key, value);
        line = lines.next();
      }
    }
  }

  /**
   * Commit unsaved changes.
   */
  function commit() {
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

  /**
   * Close the "database", abandoning any changes made since the last commit (if you want to save them, call
   * commit() first).
   */
  function close() {
    // Nothing to do here.
  }

  return { storage, commit, close };
}
