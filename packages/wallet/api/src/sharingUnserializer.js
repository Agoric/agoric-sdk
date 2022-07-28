// @ts-check
import { Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';

/**
 * Make a pair of unserializers that share low-privilege values.
 *
 * @param {string} [lowProperty]
 */
export const makeSharingUnserializer = (lowProperty = 'boardId') => {
  const seen = {
    // high privilege - e.g. wallet purses
    // hi: new WeakMap(),  // ISSUE: WeakMap conflicts with string keys
    hi: new Map(),
    // low privilege - e.g. stuff on the board
    lo: new Map(),
  };

  const slotToVal = {
    /**
     * @param {Record<string, any>} slot
     * @param {string} iface
     */
    hi: (slot, iface) => {
      let obj;
      let key;

      if (lowProperty in slot) {
        key = slot[lowProperty];
        if (seen.lo.has(key)) {
          return seen.lo.get(key);
        }
        obj = Far(iface, {});
        seen.lo.set(key, obj);
      } else {
        key = JSON.stringify(slot);
        if (seen.hi.has(key)) {
          return seen.hi.get(key);
        }
        obj = Far(iface, {});
        seen.hi.set(key, obj);
      }
      return obj;
    },

    /**
     * @param {Record<string, any>} slot
     * @param {string} iface
     */
    lo: (slot, iface) => {
      if (seen.lo.has(slot)) {
        return seen.lo.get(slot);
      }
      const obj = Far(iface, {});
      seen.lo.set(slot, obj);
      return obj;
    },
  };

  const marshal = {
    hi: makeMarshal(undefined, slotToVal.hi, { marshalName: 'hi' }),
    lo: makeMarshal(undefined, slotToVal.lo, { marshalName: 'lo' }),
  };

  return {
    hi: Far('hi priv unserializer', { unserialize: marshal.hi.unserialize }),
    lo: Far('lo priv unserializer', { unserialize: marshal.lo.unserialize }),
  };
};
