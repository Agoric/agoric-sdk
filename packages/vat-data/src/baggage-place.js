/** @typedef {import('./types').Baggage} Baggage */
/** @typedef {import('@agoric/store/exported').Place} Place */

import {
  defineVirtualExoClass,
  defineVirtualExoClassKit,
  prepareExo,
  prepareExoClass,
  prepareExoClassKit,
} from './exo-utils.js';
import {
  makeScalarBigMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakMapStore,
  makeScalarBigWeakSetStore,
  provideDurableMapStore,
  provideDurableSetStore,
  provideDurableWeakMapStore,
  provideDurableWeakSetStore,
} from './vat-data-bindings.js';

const { Fail } = assert;

/**
 * @type {Place}
 */
export const virtualPlace = harden({
  exo: () => Fail`Virtual singleton exos are not needed.`,
  exoClass: defineVirtualExoClass,
  exoClassKit: defineVirtualExoClassKit,

  mapStore: (label, options = {}) =>
    makeScalarBigMapStore(label, { durable: false, ...options }),
  weakMapStore: (label, options = {}) =>
    makeScalarBigWeakMapStore(label, { durable: false, ...options }),
  setStore: (label, options = {}) =>
    makeScalarBigSetStore(label, { durable: false, ...options }),
  weakSetStore: (label, options = {}) =>
    makeScalarBigWeakSetStore(label, { durable: false, ...options }),

  subPlace: (_label, _options = {}) => virtualPlace,
});

/**
 * @param {Baggage} baggage
 * @returns {Place}
 */
export const makeBaggagePlace = baggage =>
  harden({
    // @ts-expect-error I clain the curried type is correct
    exo: (...args) => prepareExo(baggage, ...args),
    // @ts-expect-error I clain the curried type is correct
    exoClass: (...args) => prepareExoClass(baggage, ...args),
    // @ts-expect-error I clain the curried type is correct
    exoClassKit: (...args) => prepareExoClassKit(baggage, ...args),

    mapStore: (label, options = {}) =>
      provideDurableMapStore(baggage, label, options),
    weakMapStore: (label, options = {}) =>
      provideDurableWeakMapStore(baggage, label, options),
    setStore: (label, options = {}) =>
      provideDurableSetStore(baggage, label, options),
    weakSetStore: (label, options = {}) =>
      provideDurableWeakSetStore(baggage, label, options),

    subPlace: (label, options = {}) => {
      const subBaggage = provideDurableMapStore(baggage, label, options);
      return makeBaggagePlace(subBaggage);
    },
  });
harden(makeBaggagePlace);
