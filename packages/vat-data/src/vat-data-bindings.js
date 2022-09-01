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
// TODO DANGER HAZARD DO NOT MERGE UNTIL FIXED
// Since this is not on master yet or even ready-for-review, and we don't know
// when it will be, by temporarily flipping the default here to `'true'`,
// I can get CI to run our entire system under this constraint to see what
// breaks.
const DETECT_PROVIDE_COLLISIONS =
  getEnvironmentOption('DETECT_PROVIDE_COLLISIONS', 'true') === 'true';

const { details: X, quote: q } = assert;

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

export const {
  defineKind,
  defineKindMulti,
  defineDurableKind,
  defineDurableKindMulti,
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
