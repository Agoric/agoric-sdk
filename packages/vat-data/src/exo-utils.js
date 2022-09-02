import { initEmpty } from '@agoric/store';

import { provideKindHandle } from './kind-utils.js';
import {
  defineKind,
  defineKindMulti,
  defineDurableKind,
  defineDurableKindMulti,
  provide,
} from './vat-data-bindings.js';

/** @template L,R @typedef {import('@endo/eventual-send').RemotableBrand<L, R>} RemotableBrand */
/** @template T @typedef {import('@endo/eventual-send').ERef<T>} ERef */
/** @typedef {import('./types.js').Baggage} Baggage */
/** @template T @typedef {import('./types.js').DefineKindOptions<T>} DefineKindOptions */
/** @template T @typedef {import('./types.js').KindFacet<T>} KindFacet */
/** @template T @typedef {import('./types.js').KindFacets<T>} KindFacets */
/** @typedef {import('./types.js').DurableKindHandle} DurableKindHandle */

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template A,S,T
 * @param {string} tag
 * @param {any} interfaceGuard
 * @param {(...args: A[]) => S} init
 * @param {T} methods
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const defineVirtualExoClass = (
  tag,
  interfaceGuard,
  init,
  methods,
  options,
) =>
  // @ts-expect-error The use of `thisfulMethods` to change
  // the appropriate static type is the whole point of this method.
  defineKind(tag, init, methods, {
    ...options,
    thisfulMethods: true,
    interfaceGuard,
  });
harden(defineVirtualExoClass);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template A,S,T
 * @param {string} tag
 * @param {any} interfaceGuardKit
 * @param {(...args: A[]) => S} init
 * @param {T} facets
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const defineVirtualExoClassKit = (
  tag,
  interfaceGuardKit,
  init,
  facets,
  options,
) =>
  // @ts-expect-error The use of `thisfulMethods` to change
  // the appropriate static type is the whole point of this method.
  defineKindMulti(tag, init, facets, {
    ...options,
    thisfulMethods: true,
    interfaceGuard: interfaceGuardKit,
  });
harden(defineVirtualExoClassKit);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template A,S,T
 * @param {DurableKindHandle} kindHandle
 * @param {any} interfaceGuard
 * @param {(...args: A[]) => S} init
 * @param {T} methods
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const defineDurableExoClass = (
  kindHandle,
  interfaceGuard,
  init,
  methods,
  options,
) =>
  // @ts-expect-error The use of `thisfulMethods` to change
  // the appropriate static type is the whole point of this method.
  defineDurableKind(kindHandle, init, methods, {
    ...options,
    thisfulMethods: true,
    interfaceGuard,
  });
harden(defineDurableExoClass);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template A,S,T
 * @param {DurableKindHandle} kindHandle
 * @param {any} interfaceGuardKit
 * @param {(...args: A[]) => S} init
 * @param {T} facets
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const defineDurableExoClassKit = (
  kindHandle,
  interfaceGuardKit,
  init,
  facets,
  options,
) =>
  // @ts-expect-error The use of `thisfulMethods` to change
  // the appropriate static type is the whole point of this method.
  defineDurableKindMulti(kindHandle, init, facets, {
    ...options,
    thisfulMethods: true,
    interfaceGuard: interfaceGuardKit,
  });
harden(defineDurableExoClassKit);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template A,S,T
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {any} interfaceGuard
 * @param {(...args: A[]) => S} init
 * @param {T} methods
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const vivifyExoClass = (
  baggage,
  kindName,
  interfaceGuard,
  init,
  methods,
  options = undefined,
) =>
  defineDurableExoClass(
    provideKindHandle(baggage, kindName),
    interfaceGuard,
    init,
    methods,
    options,
  );
harden(vivifyExoClass);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template A,S,T
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {any} interfaceGuardKit
 * @param {(...args: A[]) => S} init
 * @param {T} facets
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
export const vivifyExoClassKit = (
  baggage,
  kindName,
  interfaceGuardKit,
  init,
  facets,
  options = undefined,
) =>
  defineDurableExoClassKit(
    provideKindHandle(baggage, kindName),
    interfaceGuardKit,
    init,
    facets,
    options,
  );
harden(vivifyExoClassKit);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template T,M
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {any} interfaceGuard
 * @param {M} methods
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {T & RemotableBrand<{}, T>}
 */
export const vivifyExo = (
  baggage,
  kindName,
  interfaceGuard,
  methods,
  options = undefined,
) => {
  const makeSingleton = vivifyExoClass(
    baggage,
    kindName,
    interfaceGuard,
    initEmpty,
    methods,
    options,
  );

  // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error -- https://github.com/Agoric/agoric-sdk/issues/4620
  // @ts-ignore could be instantiated with an arbitrary type
  return provide(baggage, `the_${kindName}`, () => makeSingleton());
};
harden(vivifyExo);

/**
 * @deprecated Use vivifyExo instead.
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
) => vivifyExo(baggage, kindName, undefined, methods, options);
harden(vivifySingleton);
