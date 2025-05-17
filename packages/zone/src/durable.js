// @ts-check
// @jessie-check

import { Fail } from '@endo/errors';
import { Far, isPassable } from '@endo/pass-style';

import {
  canBeDurable,
  makeScalarMapStore,
  prepareExo,
  prepareExoClass,
  prepareExoClassKit,
  provideDurableMapStore,
  provideDurableSetStore,
  provideDurableWeakMapStore,
  provideDurableWeakSetStore,
  watchPromise,
} from '@agoric/vat-data';

import { agoricVatDataKeys as keys, makeOnceKit } from '@agoric/base-zone';

/**
 * @import {Zone} from './index.js';
 */

/**
 * A variant of `canBeDurable` that returns `false` instead of ever throwing.
 *
 * @param {unknown} specimen
 * @returns {boolean}
 */
const isStorable = specimen => isPassable(specimen) && canBeDurable(specimen);
harden(isStorable);

/**
 * @param {() => import('@agoric/vat-data').Baggage} getBaggage
 */
const attachDurableStores = getBaggage => {
  /** @type {Zone['mapStore']} */
  const mapStore = (label, options) => {
    const baggage = getBaggage();
    const ret = provideDurableMapStore(baggage, label, options);
    return ret;
  };
  /** @type {Zone['setStore']} */
  const setStore = (label, options) =>
    provideDurableSetStore(getBaggage(), label, options);
  /** @type {Zone['weakSetStore']} */
  const weakSetStore = (label, options) =>
    provideDurableWeakSetStore(getBaggage(), label, options);
  /** @type {Zone['weakMapStore']} */
  const weakMapStore = (label, options) =>
    provideDurableWeakMapStore(getBaggage(), label, options);

  /** @type {import('./index.js').Stores} */
  return Far('durableStores', {
    detached: () => detachedDurableStores,
    isStorable,
    mapStore,
    setStore,
    weakMapStore,
    weakSetStore,
  });
};

/** @type {import('./index.js').Stores} */
const detachedDurableStores = attachDurableStores(() =>
  makeScalarMapStore('detached'),
);

/**
 * Create a zone whose objects persist between Agoric vat upgrades.
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {string} [baseLabel]
 * @returns {Zone}
 */
export const makeDurableZone = (baggage, baseLabel = 'durableZone') => {
  baggage || Fail`baggage required`;

  const attachedStores = attachDurableStores(() => baggage);

  const { makeOnce, wrapProvider } = makeOnceKit(
    baseLabel,
    attachedStores,
    baggage,
  );

  /** @type {Zone['exoClass']} */
  const exoClass = (...args) => prepareExoClass(baggage, ...args);
  /** @type {Zone['exoClassKit']} */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- happens only integrating with Endo master
  // @ts-ignore FIXME in Endo
  const exoClassKit = (...args) => prepareExoClassKit(baggage, ...args);
  /** @type {Zone['exo']} */
  const exo = (...args) => prepareExo(baggage, ...args);

  const subZoneStore = wrapProvider(attachedStores.mapStore, keys.zone);

  /** @type {Zone['subZone']} */
  const subZone = (label, options = {}) => {
    /** @type {import('@agoric/swingset-liveslots').Baggage} */
    const subBaggage = subZoneStore(label, options);
    return makeDurableZone(subBaggage, `${baseLabel}.${label}`);
  };

  return Far('durableZone', {
    exo: wrapProvider(exo, keys.exo),
    exoClass: wrapProvider(exoClass, keys.exoClass),
    exoClassKit: wrapProvider(exoClassKit, keys.exoClassKit),
    subZone,

    makeOnce,
    watchPromise,
    detached: attachedStores.detached,
    isStorable: attachedStores.isStorable,

    mapStore: wrapProvider(attachedStores.mapStore, keys.store),
    setStore: wrapProvider(attachedStores.setStore, keys.store),
    weakMapStore: wrapProvider(attachedStores.weakMapStore, keys.store),
    weakSetStore: wrapProvider(attachedStores.weakSetStore, keys.store),
  });
};
harden(makeDurableZone);
