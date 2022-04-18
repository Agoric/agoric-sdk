import type {
  MapStore,
  SetStore,
  StoreOptions,
  WeakMapStore,
  WeakSetStore,
} from '@agoric/store';
import { Context } from 'vm';

type Tail<T extends any[]> = T extends [head: any, ...rest: infer Rest]
  ? Rest
  : [];

type MinusContext<
  F extends (context, ...rest: any[]) => any,
  P extends any[] = Parameters<F>, // P: are the parameters of F
  R = ReturnType<F>, // R: the return type of F
> = (...args: Tail<P>) => R;

type FunctionsMinusContext<O> = { [K in keyof O]: MinusContext<O[K]> };

type ActualBehavior<B> = {
  [Facet in keyof B]: FunctionsMinusContext<B[Facet]>;
};

interface KindDefiner {
  <P, S, F>(
    tag: string,
    init: (...args: P) => S,
    facet: F,
    options?: {
      finish?: (context: { state: S }, kind: FunctionsMinusContext<F>) => void;
    },
  ): (...args: P) => FunctionsMinusContext<F>;
}

type MultiKindContext<S, B> = { state: S; facets: ActualBehavior<B> };
interface KindMultiDefiner {
  <P, S, B>(
    tag: string,
    init: (...args: P) => S,
    behavior: B,
    options?: { finish?: (context: MultiKindContext<S, B>) => void },
  ): (...args: P) => ActualBehavior<B>;
}

interface KindDurableMultiDefiner {
  <P, S, B>(
    kindHandle: unknown, // TODO RemotableBrand
    init: (...args: P) => S,
    behavior: B,
    options?: { finish?: (context: MultiKindContext<S, B>) => void },
  ): (...args: P) => ActualBehavior<B>;
}

export type VatData = {
  defineKind: KindDefiner;
  defineKindMulti: KindMultiDefiner;
  defineDurableKind: KindDefiner;
  defineDurableKindMulti: KindDurableMultiDefiner;

  makeKindHandle: (descriptionTag: string) => unknown;

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
};

// The JSDoc is repeated here and at the function definition so it appears
// in IDEs where it's used, regardless of type resolution.
interface PickFacet {
  /**
   * When making a multi-facet kind, it's common to pick one facet to expose. E.g.,
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
