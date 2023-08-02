// @jessie-check

/// <reference types="ses"/>
export {
  M,
  makeScalarMapStore,
  makeScalarWeakMapStore,
  makeScalarSetStore,
  makeScalarWeakSetStore,
} from '@agoric/store';
export {
  makeKindHandle,
  providePromiseWatcher,
  watchPromise,
  makeScalarBigMapStore,
  makeScalarBigWeakMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakSetStore,
  canBeDurable,
  pickFacet,
  partialAssign,
  provide,
  provideDurableMapStore,
  provideDurableWeakMapStore,
  provideDurableSetStore,
  provideDurableWeakSetStore,
  // deprecated
  defineKind,
  defineKindMulti,
  defineDurableKind,
  defineDurableKindMulti,
} from './vat-data-bindings.js';
export {
  defineVirtualExoClass,
  defineVirtualExoClassKit,
  defineDurableExoClass,
  defineDurableExoClassKit,
  prepareExoClass,
  prepareExoClassKit,
  prepareExo,
  // deprecated
  prepareSingleton,
} from './exo-utils.js';

/** @typedef {import('@agoric/swingset-liveslots/src/vatDataTypes').Baggage} Baggage */
/** @typedef {import('@agoric/swingset-liveslots/src/vatDataTypes').DurableKindHandle} DurableKindHandle */
/** @template T @typedef {import('@agoric/swingset-liveslots/src/vatDataTypes').DefineKindOptions<T>} DefineKindOptions */

// //////////////////////////// deprecated /////////////////////////////////////

/**
 * @deprecated Use Exos/ExoClasses instead of Kinds
 */
export {
  ignoreContext,
  provideKindHandle,
  prepareKind,
  prepareKindMulti,
} from './exo-utils.js';
