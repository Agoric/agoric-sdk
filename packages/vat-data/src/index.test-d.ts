import { defineKind } from '.';

import type { MinusContext } from './types';

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
  state: {
    counter: number;
  };
};
const initFacetedCounter = () => ({ counter: 0 });
const getCount = ({ state }: CounterContext) => state.counter;
const facetedCounterBehavior = {
  incr: {
    step: ({ state }) => {
      state.counter += 1;
    },
    getCount,
  },
  decr: {
    step: ({ state }) => {
      state.counter -= 1;
    },
    getCount,
    echo: (context, toEcho) => toEcho,
  },
};

const makeFacetedCounter = defineKind(
  'counter',
  initFacetedCounter,
  facetedCounterBehavior,
);

const fc = makeFacetedCounter();
fc.incr.step();
fc.decr.step();
fc.decr.getCount();
// @ts-expect-error missing argument
fc.decr.echo();
fc.decr.echo('foo');
// @ts-expect-error missing method
fc.incr.echo('foo');
