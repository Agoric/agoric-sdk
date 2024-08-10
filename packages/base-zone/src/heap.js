// @ts-check
// @jessie-check

import { Far, isPassable } from '@endo/pass-style';
import { makeExo, defineExoClass, defineExoClassKit } from '@endo/exo';
import {
  makeScalarMapStore,
  makeScalarSetStore,
  makeScalarWeakMapStore,
  makeScalarWeakSetStore,
} from '@agoric/store';

import { makeOnceKit } from './make-once.js';
import { agoricVatDataKeys as keys } from './keys.js';
import { watchPromise } from './watch-promise.js';

/**
 * @type {import('./types.js').Stores}
 */
const detachedHeapStores = Far('heapStores', {
  detached: () => detachedHeapStores,
  isStorable: isPassable,

  setStore: makeScalarSetStore,
  mapStore: makeScalarMapStore,
  weakMapStore: makeScalarWeakMapStore,
  weakSetStore: makeScalarWeakSetStore,
});

/**
 * Create a heap (in-memory) zone that uses the default exo and store implementations.
 *
 * @param {string} [baseLabel]
 * @returns {import('./types.js').Zone}
 */
export const makeHeapZone = (baseLabel = 'heapZone') => {
  const { makeOnce, wrapProvider } = makeOnceKit(baseLabel, detachedHeapStores);

  /**
   * @param {string} label
   * @param {any} _options
   */
  const makeSubZone = (label, _options) =>
    makeHeapZone(`${baseLabel}.${label}`);

  return Far('heapZone', {
    exo: wrapProvider(makeExo, keys.exo),
    exoClass: wrapProvider(defineExoClass, keys.exoClass),
    exoClassKit: wrapProvider(defineExoClassKit, keys.exoClassKit),
    subZone: wrapProvider(makeSubZone),

    makeOnce,
    watchPromise,
    detached: detachedHeapStores.detached,
    isStorable: detachedHeapStores.isStorable,

    mapStore: wrapProvider(detachedHeapStores.mapStore),
    setStore: wrapProvider(detachedHeapStores.setStore),
    weakMapStore: wrapProvider(detachedHeapStores.weakMapStore),
    weakSetStore: wrapProvider(detachedHeapStores.weakSetStore),
  });
};
harden(makeHeapZone);
