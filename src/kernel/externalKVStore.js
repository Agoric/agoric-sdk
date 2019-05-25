import stringify from './json-stable-stringify';

export default function makeExternalKVStore(pathToRoot, external) {
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
          key: `${pathToRoot}.${key}`,
        }),
      );

      if (typeof value === 'object' && !Array.isArray(value)) {
        return makeExternalKVStore(`${pathToRoot}.${key}`, external);
      }
      return value;
    },
    set(key, value) {
      return external.sendMsg(
        stringify({
          method: 'set',
          key: `${pathToRoot}.${key}`,
          value,
        }),
      );
    },
    has(key) {
      return external.sendMsg(
        stringify({
          method: 'has',
          key: `${pathToRoot}.${key}`,
        }),
      );
    },
    keys() {
      return external.sendMsg(
        stringify({
          method: 'keys',
          key: `${pathToRoot}`,
        }),
      );
    },
    entries() {
      return external.sendMsg(
        stringify({
          method: 'entries',
          key: `${pathToRoot}`,
        }),
      );
    },
    values() {
      return external.sendMsg(
        stringify({
          method: 'values',
          key: `${pathToRoot}`,
        }),
      );
    },
    size() {
      return external.sendMsg(
        stringify({
          method: 'size',
          key: `${pathToRoot}`,
        }),
      );
    },
  };
}
