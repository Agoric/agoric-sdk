// key is a full path string, e.g.:
// "kernel.vats.vat1.kernelSlotToVatSlot.exports"
// we want to add a key and value to be able to iterate:
// key: 'kernel.vats.vat1.kernelSlotToVatSlot'
// value: ['exports]
function setKeys(state, key) {
  const fullPathArray = key.split('.');
  const oneUp = fullPathArray.slice(0, -1).join('.');
  const lastKey = fullPathArray[fullPathArray.length - 1];
  const keysKey = `keys.${oneUp}`;
  let keys = state[keysKey];
  if (keys === undefined) {
    keys = [];
  }
  keys.push(lastKey);
  const keySet = new Set(keys);
  keys = Array.from(keySet);
  state[keysKey] = keys.sort();
}

function deleteKeys(state, key) {
  const fullPathArray = key.split('.');
  const oneUp = fullPathArray.slice(0, -1).join('.');
  const lastKey = fullPathArray[fullPathArray.length - 1];
  const keysKey = `keys.${oneUp}`;
  let keys = state[keysKey];
  if (keys === undefined) {
    keys = [];
  }
  const index = keys.indexOf(lastKey);
  if (index > -1) {
    keys.splice(index, 1);
    state[keysKey] = keys.sort();
  }
}

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
      if (key.includes('undefined')) {
        throw new Error(`key ${key} value ${value} includes undefined`);
      }
      state[key] = value;
      setKeys(state, key);
    },
    has(key) {
      return Object.prototype.hasOwnProperty.call(state, key);
    },
    delete(key) {
      delete state[key];
      deleteKeys(state, key);
    },
    // reverseIterator

    // additional helpers that aren't part of kvstore

    keys(key) {
      return state[`keys.${key}`] || [];
    },
    entries(key) {
      const entries = [];
      const keys = state[`keys.${key}`] || [];
      for (const k of keys) {
        const v = state[`${key}.${k}`];
        entries.push({
          key: k,
          value: v,
        });
      }
      return entries;
    },
    values(key) {
      const values = [];
      const keys = state[`keys.${key}`] || [];
      for (const k of keys) {
        const v = state[`${key}.${k}`];
        values.push(v);
      }
      return values;
    },
    size(key) {
      return state[`keys.${key}`].length;
    },
  };
}
