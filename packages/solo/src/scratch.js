import { Far } from '@endo/marshal';

export default function makeScratchPad() {
  const map = new Map();

  const keys = async () => {
    const keyList = [...map.keys()];
    return harden(keyList.sort());
  };

  return Far('scratchPad', {
    delete: async keyP => {
      const key = await keyP;
      map.delete(key);
    },
    get: async keyP => {
      const key = await keyP;
      return map.get(key);
    },
    // Initialize a key only if it doesn't already exist.  Needed for atomicity
    // between multiple invocations.
    init: async (keyP, objP) => {
      const [key, obj] = await Promise.all([keyP, objP]);
      if (map.has(key)) {
        throw Error(`Scratchpad already has key ${key}`);
      }
      map.set(key, obj);
      return key;
    },
    keys,
    // Legacy alias for `keys`.
    list: keys,
    set: async (keyP, objP) => {
      const [key, obj] = await Promise.all([keyP, objP]);
      map.set(key, obj);
      return key;
    },
  });
}
