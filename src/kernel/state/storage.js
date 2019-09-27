import harden from '@agoric/harden';

export function makeStorage(initialState) {
  const state = JSON.parse(initialState);

  // has/get/set/del are what we will require from the backend DB

  function has(key) {
    // todo: this is temporary, until we replace the state object with proper
    // Maps
    return Object.prototype.hasOwnProperty.call(state, key);
  }

  function* getKeys(start, end) {
    // return keys, in order, where start <= key < end

    // note: this can be slow, it's only used for debug (dumpState())
    const keys = Object.getOwnPropertyNames(state);
    keys.sort();
    for (const k of keys) {
      if (start <= k && k < end) {
        yield k;
      }
    }
  }

  function get(key) {
    return state[key];
  }

  function set(key, value) {
    state[key] = value;
  }

  function del(key) {
    delete state[key];
  }

  // these functions are built on top of the DB interface

  function* enumeratePrefixedKeys(prefix, start = 0) {
    // Return an iterator over all existing keys `${prefix}${N}`, for N
    // starting at `start`, in numeric order. This is implemented with
    // has/get rather than any DB-specific functionality: we could imagine
    // a DB with getRange(start, end), but the numbers would be sorted
    // incorrectly.
    for (let i = start; true; i += 1) {
      const key = `${prefix}${i}`;
      if (has(key)) {
        yield key;
      } else {
        return;
      }
    }
  }

  function* getPrefixedValues(prefix, start = 0) {
    for (const key of enumeratePrefixedKeys(prefix, start)) {
      yield get(key);
    }
  }

  function deletePrefixedKeys(prefix, start = 0) {
    // this is kind of like a deleteRange() would be, but can be implemented
    // efficiently without backend DB support because it only looks at
    // numeric suffixes, in sequential order.
    for (const key of enumeratePrefixedKeys(prefix, start)) {
      del(key);
    }
  }

  // this is temporary, until the host manages storage
  function serialize() {
    return JSON.stringify(state);
  }

  const storage = {
    has,
    getKeys,
    get,
    set,
    delete: del,
    enumeratePrefixedKeys,
    getPrefixedValues,
    deletePrefixedKeys,
    serialize,
  };
  return harden(storage);
}
