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
      const strValue = external.sendMsg(
        stringify({
          method: 'get',
          key: `${pathToRoot}.${key}`,
        }),
      );
      const value = JSON.parse(strValue);
      if (value === 'kvstore') {
        return makeExternalKVStore(`${pathToRoot}.${key}`, external);
      }
      return value;
    },
    set(key, value) {
      if (value.get) {
        // is a kvstore itself
        value = 'kvstore';
      }
      return external.sendMsg(
        stringify({
          method: 'set',
          key: `${pathToRoot}.${key}`,
          value,
        }),
      );
    },
    has(key) {
      const boolArrayStr = external.sendMsg(
        stringify({
          method: 'has',
          key: `${pathToRoot}.${key}`,
        }),
      );
      return JSON.parse(boolArrayStr)[0]; // JSON compatibility
    },
    keys() {
      const strKeys = external.sendMsg(
        stringify({
          method: 'keys',
          key: `${pathToRoot}`,
        }),
      );
      return JSON.parse(strKeys);
    },
    entries() {
      const strEntries = external.sendMsg(
        stringify({
          method: 'entries',
          key: `${pathToRoot}`,
        }),
      );
      const results = [];
      const entries = JSON.parse(strEntries);
      for (const entry of entries) {
        if (entry.value === 'kvstore') {
          results.push({
            key: entry.key,
            value: makeExternalKVStore(`${pathToRoot}.${entry.key}`, external),
          });
        } else {
          results.push(entry);
        }
      }
      return results;
    },
    values() {
      const strEntries = external.sendMsg(
        stringify({
          method: 'entries',
          key: `${pathToRoot}`,
        }),
      );
      const values = [];
      const entries = JSON.parse(strEntries);
      for (const entry of entries) {
        if (entry.value === 'kvstore') {
          values.push(
            makeExternalKVStore(`${pathToRoot}.${entry.key}`, external),
          );
        } else {
          values.push(entry.value);
        }
      }
      return values;
    },
    size() {
      const strSize = external.sendMsg(
        stringify({
          method: 'size',
          key: `${pathToRoot}`,
        }),
      );
      return JSON.parse(strSize);
    },
  };
}
