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
  // deorecated
  prepareSingleton,
} from './exo-utils.js';

/** @typedef {import('./types.js').Baggage} Baggage */
/** @typedef {import('./types.js').DurableKindHandle} DurableKindHandle */
/** @template T @typedef {import('./types.js').DefineKindOptions<T>} DefineKindOptions */

// //////////////////////////// deprecated /////////////////////////////////////

export {
  // deprecated
  ignoreContext,
  provideKindHandle,
  prepareKind,
  prepareKindMulti,
} from './kind-utils.js';
