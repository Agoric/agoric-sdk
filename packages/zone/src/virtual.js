// @ts-check
// @jessie-check

import {
  canBeDurable,
  defineVirtualExoClass,
  defineVirtualExoClassKit,
  makeScalarBigMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakMapStore,
  makeScalarBigWeakSetStore,
  M,
} from '@agoric/vat-data';

import { Far } from '@endo/far';

import { makeOnceKit } from './make-once.js';

const emptyRecord = harden({});
const initEmpty = harden(() => emptyRecord);

/**
 * This implementation of `defineVirtualExo` only exists to ensure there are no
 * gaps in the virtualZone API.
 *
 * @type {import('.').Zone['exo']}
 */
const defineVirtualExo = (
  label,
  interfaceGuard,
  methods,
  options = undefined,
) => {
  const defineKindOptions =
    /** @type {import('@agoric/vat-data').DefineKindOptions<{ self: typeof methods }>} */ (
      options
    );
  const makeInstance = defineVirtualExoClass(
    label,
    interfaceGuard,
    initEmpty,
    methods,
    defineKindOptions,
  );
  return makeInstance();
};

/** @type {import('.').Stores} */
export const detachedVirtualStores = Far('virtualStores', {
  detached: () => detachedVirtualStores,
  isStorable: canBeDurable,
  mapStore: makeScalarBigMapStore,
  setStore: makeScalarBigSetStore,
  weakMapStore: makeScalarBigWeakMapStore,
  weakSetStore: makeScalarBigWeakSetStore,
});

/**
 * @param {string} baseLabel
 * @returns {import('.').Zone}
 */
const makeVirtualZone = baseLabel => {
  const { makeOnce, makeOnceWrapper } = makeOnceKit(
    baseLabel,
    detachedVirtualStores,
  );
  return Far('heapZone', {
    exo: makeOnceWrapper(defineVirtualExo),
    exoClass: makeOnceWrapper(defineVirtualExoClass),
    exoClassKit: makeOnceWrapper(defineVirtualExoClassKit),
    subZone: (label, _options) => {
      return makeOnce(label, () => makeVirtualZone(`${baseLabel}.${label}`));
    },

    makeOnce,
    detached: detachedVirtualStores.detached,
    isStorable: detachedVirtualStores.isStorable,

    mapStore: makeOnceWrapper(detachedVirtualStores.mapStore),
    setStore: makeOnceWrapper(detachedVirtualStores.setStore),
    weakMapStore: makeOnceWrapper(detachedVirtualStores.weakMapStore),
    weakSetStore: makeOnceWrapper(detachedVirtualStores.weakSetStore),
  });
};

/**
 * A zone that utilizes external storage to reduce the memory footprint of the
 * current vat.
 *
 * @type {import('.').Zone}
 */
export const virtualZone = makeVirtualZone('virtualZone');

export { M };
