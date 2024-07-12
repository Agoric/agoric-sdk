// @jessie-check

import { initEmpty } from '@agoric/store';

import { provide, VatData as globalVatData } from './vat-data-bindings.js';

/**
 * @import {InterfaceGuard} from '@endo/patterns';
 * @import {RemotableObject} from '@endo/pass-style';
 * @import {Baggage, DefineKindOptions, DurableKindHandle, InterfaceGuardKit} from '@agoric/swingset-liveslots';
 */

// Some feedback if the init function is async
/**
 * @typedef {(...args: any[]) => any} InitState
 */
/**
 * @template {InitState} I
 * @typedef {ReturnType<I> extends Promise<any> ? never : ReturnType<I>} StateResult
 */

/**
 * Make a version of the argument function that takes a kind context but ignores
 * it.
 *
 * @type {<T extends (...args: any) => any>(
 *   fn: T,
 * ) => import('@agoric/swingset-liveslots').PlusContext<never, T>}
 */
export const ignoreContext =
  fn =>
  (_context, ...args) =>
    fn(...args);
harden(ignoreContext);

// TODO: Find a good home for this function used by @agoric/vat-data and testing code
/** @param {import('@agoric/swingset-liveslots').VatData} VatData */
export const makeExoUtils = VatData => {
  const {
    defineKind,
    defineKindMulti,
    defineDurableKind,
    defineDurableKindMulti,
    makeKindHandle,
  } = VatData;

  /**
   * @deprecated Use Exos/ExoClasses instead of Kinds
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

  /**
   * @template {InitState} I init state function
   * @template T behavior
   * @param {string} tag
   * @param {InterfaceGuard | undefined} interfaceGuard
   * @param {I} init
   * @param {T &
   *   ThisType<{
   *     self: T;
   *     state: StateResult<I>;
   *   }>} methods
   * @param {DefineKindOptions<{
   *   self: T;
   *   state: StateResult<I>;
   * }>} [options]
   * @returns {(...args: Parameters<I>) => import('@endo/exo').Guarded<T>}
   */
  const defineVirtualExoClass = (tag, interfaceGuard, init, methods, options) =>
    // @ts-expect-error cast
    defineKind(tag, init, methods, {
      ...options,
      thisfulMethods: true,
      interfaceGuard,
    });
  harden(defineVirtualExoClass);

  /**
   * @template {InitState} I init state function
   * @template {Record<string, Record<PropertyKey, CallableFunction>>} T facets
   * @param {string} tag
   * @param {InterfaceGuardKit | undefined} interfaceGuardKit
   * @param {I} init
   * @param {T &
   *   ThisType<{
   *     facets: import('@endo/exo').GuardedKit<T>;
   *     state: StateResult<I>;
   *   }>} facets
   * @param {DefineKindOptions<{
   *   facets: T;
   *   state: StateResult<I>;
   * }>} [options]
   * @returns {(...args: Parameters<I>) => import('@endo/exo').GuardedKit<T>}
   */
  const defineVirtualExoClassKit = (
    tag,
    interfaceGuardKit,
    init,
    facets,
    options,
  ) =>
    // @ts-expect-error cast
    defineKindMulti(tag, init, facets, {
      ...options,
      thisfulMethods: true,
      interfaceGuardKit,
    });
  harden(defineVirtualExoClassKit);

  /**
   * @template {InitState} I init state function
   * @template {Record<PropertyKey, CallableFunction>} T methods
   * @param {DurableKindHandle} kindHandle
   * @param {InterfaceGuard | undefined} interfaceGuard
   * @param {I} init
   * @param {T &
   *   ThisType<{
   *     self: T;
   *     state: StateResult<I>;
   *   }>} methods
   * @param {DefineKindOptions<{
   *   self: T;
   *   state: StateResult<I>;
   * }>} [options]
   * @returns {(...args: Parameters<I>) => import('@endo/exo').Guarded<T>}
   */
  const defineDurableExoClass = (
    kindHandle,
    interfaceGuard,
    init,
    methods,
    options,
  ) =>
    // @ts-expect-error cast
    defineDurableKind(kindHandle, init, methods, {
      ...options,
      thisfulMethods: true,
      interfaceGuard,
    });
  harden(defineDurableExoClass);

  /**
   * @template {InitState} I init state function
   * @template {Record<string, Record<PropertyKey, CallableFunction>>} T facets
   * @param {DurableKindHandle} kindHandle
   * @param {InterfaceGuardKit | undefined} interfaceGuardKit
   * @param {I} init
   * @param {T &
   *   ThisType<{
   *     facets: import('@endo/exo').GuardedKit<T>;
   *     state: StateResult<I>;
   *   }>} facets
   * @param {DefineKindOptions<{
   *   facets: T;
   *   state: StateResult<I>;
   * }>} [options]
   * @returns {(...args: Parameters<I>) => import('@endo/exo').GuardedKit<T>}
   */
  const defineDurableExoClassKit = (
    kindHandle,
    interfaceGuardKit,
    init,
    facets,
    options,
  ) =>
    // @ts-expect-error cast
    defineDurableKindMulti(kindHandle, init, facets, {
      ...options,
      thisfulMethods: true,
      interfaceGuardKit,
    });
  harden(defineDurableExoClassKit);

  /**
   * @template {InitState} I init state function
   * @template {Record<PropertyKey, CallableFunction>} T methods
   * @param {Baggage} baggage
   * @param {string} kindName
   * @param {InterfaceGuard | undefined} interfaceGuard
   * @param {I} init
   * @param {T &
   *   ThisType<{
   *     self: RemotableObject & T;
   *     state: StateResult<I>;
   *   }>} methods
   * @param {DefineKindOptions<{
   *   self: T;
   *   state: StateResult<I>;
   * }>} [options]
   * @returns {(...args: Parameters<I>) => import('@endo/exo').Guarded<T>}
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

  /**
   * @template {InitState} I init state function
   * @template {Record<string, Record<PropertyKey, CallableFunction>>} T facets
   * @param {Baggage} baggage
   * @param {string} kindName
   * @param {InterfaceGuardKit | undefined} interfaceGuardKit
   * @param {I} init
   * @param {T &
   *   ThisType<{
   *     facets: import('@endo/exo').GuardedKit<T>;
   *     state: StateResult<I>;
   *   }>} facets
   * @param {DefineKindOptions<{
   *   facets: T;
   *   state: StateResult<I>;
   * }>} [options]
   * @returns {(...args: Parameters<I>) => import('@endo/exo').GuardedKit<T>}
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

  /**
   * @template {Record<PropertyKey, CallableFunction>} M methods
   * @param {Baggage} baggage
   * @param {string} kindName
   * @param {InterfaceGuard | undefined} interfaceGuard
   * @param {M} methods
   * @param {DefineKindOptions<{ self: M }>} [options]
   * @returns {import('@endo/exo').Guarded<M>}
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
   * @deprecated Use prepareExo instead.
   * @template {Record<PropertyKey, CallableFunction>} M methods
   * @param {Baggage} baggage
   * @param {string} kindName
   * @param {M} methods
   * @param {DefineKindOptions<{ self: M }>} [options]
   * @returns {import('@endo/exo').Guarded<M>}
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
