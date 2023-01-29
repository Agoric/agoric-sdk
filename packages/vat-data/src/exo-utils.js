import { initEmpty } from '@agoric/store';

import { provideKindHandle } from './kind-utils.js';
import {
  defineKind,
  defineKindMulti,
  defineDurableKind,
  defineDurableKindMulti,
  provide,
} from './vat-data-bindings.js';

/** @template I,M @typedef {import('@agoric/store/exported').DefineExo<M>} DefineExo */
/** @template I,M @typedef {import('@agoric/store/exported').DefineExoClass<I,M>} DefineExoClass */
/** @template I,F @typedef {import('@agoric/store/exported').DefineExoClassKit<I,F>} DefineExoClassKit */

/** @template L,R @typedef {import('@endo/eventual-send').RemotableBrand<L, R>} RemotableBrand */
/** @template T @typedef {import('@endo/far').ERef<T>} ERef */
/** @typedef {import('./types.js').Baggage} Baggage */
/** @template T @typedef {import('./types.js').DefineKindOptions<T>} DefineKindOptions */
/** @template T @typedef {import('./types.js').KindFacet<T>} KindFacet */
/** @template T @typedef {import('./types.js').KindFacets<T>} KindFacets */
/** @typedef {import('./types.js').DurableKindHandle} DurableKindHandle */

/**
 * @template {(...args: any) => any} I init state function
 * @template {Record<string | symbol, CallableFunction>} M methods
 * @type {DefineExoClass<I,M>}
 */
export const defineVirtualExoClass = (
  tag,
  interfaceGuard,
  init,
  methods,
  options,
) =>
  defineKind(tag, init, methods, {
    ...options,
    thisfulMethods: true,
    interfaceGuard,
  });
harden(defineVirtualExoClass);

// TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
/**
 * @template {(...args: any) => any} I init state function
 * @template {Record<string, Record<string | symbol, CallableFunction>>} F facets
 * @type {DefineExoClassKit<I,F>}
 */
export const defineVirtualExoClassKit = (
  tag,
  interfaceGuardKit,
  init,
  facets,
  options,
) =>
  defineKindMulti(tag, init, facets, {
    ...options,
    thisfulMethods: true,
    interfaceGuard: interfaceGuardKit,
  });
harden(defineVirtualExoClassKit);

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
 * @template {(...args: any) => any} I init state function
 * @template {Record<string, Record<string | symbol, CallableFunction>>} T facets
 * @param {DurableKindHandle} kindHandle
 * @param {any} interfaceGuardKit
 * @param {I} init
 * @param {T & ThisType<{ facets: T, state: ReturnType<I>}> } facets
 * @param {DefineKindOptions<{ facets: T, state: ReturnType<I>}>} [options]
 * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
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
export const prepareExoClass = (
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
harden(prepareExoClass);

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
export const prepareExoClassKit = (
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
harden(prepareExoClassKit);

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
  const makeSingleton = prepareExoClass(
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
 * @template {Record<string | symbol, CallableFunction>} T methods
 * @deprecated Use prepareExo instead.
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
