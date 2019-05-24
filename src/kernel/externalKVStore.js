import stringify from './json-stable-stringify';

export default function makeExternalKVStore(external) {
  // kvstore has set, get, has, delete methods
  // set (key []byte, value []byte)
  // get (key []byte)  => value []byte
  // has (key []byte) => exists bool
  // delete (key []byte)
  // iterator, reverseIterator

  return {
    get(key) {
      const value = external.sendMsg(
        stringify({
          method: 'get',
          key: `${key}`,
        }),
      );
      return value;
    },
    set(key, value) {
      return external.sendMsg(
        stringify({
          method: 'set',
          key: `${key}`,
          value,
        }),
      );
    },
    has(key) {
      return external.sendMsg(
        stringify({
          method: 'has',
          key: `${key}`,
        }),
      );
    },
    delete(key) {
      return external.sendMsg(
        stringify({
          method: 'delete',
          key: `${key}`,
        }),
      );
    },
    iterator() {
      return external.sendMsg(
        stringify({
          method: 'iterator',
        }),
      );
    },
    // TODO: reverseIterator

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
    size() {
      return this.keys().length;
    },
  };
}
