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
 * @template {(...args: any) => any} I init state function
 * @template T behavior
 * @param {string} tag
 * @param {any} interfaceGuard
 * @param {I} init
 * @param {T & ThisType<{ self: T, state: ReturnType<I> }>} methods
 * @param {DefineKindOptions<{ self: T, state: ReturnType<I> }>} [options]
 * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
 */
export const makeVirtualExoMaker = (
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
harden(makeVirtualExoMaker);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template {(...args: any) => any} I init state function
 * @template {Record<string, Record<string | symbol, CallableFunction>>} T facets
 * @param {string} tag
 * @param {any} interfaceGuardKit
 * @param {I} init
 * @param {T & ThisType<{ facets: T, state: ReturnType<I> }> } facets
 * @param {DefineKindOptions<{ facets: T, state: ReturnType<I> }>} [options]
 * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
 */
export const makeVirtualExoKitMaker = (
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
harden(makeVirtualExoKitMaker);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template {(...args: any) => any} I init state function
 * @template {Record<string | symbol, CallableFunction>} T methods
 * @param {DurableKindHandle} kindHandle
 * @param {any} interfaceGuard
 * @param {I} init
 * @param {T & ThisType<{ self: T, state: ReturnType<I> }>} methods
 * @param {DefineKindOptions<{ self: T, state: ReturnType<I> }>} [options]
 * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
 */
export const makeDurableExoMaker = (
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
harden(makeDurableExoMaker);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template {(...args: any) => any} I init state function
 * @template {Record<string, Record<string | symbol, CallableFunction>>} T facets
 * @param {DurableKindHandle} kindHandle
 * @param {any} interfaceGuardKit
 * @param {I} init
 * @param {T & ThisType<{ facets: T, state: ReturnType<I>}> } facets
 * @param {DefineKindOptions<{ facets: T, state: ReturnType<I>}>} [options]
 * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
 */
export const makeDurableExoKitMaker = (
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
harden(makeDurableExoKitMaker);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template {(...args: any) => any} I init state function
 * @template {Record<string | symbol, CallableFunction>} T methods
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {any} interfaceGuard
 * @param {I} init
 * @param {T & ThisType<{ self: T, state: ReturnType<I> }>} methods
 * @param {DefineKindOptions<{ self: T, state: ReturnType<I> }>} [options]
 * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
 */
export const prepareExoMaker = (
  baggage,
  kindName,
  interfaceGuard,
  init,
  methods,
  options = undefined,
) =>
  makeDurableExoMaker(
    provideKindHandle(baggage, kindName),
    interfaceGuard,
    init,
    methods,
    options,
  );
harden(prepareExoMaker);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template {(...args: any) => any} I init state function
 * @template {Record<string, Record<string | symbol, CallableFunction>>} T facets
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {any} interfaceGuardKit
 * @param {I} init
 * @param {T & ThisType<{ facets: T, state: ReturnType<I> }> } facets
 * @param {DefineKindOptions<{ facets: T, state: ReturnType<I> }>} [options]
 * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
 */
export const prepareExoKitMaker = (
  baggage,
  kindName,
  interfaceGuardKit,
  init,
  facets,
  options = undefined,
) =>
  makeDurableExoKitMaker(
    provideKindHandle(baggage, kindName),
    interfaceGuardKit,
    init,
    facets,
    options,
  );
harden(prepareExoKitMaker);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template T
 * @template {Record<string | symbol, CallableFunction>} M methods
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {any} interfaceGuard
 * @param {M} methods
 * @param {DefineKindOptions<{ self: M }>} [options]
 * @returns {T & RemotableBrand<{}, T>}
 */
export const prepareExo = (
  baggage,
  kindName,
  interfaceGuard,
  methods,
  options = undefined,
) => {
  const makeSingleton = prepareExoMaker(
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
harden(prepareExo);

/**
 * @deprecated Use prepareExo instead.
 * @template {Record<string | symbol, CallableFunction>} T methods
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {T} methods
 * @param {DefineKindOptions<{ self: T }>} [options]
 * @returns {T & RemotableBrand<{}, T>}
 */
export const prepareSingleton = (
  baggage,
  kindName,
  methods,
  options = undefined,
) => prepareExo(baggage, kindName, undefined, methods, options);
harden(prepareSingleton);
