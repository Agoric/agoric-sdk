// @ts-check
import { Far, makeMarshal } from '@endo/marshal';

/**
 * Make a pair of unserializers that share low-privilege values.
 *
 * @param {string} [lowProperty]
 */
export const makeSharingUnserializer = (lowProperty = 'boardId') => {
  const seen = {
    // high privilege - e.g. wallet purses
    // hi: new WeakMap(),  // ISSUE: WeakMap conflicts with string keys
    high: new Map(),
    // low privilege - e.g. stuff on the board
    low: new Map(),
  };

  const slotToVal = {
    /**
     * @param {Record<string, any>} slot
     * @param {string} iface
     */
    high: (slot, iface) => {
      let obj;
      let key;

      if (lowProperty in slot) {
        key = slot[lowProperty];
        if (seen.low.has(key)) {
          return seen.low.get(key);
        }
        obj = Far(iface, {});
        seen.low.set(key, obj);
      } else {
        key = JSON.stringify(slot);
        if (seen.high.has(key)) {
          return seen.high.get(key);
        }
        obj = Far(iface, {});
        seen.high.set(key, obj);
      }
      return obj;
    },

    /**
     * @param {Record<string, any>} slot
     * @param {string} iface
     */
    low: (slot, iface) => {
      if (seen.low.has(slot)) {
        return seen.low.get(slot);
      }
      const obj = Far(iface, {});
      seen.low.set(slot, obj);
      return obj;
    },
  };

  const marshal = {
    high: makeMarshal(undefined, slotToVal.high, { marshalName: 'high' }),
    low: makeMarshal(undefined, slotToVal.low, { marshalName: 'low' }),
  };

  return {
    high: Far('high privilege unserializer', {
      unserialize: marshal.high.unserialize,
    }),
    low: Far('low privilege unserializer', {
      unserialize: marshal.low.unserialize,
    }),
  };
};
