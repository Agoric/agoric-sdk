import stableStringify from './json-stable-stringify';

// TO BE TOSSED ONCE WE HAVE A KVSTORE IMPLEMENTATION

export default function makeKVStore(state) {
  // kvstore has set, get, has, delete methods
  // set (key []byte, value []byte)
  // get (key []byte)  => value []byte
  // has (key []byte) => exists bool
  // delete (key []byte)
  // iterator, reverseIterator

  function getDetermOwnProperties(obj) {
    const orderedObj = JSON.parse(stableStringify(obj));
    return Object.getOwnPropertyNames(orderedObj);
  }

  function* makeEntriesIterator(obj) {
    const properties = getDetermOwnProperties(obj);
    for (const index of properties) {
      yield {
        key: properties[index],
        value: obj[properties[index]],
      };
    }
  }

  return {
    get(key) {
      return state[key];
    },
    set(key, value) {
      state[key] = value;
    },
    has(key) {
      return Object.prototype.hasOwnProperty.call(state, key);
    },
    delete(key) {
      delete state[key];
    },
    iterator(key) {
      return makeEntriesIterator(state[key]);
    },
    // reverseIterator

    // additional helpers that aren't part of kvstore

    keys(key) {
      const keys = [];
      for (const entry of this.iterator(key)) {
        keys.push(entry.key);
      }
      return keys;
    },
    entries(key) {
      const entries = [];
      for (const entry of this.iterator(key)) {
        entries.push(entry);
      }
      return entries;
    },
    values(key) {
      const values = [];
      for (const entry of this.iterator(key)) {
        values.push(entry.value);
      }
      return values;
    },
    size(key) {
      return this.keys(key).length;
    },
  };
}
