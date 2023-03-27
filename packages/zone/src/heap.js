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

/**
 * @type {import('.').Stores}
 */
const heapStores = Far('heapStores', {
  detached: () => heapStores,
  isStorable: _specimen => true,

  setStore: makeScalarSetStore,
  mapStore: makeScalarMapStore,
  weakMapStore: makeScalarWeakMapStore,
  weakSetStore: makeScalarWeakSetStore,
});

/**
 * A heap (in-memory) zone that uses the default exo and store implementations.
 *
 * @type {import('.').Zone}
 */
export const heapZone = Far('heapZone', {
  exoClass: defineExoClass,
  exoClassKit: defineExoClassKit,
  exo: makeExo,
  subZone: (_label, _options) => heapZone,
  ...heapStores,
});

export { M };
