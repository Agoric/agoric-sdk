import fs from 'fs';
import path from 'path';
import readlines from 'n-readlines';

import { buildStorageInMemory } from '@agoric/swingset-vat';

function safeUnlink(path) {
  try {
    fs.unlinkSync(path);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
}

/**
 * Create a store instance that exists strictly as an in-memory map with no persistent backing.
 *
 * @return an object: {
 *   storage, // a storage API object to load and store data
 *   commit,  // a function to commit changes made since the last commit (a no-op in this case)
 *   close    // a function to shutdown the store, abandoning any uncommitted changes (also a no-op)
 * }
 */
export function makeMemoryStore(_basedir, _dbName, _forceReset) {
  return {
    storage: buildStorageInMemory(),
    commit: () => {},
    close: () => {},
  };
}

/**
 * Create a store instance that is an in-memory map backed by JSON serialized to a text file.
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
export function makeSimpleStore(basedir, dbName, forceReset = false) {
  const { storage, map } = buildStorageInMemory();

  const storeFile = path.resolve(basedir, `${dbName}.jsonlines`);
  if (forceReset) {
    safeUnlink(storeFile);
  } else {
    let lines;
    try {
      lines = new readlines(storeFile);
    } catch (e) {
      // storeFile will be missing the first time we try to use it.  That's OK; commit will create it.
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
    if (lines) {
      let line;
      while (line = lines.next()) {
        const [key, value] = JSON.parse(line);
        storage.set(key, value);
      }
    }
  }

  /**
   * Commit unsaved changes.
   */
  function commit() {
    const tempFile = `${storeFile}.tmp`;
    const fd = fs.openSync(tempFile, 'w');

    for (const [key, value] of map.entries()) {
      const line = JSON.stringify([key, value]);
      fs.writeSync(fd, line);
      fs.writeSync(fd, '\n');
    }
    fs.closeSync(fd);
    fs.renameSync(tempFile, storeFile);
  }

  /**
   * Close the database, abandoning any changes made since the last commit (if you want to save them, call
   * commit() first).
   */
  function close() {
  }

  return { storage, commit, close };
}
