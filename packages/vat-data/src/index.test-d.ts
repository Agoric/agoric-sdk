/* eslint-disable no-use-before-define, import/no-extraneous-dependencies */
import { expectType } from 'tsd';
import { defineKindMulti } from '.';
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
  },
  decr: {
    step: (context: CounterContext) => {
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
    echo: (context: CounterContext, toEcho: string) => toEcho,
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
