// @ts-check

import {
  defineExoClass,
  defineExoClassKit,
  makeScalarWeakMapStore,
} from '@agoric/store';
import {
  canBeDurable,
  prepareExoClass,
  prepareExoClassKit,
  provideDurableWeakMapStore,
} from '@agoric/vat-data';

/**
 * @typedef {object} Place
 * @property {<A,S,T extends Record<string | symbol, CallableFunction>>
 *   (...args: Parameters<typeof defineExoClass<A, S, T>>) =>
 *     ReturnType<typeof defineExoClass<A, S, T>>
 * } exoClass
 * @property {<A,S,T extends Record<string, Record<string | symbol, CallableFunction>>>
 *   (...args: Parameters<typeof defineExoClassKit<A, S, T>>) =>
 *     ReturnType<typeof defineExoClassKit<A, S, T>>
 * } exoClassKit
 * @property {(specimen: unknown) => boolean} isValidExoState
 * @property {<K,V>
 *   (label: string, options?: StoreOptions) =>
 *     WeakMapStore<K, V>
 * } weakMapStore
 */

/** @type {Place} */
export const heapPlace = harden({
  exoClass: defineExoClass,
  exoClassKit: defineExoClassKit,
  isValidExoState: () => true,
  weakMapStore: makeScalarWeakMapStore,
});

/**
 * @param {import('@agoric/vat-data/src/types.js').Baggage} baggage
 * @returns {Place}
 */
export const makeDurablePlace = baggage => {
  /** @type {Place['exoClass']} */
  const exoClass = (...args) => prepareExoClass(baggage, ...args);
  /** @type {Place['exoClassKit']} */
  const exoClassKit = (...args) => prepareExoClassKit(baggage, ...args);
  /** @type {Place['weakMapStore']} */
  const weakMapStore = (label, options) =>
    provideDurableWeakMapStore(baggage, label, options);
  return harden({
    exoClass,
    exoClassKit,
    isValidExoState: canBeDurable,
    weakMapStore,
  });
};
