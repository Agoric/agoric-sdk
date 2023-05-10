// @jessie-check

import {
  canBeDurable,
  makeScalarMapStore,
  provide,
  provideDurableMapStore,
  provideDurableSetStore,
  provideDurableWeakMapStore,
  provideDurableWeakSetStore,
  prepareExo,
  prepareExoClass,
  prepareExoClassKit,
  M,
} from '@agoric/vat-data';

import { Far } from '@endo/far';

/** @typedef {import('.').Zone} Zone */

const { Fail } = assert;

/**
 * @param {() => import('@agoric/vat-data').Baggage} getBaggage
 */
const attachDurableStores = getBaggage => {
  /** @type {Zone['once']} */
  const once = (key, makeValue) => provide(getBaggage(), key, makeValue);

  /** @type {Zone['mapStore']} */
  const mapStore = (label, options) =>
    provideDurableMapStore(getBaggage(), label, options);
  /** @type {Zone['setStore']} */
  const setStore = (label, options) =>
    provideDurableSetStore(getBaggage(), label, options);
  /** @type {Zone['weakSetStore']} */
  const weakSetStore = (label, options) =>
    provideDurableWeakSetStore(getBaggage(), label, options);
  /** @type {Zone['weakMapStore']} */
  const weakMapStore = (label, options) =>
    provideDurableWeakMapStore(getBaggage(), label, options);

  /** @type {import('.').Stores} */
  return Far('durableStores', {
    // eslint-disable-next-line no-use-before-define
    detached: () => detachedDurableStores,
    isStorable: canBeDurable,
    once,

    mapStore,
    setStore,
    weakMapStore,
    weakSetStore,
  });
};

/** @type {import('.').Stores} */
export const detachedDurableStores = attachDurableStores(() =>
  makeScalarMapStore('detached'),
);

/**
 * Create a zone whose objects persist between Agoric vat upgrades.
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @returns {Zone}
 */
export const makeDurableZone = baggage => {
  baggage || Fail`baggage required`;
  /** @type {Zone['exoClass']} */
  const exoClass = (...args) => prepareExoClass(baggage, ...args);
  /** @type {Zone['exoClassKit']} */
  const exoClassKit = (...args) => prepareExoClassKit(baggage, ...args);
  /** @type {Zone['exo']} */
  const exo = (...args) => prepareExo(baggage, ...args);

  const attachedStores = attachDurableStores(() => baggage);

  /** @type {Zone['subZone']} */
  const subZone = (label, options = {}) => {
    const subBaggage = provideDurableMapStore(baggage, label, options);
    return makeDurableZone(subBaggage);
  };

  return Far('durableZone', {
    exo,
    exoClass,
    exoClassKit,
    subZone,
    ...attachedStores,
  });
};
harden(makeDurableZone);

export { M };
