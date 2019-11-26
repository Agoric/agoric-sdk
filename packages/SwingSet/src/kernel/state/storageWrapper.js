import harden from '@agoric/harden';
import { insistStorageAPI } from '../../storageAPI';

// We manage a host-realm Storage object with a has/getKeys/get/set/del API.
// We must protect against cross-realm contamination, and add some
// convenience methods.

export function guardStorage(hostStorage) {
  insistStorageAPI(hostStorage);

  function callAndWrapError(method, ...args) {
    // This is based on the one in SES, but hostStorage is not supposed to
    // throw any exceptions, so we don't need to retain error types or stack
    // traces: just log the full exception, and return a stripped down
    // kernel-realm Error to the caller.

    // This does not modify the arguments in any way, it only protects against
    // exposing host-realm Error objects to kernel realm callers.

    try {
      return hostStorage[method](...args);
    } catch (err) {
      console.log(`error invoking hostStorage.${method}(${args})`, err);
      throw new Error(`error invoking hostStorage.${method}(${args}): ${err}`);
    }
  }

  function has(key) {
    return !!callAndWrapError('has', `${key}`);
  }

  // hostStorage.getKeys returns a host-realm Generator, so we return a
  // kernel-realm wrapper generator that returns the same contents, and guard
  // against the host-realm Generator throwing any new errors as it runs
  function* getKeys(start, end) {
    try {
      for (const key of hostStorage.getKeys(`${start}`, `${end}`)) {
        yield `${key}`;
      }
    } catch (err) {
      console.log(`error invoking hostStorage.getKeys(${start}, ${end})`, err);
      throw new Error(
        `error invoking hostStorage.getKeys(${start}, ${end}): ${err}`,
      );
    }
  }

  function get(key) {
    const value = callAndWrapError('get', `${key}`);
    if (value === undefined) {
      return undefined;
    }
    return `${value}`;
  }

  function set(key, value) {
    callAndWrapError('set', `${key}`, `${value}`);
  }

  function del(key) {
    callAndWrapError('delete', `${key}`);
  }

  return harden({ has, getKeys, get, set, delete: del });
}

export function buildCrankBuffer(storage) {
  insistStorageAPI(storage);

  // to avoid confusion, additions and deletions should never share a key
  const additions = new Map();
  const deletions = new Set();

  const crankBuffer = {
    has(key) {
      if (additions.has(key)) {
        return true;
      }
      if (deletions.has(key)) {
        return false;
      }
      return storage.has(key);
    },

    *getKeys(start, end) {
      const keys = new Set(storage.getKeys(start, end));
      for (const k of additions.keys()) {
        keys.add(k);
      }
      for (const k of deletions.keys()) {
        keys.delete(k);
      }
      for (const k of Array.from(keys).sort()) {
        if (start <= k && k < end) {
          yield k;
        }
      }
    },

    get(key) {
      if (additions.has(key)) {
        return additions.get(key);
      }
      if (deletions.has(key)) {
        return undefined;
      }
      return storage.get(key);
    },

    set(key, value) {
      additions.set(key, value);
      deletions.delete(key);
    },

    delete(key) {
      additions.delete(key);
      deletions.add(key);
    },
  };

  function commitCrank() {
    for (const [key, value] of additions) {
      storage.set(key, value);
    }
    for (const key of deletions) {
      storage.delete(key);
    }
  }

  function abortCrank() {
    additions.clear();
    deletions.clear();
  }

  return harden({ crankBuffer, commitCrank, abortCrank });
}

export function cacheHeuristic(key) {
  // this encodes our heuristics about which keys are worth caching

  // v$NN.t.$NN is a transcript entry, which is basically write-only at
  // runtime. But v$NN.t.nextID is the index of the next transcript to be
  // written, which gets a read/increment/write cycle on each crank.
  if (key.indexOf('.t.') !== -1 && key.indexOf('.t.nextID') !== -1) {
    return false;
  }

  // runQueue is read/modify/write on each crank
  if (key === 'runQueue') {
    return false;
  }

  return true;
}

export function addReadCache(storage, useCache) {
  // this embeds some assumptions:
  //  * the speed of 'get' on existing keys is the most important
  //  * 'has' is rare, especially on deleted keys
  //  * 'getKeys' can be arbitrarily slow

  insistStorageAPI(storage);

  const cache = new Map();

  const cachingStorage = {
    has(key) {
      if (cache.has(key)) {
        return true;
      }
      return storage.has(key);
    },

    getKeys: storage.getKeys,

    get(key) {
      if (cache.has(key)) {
        return cache.get(key);
      }
      const value = storage.get(key);
      if (useCache(key)) {
        cache.set(key, value);
        // todo: prune the cache
      }
      return value;
    },

    set(key, value) {
      storage.set(key, value);
      if (useCache(key)) {
        cache.set(key, value);
        // todo: prune the cache
      } else {
        cache.delete(key);
      }
    },

    delete(key) {
      storage.delete(key);
      cache.delete(key);
    },
  };

  return harden(cachingStorage);
}

export function addHelpers(storage) {
  // these functions are built on top of the DB interface
  insistStorageAPI(storage);

  function* enumeratePrefixedKeys(prefix, start = 0) {
    // Return an iterator over all existing keys `${prefix}${N}`, for N
    // starting at `start`, in numeric order. This is implemented with
    // has/get rather than any DB-specific functionality: we could imagine
    // a DB with getRange(start, end), but the numbers would be sorted
    // incorrectly.
    for (let i = start; true; i += 1) {
      const key = `${prefix}${i}`;
      if (storage.has(key)) {
        yield key;
      } else {
        return;
      }
    }
  }

  function* getPrefixedValues(prefix, start = 0) {
    for (const key of enumeratePrefixedKeys(prefix, start)) {
      yield storage.get(key);
    }
  }

  function deletePrefixedKeys(prefix, start = 0) {
    // this is kind of like a deleteRange() would be, but can be implemented
    // efficiently without backend DB support because it only looks at
    // numeric suffixes, in sequential order.
    for (const key of enumeratePrefixedKeys(prefix, start)) {
      storage.delete(key);
    }
  }

  return harden({
    enumeratePrefixedKeys,
    getPrefixedValues,
    deletePrefixedKeys,
    ...storage,
  });
}

// The "KeeperStorage" API is a set of functions { has, get, set, delete,
// enumeratePrefixedKeys, getPrefixedValues, deletePrefixedKeys }. The Kernel
// Keeper manipulates the saved kernel state through an object that
// implements the KeeperStorage API. That object is usually associated with a
// write-back buffer wrapper (the CrankBuffer), but the keeper is unaware of
// that.

export function wrapStorage(hostStorage) {
  const guardedHostStorage = guardStorage(hostStorage);
  const { crankBuffer, commitCrank, abortCrank } = buildCrankBuffer(
    guardedHostStorage,
  );
  const cachingCrankBuffer = addReadCache(crankBuffer, cacheHeuristic);
  const enhancedCrankBuffer = addHelpers(cachingCrankBuffer);
  return { enhancedCrankBuffer, commitCrank, abortCrank };
}
