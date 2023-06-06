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
  const { makeOnce, makeOnceWrapper } = makeOnceKit(
    baseLabel,
    detachedHeapStores,
  );
  return Far('heapZone', {
    exo: makeOnceWrapper(makeExo),
    exoClass: makeOnceWrapper(defineExoClass),
    exoClassKit: makeOnceWrapper(defineExoClassKit),
    subZone: (label, _options) => {
      return makeOnce(label, () => makeHeapZone(`${baseLabel}.${label}`));
    },

    makeOnce,
    detached: detachedHeapStores.detached,
    isStorable: detachedHeapStores.isStorable,

    mapStore: makeOnceWrapper(detachedHeapStores.mapStore),
    setStore: makeOnceWrapper(detachedHeapStores.setStore),
    weakMapStore: makeOnceWrapper(detachedHeapStores.weakMapStore),
    weakSetStore: makeOnceWrapper(detachedHeapStores.weakSetStore),
  });
};
harden(makeHeapZone);

export { M };
