/* global globalThis */

import { Fail } from '@endo/errors';
import { provideLazy } from '@agoric/store';

/** @import {Baggage, PickFacet, VatData} from '@agoric/swingset-liveslots' */

/** @type {VatData} */
let VatDataGlobal;
if ('VatData' in globalThis) {
  globalThis.VatData || Fail`VatData defined in global as null or undefined`;
  // XXX types incompatibility
  VatDataGlobal = /** @type {any} */ (globalThis.VatData);
} else {
  // XXX this module has been known to get imported (transitively) in cases that
  // never use it so we make a version that will satisfy module resolution but
  // fail at runtime.
  const unavailable = () => Fail`VatData unavailable`;
  VatDataGlobal = {
    defineKind: unavailable,
    defineKindMulti: unavailable,
    defineDurableKind: unavailable,
    defineDurableKindMulti: unavailable,
    makeKindHandle: unavailable,
    providePromiseWatcher: unavailable,
    watchPromise: unavailable,
    makeScalarBigMapStore: unavailable,
    makeScalarBigWeakMapStore: unavailable,
    makeScalarBigSetStore: unavailable,
    makeScalarBigWeakSetStore: unavailable,
    canBeDurable: unavailable,
  };
}

const VatDataExport = VatDataGlobal;
export { VatDataExport as VatData };

/**
 * @deprecated Use Exos/ExoClasses instead of Kinds
 */
export const {
  defineKind,
  defineKindMulti,
  defineDurableKind,
  defineDurableKindMulti,
} = VatDataGlobal;

export const {
  makeKindHandle,
  providePromiseWatcher,
  watchPromise,
  makeScalarBigMapStore,
  makeScalarBigWeakMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakSetStore,
  canBeDurable,
} = VatDataGlobal;

/**
 * When making a multi-facet kind, it's common to pick one facet to expose.
 * E.g.,
 *
 *     const makeFoo = (a, b, c, d) => makeFooBase(a, b, c, d).self;
 *
 * This helper reduces the duplication:
 *
 *     const makeFoo = pickFacet(makeFooBase, 'self');
 *
 * @type {PickFacet}
 */
export const pickFacet =
  (maker, facetName) =>
  (...args) =>
    maker(...args)[facetName];
harden(pickFacet);

/**
 * Assign the values of all of the enumerable own properties from the source
 * object to their keys in the target object.
 *
 * @template {{}} T
 * @param {T} target
 * @param {Partial<T>} source
 */
export const partialAssign = (target, source) => {
  Object.assign(target, source);
};
harden(partialAssign);

/** @import {StoreOptions} from '@agoric/store' */

/**
 * Unlike `provideLazy`, `provide` should be called at most once within any vat
 * incarnation with a given `baggage`,`key` pair.
 *
 * `provide` should only be used to populate baggage, where the total number of
 * calls to `provide` must be low cardinality, since we keep the bookkeeping to
 * detect collisions in normal language-heap memory. All the other
 * baggage-oriented `provide*` and `prepare*` functions call `provide`, and so
 * impose the same constraints. This is consistent with our expected durability
 * patterns: What we store in baggage are
 *
 * - kindHandles, which are per kind, which must be low cardinality
 * - data "variables" for reestablishing the lexical scope, especially of
 *   singletons
 * - named non-baggage collections at the leaves of the baggage tree.
 *
 * What is expected to be high cardinality are the instances of the kinds, and
 * the members of the non-bagggage collections.
 *
 * TODO https://github.com/Agoric/agoric-sdk/pull/5875 : Implement
 * development-time instrumentation to detect when `provide` violates the above
 * prescription, and is called more than once in the same vat incarnation with
 * the same baggage,key pair.
 */

export const provide =
  // XXX cast because provideLazy is `any` due to broken type import
  /**
   * @type {<K, V>(
   *   baggage: Baggage,
   *   key: K,
   *   makeValue: (key: K) => V,
   * ) => V}
   */ (provideLazy);

// TODO: Find a good home for this function used by @agoric/vat-data and testing code
/** @param {VatData} VatData */
export const makeStoreUtils = VatData => {
  const {
    // eslint-disable-next-line no-shadow -- these literally do shadow the globals
    makeScalarBigMapStore,
    // eslint-disable-next-line no-shadow -- these literally do shadow the globals
    makeScalarBigWeakMapStore,
    // eslint-disable-next-line no-shadow -- these literally do shadow the globals
    makeScalarBigSetStore,
    // eslint-disable-next-line no-shadow -- these literally do shadow the globals
    makeScalarBigWeakSetStore,
  } = VatData;

  /**
   * @param {Baggage} baggage
   * @param {string} name
   * @param {Omit<StoreOptions, 'durable'>} options
   */
  const provideDurableMapStore = (baggage, name, options = {}) =>
    provide(baggage, name, () =>
      makeScalarBigMapStore(name, { durable: true, ...options }),
    );
  harden(provideDurableMapStore);

  /**
   * @param {Baggage} baggage
   * @param {string} name
   * @param {Omit<StoreOptions, 'durable'>} options
   */
  const provideDurableWeakMapStore = (baggage, name, options = {}) =>
    provide(baggage, name, () =>
      makeScalarBigWeakMapStore(name, { durable: true, ...options }),
    );
  harden(provideDurableWeakMapStore);

  /**
   * @param {Baggage} baggage
   * @param {string} name
   * @param {Omit<StoreOptions, 'durable'>} options
   */
  const provideDurableSetStore = (baggage, name, options = {}) =>
    provide(baggage, name, () =>
      makeScalarBigSetStore(name, { durable: true, ...options }),
    );
  harden(provideDurableSetStore);

  /**
   * @param {Baggage} baggage
   * @param {string} name
   * @param {Omit<StoreOptions, 'durable'>} options
   */
  const provideDurableWeakSetStore = (baggage, name, options = {}) =>
    provide(baggage, name, () =>
      makeScalarBigWeakSetStore(name, { durable: true, ...options }),
    );
  harden(provideDurableWeakSetStore);

  return harden({
    provideDurableMapStore,
    provideDurableWeakMapStore,
    provideDurableSetStore,
    provideDurableWeakSetStore,
  });
};

const globalStoreUtils = makeStoreUtils(VatDataGlobal);
export const {
  provideDurableMapStore,
  provideDurableWeakMapStore,
  provideDurableSetStore,
  provideDurableWeakSetStore,
} = globalStoreUtils;
