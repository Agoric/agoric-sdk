import dJSON from 'deterministic-json';

// TO BE TOSSED ONCE WE HAVE A KVSTORE IMPLEMENTATION

export default function makeKVStore(state) {
  // kvstore has set, get, has, delete methods
  // set (key []byte, value []byte)
  // get (key []byte)  => value []byte
  // has (key []byte) => exists bool
  // delete (key []byte)
  // iterator, reverseIterator

  function getDetermOwnProperties(obj) {
    const orderedObj = dJSON.parse(dJSON.stringify(obj));
    return Object.getOwnPropertyNames(orderedObj);
  }

  function* makeEntriesIterator(obj) {
    const properties = getDetermOwnProperties(obj);
    for (let index in properties) {
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
    iterator() {
      return makeEntriesIterator(state);
    },
    // reverseIterator

    // additional helpers that aren't part of kvstore

    keys() {
      const keys = [];
      for (const entry of this.iterator()) {
        keys.push(entry.key);
      }
      return keys;
    },
    entries() {
      const entries = [];
      for (const entry of this.iterator()) {
        entries.push(entry);
      }
      return entries;
    },
    values() {
      const values = [];
      for (const entry of this.iterator()) {
        values.push(entry.value);
      }
      return values;
    },
  };
}
