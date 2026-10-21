import { E, Far } from '@endo/far';

export default function makeScratchPad() {
  const map = new Map();

  const keys = async () => {
    const keyList = [...map.keys()];
    return harden(keyList.sort());
  };

  const scratch = Far('scratchPad', {
    /** @param {import('@endo/far').ERef<unknown>} keyP */
    delete: async keyP => {
      const key = await keyP;
      map.delete(key);
    },
    /** @param {import('@endo/far').ERef<unknown>} keyP */
    get: async keyP => {
      const key = await keyP;
      return map.get(key);
    },
    /** @param {...unknown} path */
    lookup: (...path) => {
      if (path.length === 0) {
        return scratch;
      }
      const [first, ...rest] = path;
      const firstValue = E(scratch).get(first);
      if (rest.length === 0) {
        return firstValue;
      }
      return E(firstValue).lookup(...rest);
    },
    // Initialize a key only if it doesn't already exist.  Needed for atomicity
    // between multiple invocations.
    /**
     * @param {import('@endo/far').ERef<unknown>} keyP
     * @param {import('@endo/far').ERef<unknown>} objP
     */
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
    /**
     * @param {import('@endo/far').ERef<unknown>} keyP
     * @param {import('@endo/far').ERef<unknown>} objP
     */
    set: async (keyP, objP) => {
      const [key, obj] = await Promise.all([keyP, objP]);
      map.set(key, obj);
      return key;
    },
  });
  return scratch;
}
/** @typedef {ReturnType<typeof makeScratchPad>} ScratchPad */
