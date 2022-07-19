/**
 * @file Types for vat-data
 *
 * Facet is a single object with methods.
 * Behavior is a description when defining a kind of what facets it will have.
 * For the non-multi defineKind, there is just one facet so it doesn't have a key.
 */
import type {
  MapStore,
  SetStore,
  StoreOptions,
  WeakMapStore,
  WeakSetStore,
} from '@agoric/store';

type Baggage = MapStore<string, unknown>;

type Tail<T extends any[]> = T extends [head: any, ...rest: infer Rest]
  ? Rest
  : [];

type MinusContext<
  F extends (context, ...rest: any[]) => any,
  P extends any[] = Parameters<F>, // P: are the parameters of F
  R = ReturnType<F>, // R: the return type of F
> = (...args: Tail<P>) => R;

type KindFacet<O> = { [K in keyof O]: MinusContext<O[K]> };

type KindFacets<B> = {
  [FacetKey in keyof B]: KindFacet<B[FacetKey]>;
};

type KindContext<S, F> = { state: S; self: KindFacet<F> };
type MultiKindContext<S, B> = { state: S; facets: KindFacets<B> };

type PlusContext<C, M> = (c: C, ...args: Parameters<M>) => ReturnType<M>;
type FunctionsPlusContext<C, O> = { [K in keyof O]: PlusContext<C, O[K]> };

declare class DurableKindHandleClass {
  private descriptionTag: string;
}
export type DurableKindHandle = DurableKindHandleClass;

type DefineKindOptions<C> = {
  finish?: (context: C) => void;
  durable?: boolean;
};

export type VatData = {
  // virtual kinds
  defineKind: <P, S, F>(
    tag: string,
    init: (...args: P) => S,
    facet: F,
    options?: DefineKindOptions<KindContext<S, F>>,
  ) => (...args: P) => KindFacet<F>;
  defineKindMulti: <P, S, B>(
    tag: string,
    init: (...args: P) => S,
    behavior: B,
    options?: DefineKindOptions<MultiKindContext<S, B>>,
  ) => (...args: P) => KindFacets<B>;

  // durable kinds
  makeKindHandle: (descriptionTag: string) => DurableKindHandle;
  defineDurableKind: <P, S, F>(
    kindHandle: DurableKindHandle,
    init: (...args: P) => S,
    facet: F,
    options?: DefineKindOptions<KindContext<S, F>>,
  ) => (...args: P) => KindFacet<F>;
  defineDurableKindMulti: <P, S, B>(
    kindHandle: DurableKindHandle,
    init: (...args: P) => S,
    behavior: B,
    options?: DefineKindOptions<MultiKindContext<S, B>>,
  ) => (...args: P) => KindFacets<B>;

  providePromiseWatcher: unknown;
  watchPromise: unknown;

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
interface PickFacet {
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

type VivifyKind = <P, S, F>(
  baggage: Baggage,
  tag: string,
  init: (...args: P) => S,
  facet: F,
  options?: DefineKindOptions<KindContext<S, F>>,
) => (...args: P) => KindFacet<F>;

type VivifyKindMulti = <P, S, B>(
  baggage: Baggage,
  tag: string,
  init: (...args: P) => S,
  behavior: B,
  options?: DefineKindOptions<MultiKindContext<S, B>>,
) => (...args: P) => KindFacets<B>;
