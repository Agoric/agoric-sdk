// @ts-check
// @jessie-check

import {
  makeExo,
  defineExoClass,
  defineExoClassKit,
  makeScalarMapStore,
  makeScalarSetStore,
  makeScalarWeakMapStore,
  makeScalarWeakSetStore,
  M,
} from '@agoric/store';

import { Far } from '@endo/far';

import { makeOnceKit } from './make-once.js';
import { agoricVatDataKeys as keys } from './keys.js';

/**
 * @type {import('.').Stores}
 */
const detachedHeapStores = Far('heapStores', {
  detached: () => detachedHeapStores,
  isStorable: _specimen => true,

  setStore: makeScalarSetStore,
  mapStore: makeScalarMapStore,
  weakMapStore: makeScalarWeakMapStore,
  weakSetStore: makeScalarWeakSetStore,
});

/**
 * Create a heap (in-memory) zone that uses the default exo and store implementations.
 *
 * @param {string} [baseLabel]
 * @returns {import('.').Zone}
 */
export const makeHeapZone = (baseLabel = 'heapZone') => {
  const { makeOnce, wrapProvider } = makeOnceKit(baseLabel, detachedHeapStores);
  return Far('heapZone', {
    exo: wrapProvider(makeExo, keys.exo),
    exoClass: wrapProvider(defineExoClass, keys.exoClass),
    exoClassKit: wrapProvider(defineExoClassKit, keys.exoClassKit),
    subZone: (label, _options) => {
      return makeOnce(label, () => makeHeapZone(`${baseLabel}.${label}`));
    },

    makeOnce,
    detached: detachedHeapStores.detached,
    isStorable: detachedHeapStores.isStorable,

    mapStore: wrapProvider(detachedHeapStores.mapStore),
    setStore: wrapProvider(detachedHeapStores.setStore),
    weakMapStore: wrapProvider(detachedHeapStores.weakMapStore),
    weakSetStore: wrapProvider(detachedHeapStores.weakSetStore),
  });
};
harden(makeHeapZone);

export { M };
