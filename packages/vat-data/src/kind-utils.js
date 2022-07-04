import { provide } from '@agoric/store';
import { defineDurableKind, makeKindHandle } from './vat-data-bindings.js';

export const dropContext =
  fn =>
  (_, ...args) =>
    fn(...args);
// @ts-expect-error TODO statically recognize harden
harden(dropContext);

export const provideKindHandle = (baggage, kindName) =>
  provide(baggage, `${kindName}_kindHandle`, () => makeKindHandle(kindName));
// @ts-expect-error TODO statically recognize harden
harden(provideKindHandle);

/**
 * By analogy with how `Array.prototype.map` will map the elements of
 * an array to transformed elements of an array of the same shape,
 * `objectMap` will do likewise for the string-named own enumerable
 * properties of an object.
 *
 * See the comment at
 * https://github.com/Agoric/agoric-sdk/pull/5674#discussion_r908883510
 * TODO need to move this to a common place.
 *
 * @template T, U
 * @template {keyof T} K
 * @param {{ [K2 in keyof T]: T[K2] }} original
 * @param {(pair: [K, T[K]]) => [K, U]} mapPairFn
 * @returns {Record<K, U>}
 */
export const objectMap = (original, mapPairFn) => {
  const ents = /** @type {[K, T[K]][]} */ (Object.entries(original));
  const mapEnts = ents.map(ent => mapPairFn(ent));
  // @ts-expect-error TODO statically recognize harden
  return /** @type {Record<K, U>} */ (harden(Object.fromEntries(mapEnts)));
};

/** @typedef {import('@agoric/store').MapStore<string,unknown>} Baggage */

/**
 * @template T
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {T} methods
 * @param {import('./types.js').DefineKindOptions<unknown>} [options]
 * @returns {T}
 */
export const ProvideFar = (baggage, kindName, methods, options = undefined) => {
  const kindHandle = provideKindHandle(baggage, kindName);
  const behavior = objectMap(methods, ([k, m]) => [k, dropContext(m)]);
  const makeSingleton = defineDurableKind(
    kindHandle,
    () => ({}),
    behavior,
    options,
  );

  return provide(baggage, `the_${kindName}`, () => makeSingleton());
};
// @ts-expect-error TODO statically recognize harden
harden(ProvideFar);
