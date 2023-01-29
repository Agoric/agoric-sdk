import {
  defineExoClass,
  defineExoClassKit,
  makeExo,
} from './patterns/exo-makers.js';
import { makeScalarMapStore } from './stores/scalarMapStore.js';
import { makeScalarSetStore } from './stores/scalarSetStore.js';
import { makeScalarWeakMapStore } from './stores/scalarWeakMapStore.js';
import { makeScalarWeakSetStore } from './stores/scalarWeakSetStore.js';

/**
 * @type {Place}
 */
export const heapPlace = harden({
  exo: makeExo,
  exoClass: defineExoClass,
  exoClassKit: defineExoClassKit,

  mapStore: makeScalarMapStore,
  weakMapStore: makeScalarWeakMapStore,
  setStore: makeScalarSetStore,
  weakSetStore: makeScalarWeakSetStore,

  subPlace: (_label, _options = {}) => heapPlace,
});
