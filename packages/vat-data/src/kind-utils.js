import { provide } from '@agoric/store';
import {
  defineKind,
  defineKindMulti,
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
 * @template A,S,T
 * @param {string} tag
 * @param {(...args: A[]) => S} init
 * @param {T} methods
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const defineThisfulKind = (tag, init, methods, options) =>
  // @ts-expect-error The use of `thisfulMethods` to change
  // the appropriate static type is the whole point of this method.
  defineKind(tag, init, methods, { ...options, thisfulMethods: true });

/**
 * @template A,S,T
 * @param {string} tag
 * @param {(...args: A[]) => S} init
 * @param {T} facets
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const defineThisfulKindMulti = (tag, init, facets, options) =>
  // @ts-expect-error The use of `thisfulMethods` to change
  // the appropriate static type is the whole point of this method.
  defineKindMulti(tag, init, facets, { ...options, thisfulMethods: true });

/**
 * @template A,S,T
 * @param {DurableKindHandle} kindHandle
 * @param {(...args: A[]) => S} init
 * @param {T} methods
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const defineDurableThisfulKind = (kindHandle, init, methods, options) =>
  // @ts-expect-error The use of `thisfulMethods` to change
  // the appropriate static type is the whole point of this method.
  defineDurableKind(kindHandle, init, methods, {
    ...options,
    thisfulMethods: true,
  });

/**
 * @template A,S,T
 * @param {DurableKindHandle} kindHandle
 * @param {(...args: A[]) => S} init
 * @param {T} facets
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const defineDurableThisfulKindMulti = (
  kindHandle,
  init,
  facets,
  options,
) =>
  // @ts-expect-error The use of `thisfulMethods` to change
  // the appropriate static type is the whole point of this method.
  defineDurableKindMulti(kindHandle, init, facets, {
    ...options,
    thisfulMethods: true,
  });

/**
 * Make a version of the argument function that takes a kind context but
 * ignores it.
 *
 * @type {<T extends Function>(fn: T) => import('./types.js').PlusContext<never, T>}
 */
export const ignoreContext =
  fn =>
  (_context, ...args) =>
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
 * @template A,S,T
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {(...args: A[]) => S} init
 * @param {T} methods
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const vivifyThisfulKind = (
  baggage,
  kindName,
  init,
  methods,
  options = undefined,
) =>
  defineDurableThisfulKind(
    provideKindHandle(baggage, kindName),
    init,
    methods,
    options,
  );
// @ts-expect-error TODO statically recognize harden
harden(vivifyKind);

/**
 * @template A,S,T
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {(...args: A[]) => S} init
 * @param {T} facets
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const vivifyThisfulKindMulti = (
  baggage,
  kindName,
  init,
  facets,
  options = undefined,
) =>
  defineDurableThisfulKindMulti(
    provideKindHandle(baggage, kindName),
    init,
    facets,
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
  const makeSingleton = vivifyThisfulKind(
    baggage,
    kindName,
    () => ({}),
    methods,
    options,
  );

  return provide(baggage, `the_${kindName}`, () => makeSingleton());
};
// @ts-expect-error TODO statically recognize harden
harden(vivifySingleton);
