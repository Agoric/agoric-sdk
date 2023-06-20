// @ts-check
// @jessie-check

import {
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
import { agoricVatDataKeys as keys } from './keys.js';

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

/**
 * This is a store that is used to check if a value can be stored in a virtual
 * store.  It is not intended to be used for any other purpose.
 */
const checkVirtualStore = makeScalarBigMapStore('checkVirtualStore');

/**
 * Check if a value can be stored in a virtual store.
 *
 * FIXME: It would be nice if `@agoric/vat-data` exposed a way to do this
 * without having to catch exceptions.
 *
 * @param {unknown} specimen
 * @returns {boolean}
 */
const isStorable = specimen => {
  const key = isStorable.name;
  try {
    if (checkVirtualStore.has(key)) {
      // Be defensive in case the store wasn't cleaned up properly.
      checkVirtualStore.set(key, specimen);
    } else {
      // Initialize the store with our specimen.
      checkVirtualStore.init(key, specimen);
    }
    checkVirtualStore.delete(key);
    return true;
  } catch (_e) {
    return false;
  }
};
harden(isStorable);

/** @type {import('.').Stores} */
export const detachedVirtualStores = Far('virtualStores', {
  detached: () => detachedVirtualStores,
  isStorable,
  mapStore: makeScalarBigMapStore,
  setStore: makeScalarBigSetStore,
  weakMapStore: makeScalarBigWeakMapStore,
  weakSetStore: makeScalarBigWeakSetStore,
});

/**
 * A zone that utilizes external storage to reduce the memory footprint of the
 * current vat.
 *
 * @param {string} [baseLabel]
 * @returns {import('.').Zone}
 */
export const makeVirtualZone = (baseLabel = 'virtualZone') => {
  const { makeOnce, wrapProvider } = makeOnceKit(
    baseLabel,
    detachedVirtualStores,
  );
  return Far('VirtualZone', {
    exo: wrapProvider(defineVirtualExo, keys.exo),
    exoClass: wrapProvider(defineVirtualExoClass, keys.exoClass),
    exoClassKit: wrapProvider(defineVirtualExoClassKit, keys.exoClassKit),
    subZone: (label, _options) => {
      return makeOnce(label, () => makeVirtualZone(`${baseLabel}.${label}`));
    },

    makeOnce,
    detached: detachedVirtualStores.detached,
    isStorable: detachedVirtualStores.isStorable,

    mapStore: wrapProvider(detachedVirtualStores.mapStore),
    setStore: wrapProvider(detachedVirtualStores.setStore),
    weakMapStore: wrapProvider(detachedVirtualStores.weakMapStore),
    weakSetStore: wrapProvider(detachedVirtualStores.weakSetStore),
  });
};

export { M };
