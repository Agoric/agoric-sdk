import harden from '@agoric/harden';

// The "Storage API" a set of functions { has, getKeys, get, set, delete },
// which work on string keys and accept string values. A lot of kernel-side
// code expects to get an object which implements the Storage API, which is
// usually associated with a write-back buffer wrapper.

// The "HostDB API" is a different set of functions { has, getKeys, get,
// applyBatch } which the host is expected to provide to the Controller in
// the config object. This API allows SwingSet to deliver batches of changes
// to the host-side storage medium.

// buildStorageInMemory() returns a RAM-based StorageAPI object, which can
// accept an optional initialState string, and which provides an extra
// getState() function to extract a string with all the state.

// buildHostDBInMemory creates hostDB objects for testing and casual hosts
// that can afford to hold all state in RAM. They must arrange to call
// getState() at the end of each block and save the resulting string to
// disk.

// A more sophisticated host will build a hostDB that writes changes to disk
// directly.

export function buildStorageInMemory(initialState = {}) {
  const state = new Map();

  for (const k of Object.getOwnPropertyNames(initialState)) {
    state.set(k, initialState[k]);
  }

  function has(key) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    return state.has(key);
  }

  function* getKeys(start, end) {
    // return keys, in order, where start <= key < end
    if (`${start}` !== start) {
      throw new Error(`non-string start ${start}`);
    }
    if (`${end}` !== end) {
      throw new Error(`non-string end ${end}`);
    }

    // note: this can be slow, it's only used for debug (dumpState())
    const keys = Array.from(state.keys()).sort();
    for (const k of keys) {
      if (start <= k && k < end) {
        yield k;
      }
    }
  }

  function get(key) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    return state.get(key);
  }

  function set(key, value) {
    if (`${key}` !== key) {
      throw new Error(`non-string key ${key}`);
    }
    if (`${value}` !== value) {
      throw new Error(`non-string value ${value}`);
    }
    state.set(key, value);
  }

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

  function getState() {
    const data = {};
    for (const k of Array.from(state.keys()).sort()) {
      data[k] = state.get(k);
    }
    return data;
  }

  return { storage, getState, map: state };
}

export function buildHostDBInMemory(storage) {
  if (!storage) {
    storage = buildStorageInMemory();
  }

  function has(key) {
    return storage.has(key);
  }

  function getKeys(start, end) {
    return storage.getKeys(start, end);
  }

  function get(key) {
    return storage.get(key);
  }

  function applyBatch(changes) {
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
