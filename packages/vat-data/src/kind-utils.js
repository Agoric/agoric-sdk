import { objectMap } from '@agoric/internal';
import { provide } from '@agoric/store';
import {
  defineDurableKind,
  defineDurableKindMulti,
  makeKindHandle,
} from './vat-data-bindings.js';

/** @template L,R @typedef {import('@endo/eventual-send').RemotableBrand<L, R>} RemotableBrand */
/** @typedef {import('./types.js').Baggage} Baggage */
/** @template T @typedef {import('./types.js').DefineKindOptions<T>} DefineKindOptions */
/** @template T @typedef {import('./types.js').KindFacet<T>} KindFacet */
/** @template T @typedef {import('./types.js').KindFacets<T>} KindFacets */
/** @typedef {import('./types.js').DurableKindHandle} DurableKindHandle */

/**
 * Make a version of the argument function that takes a kind context but ignores it.
 *
 * @type {<T extends Function>(fn: T) => import('./types.js').PlusContext<never, T>}
 */
export const ignoreContext =
  fn =>
  (context, ...args) =>
    fn(...args);
// @ts-expect-error TODO statically recognize harden
harden(ignoreContext);

/**
 * @param {Baggage} baggage
 * @param {string} kindName
 * @returns {DurableKindHandle}
 */
export const provideKindHandle = (baggage, kindName) =>
  provide(baggage, `${kindName}_kindHandle`, () => makeKindHandle(kindName));
// @ts-expect-error TODO statically recognize harden
harden(provideKindHandle);

/** @type {import('./types.js').VivifyKind} */
export const vivifyKind = (
  baggage,
  kindName,
  init,
  behavior,
  options = undefined,
) =>
  defineDurableKind(
    provideKindHandle(baggage, kindName),
    init,
    behavior,
    options,
  );
// @ts-expect-error TODO statically recognize harden
harden(vivifyKind);

/** @type {import('./types.js').VivifyKindMulti} */
export const vivifyKindMulti = (
  baggage,
  kindName,
  init,
  behavior,
  options = undefined,
) =>
  defineDurableKindMulti(
    provideKindHandle(baggage, kindName),
    init,
    behavior,
    options,
  );
// @ts-expect-error TODO statically recognize harden
harden(vivifyKindMulti);

/**
 * @template T
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {T} methods
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {T & RemotableBrand<{}, T>}
 */
export const vivifySingleton = (
  baggage,
  kindName,
  methods,
  options = undefined,
) => {
  const behavior = objectMap(methods, ignoreContext);
  const makeSingleton = vivifyKind(
    baggage,
    kindName,
    () => ({}),
    behavior,
    options,
  );

  return provide(baggage, `the_${kindName}`, () => makeSingleton());
};
// @ts-expect-error TODO statically recognize harden
harden(vivifySingleton);
