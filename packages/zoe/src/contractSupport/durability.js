import { Fail } from '@agoric/assert';
import { allValues, objectMap } from '@agoric/internal';
import { provide, provideDurableMapStore } from '@agoric/vat-data';
import { E } from '@endo/eventual-send';

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
 * @template {(baggage: import('@agoric/ertp').Baggage, ...rest: any[]) => any} M Maker function
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {string} category diagnostic tag
 * @param {M} prepareSingleton
 * @param {any[]} categoryArgs
 */
export const provideCategorySingletons = (
  baggage,
  category,
  prepareSingleton,
  categoryArgs,
) => {
  /** @type {MapStore<number, unknown[]>} */
  const singletonArgs = provideDurableMapStore(baggage, `args of ${category}`);
  /** @type {MapStore<number, import('@agoric/vat-data').Baggage>} */
  const singletonBaggages = provideDurableMapStore(
    baggage,
    `baggages of ${category}`,
  );
  singletonArgs.getSize() === singletonBaggages.getSize() ||
    Fail`mismatched store sizes`;

  // restore from baggage
  const singletons = [...singletonArgs.entries()].map(([index, args]) => {
    const singletonBaggage = singletonBaggages.get(index);
    return prepareSingleton(singletonBaggage, ...categoryArgs, ...args);
  });

  return {
    /**
     * @param {string} tag diagnostic tag
     * @param {any[]} args
     * @returns {ReturnType<ReturnType<M>>}
     */
    makeSingleton: (tag, ...args) => {
      console.log(
        'DURABILITY makeSingleton',
        singletonArgs.getSize(),
        singletonBaggages.getSize(),
        ...args,
      );
      const index = singletonArgs.getSize();
      index === singletonBaggages.getSize() || Fail`mismatched store sizes`;

      // new data
      const singletonBaggage = provideDurableMapStore(
        baggage,
        `${tag}${category}`,
      );
      const makeSingleton = prepareSingleton(
        singletonBaggage,
        ...categoryArgs,
        ...args,
      );
      const singleton = makeSingleton();

      // upon success, commit
      singletons[index] = singleton;
      singletonArgs.init(index, harden(args));
      singletonBaggages.init(index, singletonBaggage);

      return singleton;
    },
    /** @type {(index: number) => ReturnType<ReturnType<M>>} */
    get: index => {
      // assume the stores are equal size but check against the array
      singletons.length === singletonBaggages.getSize() ||
        Fail`mismatched lengths`;
      index < singletons.length || Fail`no singleton at index ${index}`;
      return singletons[index];
    },
    length: () => singletons.length,
  };
};
harden(provideCategorySingletons);

/**
 * For use in contract upgrades to provide values that come from other vats.
 * All vats must be able to finish their upgrade without contacting other vats,
 * so whatever values an instance needs from other vats must be saved in the first
 * incarnation and read from baggage in each subsequent.
 *
 * This abstracts that condition so that the contract can convert a dictionary
 * of thunks into a dictionary of values during its first `prepare` (start).
 * Each subsequent `prepare` call will automatically read from the baggage and
 * eschew remote calls.
 *
 * The values are thunks instead of promises so that they don't start executing
 * unnecessarily or induce failures.
 *
 * For example,
 *
 *     const invitationIssuerP = E(zoe).getInvitationIssuer();
 *     const {
 *       invitationIssuer,
 *       invitationBrand,
 *     } = await provideAll(baggage, {
 *       invitationIssuer: () => invitationIssuerP,
 *       invitationBrand: () => E(invitationIssuerP).getBrand(),
 *     });
 *
 * @template {Record<string, () => ERef<any>>} T dict of thunks (promise makers)
 * @param {MapStore<string, any>} baggage
 * @param {T} thunks
 * @returns {Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>}
 */
export const provideAll = (baggage, thunks) => {
  const keys = Object.keys(thunks);
  // assume if any keys are defined they all are
  const inBaggage = baggage.has(keys[0]);
  if (inBaggage) {
    const obj = objectMap(
      thunks,
      /** @type {(value: any, key: string) => any} */
      (_, k) => baggage.get(k),
    );
    return Promise.resolve(harden(obj));
  }

  const keyedPromises = objectMap(thunks, fn => fn());

  return allValues(keyedPromises).then(keyedVals => {
    for (const [k, v] of Object.entries(keyedVals)) {
      baggage.init(k, v);
    }
    return keyedVals;
  });
};
harden(provideAll);

/**
 * Like provideAsync in AtomicProvider but assumes only one call so there are no race conditions.
 * Additionally offers a `withValue` helper useful for triggering procesess on a provided object.
 *
 * @see {makeAtomicProvider}
 * @see {AtomicProvider}
 * @template {() => ERef<any>} T
 * @param {import('@agoric/vat-data').Baggage} mapStore
 * @param {string} key
 * @param {T} makeValue
 * @param {(value: Awaited<ReturnType<T>>) => void} [withValue]
 * @returns {Promise<Awaited<ReturnType<T>>>}
 */
export const provideSingleton = (mapStore, key, makeValue, withValue) => {
  const stored =
    mapStore.has(key) ||
    E.when(makeValue(), v => mapStore.init(key, harden(v)));

  return E.when(stored, () => {
    const value = mapStore.get(key);
    if (withValue) {
      withValue(value);
    }
    return value;
  });
};
