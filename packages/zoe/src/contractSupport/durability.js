import { allValues, objectMap } from '@agoric/internal';
import { makeAtomicProvider } from '@agoric/store/src/stores/store-utils.js';
import {
  makeScalarBigMapStore,
  provide,
  provideDurableMapStore,
  provideDurableSetStore,
} from '@agoric/vat-data';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

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
 * @deprecated use Recorder getStoragePath() which memoizes
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

/**
 * For use in contract upgrades to provide values that come from other vats.
 * All vats must be able to finish their upgrade without contacting other vats,
 * so whatever values an instance needs from other vats must be saved in the first
 * incarnation and read from baggage in each subsequent.
 *
 * This abstracts that condition so that the contract can convert a dictionary of promises
 * into a dictionary of values during its first prepare (start) and each additional
 * automatically reads from the baggage.
 *
 * For example,
 *
 *     const invitationIssuerP = E(zoe).getInvitationIssuer();
 *     const {
 *       invitationIssuer,
 *       invitationBrand,
 *     } = await provideAll(baggage, {
 *       invitationIssuer: invitationIssuerP,
 *       invitationBrand: E(invitationIssuerP).getBrand(),
 *     });
 *
 * @template {Record<string, Promise>} T dict of promises
 * @param {MapStore<string, any>} baggage
 * @param {T} keyedPromises
 * @returns {Promise<{ [K in keyof T]: Awaited<T[K]> }>}
 */
export const provideAll = (baggage, keyedPromises) => {
  const keys = Object.keys(keyedPromises);
  // assume if any keys are defined they all are
  const inBaggage = baggage.has(keys[0]);
  if (inBaggage) {
    const obj = objectMap(
      keyedPromises,
      /** @type {(value: any, key: string) => any} */
      (_, k) => baggage.get(k),
    );
    return Promise.resolve(harden(obj));
  }

  return allValues(keyedPromises).then(keyedVals => {
    for (const [k, v] of Object.entries(keyedVals)) {
      baggage.init(k, v);
    }
    return keyedVals;
  });
};
harden(provideAll);
