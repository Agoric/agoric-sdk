/* eslint-disable no-use-before-define */
import { TypedMatcher } from '@agoric/internal/src/types.js';
import type {
  DurableKindHandle,
  FunctionsPlusContext,
  KindFacet,
  KindFacets,
} from '@agoric/swingset-liveslots';
import { VirtualObjectManager } from '@agoric/swingset-liveslots/src/virtualObjectManager.js';
import { InterfaceGuard } from '@endo/patterns';
import { expectNotType, expectType } from 'tsd';
import {
  defineDurableKind,
  defineKind,
  defineKindMulti,
  M,
  makeKindHandle,
  partialAssign,
  prepareExo,
  watchPromise,
} from '.';
import {
  GuardedMethod,
  TypedInterfaceGuard,
  TypedMethodGuard,
} from './types.js';

// for use in assignments below
const anyVal = null as any;

/*
export const makePaymentMaker = (allegedName: string, brand: unknown) => {
  const makePayment = defineKind(
    `${allegedName} payment`,
    () => ({}),
    // @ts-expect-error "state" type implied by init() doesn't provide "a"
    ({ a: something }) => ({
      getAllegedBrand: () => brand,
    }),
  );
  return makePayment;
};

type FlorgState = { str: string };
const makeFlorg = defineKind(
  'florg',
  (num: number) => ({ str: String(num), extra: 'extra' }),
  ({ str }: FlorgState) => str,
);
const f = makeFlorg(42);
f.concat; // string
// @ts-expect-error
makeFlorg('notnumber');
*/

// Single-faceted example from virtual-objects.md
type SingleCounterState = { counter: number; name: string };
type SingleCounterContext = {
  state: SingleCounterState;
  self: KindFacet<typeof counterBehavior>;
};
const initCounter = (name: string, str: string): SingleCounterState => ({
  counter: 0,
  name,
});

const counterBehavior = {
  inc: ({ state }: SingleCounterContext) => {
    state.counter += 1;
  },
  dec: ({ state }: SingleCounterContext) => {
    state.counter -= 1;
  },
  reset: ({ state }: SingleCounterContext) => {
    state.counter = 0;
  },
  rename: ({ state }: SingleCounterContext, newName: string) => {
    state.name = newName;
  },
  getCount: ({ state }: SingleCounterContext) => state.counter,
  getName: ({ state }: SingleCounterContext) => state.name,
};

const finishCounter = ({ state, self }: SingleCounterContext) => {
  expectType<string>(state.name);
  expectType<number>(self.getCount());
};

const makeCounter = defineKind('counter', initCounter, counterBehavior, {
  finish: finishCounter,
});

// Multi-faceted example from virtual-objects.md
type MultiCounterContext = {
  state: ReturnType<typeof initFacetedCounter>;
  facets: KindFacets<typeof facetedCounterBehavior>;
};
const initFacetedCounter = () => ({ counter: 0 });
const getCount = ({ state }: MultiCounterContext) => state.counter;
const facetedCounterBehavior = {
  incr: {
    step: ({ state }: MultiCounterContext) => {
      state.counter += 1;
    },
    getCount,
  },
  decr: {
    step: (context: MultiCounterContext) => {
      // Destructure within method because doing so in params creates a circular reference
      const { state, facets } = context;
      const { other } = facets;
      other.echo('hi');
      state.counter -= 1;
    },
    getCount,
  },
  other: {
    emptyFn: () => null,
    echo: (context: MultiCounterContext, toEcho: string) => toEcho,
  },
};

const makeFacetedCounter = defineKindMulti(
  'counter',
  initFacetedCounter,
  facetedCounterBehavior,
);

const fc = makeFacetedCounter();
expectType<void>(fc.incr.step());
expectType<void>(fc.decr.step());
expectType<number>(fc.decr.getCount());
// @ts-expect-error missing argument
fc.decr.echo();
expectType<string>(fc.other.echo('foo'));
// @ts-expect-error missing method
fc.incr.echo('foo');
expectType<null>(fc.other.emptyFn());

// durable kind
const fooHandle = makeKindHandle('foo');
expectType<DurableKindHandle>(fooHandle);
const fooInit = (name: string) => ({ name });
const fooBehavior = {
  sayHi: ({ state }: { state: { name: string } }) => `Howdy, ${state.name}`,
};
const makeFoo = defineDurableKind(fooHandle, fooInit, fooBehavior);
const foo = makeFoo('Doody');
expectType<string>(foo.sayHi());
// @ts-expect-error missing method
foo.sayBye();

// partialAssign
const state = { name: 'ted', color: 'red' };
partialAssign(state, { name: 'ed' });
// @ts-expect-error
partialAssign(state, { key: 'ted' });
// @ts-expect-error
partialAssign(state, { name: 3 });

// test FunctionsPlusContext
type SomeFacet = {
  gt(b: number): boolean;
};
type SomeContext = { state: { a: number } };
const someBehavior: FunctionsPlusContext<SomeContext, SomeFacet> = {
  gt(context: SomeContext, b: number) {
    return b > context.state.a;
  },
};
const someFacet: KindFacet<typeof someBehavior> = anyVal;
// @ts-expect-error
someFacet.gt();
expectType<boolean>(someFacet.gt(1));

const vom: VirtualObjectManager = anyVal;
// @ts-expect-error
vom.missingMethod;
// @ts-expect-error Expected 0-4 arguments but got 5
vom.defineDurableKind(anyVal, anyVal, anyVal, anyVal, 'extra');

const p: Promise<bigint> = anyVal;
watchPromise(
  p,
  {
    onFulfilled(value, extra1, extra2) {
      expectType<bigint>(value);
      expectType<string>(extra1);
      // @ts-expect-error str
      expectType<number>(extra2);
    },
    onRejected(reason, extra1) {
      expectType<unknown>(reason);
      expectType<string>(extra1);
    },
  },
  'extraString',
  'alsoString',
);
const Mnumber = M.number() as TypedMatcher<number>;

{
  const numIdentityGuard = M.call(Mnumber).returns(Mnumber) as TypedMethodGuard<
    (n: number) => number
  >;
  const numIdentity: GuardedMethod<typeof numIdentityGuard> = x => x;
  expectType<number>(numIdentity(3));

  const untypedGuard = M.call(Mnumber).returns(Mnumber);
  // @ts-expect-error cannot assign to never
  const untypedIdentity: GuardedMethod<typeof untypedGuard> = x => x;
  expectType<never>(untypedIdentity);
}

{
  // TypedMethodGuard
  const baggage = null as any;
  const UpCounterI = M.interface('UpCounter', {
    // TODO infer the TypedMethodGuard signature from the fluent builder
    adjustBy: M.call(Mnumber).returns(Mnumber) as TypedMethodGuard<
      (y: number) => number
    >,
  });
  expectType<InterfaceGuard>(UpCounterI);
  expectType<TypedInterfaceGuard>(UpCounterI);
  const exo = prepareExo(baggage, 'upCounter', UpCounterI, {
    adjustBy(y) {
      expectType<number>(y);
      expectNotType<any>(y);
      return y;
    },
  });
  expectType<(y: number) => number>(exo.adjustBy);
  // @ts-expect-error invalid argument
  exo.adjustBy('foo');
  // @ts-expect-error cannot add number to bigint
  exo.adjustBy(1) + 1n;

  prepareExo(baggage, 'upCounter', UpCounterI, {
    // TODO error on the faulty return type
    adjustBy(y) {
      expectType<number>(y);
      return 'hi';
    },
  });
}

{
  // MethodGuard with type on impl
  const baggage = null as any;
  const UpCounterI = M.interface('UpCounter', {
    adjustBy: M.call(Mnumber).returns(Mnumber),
  });
  expectType<InterfaceGuard>(UpCounterI);
  expectNotType<TypedInterfaceGuard>(UpCounterI);
  const exo = prepareExo(baggage, 'upCounter', UpCounterI, {
    /** @param {number} y */
    adjustBy(y) {
      return y;
    },
  });
  // @ts-expect-error must not be any
  exo.adjustBy + 1;
  // TODO propagate return type instead of `any`
  exo.adjustBy(1) + 1n;

  expectType<(y: number) => number>(exo.adjustBy);
}
