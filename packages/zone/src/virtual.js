// @ts-check
// @jessie-check

import { Far, isPassable } from '@endo/pass-style';
import {
  defineVirtualExoClass,
  defineVirtualExoClassKit,
  makeScalarBigMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakMapStore,
  makeScalarBigWeakSetStore,
} from '@agoric/vat-data';

import {
  agoricVatDataKeys as keys,
  makeOnceKit,
  watchPromise,
} from '@agoric/base-zone';

/**
 * @import {Zone} from './index.js';
 * @import {DefineKindOptions} from '@agoric/vat-data';
 * @import {Stores} from './index.js';
 */

const emptyRecord = harden({});
const initEmpty = harden(() => emptyRecord);

/**
 * This implementation of `defineVirtualExo` only exists to ensure there are no
 * gaps in the virtualZone API.
 *
 * @type {Zone['exo']}
 */
const makeVirtualExo = (
  label,
  interfaceGuard,
  methods,
  options = undefined,
) => {
  const defineKindOptions =
    /** @type {DefineKindOptions<{ self: typeof methods }>} */ (
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

/** @type {Stores} */
const detachedVirtualStores = Far('virtualStores', {
  detached: () => detachedVirtualStores,
  isStorable: isPassable,
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
 * @returns {Zone}
 */
export const makeVirtualZone = (baseLabel = 'virtualZone') => {
  const { makeOnce, wrapProvider } = makeOnceKit(
    baseLabel,
    detachedVirtualStores,
  );

  /**
   * @param {string} label
   * @param {any} _options
   */
  const makeSubZone = (label, _options) =>
    makeVirtualZone(`${baseLabel}.${label}`);

  return Far('virtualZone', {
    exo: wrapProvider(makeVirtualExo, keys.exo),
    exoClass: wrapProvider(defineVirtualExoClass, keys.exoClass),
    exoClassKit: wrapProvider(defineVirtualExoClassKit, keys.exoClassKit),
    subZone: wrapProvider(makeSubZone),

    makeOnce,
    watchPromise,
    detached: detachedVirtualStores.detached,
    isStorable: detachedVirtualStores.isStorable,

    mapStore: wrapProvider(detachedVirtualStores.mapStore),
    setStore: wrapProvider(detachedVirtualStores.setStore),
    weakMapStore: wrapProvider(detachedVirtualStores.weakMapStore),
    weakSetStore: wrapProvider(detachedVirtualStores.weakSetStore),
  });
};
