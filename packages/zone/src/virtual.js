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
import { alwaysOnce } from './once.js';

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
  once: alwaysOnce,

  mapStore: makeScalarBigMapStore,
  setStore: makeScalarBigSetStore,
  weakMapStore: makeScalarBigWeakMapStore,
  weakSetStore: makeScalarBigWeakSetStore,
});

/**
 * A zone that utilizes external storage to reduce the memory footprint of the
 * current vat.
 *
 * @type {import('.').Zone}
 */
export const virtualZone = Far('virtualZone', {
  exo: defineVirtualExo,
  exoClass: defineVirtualExoClass,
  exoClassKit: defineVirtualExoClassKit,
  subZone: (_label, _options = {}) => virtualZone,

  ...detachedVirtualStores,
});

export { M };
