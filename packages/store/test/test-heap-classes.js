// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import {
  defineHeapFarClass,
  defineHeapFarClassKit,
  defineHeapFarInstance,
} from '../src/patterns/interface-tools.js';
import { M } from '../src/patterns/patternMatchers.js';

/* Defining an interface for the UpCounter class. */
const UpCounterI = M.interface('UpCounter', {
  /* Defining the interface for the `incr` method. */
  incr: M.call()
    // TODO M.number() should not be needed to get a better error message
    /* The argument to `incr` is optional, and if it is
    present, it must be a number greater than or equal to zero. */
    .optional(M.and(M.number(), M.gte(0)))
    .returns(M.number()),
});

/* Defining an interface for the DownCounter class. */
const DownCounterI = M.interface('DownCounter', {
  /* Defining the interface for the `decr` method. */
  decr: M.call()
    // TODO M.number() should not be needed to get a better error message
    /* Argument to `incr` is optional, and if it is
    present, it must be a number greater than or equal to zero. */
    .optional(M.and(M.number(), M.gte(0)))
    .returns(M.number()),
});

/* Defining a class that can be instantiated and used in a type-safe way. */
test('test defineHeapFarClass', t => {
  const makeUpCounter = defineHeapFarClass(
    'UpCounter',
    UpCounterI,
    (x = 0) => ({ x }),
    {
      incr(y = 1) {
        // // @ts-expect-error TS doesn't know that `this` is a `Context`
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
    message: 'In "incr" method of (UpCounter) arg 0: -3 - Must be >= 0',
  });
  t.throws(() => upCounter.incr('foo'), {
    message:
      'In "incr" method of (UpCounter) arg 0: string "foo" - Must be a number',
  });
});

/* Defining a class called Counter that has two interfaces, up and down. */
test('test defineHeapFarClassKit', t => {
  const makeCounterKit = defineHeapFarClassKit(
    'Counter',
    harden({ up: UpCounterI, down: DownCounterI }),
    (x = 0) => ({ x }),
    {
      up: {
        /* Defining a method called `incr` that takes an optional argument `y` and defaults it to 1. It then
        uses the `this` keyword to access the `state` property of the `Context` object. It then adds `y` to
        the `x` property of the `state` object and returns the new value of `x`. */
        incr(y = 1) {
          const { state } = this;
          state.x += y;
          return state.x;
        },
      },
      down: {
        /* Defining a method called `decr` that takes an optional argument `y` and defaults it to 1. It then
        uses the `this` keyword to access the `state` property of the `Context` object. It then subtracts
        `y` from the `x` property of the `state` object and returns the new value of `x`. */
        decr(y = 1) {
          const { state } = this;
          state.x -= y;
          return state.x;
        },
      },
    },
  );

  //destructure `makeCounterKit` function for upCounter and downCounter functions
  const { upCounter, downCounter } = makeCounterKit(3);
  t.is(upCounter.incr(5), 8);
  t.is(downCounter.decr(), 7);
  t.is(upCounter.incr(3), 10);
  /* Testing that the `incr` method of the `UpCounter` class throws an error when the argument is less
    than zero. */
  // @ts-expect-error TS doesn't know that `upCounter` is a `Context`
  t.throws(() => upCounter.incr(-3), {
    message: 'In "incr" method of (Counter up) arg 0: -3 - Must be >= 0',
  });
  /* Testing that the `decr` method of the `DownCounter` class throws an error when the argument is not a
  number. */
  // @ts-expect-error the type violation is what we're testing
  t.throws(() => downCounter.decr('foo'), {
    message:
      'In "decr" method of (Counter down) arg 0: string "foo" - Must be a number',
  });
  /* Testing that the `decr` method of the `UpCounter` class throws an error when the argument is not a
    number. */
  t.throws(() => upCounter.decr(3), {
    message: 'upCounter.decr is not a function',
  });
});

/* Defining an instance of the `UpCounter` class. */
test('test defineHeapFarInstance', t => {
  let x = 3;
  /* Defining an instance of the `UpCounter` class. */
  const upCounter = defineHeapFarInstance('upCounter', UpCounterI, {
    /* Defining a method called `incr` that takes an optional argument `y` and defaults it to 1. It then
    uses the `this` keyword to access the `state` property of the `Context` object. It then adds `y` to
    the `x` property of the `state` object and returns the new value of `x`. */
    incr(y = 1) {
      x += y;
      return x;
    },
  });
  t.is(upCounter.incr(5), 8);
  t.is(upCounter.incr(1), 9);
  /* Testing that the `incr` method of the `UpCounter` class throws an error when the argument is less
  than zero. */
  t.throws(() => upCounter.incr(-3), {
    message: 'In "incr" method of (upCounter) arg 0: -3 - Must be >= 0',
  });
  /* Testing that the `incr` method of the `UpCounter` class throws an error when the argument is not a
  number. */
  // @ts-expect-error testing the type violation
  t.throws(() => upCounter.incr('foo'), {
    message:
      'In "incr" method of (upCounter) arg 0: string "foo" - Must be a number',
  });
});
