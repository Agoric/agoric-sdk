// Modeled on test-heap-classes.js

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { M } from '@agoric/store';
import {
  defineDurableExoClass,
  defineDurableExoClassKit,
} from '../src/exo-utils.js';
import { makeKindHandle } from '../src/vat-data-bindings.js';

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

test('test defineDurableExoClass', t => {
  const upCounterKind = makeKindHandle('UpCounter');

  const makeUpCounter = defineDurableExoClass(
    upCounterKind,
    UpCounterI,
    (x = 0) => ({ x }),
    {
      incr(y = 1) {
        // @ts-expect-error TS doesn't know that `this` is a `Context`
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
  // @ts-expect-error the type violation is what we're testing
  t.throws(() => upCounter.incr('foo'), {
    message:
      'In "incr" method of (UpCounter) arg 0: string "foo" - Must be a number',
  });
});

test('test defineDurableExoClassKit', t => {
  const counterKindHandle = makeKindHandle('Counter');

  const makeCounterKit = defineDurableExoClassKit(
    counterKindHandle,
    { up: UpCounterI, down: DownCounterI },
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
    message: 'In "incr" method of (Counter up) arg 0: -3 - Must be >= 0',
  });
  // @ts-expect-error the type violation is what we're testing
  t.throws(() => downCounter.decr('foo'), {
    message:
      'In "decr" method of (Counter down) arg 0: string "foo" - Must be a number',
  });
  t.throws(() => upCounter.decr(3), {
    message: 'upCounter.decr is not a function',
  });
});

test.todo('Add tests for durability');
