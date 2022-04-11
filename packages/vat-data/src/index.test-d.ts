/* eslint-disable no-use-before-define, import/no-extraneous-dependencies */
import { expectType } from 'tsd';
import { defineKind } from '.';
import { ActualBehavior, FunctionsMinusContext } from './types.js';

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

// From virtual-objects.md
type CounterContext = {
  state: ReturnType<typeof initFacetedCounter>;
  facets: ActualBehavior<typeof facetedCounterBehavior>;
};
const initFacetedCounter = () => ({ counter: 0 });
const getCount = ({ state }: CounterContext) => state.counter;
const facetedCounterBehavior = {
  incr: {
    step: ({ state }: CounterContext) => {
      state.counter += 1;
    },
    getCount,
    emptyFn: () => null,
  },
  decr: {
    step: (context: CounterContext) => {
      const { state, facets } = context;
      const { decr } = facets;
      decr.echo('hi');
      state.counter -= 1;
    },
    getCount,
    echo: (context: CounterContext, toEcho: string) => toEcho,
  },
};

const makeFacetedCounter = defineKind(
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
expectType<string>(fc.decr.echo('foo'));
// @ts-expect-error missing method
fc.incr.echo('foo');
expectType<null>(fc.incr.emptyFn());
