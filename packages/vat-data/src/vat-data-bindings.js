/* global globalThis */

import { assert } from '@agoric/assert';
import {
  M,
  makeScalarMapStore,
  makeScalarWeakMapStore,
  makeScalarSetStore,
  makeScalarWeakSetStore,
  provideLazy,
} from '@agoric/store';

export {
  M,
  makeScalarMapStore,
  makeScalarWeakMapStore,
  makeScalarSetStore,
  makeScalarWeakSetStore,
};

/** @type {import('./types').VatData} */
let VatDataGlobal;
if ('VatData' in globalThis) {
  assert(globalThis.VatData, 'VatData defined in global as null or undefined');
  VatDataGlobal = globalThis.VatData;
} else {
  // XXX this module has been known to get imported (transitively) in cases that
  // never use it so we make a version that will satisfy module resolution but
  // fail at runtime.
  const unvailable = () => assert.fail('VatData unavailable');
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

/**
 * @deprecated Use Exo/ExoFactory/ExoKitFactory instead of kinds
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

/**
 * Unlike `provideLazy`, `provide` should be called at most once
 * within any vat incarnation with a given `baggage`,`key` pair.
 *
 * `provide` should only to be used to populate baggage,
 * where the total number of calls to `provide` must be
 * low cardinality, since we keep the bookkeeping to detect collisions
 * in normal language-heap memory. All the other baggage-oriented
 * `provide*` and `vivify*` functions call `provide`,
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
 * than one in the same vat incarnation with the same
 * baggage,key pair.
 *
 * @template K,V
 * @param {import('./types.js').Baggage} baggage
 * @param {K} key
 * @param {(key: K) => V} makeValue
 * @returns {V}
 */
export const provide = provideLazy;

export const provideDurableMapStore = (baggage, name) =>
  provide(baggage, name, () => makeScalarBigMapStore(name, { durable: true }));
harden(provideDurableMapStore);

export const provideDurableWeakMapStore = (baggage, name) =>
  provide(baggage, name, () =>
    makeScalarBigWeakMapStore(name, { durable: true }),
  );
harden(provideDurableWeakMapStore);

export const provideDurableSetStore = (baggage, name) =>
  provide(baggage, name, () => makeScalarBigSetStore(name, { durable: true }));
harden(provideDurableSetStore);
