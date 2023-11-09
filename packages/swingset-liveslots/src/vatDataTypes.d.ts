/**
 * @file Types for vat-data
 *
 * Facet is a single object with methods.
 * Behavior is a description when defining a kind of what facets it will have.
 * For the non-multi defineKind, there is just one facet so it doesn't have a key.
 */
import type { InterfaceGuard, Pattern } from '@endo/patterns';
import type {
  MapStore,
  SetStore,
  StoreOptions,
  WeakMapStore,
  WeakSetStore,
} from '@agoric/store';
import type { makeWatchedPromiseManager } from './watchedPromises.js';

// TODO should be moved into @endo/patterns and eventually imported here
// instead of this local definition.
export type InterfaceGuardKit = Record<string, InterfaceGuard>;

export type { MapStore, Pattern };

// This needs `any` values.  If they were `unknown`, code that uses Baggage
// would need explicit runtime checks or casts for every fetch, which is
// onerous.
export type Baggage = MapStore<string, any>;

type WatchedPromisesManager = ReturnType<typeof makeWatchedPromiseManager>;

type Tail<T extends any[]> = T extends [head: any, ...rest: infer Rest]
  ? Rest
  : [];

// used to omit the 'context' parameter
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R
  ? (...args: P) => R
  : never;

export type KindFacet<O> = {
  [K in keyof O]: OmitFirstArg<O[K]>; // omit the 'context' parameter
};

export type KindFacets<B> = {
  [FacetKey in keyof B]: KindFacet<B[FacetKey]>;
};

export type KindContext<S, F> = { state: S; self: KindFacet<F> };
export type MultiKindContext<S, B> = { state: S; facets: KindFacets<B> };

export type PlusContext<C, M> = (c: C, ...args: Parameters<M>) => ReturnType<M>;
export type FunctionsPlusContext<C, O> = {
  [K in keyof O]: PlusContext<C, O[K]>;
};

declare class DurableKindHandleClass {
  private descriptionTag: string;
}
export type DurableKindHandle = DurableKindHandleClass;

/**
 * Grab bag of options that can be provided to `defineDurableKind` and its
 * siblings. Not all options are meaningful in all contexts. See the
 * doc-comments on each option.
 */
export type DefineKindOptions<C> = {
  /**
   * If provided, the `finish` function will be called after the instance is
   * made and internally registered, but before it is returned. The finish
   * function is to do any post-intantiation initialization that should be
   * done before exposing the object to its clients.
   */
  finish?: (context: C) => void;

  /**
   * Meaningful to `makeScalarBigMapStore` and its siblings. These maker
   * fuctions will make either virtual or durable stores, depending on
   * this flag. Defaults to off, making virtual but not durable collections.
   *
   * Generally, durable collections are provided with `provideDurableMapStore`
   * and its sibling, which use this flag internally. If you do not make
   * durable collections by other means, you can consider this as
   * intended for internal use only.
   */
  durable?: boolean;

  /**
   * If provided, it describes the shape of all state records of instances
   * of this kind.
   */
  stateShape?: { [name: string]: Pattern };

  /**
   * Intended for internal use only.
   * Should the raw methods receive their `context` argument as their first
   * argument or as their `this` binding? For `defineDurableKind` and its
   * siblings (including `prepareSingleton`), this defaults to off, meaning that
   * their behavior methods receive `context` as their first argument.
   * `prepareExoClass` and its siblings (including `prepareExo`) use
   * this flag internally to indicate that their methods receive `context`
   * as their `this` binding.
   */
  thisfulMethods?: boolean;

  /**
   * Intended for internal use only.
   * Only applicable if this is a class kind. A class kit kind should use
   * `interfaceGuardKit` instead.
   *
   * If an `interfaceGuard` is provided, then the raw methods passed alongside
   * it are wrapped by a function that first checks that this method's guard
   * pattern is satisfied before calling the raw method.
   *
   * In `defineDurableKind` and its siblings, this defaults to `undefined`.
   * Exo classes use this internally to protect their raw class methods
   * using the provided interface.
   * In absence, an exo is protected anyway, while a bare kind is
   * not (detected by `!thisfulMethods`),
   */
  interfaceGuard?: InterfaceGuard;

  /**
   * Intended for internal use only.
   * Only applicable if this is a class kit kind. A class kind should use
   * `interfaceGuard` instead.
   *
   * If an `interfaceGuardKit` is provided, then each member of the
   * interfaceGuardKit is used to guard the corresponding facet of the
   * class kit.
   *
   * In `defineDurableKindMulti` and its siblings, this defaults to `undefined`.
   * Exo class kits use this internally to protect their facets.
   * In absence, an exo is protected anyway, while a bare kind is
   * not (detected by `!thisfulMethods`),
   */
  interfaceGuardKit?: InterfaceGuardKit;
};

export type VatData = {
  // virtual kinds
  /** @deprecated Use defineVirtualExoClass instead */
  defineKind: <P, S, F>(
    tag: string,
    init: (...args: P) => S,
    facet: F,
    options?: DefineKindOptions<KindContext<S, F>>,
  ) => (...args: P) => KindFacet<F>;

  /** @deprecated Use defineVirtualExoClassKit instead */
  defineKindMulti: <P, S, B>(
    tag: string,
    init: (...args: P) => S,
    behavior: B,
    options?: DefineKindOptions<MultiKindContext<S, B>>,
  ) => (...args: P) => KindFacets<B>;

  // durable kinds
  makeKindHandle: (descriptionTag: string) => DurableKindHandle;

  /** @deprecated Use defineDurableExoClass instead */
  defineDurableKind: <P, S, F>(
    kindHandle: DurableKindHandle,
    init: (...args: P) => S,
    facet: F,
    options?: DefineKindOptions<KindContext<S, F>>,
  ) => (...args: P) => KindFacet<F>;

  /** @deprecated Use defineDurableExoClassKit instead */
  defineDurableKindMulti: <P, S, B>(
    kindHandle: DurableKindHandle,
    init: (...args: P) => S,
    behavior: B,
    options?: DefineKindOptions<MultiKindContext<S, B>>,
  ) => (...args: P) => KindFacets<B>;

  providePromiseWatcher: WatchedPromisesManager['providePromiseWatcher'];
  watchPromise: WatchedPromisesManager['watchPromise'];

  makeScalarBigMapStore: <K, V>(
    label: string,
    options?: StoreOptions,
  ) => MapStore<K, V>;
  makeScalarBigWeakMapStore: <K, V>(
    label: string,
    options?: StoreOptions,
  ) => WeakMapStore<K, V>;

  makeScalarBigSetStore: <K>(
    label: string,
    options?: StoreOptions,
  ) => SetStore<K>;
  makeScalarBigWeakSetStore: <K>(
    label: string,
    options?: StoreOptions,
  ) => WeakSetStore<K>;
  canBeDurable: (specimen: unknown) => boolean;
};

// The JSDoc is repeated here and at the function definition so it appears
// in IDEs where it's used, regardless of type resolution.
export interface PickFacet {
  /**
   * When making a multi-facet kind, it's common to pick one facet to
   * expose. E.g.,
   *
   *     const makeFoo = (a, b, c, d) => makeFooBase(a, b, c, d).self;
   *
   * This helper reduces the duplication:
   *
   *     const makeFoo = pickFacet(makeFooBase, 'self');
   */
  <M extends (...args: any[]) => any, F extends keyof ReturnType<M>>(
    maker: M,
    facetName: F,
  ): (...args: Parameters<M>) => ReturnType<M>[F];
}

/** @deprecated Use prepareExoClass instead */
export type PrepareKind = <P, S, F>(
  baggage: Baggage,
  tag: string,
  init: (...args: P) => S,
  facet: F,
  options?: DefineKindOptions<KindContext<S, F>>,
) => (...args: P) => KindFacet<F>;

/** @deprecated Use prepareExoClassKit instead */
export type PrepareKindMulti = <P, S, B>(
  baggage: Baggage,
  tag: string,
  init: (...args: P) => S,
  behavior: B,
  options?: DefineKindOptions<MultiKindContext<S, B>>,
) => (...args: P) => KindFacets<B>;
