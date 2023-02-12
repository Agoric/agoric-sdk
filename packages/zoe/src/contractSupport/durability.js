import { makeAtomicProvider } from '@agoric/store/src/stores/store-utils.js';
import {
  makeScalarBigMapStore,
  provide,
  provideDurableMapStore,
  provideDurableSetStore,
} from '@agoric/vat-data';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

/// <reference types="@agoric/notifier/src/types-ambient.js"/>

/**
 * SCALE: Only for low cardinality provisioning. Every value from init() will
 * remain in the map for the lifetime of the heap. If a key object is GCed, its
 * representative also remains.
 *
 * @template {{}} E Ephemeral state
 * @template {{}} [K=any] key on which to provision
 * @param {(key: K) => E} init
 */
export const makeEphemeraProvider = init => {
  /** @type {WeakMap<K, E>} */
  const extant = new WeakMap();

  /**
   * Provide an object to hold state that need not (or cannot) be durable.
   *
   * @type {(key: K) => E}
   */
  return key => {
    if (extant.has(key)) {
      // @ts-expect-error cast
      return extant.get(key);
    }
    const newEph = init(key);
    extant.set(key, newEph);
    return newEph;
  };
};
harden(makeEphemeraProvider);

/**
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const makeStorageNodePathProvider = baggage => {
  /** @type {import('@agoric/store/src/stores/store-utils.js').AtomicProvider<StorageNode, string>} */
  const nodePaths = makeAtomicProvider(
    provideDurableMapStore(baggage, 'storage node paths'),
  );
  /** @param {ERef<StorageNode>} nodeP */
  return async nodeP => {
    const node = await nodeP;
    return nodePaths.provideAsync(node, n => E(n).getPath());
  };
};

/**
 * Provide an empty ZCF seat.
 *
 * @param {ZCF} zcf
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {string} name
 * @returns {ZCFSeat}
 */
export const provideEmptySeat = (zcf, baggage, name) => {
  return provide(baggage, name, () => zcf.makeEmptySeatKit().zcfSeat);
};
harden(provideEmptySeat);

/**
 * For making singletons, so that each baggage carries a separate kind definition (albeit of the definer)
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {string} category diagnostic tag
 */
export const provideChildBaggage = (baggage, category) => {
  const baggageSet = provideDurableSetStore(baggage, `${category}Set`);
  return Far('childBaggageManager', {
    // TODO(types) infer args
    /**
     * @template {Array} R rest of args besides Baggage
     * @template {(baggage: import('@agoric/ertp').Baggage, ...rest: R) => any} M Maker function
     * @param {string} childName diagnostic tag
     * @param {M} makeChild
     * @param {R} nonBaggageArgs
     * @returns {ReturnType<M>}
     */
    addChild: (childName, makeChild, ...nonBaggageArgs) => {
      const childStore = makeScalarBigMapStore(`${childName}${category}`, {
        durable: true,
      });
      const result = makeChild(childStore, ...nonBaggageArgs);
      baggageSet.add(childStore);
      return result;
    },
    children: () => baggageSet.values(),
  });
};
harden(provideChildBaggage);
/** @typedef {ReturnType<typeof provideChildBaggage>} ChildBaggageManager */
