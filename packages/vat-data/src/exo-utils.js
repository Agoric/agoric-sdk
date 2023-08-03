// @jessie-check

import { initEmpty } from '@agoric/store';

import { provide, VatData as globalVatData } from './vat-data-bindings.js';

/** @template L,R @typedef {import('@endo/eventual-send').RemotableBrand<L, R>} RemotableBrand */
/** @template T @typedef {import('@endo/far').ERef<T>} ERef */
/** @typedef {import('@agoric/swingset-liveslots').Baggage} Baggage */
/** @template T @typedef {import('@agoric/swingset-liveslots').DefineKindOptions<T>} DefineKindOptions */
/** @template T @typedef {import('@agoric/swingset-liveslots').KindFacet<T>} KindFacet */
/** @template T @typedef {import('@agoric/swingset-liveslots').KindFacets<T>} KindFacets */
/** @typedef {import('@agoric/swingset-liveslots').DurableKindHandle} DurableKindHandle */

/**
 * Make a version of the argument function that takes a kind context but
 * ignores it.
 *
 * @type {<T extends Function>(fn: T) => import('@agoric/swingset-liveslots').PlusContext<never, T>}
 */
export const ignoreContext =
  fn =>
  (_context, ...args) =>
    fn(...args);
harden(ignoreContext);

// TODO: Find a good home for this function used by @agoric/vat-data and testing code
export const makeExoUtils = VatData => {
  const {
    defineKind,
    defineKindMulti,
    defineDurableKind,
    defineDurableKindMulti,
    makeKindHandle,
  } = VatData;

  /**
   * @param {Baggage} baggage
   * @param {string} kindName
   * @returns {DurableKindHandle}
   */
  const provideKindHandle = (baggage, kindName) =>
    provide(baggage, `${kindName}_kindHandle`, () => makeKindHandle(kindName));
  harden(provideKindHandle);

  /**
   * @deprecated Use prepareExoClass instead
   * @type {import('@agoric/swingset-liveslots').PrepareKind}
   */
  const prepareKind = (
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
  harden(prepareKind);

  /**
   * @deprecated Use prepareExoClassKit instead
   * @type {import('@agoric/swingset-liveslots').PrepareKindMulti}
   */
  const prepareKindMulti = (
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
  harden(prepareKindMulti);

  // TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
  /**
   * @template {(...args: any) => any} I init state function
   * @template T behavior
   * @param {string} tag
   * @param {any} interfaceGuard
   * @param {I} init
   * @param {T & ThisType<{
   *   self: T,
   *   state: ReturnType<I>
   * }>} methods
   * @param {DefineKindOptions<{
   *   self: T,
   *   state: ReturnType<I>
   * }>} [options]
   * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
   */
  const defineVirtualExoClass = (tag, interfaceGuard, init, methods, options) =>
    defineKind(tag, init, methods, {
      ...options,
      thisfulMethods: true,
      interfaceGuard,
    });
  harden(defineVirtualExoClass);

  // TODO interfaceGuard type https://github.com/Agoric/agoric-sdk/issues/6206
  /**
   * @template {(...args: any) => any} I init state function
   * @template {Record<string, Record<string | symbol, CallableFunction>>} T facets
   * @param {string} tag
   * @param {any} interfaceGuardKit
   * @param {I} init
   * @param {T & ThisType<{
   *   facets: T,
   *   state: ReturnType<I>
   * }> } facets
   * @param {DefineKindOptions<{
   *   facets: T,
   *   state: ReturnType<I>
   * }>} [options]
   * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
   */
  const defineVirtualExoClassKit = (
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
   * @param {T & ThisType<{
   *   self: T,
   *   state: ReturnType<I>
   * }>} methods
   * @param {DefineKindOptions<{
   *   self: T,
   *   state: ReturnType<I>
   * }>} [options]
   * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
   */
  const defineDurableExoClass = (
    kindHandle,
    interfaceGuard,
    init,
    methods,
    options,
  ) =>
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
   * @param {T & ThisType<{
   *   facets: T,
   *   state: ReturnType<I>
   * }> } facets
   * @param {DefineKindOptions<{
   *   facets: T,
   *   state: ReturnType<I>
   * }>} [options]
   * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
   */
  const defineDurableExoClassKit = (
    kindHandle,
    interfaceGuardKit,
    init,
    facets,
    options,
  ) =>
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
   * @param {T & ThisType<{
   *   self: T,
   *   state: ReturnType<I>
   * }>} methods
   * @param {DefineKindOptions<{
   *   self: T,
   *   state: ReturnType<I>
   * }>} [options]
   * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
   */
  const prepareExoClass = (
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
   * @param {T & ThisType<{
   *   facets: T,
   *   state: ReturnType<I>
   * }> } facets
   * @param {DefineKindOptions<{
   *   facets: T,
   *   state: ReturnType<I>
   * }>} [options]
   * @returns {(...args: Parameters<I>) => (T & RemotableBrand<{}, T>)}
   */
  const prepareExoClassKit = (
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
   * @template {Record<string | symbol, CallableFunction>} M methods
   * @param {Baggage} baggage
   * @param {string} kindName
   * @param {any} interfaceGuard
   * @param {M} methods
   * @param {DefineKindOptions<{ self: M }>} [options]
   * @returns {M & RemotableBrand<{}, M>}
   */
  const prepareExo = (
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

    return provide(baggage, `${kindName}_singleton`, () => makeSingleton());
  };
  harden(prepareExo);

  /**
   * @template {Record<string | symbol, CallableFunction>} M methods
   * @deprecated Use prepareExo instead.
   * @param {Baggage} baggage
   * @param {string} kindName
   * @param {M} methods
   * @param {DefineKindOptions<{ self: M }>} [options]
   * @returns {M & RemotableBrand<{}, M>}
   */
  const prepareSingleton = (baggage, kindName, methods, options = undefined) =>
    prepareExo(baggage, kindName, undefined, methods, options);
  harden(prepareSingleton);

  return harden({
    defineVirtualExoClass,
    defineVirtualExoClassKit,
    defineDurableExoClass,
    defineDurableExoClassKit,
    prepareExoClass,
    prepareExoClassKit,
    prepareExo,
    prepareSingleton,

    provideKindHandle,
    prepareKind,
    prepareKindMulti,
  });
};

const globalExoUtils = makeExoUtils(globalVatData);

export const {
  defineVirtualExoClass,
  defineVirtualExoClassKit,
  defineDurableExoClass,
  defineDurableExoClassKit,
  prepareExoClass,
  prepareExoClassKit,
  prepareExo,
  prepareSingleton,
} = globalExoUtils;

/**
 * @deprecated Use Exos/ExoClasses instead of Kinds
 */
export const { provideKindHandle, prepareKind, prepareKindMulti } =
  globalExoUtils;
