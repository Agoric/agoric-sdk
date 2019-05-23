export default function makeKVStore(state) {
  // kvstore has set, get, has, delete methods
  // set (key []byte, value []byte)
  // get (key []byte)  => value []byte
  // has (key []byte) => exists bool
  // delete (key []byte)
  // iterator, reverseIterator

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
    // delete
    // iterator
    // reverseIterator
  };
}
