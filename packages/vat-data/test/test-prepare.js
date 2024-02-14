// Modeled on test-heap-classes.js

import { test } from './prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { M } from '@agoric/store';
import {
  prepareExoClass,
  prepareExoClassKit,
  prepareExo,
} from '../src/exo-utils.js';
import { makeScalarBigMapStore } from '../src/vat-data-bindings.js';

const UpCounterI = M.interface('UpCounter', {
  incr: M.call()
    // TODO M.number() should not be needed to get a better error message
    .optional(M.and(M.number(), M.gte(0)))
    .returns(M.number()),
});

const DownCounterI = M.interface('DownCounter', {
  decr: M.call()
    // TODO M.number() should not be needed to get a better error message
    .optional(M.and(M.number(), M.gte(0)))
    .returns(M.number()),
});

test('test prepareExoClass', t => {
  const baggage = makeScalarBigMapStore('baggage', { durable: true });

  const makeUpCounter = prepareExoClass(
    baggage,
    'UpCounter',
    UpCounterI,
    /** @param {number} [x] */
    (x = 0) => ({ x }),
    {
      incr(y = 1) {
        const { state } = this;
        state.x += y;
        return state.x;
      },
    },
  );
  const upCounter = makeUpCounter(3);
  t.is(upCounter.incr(5), 8);
  t.is(upCounter.incr(1), 9);
  t.throws(() => upCounter.incr(-3), {
    message: 'In "incr" method of (UpCounter): arg 0?: -3 - Must be >= 0',
  });
  // @ts-expect-error the type violation is what we're testing
  t.throws(() => upCounter.incr('foo'), {
    message:
      'In "incr" method of (UpCounter): arg 0?: string "foo" - Must be a number',
  });
  // @ts-expect-error arity check
  makeUpCounter(3, 4);
  // @ts-expect-error type check
  makeUpCounter('str');
});

test('test prepareExoClassKit', t => {
  const baggage = makeScalarBigMapStore('baggage', { durable: true });

  const makeCounterKit = prepareExoClassKit(
    baggage,
    'Counter',
    { up: UpCounterI, down: DownCounterI },
    /** @param {number} [x] */
    (x = 0) => ({ x }),
    {
      up: {
        incr(y = 1) {
          const { state } = this;
          state.x += y;
          return state.x;
        },
      },
      down: {
        decr(y = 1) {
          const { state } = this;
          state.x -= y;
          return state.x;
        },
      },
    },
  );
  const { up: upCounter, down: downCounter } = makeCounterKit(3);
  t.is(upCounter.incr(5), 8);
  t.is(downCounter.decr(), 7);
  t.is(upCounter.incr(3), 10);
  t.throws(() => upCounter.incr(-3), {
    message: 'In "incr" method of (Counter up): arg 0?: -3 - Must be >= 0',
  });
  // @ts-expect-error the type violation is what we're testing
  t.throws(() => downCounter.decr('foo'), {
    message:
      'In "decr" method of (Counter down): arg 0?: string "foo" - Must be a number',
  });
  // @ts-expect-error the type violation is what we're testing
  t.throws(() => upCounter.decr(3), {
    message: 'upCounter.decr is not a function',
  });
  // @ts-expect-error arity check
  makeCounterKit(3, 4);
  // @ts-expect-error type check
  makeCounterKit('str');
});

test('test prepareExo', t => {
  const baggage = makeScalarBigMapStore('baggage', { durable: true });

  let x = 3;
  const upCounter = prepareExo(baggage, 'upCounter', UpCounterI, {
    incr(y = 1) {
      x += y;
      return x;
    },
  });
  t.is(upCounter.incr(5), 8);
  t.is(upCounter.incr(1), 9);
  t.throws(() => upCounter.incr(-3), {
    message: 'In "incr" method of (upCounter): arg 0?: -3 - Must be >= 0',
  });
  // @ts-expect-error intentional
  t.throws(() => upCounter.incr('foo'), {
    message:
      'In "incr" method of (upCounter): arg 0?: string "foo" - Must be a number',
  });
});

test.todo('Demonstrate that the baggage can be used to revive objects.');
