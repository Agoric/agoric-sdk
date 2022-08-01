// @ts-check
import { Far, makeMarshal } from '@endo/marshal';

/**
 * Make a pair of unserializers that share low-privilege values.
 *
 * The "high" privilege unserializer can understand objects as slots, such as
 * those from the wallet serializer. The "low" privilege unserializer can only
 * understand strings as slots, such as those from the board serializer.
 *
 * This provides a way, for instance, to get identical brand references from
 * both a public contract and a user's purses.
 *
 * @param {string} [lowProperty] - The key name to check on a high privilege
 * slot object. If the string value at this key is equivalent to the value of
 * another low privilege slot, the high privilege unserializer will return the
 * same object for both slots.
 */
export const makeSharingUnserializer = lowProperty => {
  assert(lowProperty, 'lowProperty must be specified for sharing unserializer');
  const seen = {
    // high: new WeakMap(),  // ISSUE: WeakMap conflicts with string keys
    high: new Map(),
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
