/* global globalThis */

import { Fail, assert } from '@agoric/assert';
import {
  M,
  makeScalarMapStore,
  makeScalarWeakMapStore,
  makeScalarSetStore,
  makeScalarWeakSetStore,
  provideLazy,
} from '@agoric/store';

// TODO import from proper place. See note in that module.
import { makeEnvironmentCaptor } from './environment-options.js';

/** @typedef {import('./types.js').Baggage} Baggage */

export {
  M,
  makeScalarMapStore,
  makeScalarWeakMapStore,
  makeScalarSetStore,
  makeScalarWeakSetStore,
};

const { getEnvironmentOption } = makeEnvironmentCaptor(globalThis);
const DETECT_PROVIDE_COLLISIONS =
  getEnvironmentOption('DETECT_PROVIDE_COLLISIONS', 'false') === 'true';

const { details: X, quote: q } = assert;

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
 * @template {string} K
 * @template V
 * @typedef {Map<K, (key:K) => V>} ProvisionEntries
 */

/**
 * @template {string} K
 * @template V
 * @type {WeakMap<Baggage, ProvisionEntries<K,V>>}
 */
// @ts-expect-error I only use it when DETECT_PROVIDE_COLLISIONS , so I
// know it is not `undefined` in those cases.
const provisionTracker = DETECT_PROVIDE_COLLISIONS ? new WeakMap() : undefined;

/**
 * HAZARD: `assertUniqueProvide` uses top-level mutable state, but only for
 * diagnostic purposes.
 * Aside from being able to provoke it to throw an error, it is not
 * otherwise usable as a top-level communications channel. The throwing-or-not
 * of the error is the only way in which this top level state is observable.
 *
 * TODO since this still does violate our security assumptions, we should
 * consider making it development-time only, and turn it off in production.
 * Or better, adapt it to stop using top-level state.
 *
 * The condition it checks for is that, within one incarnation, the
 * `provide` is never called twice with the same `mapStore`
 * and the same `key`. For a given `mapStore` and `key`, there should be at
 * most one `provide` call but any number of `get` calls.
 *
 * When the `mapStore` is baggage, for purposes of upgrade, then we
 * expect `provide` to be called with the same `baggage` and `key`
 * (and some `makeValue`) in each incarnation of that vat.
 * In the incarnation that first registers this `baggage`,`key` pair, the
 * `provide` will actually call the `makeValue`. The one `provide` call
 * for this pair in each succeeding incarnation will merely retrieve the value it
 * inherited from the previous incarnation. But even for this case, it should
 * only call `provide` for that pair once during that incarnation.
 *
 * @template {string} K
 * @template V
 * @param {Baggage} baggage
 * @param {K} key
 * @param {(key: K) => V} makeValue
 */
const assertUniqueProvide = (baggage, key, makeValue) => {
  if (provisionTracker.has(baggage)) {
    /** @type {ProvisionEntries<K,V>} */
    // @ts-expect-error TS doesn't understand that .has guarantees .get
    const submap = provisionTracker.get(baggage);
    assert(submap !== undefined);
    if (submap.has(key)) {
      if (submap.get(key) === makeValue) {
        // The error message also tells us if the colliding calls happened
        // to use the same `makeValue` only as a clue about whether
        // these are two separate evaluations at of the same call site or
        // two distinct call sites. However, this clue is unreliable in
        // both directions.
        assert.fail(
          X`provide collision on ${q(
            key,
          )} with same makeValue. Consider provideLazy()`,
        );
      } else {
        assert.fail(X`provide collision on ${q(key)} with different makeValue`);
      }
    } else {
      submap.set(key, makeValue);
    }
  } else {
    const submap = new Map([[key, makeValue]]);
    // @ts-expect-error This type error I don't understand
    provisionTracker.set(baggage, submap);
  }
};

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
 *
 * @template {string} K
 * @template V
 * @param {Baggage} baggage
 * @param {K} key
 * @param {(key: K) => V} makeValue
 * @returns {V}
 */
export const provide = (baggage, key, makeValue) => {
  if (DETECT_PROVIDE_COLLISIONS) {
    assertUniqueProvide(baggage, key, makeValue);
  }
  return provideLazy(baggage, key, makeValue);
};
harden(provide);

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
