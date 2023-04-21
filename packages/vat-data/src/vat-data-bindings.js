/* global globalThis */

import { Fail } from '@agoric/assert';
import { provideLazy } from '@agoric/store';

/** @type {import('./types').VatData} */
let VatDataGlobal;
if ('VatData' in globalThis) {
  globalThis.VatData || Fail`VatData defined in global as null or undefined`;
  VatDataGlobal = globalThis.VatData;
} else {
  // XXX this module has been known to get imported (transitively) in cases that
  // never use it so we make a version that will satisfy module resolution but
  // fail at runtime.
  const unvailable = () => Fail`VatData unavailable`;
  VatDataGlobal = {
    defineKind: unvailable,
    defineKindMulti: unvailable,
    defineDurableKind: unvailable,
    defineDurableKindMulti: unvailable,
    makeKindHandle: unvailable,
    providePromiseWatcher: unvailable,
    watchPromise: unvailable,
    makeScalarBigMapStore: unvailable,
    makeScalarBigWeakMapStore: unvailable,
    makeScalarBigSetStore: unvailable,
    makeScalarBigWeakSetStore: unvailable,
    canBeDurable: unvailable,
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
 * When making a multi-facet kind, it's common to pick one facet to expose. E.g.,
 *
 *     const makeFoo = (a, b, c, d) => makeFooBase(a, b, c, d).self;
 *
 * This helper reduces the duplication:
 *
 *     const makeFoo = pickFacet(makeFooBase, 'self');
 *
 * @type {import('./types').PickFacet}
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

// XXX copied from @agoric/store types
// UNTIL https://github.com/Agoric/agoric-sdk/issues/4560
/**
 * @typedef {object} StoreOptions
 * Of the dimensions on which KeyedStores can differ, we only represent a few
 * of them as standard options. A given store maker should document which
 * options it supports, as well as its positions on dimensions for which it
 * does not support options.
 * @property {boolean} [longLived=true] Which way to optimize a weak store. True means
 * that we expect this weak store to outlive most of its keys, in which
 * case we internally may use a JavaScript `WeakMap`. Otherwise we internally
 * may use a JavaScript `Map`.
 * Defaults to true, so please mark short lived stores explicitly.
 * @property {boolean} [durable=false]  The contents of this store survive termination
 *   of its containing process, allowing for restart or upgrade but at the cost
 *   of forbidding storage of references to ephemeral data.  Defaults to false.
 * @property {boolean} [fakeDurable=false]  This store pretends to be a durable store
 *   but does not enforce that the things stored in it actually be themselves
 *   durable (whereas an actual durable store would forbid storage of such
 *   items).  This is in service of allowing incremental transition to use of
 *   durable stores, to enable normal operation and testing when some stuff
 *   intended to eventually be durable has not yet been made durable.  A store
 *   marked as fakeDurable will appear to operate normally but any attempt to
 *   upgrade its containing vat will fail with an error.
 * @property {import('./types').Pattern} [keyShape]
 * @property {import('./types').Pattern} [valueShape]
 */
/**
 * Unlike `provideLazy`, `provide` should be called at most once
 * within any vat incarnation with a given `baggage`,`key` pair.
 *
 * `provide` should only to be used to populate baggage,
 * where the total number of calls to `provide` must be
 * low cardinality, since we keep the bookkeeping to detect collisions
 * in normal language-heap memory. All the other baggage-oriented
 * `provide*` and `prepare*` functions call `provide`,
 * and so impose the same constraints. This is consistent with
 * our expected durability patterns: What we store in baggage are
 *    * kindHandles, which are per kind, which must be low cardinality
 *    * data "variables" for reestablishing the lexical scope, especially
 *      of singletons
 *    * named non-baggage collections at the leaves of the baggage tree.
 *
 * What is expected to be high cardinality are the instances of the kinds,
 * and the members of the non-bagggage collections.
 *
 * TODO https://github.com/Agoric/agoric-sdk/pull/5875 :
 * Implement development-time instrumentation to detect when
 * `provide` violates the above prescription, and is called more
 * than once in the same vat incarnation with the same
 * baggage,key pair.
 */

export const provide =
  // XXX cast because provideLazy is `any` due to broken type import
  /** @type {<K, V>(baggage: import('./types.js').Baggage, key: K, makeValue: (key: K) => V) => V} */ (
    provideLazy
  );

// TODO: Find a good home for this function used by @agoric/vat-data and testing code
/** @param {import('@agoric/vat-data/src/types').VatData} VatData */
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
   * @param {import('./types').Baggage} baggage
   * @param {string} name
   * @param {Omit<StoreOptions, 'durable'>} options
   */
  const provideDurableMapStore = (baggage, name, options = {}) =>
    provide(baggage, name, () =>
      makeScalarBigMapStore(name, { durable: true, ...options }),
    );
  harden(provideDurableMapStore);

  /**
   * @param {import('./types').Baggage} baggage
   * @param {string} name
   * @param {Omit<StoreOptions, 'durable'>} options
   */
  const provideDurableWeakMapStore = (baggage, name, options = {}) =>
    provide(baggage, name, () =>
      makeScalarBigWeakMapStore(name, { durable: true, ...options }),
    );
  harden(provideDurableWeakMapStore);

  /**
   * @param {import('./types').Baggage} baggage
   * @param {string} name
   * @param {Omit<StoreOptions, 'durable'>} options
   */
  const provideDurableSetStore = (baggage, name, options = {}) =>
    provide(baggage, name, () =>
      makeScalarBigSetStore(name, { durable: true, ...options }),
    );
  harden(provideDurableSetStore);

  /**
   * @param {import('./types').Baggage} baggage
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
